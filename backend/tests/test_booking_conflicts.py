from datetime import datetime, timedelta
from tests.conftest import auth_header


def test_valid_booking_succeeds(client, seed_test_data):
    student = seed_test_data["users"]["c1_student"]
    room = seed_test_data["resources"]["c1_room"]

    tomorrow = datetime.utcnow() + timedelta(days=1)
    start_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(minutes=60)

    res = client.post("/api/v1/bookings", json={
        "resource_id": room.id,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "notes": "Valid test booking"
    }, headers=auth_header(student))

    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "CONFIRMED"
    assert data["resource_id"] == room.id
    assert "qr_token" in data
    assert "qr_code_image_base64" in data
    assert data["qr_code_image_base64"].startswith("data:image/png;base64,")


def test_overlapping_booking_rejected_with_409(client, seed_test_data):
    student1 = seed_test_data["users"]["c1_student"]
    student2 = seed_test_data["users"]["c1_student2"]
    room = seed_test_data["resources"]["c1_room"]

    target_day = datetime.utcnow() + timedelta(days=2)
    start_time = target_day.replace(hour=14, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(minutes=60)

    # 1. First student reserves 14:00 - 15:00
    res1 = client.post("/api/v1/bookings", json={
        "resource_id": room.id,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    }, headers=auth_header(student1))
    assert res1.status_code == 201

    # 2. Second student attempts exact same time (14:00 - 15:00)
    res2 = client.post("/api/v1/bookings", json={
        "resource_id": room.id,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    }, headers=auth_header(student2))
    assert res2.status_code == 409
    assert "Double-booking conflict" in res2.json()["detail"]

    # 3. Second student attempts partial overlap (14:30 - 15:30)
    res3 = client.post("/api/v1/bookings", json={
        "resource_id": room.id,
        "start_time": (start_time + timedelta(minutes=30)).isoformat(),
        "end_time": (end_time + timedelta(minutes=30)).isoformat()
    }, headers=auth_header(student2))
    assert res3.status_code == 409


def test_cancelled_booking_releases_slot(client, seed_test_data):
    student1 = seed_test_data["users"]["c1_student"]
    student2 = seed_test_data["users"]["c1_student2"]
    room = seed_test_data["resources"]["c1_room"]

    target_day = datetime.utcnow() + timedelta(days=3)
    start_time = target_day.replace(hour=11, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(minutes=60)

    # 1. Student 1 books 11:00 - 12:00
    res1 = client.post("/api/v1/bookings", json={
        "resource_id": room.id,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    }, headers=auth_header(student1))
    assert res1.status_code == 201
    booking_id = res1.json()["id"]

    # 2. Student 1 cancels the booking
    cancel_res = client.post(f"/api/v1/bookings/{booking_id}/cancel", json={
        "reason": "Change of plans"
    }, headers=auth_header(student1))
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # 3. Student 2 can now successfully book the released slot!
    res2 = client.post("/api/v1/bookings", json={
        "resource_id": room.id,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    }, headers=auth_header(student2))
    assert res2.status_code == 201
    assert res2.json()["status"] == "CONFIRMED"


def test_duration_exceeding_limit_rejected(client, seed_test_data):
    student = seed_test_data["users"]["c1_student"]
    room = seed_test_data["resources"]["c1_room"]  # Max duration 120 min

    target_day = datetime.utcnow() + timedelta(days=1)
    start_time = target_day.replace(hour=10, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(minutes=180)  # 3 hours > 120 min

    res = client.post("/api/v1/bookings", json={
        "resource_id": room.id,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    }, headers=auth_header(student))
    assert res.status_code == 400
    assert "Duration exceeds maximum allowed limit" in res.json()["detail"]


def test_maintenance_block_prevents_booking(client, seed_test_data):
    admin = seed_test_data["users"]["c1_admin"]
    student = seed_test_data["users"]["c1_student"]
    room = seed_test_data["resources"]["c1_room"]

    target_day = datetime.utcnow() + timedelta(days=4)
    start_time = target_day.replace(hour=12, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(hours=2)

    # 1. Admin creates maintenance block
    maint_res = client.post("/api/v1/maintenance", json={
        "resource_id": room.id,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "reason": "Air conditioner servicing"
    }, headers=auth_header(admin))
    assert maint_res.status_code == 201

    # 2. Student attempts to book during maintenance block
    book_res = client.post("/api/v1/bookings", json={
        "resource_id": room.id,
        "start_time": start_time.isoformat(),
        "end_time": (start_time + timedelta(minutes=60)).isoformat()
    }, headers=auth_header(student))
    assert book_res.status_code == 409
    assert "maintenance" in book_res.json()["detail"].lower()
