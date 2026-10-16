from tests.conftest import auth_header


def test_login_success(client, seed_test_data):
    response = client.post("/api/v1/auth/login", json={
        "email": "student1@test.edu",
        "password": "testpassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "student1@test.edu"
    assert data["user"]["role"] == "STUDENT"


def test_login_invalid_password(client, seed_test_data):
    response = client.post("/api/v1/auth/login", json={
        "email": "student1@test.edu",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_unknown_user(client, seed_test_data):
    response = client.post("/api/v1/auth/login", json={
        "email": "nonexistent@test.edu",
        "password": "testpassword"
    })
    assert response.status_code == 401


def test_get_current_user_profile(client, seed_test_data):
    student = seed_test_data["users"]["c1_student"]
    response = client.get("/api/v1/auth/me", headers=auth_header(student))
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "student1@test.edu"
    assert data["college_id"] == student.college_id


def test_student_forbidden_from_admin_endpoint(client, seed_test_data):
    student = seed_test_data["users"]["c1_student"]
    # Attempt to list college users (admin-only)
    response = client.get("/api/v1/users", headers=auth_header(student))
    assert response.status_code == 403
    assert "Access forbidden" in response.json()["detail"]


def test_admin_can_access_admin_endpoint(client, seed_test_data):
    admin = seed_test_data["users"]["c1_admin"]
    response = client.get("/api/v1/users", headers=auth_header(admin))
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 4
