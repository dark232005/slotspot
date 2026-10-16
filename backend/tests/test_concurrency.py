import concurrent.futures
from datetime import datetime, timedelta
from tests.conftest import auth_header, client


def test_concurrent_conflicting_bookings_at_most_one_succeeds(client, seed_test_data):
    """
    Simulates race condition: Two students submit booking requests for the exact same
    resource and overlapping time slot simultaneously.
    Verifies that concurrency control ensures exactly ONE succeeds and the other fails with HTTP 409 Conflict.
    """
    student1 = seed_test_data["users"]["c1_student"]
    student2 = seed_test_data["users"]["c1_student2"]
    room = seed_test_data["resources"]["c1_room"]

    target_day = datetime.utcnow() + timedelta(days=5)
    start_time = target_day.replace(hour=15, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(minutes=60)

    payload = {
        "resource_id": room.id,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "notes": "Concurrent race condition test"
    }

    results = []

    def make_booking_call(user):
        return client.post("/api/v1/bookings", json=payload, headers=auth_header(user))

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(make_booking_call, student1)
        f2 = executor.submit(make_booking_call, student2)
        results = [f1.result(), f2.result()]

    status_codes = [r.status_code for r in results]

    # Verification:
    # Exactly one must succeed (201 Created)
    # The other must be rejected (409 Conflict)
    success_count = status_codes.count(201)
    conflict_count = status_codes.count(409)

    assert success_count == 1, f"Expected exactly 1 successful booking, got {success_count}. Statuses: {status_codes}"
    assert conflict_count == 1, f"Expected exactly 1 conflict (409), got {conflict_count}. Statuses: {status_codes}"
