# SlotSpot — Zero-Cost Campus Resource Booking SaaS

> **B.Tech Computer Science and Engineering — Cloud Architecture Project**  
> An enterprise-grade, multi-tenant campus resource reservation platform designed to operate with **$0 external budget**, no paid APIs, and complete local portability.

---

## 1. System Architecture Overview

SlotSpot is architected following modern **Cloud-Native and SaaS design principles**:

- **Frontend Tier:** Single Page Application (SPA) built with React 19, TypeScript, Vite, and Tailwind CSS.
- **Backend API Tier:** Stateless RESTful service built with Python FastAPI, Pydantic v2 validation, and dependency-injected security.
- **Database Tier:** Relational storage using PostgreSQL (with Docker Compose or native installation), with automatic SQLite fallback for zero-install development.
- **Concurrency Control Engine:** Database-level transaction serialization and row-locking (`with_for_update`) to prevent double-booking race conditions.
- **Asynchronous Background Processing:** Lightweight in-process worker continuously evaluating configurable grace periods for automated no-show release.
- **Cryptographic QR Validation:** Unguessable cryptographically random tokens stored as SHA-256 digests, paired with browser camera optical scanning (`html5-qrcode`) and manual fallback.
- **Multi-Tenant Isolation:** Complete college-level data separation enforced at the API route and database query levels.

---

## 2. Architecture Diagrams

### A. System Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Client Tier (Web Browser)"]
        UI["React 19 + TypeScript SPA"]
        Scanner["Camera Optical QR Scanner<br/>(html5-qrcode)"]
        UI --- Scanner
    end

    subgraph API["Backend Tier (Python FastAPI)"]
        Auth["Auth & Security Engine<br/>(JWT + Passlib Argon2id/Bcrypt)"]
        TenantFilter["Tenant Context Enforcer<br/>(college_id derivation)"]
        BookingEngine["Booking Engine & Concurrency Guard<br/>(Row Locks + Conflict Checking)"]
        QRService["QR Token Generator<br/>(SHA-256 Hashed Tokens)"]
        NoShowWorker["No-Show Background Scheduler<br/>(Periodic Worker Loop)"]
        AnalyticsSvc["Analytics & Utilization Engine<br/>(Real DB Metrics & CSV Export)"]
    end

    subgraph Storage["Database Tier (PostgreSQL / SQLite)"]
        DB[(Relational DB)]
        T_Colleges["colleges & settings"]
        T_Users["users & roles"]
        T_Resources["resources & managers"]
        T_Bookings["bookings & timestamps"]
        T_Audit["audit_events & logs"]
        T_Notifs["in-app notifications"]

        DB --- T_Colleges
        DB --- T_Users
        DB --- T_Resources
        DB --- T_Bookings
        DB --- T_Audit
        DB --- T_Notifs
    end

    Client -- "HTTPS / JSON REST API" --> Auth
    Auth --> TenantFilter
    TenantFilter --> BookingEngine
    BookingEngine --> QRService
    BookingEngine -- "ACID Transaction & Row Locks" --> DB
    NoShowWorker -- "Periodic Scan (Grace Period Expiry)" --> DB
    AnalyticsSvc -- "Aggregations & Utilization %" --> DB
```

---

### B. Booking & Automatic No-Show Lifecycle

```mermaid
stateDiagram-v2
    [*] --> CONFIRMED : Student submits valid slot (Lock Acquired)
    CONFIRMED --> CHECKED_IN : Staff scans QR / Enters manual code<br/>[Within 15m prior to start until grace cutoff]
    CONFIRMED --> CANCELLED : Student / Admin cancels booking<br/>[Slot immediately released]
    CONFIRMED --> NO_SHOW : Grace period elapses with no check-in<br/>[Background Worker auto-releases slot]
    CHECKED_IN --> COMPLETED : Equipment returned or room time concludes
    NO_SHOW --> [*]
    CANCELLED --> [*]
    COMPLETED --> [*]
```

---

## 3. Zero-Cost Execution Model

In accordance with strict project guidelines:
- **No Paid APIs:** Zero third-party paid dependencies (no OpenAI, no Google Maps, no Twilio, no SendGrid).
- **No Paid Infrastructure:** Can run indefinitely on any standard local developer machine.
- **Local QR Engine:** QR codes are generated directly in Python using `qrcode` and returned as Base64 Data URLs (`data:image/png;base64,...`).
- **In-App Notifications:** Stored directly in the relational database and served in real time via polling.
- **Offline Capable:** Once `npm` and `pip` packages are installed, the entire system runs without an internet connection.

---

## 4. Pre-Configured Demo Accounts

SlotSpot comes seeded with realistic campus data across **two colleges** to demonstrate multi-tenant isolation. All passwords are set to `password123`.

### College A: Apex Institute of Technology
| Role | Name | Email | Password | Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | Aarav Sharma | `student@apex.edu` | `password123` | Browses resources, reserves slots, receives QR pass |
| **Student 2** | Diya Patel | `student2@apex.edu` | `password123` | Demonstrates double-booking and concurrent conflict |
| **Room Manager** | Prof. Sunita Mehta | `manager@apex.edu` | `password123` | Manages Discussion Rooms A/B & Project Suites, scans QR |
| **Equip Manager**| Karan Verma | `equipment@apex.edu` | `password123` | Issues & returns 4K Projector, FX30 Camera, Dell XPS Laptop |
| **College Admin** | Dr. Vikram Rao | `admin@apex.edu` | `password123` | Analytics dashboard, grace periods, users, CSV export |

### College B: Metro University of Engineering (Tenant Isolation)
| Role | Name | Email | Password | Verification Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Metro Student**| Rohan Verma | `student@metro.edu` | `password123` | Cannot view or book Apex Institute facilities |
| **Metro Admin**  | Dean H. Walker | `admin@metro.edu` | `password123` | Cannot view or modify Apex Institute policies or logs |

> **Pro Tip:** In the UI, click the **"Demo Persona"** dropdown in the top navigation bar to switch between any of these accounts in 1 click!

---

## 5. Local Setup & Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+ (Node 20+ recommended)
- (Optional) Docker & Docker Compose for PostgreSQL

### Step 1: Clone & Configure
```bash
# Clone the repository
git clone https://github.com/your-username/slotspot.git
cd slotspot
```

### Step 2: Start Backend
#### On Windows PowerShell:
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Run database migrations / seed demo data
python -m app.seed

# Start FastAPI backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### On Linux / macOS:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Seed demo data
python -m app.seed

# Start FastAPI backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API Docs will be live at `http://localhost:8000/docs`.*

---

### Step 3: Start Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Frontend web application will be live at `http://localhost:5173`.*

---

### Step 4 (Optional): Running with PostgreSQL via Docker
If you have Docker installed and want to run with full PostgreSQL:
```bash
# From root directory:
docker-compose up -d

# Set DATABASE_URL in backend/.env:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/slotspot
```

---

## 6. Automated Testing Suite

SlotSpot includes comprehensive tests covering authentication, tenant isolation, booking conflicts, concurrency race conditions, QR check-in, and no-show releases.

### Running Pytest
```bash
cd backend
.\venv\Scripts\pytest -v
```

### Actual Test Results (23/23 Passing):
```text
tests/test_auth.py::test_login_success PASSED                            [  4%]
tests/test_auth.py::test_login_invalid_password PASSED                   [  8%]
tests/test_auth.py::test_login_unknown_user PASSED                       [ 13%]
tests/test_auth.py::test_get_current_user_profile PASSED                 [ 17%]
tests/test_auth.py::test_student_forbidden_from_admin_endpoint PASSED    [ 21%]
tests/test_auth.py::test_admin_can_access_admin_endpoint PASSED          [ 26%]
tests/test_booking_conflicts.py::test_valid_booking_succeeds PASSED      [ 30%]
tests/test_booking_conflicts.py::test_overlapping_booking_rejected_with_409 PASSED [ 34%]
tests/test_booking_conflicts.py::test_cancelled_booking_releases_slot PASSED [ 39%]
tests/test_booking_conflicts.py::test_duration_exceeding_limit_rejected PASSED [ 43%]
tests/test_booking_conflicts.py::test_maintenance_block_prevents_booking PASSED [ 47%]
tests/test_concurrency.py::test_concurrent_conflicting_bookings_at_most_one_succeeds PASSED [ 52%]
tests/test_no_show_worker.py::test_no_show_worker_releases_eligible_booking PASSED [ 56%]
tests/test_no_show_worker.py::test_no_show_worker_preserves_checked_in_and_cancelled_bookings PASSED [ 60%]
tests/test_no_show_worker.py::test_repeated_worker_execution_is_idempotent PASSED [ 65%]
tests/test_qr_checkin.py::test_qr_checkin_success_with_token PASSED      [ 69%]
tests/test_qr_checkin.py::test_qr_checkin_with_manual_lookup_code PASSED [ 73%]
tests/test_qr_checkin.py::test_student_cannot_perform_staff_checkin PASSED [ 78%]
tests/test_qr_checkin.py::test_repeated_checkin_rejected PASSED          [ 82%]
tests/test_qr_checkin.py::test_equipment_issue_and_return_workflow PASSED [ 86%]
tests/test_tenant_isolation.py::test_resource_listing_isolated_by_college PASSED [ 91%]
tests/test_tenant_isolation.py::test_cannot_access_or_book_other_college_resource PASSED [ 95%]
tests/test_tenant_isolation.py::test_manager_cannot_manage_unassigned_resource PASSED [100%]

====================== 23 passed in 26.58s =======================
```

---

## 7. Five-Minute Faculty Demonstration Walkthrough

Follow this step-by-step script during your presentation:

1. **Architecture & Zero-Cost Model (0:00 - 1:00)**
   - Open `http://localhost:5173`. Show the Landing Page explaining that the entire SaaS application runs locally with zero external API fees.
   - Mention the database abstraction: PostgreSQL for production and lightweight SQLite for evaluation.

2. **Student Reservation & QR Pass (1:00 - 2:00)**
   - Click "Launch Demo Application" and select **Aarav Sharma (Student)**.
   - Navigate to "Browse Resources", pick **Discussion Room Alpha**, click "View Slots & Reserve".
   - Pick an available slot (e.g. 14:00 - 15:00), enter purpose: *"Cloud Architecture Review"*, click "Confirm Reservation".
   - Show the generated high-contrast QR code and the 8-character manual code (e.g., `SS-APEX01`).

3. **Conflict Prevention Proof (2:00 - 2:45)**
   - In the top-right persona switcher, switch to **Diya Patel (Student 2)**.
   - Try to book the exact same slot on Discussion Room Alpha.
   - Show that the system immediately rejects the request with **HTTP 409 Conflict: Double-booking conflict**.
   - Explain how database row locks serialize concurrent requests.

4. **Staff QR Check-In & Equipment Return (2:45 - 3:45)**
   - Switch persona to **Prof. Sunita Mehta (Room Manager)**.
   - Click "Launch QR Scanner", demonstrate the live optical camera feed, and type the booking code `SS-APEX01`.
   - Click "Verify & Complete Check-In". Show the instant transition to `CHECKED_IN` status.
   - Switch persona to **Karan Verma (Equip Manager)**, open "Equipment Issue/Return", show the handover notes and check-in / return workflow.

5. **Automatic No-Show Release & Live Analytics (3:45 - 5:00)**
   - On the Manager Dashboard, click **"Test No-Show Release"** to trigger the background worker scan. Show that abandoned reservations are automatically released.
   - Switch persona to **Dr. Vikram Rao (College Admin)**.
   - Show the live **Analytics Dashboard**: 14-day utilization %, no-show rate, peak booking hours, and click **"Export Bookings as CSV"** to download the live spreadsheet.
   - Show the **System Audit Log** to demonstrate compliance tracking.

---

## 8. Database Backup & Restore

### PostgreSQL Backup
```bash
# Backup to SQL dump file
pg_dump -U postgres -h localhost -d slotspot > slotspot_backup.sql

# Restore from SQL dump file
psql -U postgres -h localhost -d slotspot < slotspot_backup.sql
```

### SQLite Backup (Fallback)
```bash
# SQLite files can be backed up simply by copying:
cp slotspot.db slotspot_backup.db
```

---

## 9. Free Optional Deployment Guidance

If presenting the project online without spending money, use only genuinely free tiers:
- **Backend & Database:** [Render Free Web Service](https://render.com) (spins down after 15m of inactivity) or [Fly.io](https://fly.io).
- **Frontend:** [Vercel](https://vercel.com) or [Netlify](https://netlify.com) connected to the Vite frontend repository.
- **Important Note:** Free tiers sleep when inactive and may clear ephemeral SQLite databases on restart. The locally runnable application is the guaranteed, permanent baseline.
