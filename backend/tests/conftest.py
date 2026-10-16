import os
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.college import College, CollegeSettings
from app.models.user import User, UserRole
from app.models.resource import Resource, ResourceManagerAssignment, ResourceType, ResourceStatus
from app.models.booking import Booking, BookingStatus
from app.core.security import get_password_hash, create_access_token

TEST_DB_FILE = "test_slotspot.db"
TEST_DATABASE_URL = f"sqlite:///./{TEST_DB_FILE}"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


from unittest.mock import patch

@pytest.fixture(scope="session", autouse=True)
def disable_background_worker():
    with patch("app.main.start_no_show_worker"), patch("app.main.stop_no_show_worker"):
        yield


@pytest.fixture(scope="function")
def db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def seed_test_data(db):
    # Two colleges
    college1 = College(name="College One", slug="col-one", timezone="UTC")
    college2 = College(name="College Two", slug="col-two", timezone="UTC")
    db.add_all([college1, college2])
    db.flush()

    s1 = CollegeSettings(college_id=college1.id, no_show_grace_minutes=10)
    s2 = CollegeSettings(college_id=college2.id, no_show_grace_minutes=10)
    db.add_all([s1, s2])
    db.flush()

    pwd = get_password_hash("testpassword")

    # College 1 Users
    c1_admin = User(college_id=college1.id, email="admin1@test.edu", hashed_password=pwd, full_name="Admin One", role=UserRole.COLLEGE_ADMIN.value)
    c1_manager = User(college_id=college1.id, email="mgr1@test.edu", hashed_password=pwd, full_name="Mgr One", role=UserRole.RESOURCE_MANAGER.value)
    c1_student = User(college_id=college1.id, email="student1@test.edu", hashed_password=pwd, full_name="Student One", role=UserRole.STUDENT.value)
    c1_student2 = User(college_id=college1.id, email="student2@test.edu", hashed_password=pwd, full_name="Student Two", role=UserRole.STUDENT.value)

    # College 2 Users
    c2_admin = User(college_id=college2.id, email="admin2@test.edu", hashed_password=pwd, full_name="Admin Two", role=UserRole.COLLEGE_ADMIN.value)
    c2_student = User(college_id=college2.id, email="student_c2@test.edu", hashed_password=pwd, full_name="Student C2", role=UserRole.STUDENT.value)

    db.add_all([c1_admin, c1_manager, c1_student, c1_student2, c2_admin, c2_student])
    db.flush()

    # College 1 Resources
    res_c1_room = Resource(
        college_id=college1.id,
        name="Study Room 101",
        type=ResourceType.DISCUSSION_ROOM.value,
        description="Test Room",
        location="Floor 1",
        capacity=4,
        operating_start_time="00:00",
        operating_end_time="23:59",
        max_booking_duration_minutes=120,
        slot_granularity_minutes=30,
        status=ResourceStatus.ACTIVE.value
    )
    res_c1_equip = Resource(
        college_id=college1.id,
        name="DSLR Camera A",
        type=ResourceType.EQUIPMENT.value,
        description="Canon 80D",
        location="Media Lab",
        capacity=1,
        operating_start_time="00:00",
        operating_end_time="23:59",
        max_booking_duration_minutes=180,
        slot_granularity_minutes=60,
        status=ResourceStatus.ACTIVE.value
    )

    # College 2 Resource
    res_c2_room = Resource(
        college_id=college2.id,
        name="Metro Lab A",
        type=ResourceType.PROJECT_ROOM.value,
        description="C2 Lab",
        location="Metro Hall",
        capacity=10,
        operating_start_time="00:00",
        operating_end_time="23:59",
        max_booking_duration_minutes=180,
        slot_granularity_minutes=60,
        status=ResourceStatus.ACTIVE.value
    )
    db.add_all([res_c1_room, res_c1_equip, res_c2_room])
    db.flush()

    # Manager assignment
    assign = ResourceManagerAssignment(
        college_id=college1.id,
        user_id=c1_manager.id,
        resource_id=res_c1_room.id
    )
    db.add(assign)
    db.commit()

    return {
        "colleges": (college1, college2),
        "users": {
            "c1_admin": c1_admin,
            "c1_manager": c1_manager,
            "c1_student": c1_student,
            "c1_student2": c1_student2,
            "c2_admin": c2_admin,
            "c2_student": c2_student
        },
        "resources": {
            "c1_room": res_c1_room,
            "c1_equip": res_c1_equip,
            "c2_room": res_c2_room
        }
    }


def auth_header(user: User) -> dict:
    token = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}"}
