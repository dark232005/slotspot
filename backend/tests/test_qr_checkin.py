from datetime import datetime, timedelta
from tests.conftest import auth_header


def test_qr_checkin_success_with_token(client, seed_test_data):
    student = seed_test_data["users"]["c1_student"]
    manager = seed_test_data["users"]["c1_manager"]
    room = seed_test_data["resources"]["c1_room"]

    # Booking starting right now (within valid check-in window)
    now = datetime.utcnow()
    start_time = now + timedelta(minutes=5)
    end_time = start_time + timedelta(minutes=60)

    book_res = client.post("/api/v1/bookings", json={
        "resource_id": room.id,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    }, headers=auth_header(student))
    assert book_res.status_code == 201
    qr_token = book_res.json()["qr_token"]
    booking_id = book_res.json()["id"]

    # Manager scans QR code
    checkin_res = client.post("/api/v1/checkin", json={
        "qr_token": qr_token
    }, headers=auth_header(manager))

    assert checkin_res.status_code == 200
    data = checkin_res.json()
    assert data["success"] is True
    assert data["booking"]["status"] == "CHECKED_IN"
    assert data["booking"]["check_in_time"] is not None


def test_qr_checkin_with_manual_lookup_code(client, seed_test_data):
    student = seed_test_data["users"]["c1_student"]
    manager = seed_test_data["users"]["c1_manager"]
    room = seed_test_data["resources"]["c1_room"]

    now = datetime.utcnow()
    start_time = now + timedelta(minutes=2)
    end_time = start_time + timedelta(minutes=60)

    book_res = client.post("/api/v1/bookings", json={
        "resource_id": room.id,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    }, headers=auth_header(student))
    lookup_code = book_res.json()["qr_lookup_code"]

    # Manager inputs lookup code manually
    checkin_res = client.post("/api/v1/checkin", json={
        "lookup_code": lookup_code
    }, headers=auth_header(manager))

    assert checkin_res.status_code == 200
    assert checkin_res.json()["booking"]["status"] == "CHECKED_IN"


def test_student_cannot_perform_staff_checkin(client, seed_test_data):
    student1 = seed_test_data["users"]["c1_student"]
    student2 = seed_test_data["users"]["c1_student2"]
    room = seed_test_data["resources"]["c1_room"]

    now = datetime.utcnow()
    book_res = client.post("/api/v1/bookings", json={
        "resource_id": room.id,
        "start_time": (now + timedelta(minutes=5)).isoformat(),
        "end_time": (now + timedelta(minutes=65)).isoformat()
    }, headers=auth_header(student1))

    # Another student tries to perform check-in
    checkin_res = client.post("/api/v1/checkin", json={
        "qr_token": book_res.json()["qr_token"]
    }, headers=auth_header(student2))

    assert checkin_res.status_code == 403


def test_repeated_checkin_rejected(client, seed_test_data):
    student = seed_test_data["users"]["c1_student"]
    manager = seed_test_data["users"]["c1_manager"]
    room = seed_test_data["resources"]["c1_room"]

    now = datetime.utcnow()
    book_res = client.post("/api/v1/bookings", json={
        "resource_id": room.id,
        "start_time": (now + timedelta(minutes=5)).isoformat(),
        "end_time": (now + timedelta(minutes=65)).isoformat()
    }, headers=auth_header(student))
    token = book_res.json()["qr_token"]

    # First check-in
    res1 = client.post("/api/v1/checkin", json={"qr_token": token}, headers=auth_header(manager))
    assert res1.status_code == 200

    # Second check-in (repeated scan)
    res2 = client.post("/api/v1/checkin", json={"qr_token": token}, headers=auth_header(manager))
    assert res2.status_code == 400
    assert "already checked in" in res2.json()["detail"].lower()


def test_equipment_issue_and_return_workflow(client, seed_test_data):
    student = seed_test_data["users"]["c1_student"]
    admin = seed_test_data["users"]["c1_admin"]
    equip = seed_test_data["resources"]["c1_equip"]

    now = datetime.utcnow()
    book_res = client.post("/api/v1/bookings", json={
        "resource_id": equip.id,
        "start_time": (now + timedelta(minutes=5)).isoformat(),
        "end_time": (now + timedelta(minutes=65)).isoformat()
    }, headers=auth_header(student))
    booking_id = book_res.json()["id"]

    # 1. Issue equipment
    issue_res = client.post(f"/api/v1/checkin/equipment/{booking_id}", json={
        "action": "ISSUE",
        "notes": "Lens cap and charger included."
    }, headers=auth_header(admin))
    assert issue_res.status_code == 200
    assert issue_res.json()["status"] == "CHECKED_IN"
    assert issue_res.json()["equipment_issued_at"] is not None

    # 2. Return equipment
    return_res = client.post(f"/api/v1/checkin/equipment/{booking_id}", json={
        "action": "RETURN",
        "notes": "Returned in perfect working condition."
    }, headers=auth_header(admin))
    assert return_res.status_code == 200
    assert return_res.json()["status"] == "COMPLETED"
    assert return_res.json()["equipment_returned_at"] is not None
