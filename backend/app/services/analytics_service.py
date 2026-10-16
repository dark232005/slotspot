import csv
import io
from datetime import datetime, date, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.models.resource import Resource, ResourceStatus
from app.models.booking import Booking, BookingStatus
from app.models.college import CollegeSettings
from app.schemas.analytics import (
    AnalyticsOverview,
    DailyUtilization,
    ResourcePopularity,
    PeakPeriod,
    AnalyticsReport
)


def get_college_analytics(
    db: Session,
    college_id: str,
    days: int = 14
) -> AnalyticsReport:
    """
    Computes precise college analytics from database records.
    Utilization Rule:
      Eligible operating minutes = active_resources_count * (operating_hours_per_day * 60)
      Reserved minutes = Sum of booked durations for (CONFIRMED, CHECKED_IN, COMPLETED)
      Daily utilization % = (reserved_minutes / max(eligible_operating_minutes, 1)) * 100
    """
    now_utc = datetime.utcnow()
    today_start = datetime(now_utc.year, now_utc.month, now_utc.day, 0, 0, 0)
    today_end = datetime(now_utc.year, now_utc.month, now_utc.day, 23, 59, 59)
    window_start = today_start - timedelta(days=days - 1)

    # 1. Resource counts
    total_resources = db.query(Resource).filter(Resource.college_id == college_id).count()
    active_resources = db.query(Resource).filter(
        Resource.college_id == college_id,
        Resource.status == ResourceStatus.ACTIVE.value
    ).count()

    # 2. Bookings overview
    all_bookings_query = db.query(Booking).filter(Booking.college_id == college_id)
    total_booking_count = all_bookings_query.count()

    today_bookings = all_bookings_query.filter(
        Booking.start_time >= today_start,
        Booking.start_time <= today_end
    ).count()

    upcoming_bookings = all_bookings_query.filter(
        Booking.start_time > now_utc,
        Booking.status == BookingStatus.CONFIRMED.value
    ).count()

    completed_bookings = all_bookings_query.filter(
        Booking.status == BookingStatus.COMPLETED.value
    ).count()

    cancelled_bookings = all_bookings_query.filter(
        Booking.status == BookingStatus.CANCELLED.value
    ).count()

    no_show_bookings = all_bookings_query.filter(
        Booking.status == BookingStatus.NO_SHOW.value
    ).count()

    # Rate calculations
    cancellation_rate = round((cancelled_bookings / total_booking_count * 100), 1) if total_booking_count > 0 else 0.0
    
    # No-show denominator: bookings that had a chance to show up (completed + checked_in + no_show)
    past_due_candidates = completed_bookings + no_show_bookings + all_bookings_query.filter(Booking.status == BookingStatus.CHECKED_IN.value).count()
    no_show_rate = round((no_show_bookings / past_due_candidates * 100), 1) if past_due_candidates > 0 else 0.0

    # Average booking duration in minutes
    all_valid_bookings = all_bookings_query.filter(
        Booking.status.in_([BookingStatus.CONFIRMED.value, BookingStatus.CHECKED_IN.value, BookingStatus.COMPLETED.value])
    ).all()
    
    total_duration_minutes = sum((b.end_time - b.start_time).total_seconds() / 60 for b in all_valid_bookings)
    avg_duration = round(total_duration_minutes / max(len(all_valid_bookings), 1), 1) if all_valid_bookings else 0.0

    overview = AnalyticsOverview(
        total_resources=total_resources,
        active_resources=active_resources,
        today_bookings=today_bookings,
        upcoming_bookings=upcoming_bookings,
        completed_bookings=completed_bookings,
        cancellation_rate_percentage=cancellation_rate,
        no_show_rate_percentage=no_show_rate,
        average_booking_duration_minutes=avg_duration,
        total_booking_count=total_booking_count
    )

    # 3. Daily Utilization calculation for date range
    settings = db.query(CollegeSettings).filter(CollegeSettings.college_id == college_id).first()
    operating_hours_per_day = 12.0  # Default 08:00 to 20:00 (12 hours)
    if settings:
        try:
            sh, sm = [int(p) for p in settings.operating_start_time.split(":")]
            eh, em = [int(p) for p in settings.operating_end_time.split(":")]
            operating_hours_per_day = (eh * 60 + em - (sh * 60 + sm)) / 60.0
        except Exception:
            pass

    daily_available_minutes = int(active_resources * operating_hours_per_day * 60)

    daily_utilization = []
    for day_offset in range(days):
        current_day_start = window_start + timedelta(days=day_offset)
        current_day_end = current_day_start + timedelta(hours=23, minutes=59, seconds=59)
        day_date_str = current_day_start.strftime("%Y-%m-%d")

        day_bookings = all_bookings_query.filter(
            Booking.start_time >= current_day_start,
            Booking.start_time <= current_day_end,
            Booking.status.in_([
                BookingStatus.CONFIRMED.value,
                BookingStatus.CHECKED_IN.value,
                BookingStatus.COMPLETED.value
            ])
        ).all()

        reserved_minutes = int(sum((b.end_time - b.start_time).total_seconds() / 60 for b in day_bookings))
        util_pct = round((reserved_minutes / max(daily_available_minutes, 1)) * 100, 1)

        daily_utilization.append(DailyUtilization(
            date_str=day_date_str,
            available_operating_minutes=daily_available_minutes,
            reserved_minutes=reserved_minutes,
            utilization_percentage=min(util_pct, 100.0)
        ))

    # 4. Most popular resources
    resources = db.query(Resource).filter(Resource.college_id == college_id).all()
    top_resources = []
    for res in resources:
        res_bookings = [b for b in all_valid_bookings if b.resource_id == res.id]
        booking_count = len(res_bookings)
        res_minutes = int(sum((b.end_time - b.start_time).total_seconds() / 60 for b in res_bookings))
        top_resources.append(ResourcePopularity(
            resource_id=res.id,
            resource_name=res.name,
            resource_type=res.type,
            booking_count=booking_count,
            total_reserved_minutes=res_minutes
        ))

    top_resources.sort(key=lambda x: x.booking_count, reverse=True)
    top_resources = top_resources[:8]

    # 5. Peak booking periods (00:00 - 23:00)
    hour_counts = {h: 0 for h in range(8, 21)}  # Standard operating hours 8 AM to 8 PM
    for b in all_valid_bookings:
        hour = b.start_time.hour
        if hour in hour_counts:
            hour_counts[hour] += 1

    peak_periods = [
        PeakPeriod(
            hour=h,
            hour_label=f"{h:02d}:00",
            booking_count=count
        )
        for h, count in sorted(hour_counts.items())
    ]

    return AnalyticsReport(
        overview=overview,
        daily_utilization=daily_utilization,
        top_resources=top_resources,
        peak_periods=peak_periods
    )


def generate_bookings_csv(db: Session, college_id: str) -> str:
    """Generates a CSV string of all bookings for college admin export."""
    bookings = db.query(Booking).filter(Booking.college_id == college_id).order_by(Booking.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Booking ID",
        "Lookup Code",
        "Resource Name",
        "Resource Type",
        "Student Name",
        "Student Email",
        "Start Time (UTC)",
        "End Time (UTC)",
        "Status",
        "Check-In Time (UTC)",
        "Cancellation Reason",
        "Created At (UTC)"
    ])

    for b in bookings:
        writer.writerow([
            b.id,
            b.qr_lookup_code,
            b.resource.name if b.resource else "N/A",
            b.resource.type if b.resource else "N/A",
            b.student.full_name if b.student else "N/A",
            b.student.email if b.student else "N/A",
            b.start_time.strftime("%Y-%m-%d %H:%M:%S") if b.start_time else "",
            b.end_time.strftime("%Y-%m-%d %H:%M:%S") if b.end_time else "",
            b.status,
            b.check_in_time.strftime("%Y-%m-%d %H:%M:%S") if b.check_in_time else "",
            b.cancellation_reason or "",
            b.created_at.strftime("%Y-%m-%d %H:%M:%S") if b.created_at else ""
        ])

    return output.getvalue()
