from datetime import datetime, timedelta
from tests.conftest import auth_header


def test_resource_listing_isolated_by_college(client, seed_test_data):
    student_c1 = seed_test_data["users"]["c1_student"]
    student_c2 = seed_test_data["users"]["c2_student"]

    # Student from College 1
    res1 = client.get("/api/v1/resources", headers=auth_header(student_c1))
    assert res1.status_code == 200
    names1 = [r["name"] for r in res1.json()]
    assert "Study Room 101" in names1
    assert "Metro Lab A" not in names1  # College 2 resource must NOT appear

    # Student from College 2
    res2 = client.get("/api/v1/resources", headers=auth_header(student_c2))
    assert res2.status_code == 200
    names2 = [r["name"] for r in res2.json()]
    assert "Metro Lab A" in names2
    assert "Study Room 101" not in names2  # College 1 resource must NOT appear


def test_cannot_access_or_book_other_college_resource(client, seed_test_data):
    student_c1 = seed_test_data["users"]["c1_student"]
    c2_room = seed_test_data["resources"]["c2_room"]

    # Attempt to view details of College 2 resource
    res = client.get(f"/api/v1/resources/{c2_room.id}", headers=auth_header(student_c1))
    assert res.status_code == 404

    # Attempt to book resource belonging to College 2
    tomorrow = datetime.utcnow() + timedelta(days=1)
    start_dt = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
    end_dt = start_dt + timedelta(minutes=60)

    book_res = client.post("/api/v1/bookings", json={
        "resource_id": c2_room.id,
        "start_time": start_dt.isoformat(),
        "end_time": end_dt.isoformat()
    }, headers=auth_header(student_c1))

    assert book_res.status_code == 404
    assert "Resource not found in your college workspace" in book_res.json()["detail"]


def test_manager_cannot_manage_unassigned_resource(client, seed_test_data):
    mgr_c1 = seed_test_data["users"]["c1_manager"]
    equip_c1 = seed_test_data["resources"]["c1_equip"]  # Assigned to no one or different manager

    # Manager attempts to create a maintenance block on an unassigned resource
    start_dt = datetime.utcnow() + timedelta(days=2)
    end_dt = start_dt + timedelta(hours=2)

    res = client.post("/api/v1/maintenance", json={
        "resource_id": equip_c1.id,
        "start_time": start_dt.isoformat(),
        "end_time": end_dt.isoformat(),
        "reason": "Unauthorized maintenance test"
    }, headers=auth_header(mgr_c1))

    assert res.status_code == 403
    assert "not assigned as a manager" in res.json()["detail"]
