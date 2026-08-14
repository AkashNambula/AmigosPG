# AMIGOS MENS LUXURY PG — Management System

A complete, production-ready, database-driven full-stack web application designed for men's paying guest (PG) accommodations, branded under **AMIGOS MENS LUXURY PG**. It features separate User/Tenant and Admin/Owner portals with Role-Based Access Control (RBAC), room capacity management, document verification workflows, confidential peer-complaints mediation, automated invoicing, food menu schedules, announcements, and admin audit log tracking.

---

## 1. Tech Stack

- **Frontend**: React.js, Vite, Tailwind CSS, React Router v6, Axios, Lucide React (icons).
- **Backend**: Python 3.14+, FastAPI, SQLAlchemy ORM, Pydantic v2, PyJWT (tokens), Bcrypt (password hashing), ReportLab (PDF rendering).
- **Database**: PostgreSQL (using SQLite for out-of-the-box zero-config local testing).
- **Storage**: Local filesystem storage (`backend/uploads/`) with paths stored in the database. 

---

## 2. Directory Structure

```text
AMIGOS PG/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py             # dotenv configuration loaders
│   │   │   ├── database.py           # DB engines & session managers
│   │   │   └── security.py           # bcrypt & JWT security handlers
│   │   ├── dependencies/
│   │   │   └── auth.py               # authentication & role guards
│   │   ├── models/
│   │   │   ├── __init__.py           # models exporter
│   │   │   └── [entities].py         # SQLAlchemy schemas
│   │   ├── schemas/
│   │   │   ├── __init__.py           # schemas exporter
│   │   │   └── [entities].py         # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── __init__.py           # routers package init
│   │   │   └── [endpoints].py        # FastAPI routes
│   │   ├── utils/
│   │   │   └── pdf.py                # ReportLab PDF receipt generator
│   │   └── main.py                   # application startup & table generation
│   ├── uploads/                      # local storage folder
│   ├── .env                          # local variables
│   ├── requirements.txt              # python requirements
│   └── test_api.py                   # integration workflow verification script
└── frontend/
    ├── src/
    │   ├── components/               # reusable elements (Toasts, tables)
    │   ├── context/                  # AuthContext user sync
    │   ├── layouts/                  # Dashboard collapsible navigation Layout
    │   ├── pages/                    # Tenant + Admin pages
    │   ├── services/                 # Axios api configuration
    │   ├── App.jsx                   # React protected routing
    │   ├── index.css                 # custom base styles and scrollbars
    │   └── main.jsx                  # React DOM renderer
    ├── tailwind.config.js            # Tailwind v3 configurations
    ├── postcss.config.js             # PostCSS configurations
    └── package.json                  # frontend dependencies
```

---

## 3. Database Design

The application uses SQLAlchemy to model the relational database. Database tables are dynamically generated on application startup if they do not exist:

- `users`: Stores tenant & admin profiles, account status, and roles.
- `rooms`: Floor level, sharing capacity, rent price, deposit, and status.
- `room_images` & `room_facilities`: Room photos and features list.
- `bookings`: Booking requests records, start date, duration, and status.
- `booking_documents`: File references for uploaded Aadhaar and passport photo.
- `complaints` & `complaint_updates`: Resident grievances and admin replies log.
- `bills` & `payments`: Rent invoice sheets, payments reference, and clearance.
- `food_menus`: Weekly food schedule schedules.
- `person_problem_reports`: Confidentially reported peer/roommate issues (Admin only).
- `notifications`: Centralized alert logs for booking/billing updates.
- `announcements`: Broadcast logs for announcements.
- `audit_logs`: Admin audit ledger.

---

## 4. Environment Variables

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=sqlite:///./amigos_pg.db
JWT_SECRET_KEY=amigos_pg_super_secret_key_change_me_in_production_123456
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
UPLOAD_DIR=uploads
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
ADMIN_DEFAULT_EMAIL=admin@amigospg.com
ADMIN_DEFAULT_PASSWORD=AdminAmigos123
ADMIN_DEFAULT_PHONE=9876543210
```

---

## 5. Security & Verification Features

- **RBAC**: Protects routes; users are blocked with an HTTP 403 error page if they try to call admin interfaces.
- **Secure Storage**: Identity documents (Aadhaar, photo) and peer reports are stored in private directories and can *only* be accessed through secure, auth-checked API routes. They are not served statically.
- **Duplicate Prevention**: Residents can only submit one active booking request at a time.
- **Capacity Locks**: Booking approvals automatically decrement vacancies and set status to "FULL", locking double-bookings.
- **Leaked Exceptions Prevention**: FastAPI custom error interceptors block stack traces, sending clean JSON payloads to the frontend.

---

## 6. Run & Setup Guide

### Backend Setup
1. Open a terminal in `backend/`.
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the backend:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

*Note: On startup, the script will automatically create the database (`amigos_pg.db`), run table generation, and seed the default admin account: `admin@amigospg.com` / `AdminAmigos123`.*

### Frontend Setup
1. Open a terminal in `frontend/`.
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Open your browser to the local URL (defaults to `http://localhost:5173`).

---

## 7. Verification Tests

To verify backend endpoints and capacity triggers:
1. Ensure the backend server is running on port 8000.
2. In the `backend/` folder, run:
   ```bash
   python test_api.py
   ```
3. All 10 phases of user registration, login, room creation, booking requests, RBAC boundaries, and allocation capacity adjustments will run and log success.

---

- **Tenant Account**:
  - Register a new account via the frontend register form, or check console test runs.

---

## 9. Docker Deployment

This application is fully Dockerized using a multi-container architecture.

### Tech Stack in Docker
- **ReactJS**: Built statically and served using **Nginx**.
- **FastAPI**: Served using **Uvicorn** over port 8000.
- **PostgreSQL**: Serving as the relational database.
- **Docker Compose**: Orchestrates networks, health checks, dependency startup ordering, and persistent volumes.

### Local Setup via Docker
1. Make sure **Docker** and **Docker Compose** are installed and running.
2. Clone the repository and navigate to the root directory:
   ```bash
   cd "Amigos pg"
   ```
3. Copy the `.env.example` file to `.env` (the compose environment automatically reads this root file):
   ```bash
   cp .env.example .env
   ```
4. Spin up the containers using Docker Compose:
   ```bash
   docker compose up --build
   ```
5. Once all services report healthy, access the following URLs in your browser:
   - **Frontend App**: [http://localhost](http://localhost)
   - **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Backend Base API**: [http://localhost:8000](http://localhost:8000)

### Persistence
- PostgreSQL database files are saved inside a Docker named volume `pgdata`.
- Identity documents (Aadhaar, passport photos) and payment screenshot proofs are preserved across container lifecycles in the `uploads_data` Docker volume.

