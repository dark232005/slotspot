from datetime import datetime, timedelta
from app.models.booking import Booking, BookingStatus
from app.core.security import generate_secure_qr_token, hash_qr_token, generate_lookup_code
from app.services.no_show_worker import release_expired_no_shows


def test_no_show_worker_releases_eligible_booking(db, seed_test_data):
    student = seed_test_data["users"]["c1_student"]
    room = seed_test_data["resources"]["c1_room"]

    # Create a CONFIRMED booking whose start_time + 10m grace period is already in the past
    now = datetime.utcnow()
    past_start = now - timedelta(minutes=25)
    past_end = now + timedelta(minutes=35)

    booking = Booking(
        college_id=student.college_id,
        resource_id=room.id,
        student_id=student.id,
        start_time=past_start,
        end_time=past_end,
        status=BookingStatus.CONFIRMED.value,
        qr_token_hash=hash_qr_token(generate_secure_qr_token()),
        qr_lookup_code=generate_lookup_code()
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    assert booking.status == BookingStatus.CONFIRMED.value

    # Run release worker with 10 minute grace period
    released = release_expired_no_shows(db, force_grace_minutes=10)

    db.refresh(booking)
    assert booking.status == BookingStatus.NO_SHOW.value
    assert booking.no_show_time is not None
    assert any(b.id == booking.id for b in released)


def test_no_show_worker_preserves_checked_in_and_cancelled_bookings(db, seed_test_data):
    student = seed_test_data["users"]["c1_student"]
    room = seed_test_data["resources"]["c1_room"]

    now = datetime.utcnow()
    past_start = now - timedelta(minutes=30)
    past_end = now + timedelta(minutes=30)

    # 1. Checked-in booking in the past
    b_checked_in = Booking(
        college_id=student.college_id,
        resource_id=room.id,
        student_id=student.id,
        start_time=past_start,
        end_time=past_end,
        status=BookingStatus.CHECKED_IN.value,
        check_in_time=past_start + timedelta(minutes=2),
        qr_token_hash=hash_qr_token(generate_secure_qr_token()),
        qr_lookup_code=generate_lookup_code()
    )

    # 2. Cancelled booking in the past
    b_cancelled = Booking(
        college_id=student.college_id,
        resource_id=room.id,
        student_id=student.id,
        start_time=past_start,
        end_time=past_end,
        status=BookingStatus.CANCELLED.value,
        cancellation_time=past_start - timedelta(hours=1),
        cancellation_reason="Cancelled by user",
        qr_token_hash=hash_qr_token(generate_secure_qr_token()),
        qr_lookup_code=generate_lookup_code()
    )

    # 3. Active future booking
    b_future = Booking(
        college_id=student.college_id,
        resource_id=room.id,
        student_id=student.id,
        start_time=now + timedelta(hours=2),
        end_time=now + timedelta(hours=3),
        status=BookingStatus.CONFIRMED.value,
        qr_token_hash=hash_qr_token(generate_secure_qr_token()),
        qr_lookup_code=generate_lookup_code()
    )

    db.add_all([b_checked_in, b_cancelled, b_future])
    db.commit()

    # Run worker
    released = release_expired_no_shows(db, force_grace_minutes=10)

    db.refresh(b_checked_in)
    db.refresh(b_cancelled)
    db.refresh(b_future)

    # All three must remain untouched
    assert b_checked_in.status == BookingStatus.CHECKED_IN.value
    assert b_cancelled.status == BookingStatus.CANCELLED.value
    assert b_future.status == BookingStatus.CONFIRMED.value


def test_repeated_worker_execution_is_idempotent(db, seed_test_data):
    # Running worker twice consecutively produces no errors and handles already-released bookings safely
    release1 = release_expired_no_shows(db, force_grace_minutes=10)
    release2 = release_expired_no_shows(db, force_grace_minutes=10)

    assert isinstance(release1, list)
    assert isinstance(release2, list)
    # The second execution finds 0 remaining candidates
    assert len(release2) == 0
