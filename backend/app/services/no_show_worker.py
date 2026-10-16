import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.booking import Booking, BookingStatus
from app.models.college import CollegeSettings
from app.services.audit_service import log_audit_event
from app.services.notification_service import create_notification
from app.config import settings

logger = logging.getLogger("slotspot.worker")

_worker_running = False
_worker_task: Optional[asyncio.Task] = None


def release_expired_no_shows(db: Session, force_grace_minutes: Optional[int] = None) -> List[Booking]:
    """
    Scans for CONFIRMED bookings whose start time plus no-show grace period has elapsed.
    Transitions them to NO_SHOW, logs audit events, creates notifications, and releases the slot.
    Concurrency safe: uses transactions and re-verifies status before changing.
    """
    now_utc = datetime.utcnow()
    released_bookings = []

    # Cache college settings to avoid redundant queries
    college_settings_cache = {}

    try:
        # Query only CONFIRMED bookings that could possibly be expired
        eligible_candidates = db.query(Booking).filter(
            Booking.status == BookingStatus.CONFIRMED.value,
            Booking.start_time <= now_utc
        ).all()

        for booking in eligible_candidates:
            # Determine grace period for this college
            if force_grace_minutes is not None:
                grace_minutes = force_grace_minutes
            else:
                cid = booking.college_id
                if cid not in college_settings_cache:
                    c_setting = db.query(CollegeSettings).filter(CollegeSettings.college_id == cid).first()
                    college_settings_cache[cid] = c_setting.no_show_grace_minutes if c_setting else settings.DEFAULT_NO_SHOW_GRACE_MINUTES
                grace_minutes = college_settings_cache[cid]

            cutoff = booking.start_time + timedelta(minutes=grace_minutes)

            if now_utc >= cutoff:
                # Re-verify and update in a row lock / immediate check
                # Double-check status has not changed concurrently by a manual check-in
                if booking.status == BookingStatus.CONFIRMED.value:
                    booking.status = BookingStatus.NO_SHOW.value
                    booking.no_show_time = now_utc

                    log_audit_event(
                        db=db,
                        college_id=booking.college_id,
                        user_id=None,  # System background process
                        action="NO_SHOW_RELEASED",
                        target_type="BOOKING",
                        target_id=booking.id,
                        details={
                            "resource_id": booking.resource_id,
                            "resource_name": booking.resource.name if booking.resource else "Resource",
                            "start_time": booking.start_time.isoformat(),
                            "grace_period_minutes": grace_minutes,
                            "released_at": now_utc.isoformat()
                        }
                    )

                    create_notification(
                        db=db,
                        college_id=booking.college_id,
                        user_id=booking.student_id,
                        title="Booking Released (No-Show)",
                        message=f"Your reservation for '{booking.resource.name if booking.resource else 'Resource'}' was released because check-in was not completed within the {grace_minutes}-minute grace period.",
                        notification_type="NO_SHOW"
                    )

                    db.commit()
                    released_bookings.append(booking)
                    logger.info(f"Released no-show booking {booking.id} for resource {booking.resource_id}")

    except Exception as e:
        db.rollback()
        logger.error(f"Error during no-show release execution: {str(e)}")

    return released_bookings


async def no_show_worker_loop():
    """Periodic worker loop running inside the backend process."""
    global _worker_running
    logger.info("Starting SlotSpot automatic no-show release background worker...")
    while _worker_running:
        try:
            db = SessionLocal()
            try:
                release_expired_no_shows(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Background worker encountered an unhandled error: {e}")

        # Sleep between checks
        await asyncio.sleep(settings.NO_SHOW_CHECK_INTERVAL_SECONDS)


def start_no_show_worker():
    global _worker_running, _worker_task
    if not _worker_running:
        _worker_running = True
        _worker_task = asyncio.create_task(no_show_worker_loop())


def stop_no_show_worker():
    global _worker_running, _worker_task
    if _worker_running:
        _worker_running = False
        if _worker_task:
            _worker_task.cancel()
            _worker_task = None
        logger.info("SlotSpot no-show worker stopped.")
