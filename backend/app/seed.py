import sys
import os
from datetime import datetime, timedelta

# Ensure backend root is on sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, init_db
from app.models.college import College, CollegeSettings
from app.models.user import User, UserRole
from app.models.resource import Resource, ResourceManagerAssignment, ResourceType, ResourceStatus
from app.models.booking import Booking, BookingStatus
from app.models.maintenance import ResourceMaintenanceBlock
from app.models.notification import Notification
from app.core.security import get_password_hash, generate_secure_qr_token, hash_qr_token, generate_lookup_code
from app.services.audit_service import log_audit_event


def seed_database():
    print("Initializing database tables...")
    init_db()
    db = SessionLocal()

    try:
        print("Checking existing seed data...")
        apex_college = db.query(College).filter(College.slug == "apex-tech").first()
        if apex_college:
            print("Database already contains seed data. Skipping re-seed.")
            return

        print("Seeding Colleges...")
        # 1. Colleges
        apex_college = College(
            name="Apex Institute of Technology",
            slug="apex-tech",
            timezone="Asia/Kolkata"
        )
        metro_college = College(
            name="Metro University of Engineering",
            slug="metro-eng",
            timezone="Asia/Kolkata"
        )
        db.add_all([apex_college, metro_college])
        db.flush()

        # College Settings
        apex_settings = CollegeSettings(
            college_id=apex_college.id,
            no_show_grace_minutes=10,
            operating_start_time="08:00",
            operating_end_time="21:00",
            max_booking_duration_minutes=240,
            max_advance_booking_days=7
        )
        metro_settings = CollegeSettings(
            college_id=metro_college.id,
            no_show_grace_minutes=15,
            operating_start_time="09:00",
            operating_end_time="19:00",
            max_booking_duration_minutes=180,
            max_advance_booking_days=5
        )
        db.add_all([apex_settings, metro_settings])
        db.flush()

        print("Seeding Users...")
        default_pwd = get_password_hash("password123")

        # Apex College Users
        apex_admin = User(
            college_id=apex_college.id,
            email="admin@apex.edu",
            hashed_password=default_pwd,
            full_name="Dr. Vikram Rao (Admin)",
            role=UserRole.COLLEGE_ADMIN.value,
            is_active=True
        )
        apex_manager = User(
            college_id=apex_college.id,
            email="manager@apex.edu",
            hashed_password=default_pwd,
            full_name="Prof. Sunita Mehta (Room Manager)",
            role=UserRole.RESOURCE_MANAGER.value,
            is_active=True
        )
        apex_equip_manager = User(
            college_id=apex_college.id,
            email="equipment@apex.edu",
            hashed_password=default_pwd,
            full_name="Karan Verma (Lab Technician)",
            role=UserRole.RESOURCE_MANAGER.value,
            is_active=True
        )
        apex_student1 = User(
            college_id=apex_college.id,
            email="student@apex.edu",
            hashed_password=default_pwd,
            full_name="Aarav Sharma (Student)",
            role=UserRole.STUDENT.value,
            is_active=True
        )
        apex_student2 = User(
            college_id=apex_college.id,
            email="student2@apex.edu",
            hashed_password=default_pwd,
            full_name="Diya Patel (Student)",
            role=UserRole.STUDENT.value,
            is_active=True
        )

        # Metro College Users (for tenant isolation testing)
        metro_admin = User(
            college_id=metro_college.id,
            email="admin@metro.edu",
            hashed_password=default_pwd,
            full_name="Dean H. Walker (Metro Admin)",
            role=UserRole.COLLEGE_ADMIN.value,
            is_active=True
        )
        metro_student = User(
            college_id=metro_college.id,
            email="student@metro.edu",
            hashed_password=default_pwd,
            full_name="Rohan Verma (Metro Student)",
            role=UserRole.STUDENT.value,
            is_active=True
        )

        db.add_all([apex_admin, apex_manager, apex_equip_manager, apex_student1, apex_student2, metro_admin, metro_student])
        db.flush()

        print("Seeding Resources...")
        # Apex Resources
        room_alpha = Resource(
            college_id=apex_college.id,
            name="Discussion Room Alpha",
            type=ResourceType.DISCUSSION_ROOM.value,
            description="Equipped with 65-inch 4K smart display, whiteboard, high-speed Wi-Fi, and 8 conference chairs.",
            location="Turing Block, 3rd Floor, Room 301",
            capacity=8,
            operating_start_time="08:00",
            operating_end_time="20:00",
            max_booking_duration_minutes=180,
            slot_granularity_minutes=30,
            status=ResourceStatus.ACTIVE.value
        )
        room_beta = Resource(
            college_id=apex_college.id,
            name="Discussion Room Beta",
            type=ResourceType.DISCUSSION_ROOM.value,
            description="Compact meeting room ideal for group study and interview preparation. Acoustic paneling and display.",
            location="Turing Block, 3rd Floor, Room 302",
            capacity=6,
            operating_start_time="08:00",
            operating_end_time="20:00",
            max_booking_duration_minutes=120,
            slot_granularity_minutes=30,
            status=ResourceStatus.ACTIVE.value
        )
        project_suite = Resource(
            college_id=apex_college.id,
            name="Innovation Lab - Project Suite 1",
            type=ResourceType.PROJECT_ROOM.value,
            description="Dedicated workspace for capstone teams with modular tables, dual monitors, soldering station, and prototyping tools.",
            location="Shannon Building, Ground Floor, Room G12",
            capacity=12,
            operating_start_time="09:00",
            operating_end_time="21:00",
            max_booking_duration_minutes=240,
            slot_granularity_minutes=60,
            status=ResourceStatus.ACTIVE.value
        )
        projector_res = Resource(
            college_id=apex_college.id,
            name="Epson 4K Ultra-Bright Projector",
            type=ResourceType.EQUIPMENT.value,
            description="4000 lumens portable projector with HDMI, USB-C, and wireless projection dongle. Includes padded travel case.",
            location="AV Resource Desk, Library Level 1",
            capacity=1,
            operating_start_time="09:00",
            operating_end_time="17:00",
            max_booking_duration_minutes=180,
            slot_granularity_minutes=60,
            status=ResourceStatus.ACTIVE.value
        )
        camera_res = Resource(
            college_id=apex_college.id,
            name="Sony Cinema Line FX30 Camera Kit",
            type=ResourceType.EQUIPMENT.value,
            description="Super 35 cinema camera with 18-50mm f/2.8 lens, 2x 128GB V90 cards, 3 batteries, charger, and Manfrotto tripod.",
            location="Media Lab Central, Media Center 204",
            capacity=1,
            operating_start_time="09:00",
            operating_end_time="17:00",
            max_booking_duration_minutes=240,
            slot_granularity_minutes=60,
            status=ResourceStatus.ACTIVE.value
        )
        laptop_res = Resource(
            college_id=apex_college.id,
            name="Dell XPS 15 High-Performance Dev Laptop",
            type=ResourceType.EQUIPMENT.value,
            description="Intel i7, 32GB RAM, RTX 4060 GPU, preloaded with Docker, VS Code, CUDA, and Linux dual-boot.",
            location="IT Helpdesk, Turing Block Ground Floor",
            capacity=1,
            operating_start_time="08:00",
            operating_end_time="19:00",
            max_booking_duration_minutes=360,
            slot_granularity_minutes=60,
            status=ResourceStatus.ACTIVE.value
        )

        # Metro College Resource (for isolation check)
        metro_room = Resource(
            college_id=metro_college.id,
            name="Metro Engineering Conference Room",
            type=ResourceType.PROJECT_ROOM.value,
            description="Private conference room exclusively for Metro University students.",
            location="Main Campus Hall B",
            capacity=15,
            operating_start_time="09:00",
            operating_end_time="18:00",
            max_booking_duration_minutes=180,
            slot_granularity_minutes=60,
            status=ResourceStatus.ACTIVE.value
        )

        db.add_all([room_alpha, room_beta, project_suite, projector_res, camera_res, laptop_res, metro_room])
        db.flush()

        print("Assigning Managers to Resources...")
        # Assign Room Manager to Discussion Rooms and Project Suite
        assign1 = ResourceManagerAssignment(college_id=apex_college.id, user_id=apex_manager.id, resource_id=room_alpha.id)
        assign2 = ResourceManagerAssignment(college_id=apex_college.id, user_id=apex_manager.id, resource_id=room_beta.id)
        assign3 = ResourceManagerAssignment(college_id=apex_college.id, user_id=apex_manager.id, resource_id=project_suite.id)

        # Assign Equipment Manager to Equipment
        assign4 = ResourceManagerAssignment(college_id=apex_college.id, user_id=apex_equip_manager.id, resource_id=projector_res.id)
        assign5 = ResourceManagerAssignment(college_id=apex_college.id, user_id=apex_equip_manager.id, resource_id=camera_res.id)
        assign6 = ResourceManagerAssignment(college_id=apex_college.id, user_id=apex_equip_manager.id, resource_id=laptop_res.id)

        db.add_all([assign1, assign2, assign3, assign4, assign5, assign6])
        db.flush()

        print("Seeding Bookings with Realistic Analytics History...")
        now = datetime.utcnow()
        today = datetime(now.year, now.month, now.day)

        # 1. Upcoming booking today for student1 (Ready for QR scan demo!)
        t1 = generate_secure_qr_token()
        b_upcoming = Booking(
            college_id=apex_college.id,
            resource_id=room_alpha.id,
            student_id=apex_student1.id,
            start_time=today.replace(hour=14, minute=0),
            end_time=today.replace(hour=16, minute=0),
            status=BookingStatus.CONFIRMED.value,
            qr_token_hash=hash_qr_token(t1),
            qr_lookup_code="SS-APEX01",
            notes="Cloud Computing project architecture group review with team members."
        )

        # 2. Equipment booking today for student1 (Ready for Issue/Return demo!)
        t2 = generate_secure_qr_token()
        b_equipment_active = Booking(
            college_id=apex_college.id,
            resource_id=projector_res.id,
            student_id=apex_student1.id,
            start_time=today.replace(hour=10, minute=0),
            end_time=today.replace(hour=12, minute=0),
            status=BookingStatus.CHECKED_IN.value,
            qr_token_hash=hash_qr_token(t2),
            qr_lookup_code="SS-PROJ01",
            check_in_time=today.replace(hour=9, minute=55),
            equipment_issued_at=today.replace(hour=9, minute=58),
            notes="Seminar presentation in Room 204."
        )

        # 3. Past Completed Bookings (for realistic metrics over last 7 days)
        past_bookings = []
        for i in range(1, 8):
            past_day = today - timedelta(days=i)
            # Completed discussion room
            past_bookings.append(Booking(
                college_id=apex_college.id,
                resource_id=room_alpha.id,
                student_id=apex_student1.id,
                start_time=past_day.replace(hour=10, minute=0),
                end_time=past_day.replace(hour=12, minute=0),
                status=BookingStatus.COMPLETED.value,
                qr_token_hash=hash_qr_token(generate_secure_qr_token()),
                qr_lookup_code=generate_lookup_code(),
                check_in_time=past_day.replace(hour=9, minute=58),
                notes=f"Team study session day -{i}"
            ))
            # Completed project suite
            past_bookings.append(Booking(
                college_id=apex_college.id,
                resource_id=project_suite.id,
                student_id=apex_student2.id,
                start_time=past_day.replace(hour=14, minute=0),
                end_time=past_day.replace(hour=17, minute=0),
                status=BookingStatus.COMPLETED.value,
                qr_token_hash=hash_qr_token(generate_secure_qr_token()),
                qr_lookup_code=generate_lookup_code(),
                check_in_time=past_day.replace(hour=14, minute=5),
                notes=f"Embedded systems lab work day -{i}"
            ))

        # 4. Past Cancelled booking
        b_cancelled = Booking(
            college_id=apex_college.id,
            resource_id=room_beta.id,
            student_id=apex_student2.id,
            start_time=(today - timedelta(days=2)).replace(hour=15, minute=0),
            end_time=(today - timedelta(days=2)).replace(hour=16, minute=30),
            status=BookingStatus.CANCELLED.value,
            qr_token_hash=hash_qr_token(generate_secure_qr_token()),
            qr_lookup_code=generate_lookup_code(),
            cancellation_time=(today - timedelta(days=2)).replace(hour=12, minute=0),
            cancellation_reason="Meeting rescheduled due to lecture conflict."
        )

        # 5. Past No-Show booking (released automatically)
        b_no_show = Booking(
            college_id=apex_college.id,
            resource_id=room_beta.id,
            student_id=apex_student2.id,
            start_time=(today - timedelta(days=1)).replace(hour=11, minute=0),
            end_time=(today - timedelta(days=1)).replace(hour=12, minute=0),
            status=BookingStatus.NO_SHOW.value,
            qr_token_hash=hash_qr_token(generate_secure_qr_token()),
            qr_lookup_code=generate_lookup_code(),
            no_show_time=(today - timedelta(days=1)).replace(hour=11, minute=10)
        )

        db.add_all([b_upcoming, b_equipment_active, b_cancelled, b_no_show] + past_bookings)
        db.flush()

        print("Seeding Initial Notifications...")
        n1 = Notification(
            college_id=apex_college.id,
            user_id=apex_student1.id,
            title="Reservation Confirmed",
            message="Your reservation for Discussion Room Alpha today at 14:00 is confirmed. Lookup Code: SS-APEX01.",
            type="CONFIRMATION",
            is_read=False
        )
        n2 = Notification(
            college_id=apex_college.id,
            user_id=apex_student1.id,
            title="Equipment Checked Out",
            message="Epson 4K Projector has been checked out and issued to you.",
            type="INFO",
            is_read=True
        )
        db.add_all([n1, n2])

        db.commit()
        print("Seed completed successfully! All demo users, resources, and bookings populated.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
