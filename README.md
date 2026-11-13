# AMIGOS MENS LUXURY PG — Management System

A complete, production-ready, database-driven full-stack web application designed for men's paying guest (PG) accommodations, branded under **AMIGOS MENS LUXURY PG**. It features separate User/Tenant and Admin/Owner portals with Role-Based Access Control (RBAC), room capacity management, document verification workflows, confidential peer-complaints mediation, automated invoicing, food menu schedules, announcements, and admin audit log tracking.

---

## 1. Tech Stack

- **Frontend**: React.js, Vite, Tailwind CSS, React Router v6, Axios, Lucide React (icons).
- **Backend**: Python 3.11+ (Python 3.11-slim container), FastAPI, SQLAlchemy ORM, Pydantic v2, PyJWT (tokens), Bcrypt (password hashing), ReportLab (PDF rendering).
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

### Local Development (`backend/.env`)
For local zero-config testing using SQLite:
```env
ENVIRONMENT=development
DATABASE_URL=sqlite:///./amigos_pg.db
JWT_SECRET_KEY=amigos_pg_super_secret_key_change_me_in_production_123456
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
UPLOAD_DIR=uploads
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
ADMIN_DEFAULT_EMAIL=admin@amigospg.com
ADMIN_DEFAULT_PASSWORD=AdminAmigos123
ADMIN_DEFAULT_PHONE=9876543210
SUPERADMIN_DEFAULT_EMAIL=superadmin@amigospg.com
SUPERADMIN_DEFAULT_PASSWORD=SuperAdmin123
SUPERADMIN_DEFAULT_PHONE=9999999999
```

### Production Deployment (`.env` in repository root)
Refer to `.env.example` in the project root. In production mode (`ENVIRONMENT=production`), the application strictly validates that passwords and JWT secret keys are non-default and that PostgreSQL is connected.
```env
ENVIRONMENT=production
DATABASE_URL=postgresql://postgres:STRONG_DB_PASSWORD@db:5432/amigos_pg
POSTGRES_DB=amigos_pg
POSTGRES_USER=postgres
POSTGRES_PASSWORD=STRONG_DB_PASSWORD
JWT_SECRET_KEY=USE_A_STRONG_RANDOM_SECRET_MIN_32_CHARS
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
STORAGE_BACKEND=local
UPLOAD_DIR=uploads
CORS_ORIGINS=["https://your-domain.com", "http://your-ec2-ip"]
ADMIN_DEFAULT_EMAIL=admin@amigospg.com
ADMIN_DEFAULT_PASSWORD=STRONG_ADMIN_PASSWORD
ADMIN_DEFAULT_PHONE=9876543210
SUPERADMIN_DEFAULT_EMAIL=superadmin@amigospg.com
SUPERADMIN_DEFAULT_PASSWORD=STRONG_SUPERADMIN_PASSWORD
SUPERADMIN_DEFAULT_PHONE=9999999999
VITE_API_URL=
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
   python -m uvicorn app.main:app --reload --port 8001
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
1. Ensure the backend server is running on port 8001.
2. In the `backend/` folder, run:
   ```bash
   python test_api.py
   ```
3. All 10 phases of user registration, login, room creation, booking requests, RBAC boundaries, and allocation capacity adjustments will run and log success.

---

- **Tenant Account**:
  - Register a new account via the frontend register form, or check console test runs.

---

## 9. Production Deployment on AWS EC2 (Docker Compose)

The application is fully containerized and production-ready for deployment on a single AWS EC2 instance (e.g. `t3.small` or `t3.medium` running Ubuntu 22.04 / 24.04 LTS).

### Architecture in Docker
- **Frontend (`amigos_pg_frontend`)**: Vite React production build served via **Nginx** on port 80. Nginx acts as the reverse proxy for `/api/`, `/uploads/`, and `/docs`, with 25MB upload limits and gzip compression.
- **Backend (`amigos_pg_backend`)**: FastAPI running on Python 3.11-slim, automatically executing Alembic migrations (`alembic upgrade head`) before launching Uvicorn on port 8001. Port 8001 is kept private and bound only to loopback (`127.0.0.1:8001`).
- **Database (`amigos_pg_db`)**: PostgreSQL 15 Alpine with health checks. Port 5432 is kept internal within the Docker network and is never exposed publicly.
- **Network (`amigos_network`)**: Isolated Docker bridge network for inter-container communication.
- **Volumes**:
  - `pgdata`: Persistent PostgreSQL relational database storage.
  - `uploads_data`: Persistent document and proof upload storage mounted at `/app/uploads`.

### AWS EC2 Step-by-Step Deployment Guide

#### 1. EC2 Security Group Configuration
In the AWS EC2 Console, configure your instance's Inbound Security Group rules:
- **Port 22 (SSH)**: Accessible from your IP address.
- **Port 80 (HTTP)**: Accessible from anywhere (`0.0.0.0/0`).
- **Port 443 (HTTPS)**: Accessible from anywhere (`0.0.0.0/0`, for future SSL).
- *(Do NOT open ports 5432 or 8001; they are kept secure behind Docker and Nginx).*

#### 2. Install Docker & Docker Compose on EC2
Connect to your EC2 instance via SSH and run:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
# Log out and log back in, or run 'newgrp docker' to apply group permissions
```

#### 3. Clone Repository & Setup Environment
```bash
git clone https://github.com/AkashNambula/AmigosPG.git
cd AmigosPG

# Create production environment file from template
cp .env.example .env
```

#### 4. Configure Production Secrets
Edit `.env` using your preferred editor:
```bash
nano .env
```
Ensure you provide strong, non-default values:
- `POSTGRES_PASSWORD`: A strong random password.
- `DATABASE_URL`: `postgresql://postgres:<YOUR_POSTGRES_PASSWORD>@db:5432/amigos_pg`
- `JWT_SECRET_KEY`: A cryptographically strong secret at least 32 characters long (`openssl rand -hex 32`).
- `ADMIN_DEFAULT_PASSWORD`: A secure admin password.
- `SUPERADMIN_DEFAULT_PASSWORD`: A secure super-admin password.
- `CORS_ORIGINS`: `["http://<YOUR_EC2_PUBLIC_IP>", "https://<YOUR_DOMAIN>"]`

#### 5. Build and Launch Containers
```bash
docker-compose up --build -d
```

#### 6. Verify Service Health
Check that all containers are healthy:
```bash
docker-compose ps
```
You should see:
- `amigos_pg_db`: `Up (healthy)`
- `amigos_pg_backend`: `Up (healthy)`
- `amigos_pg_frontend`: `Up`

Access your application:
- **Frontend Web Portal**: `http://<YOUR_EC2_PUBLIC_IP>`
- **API Documentation**: `http://<YOUR_EC2_PUBLIC_IP>/docs`
- **Health Check**: `http://<YOUR_EC2_PUBLIC_IP>/api/tenants`

---

## 10. Troubleshooting & Operations

### View Live Logs
```bash
# View all container logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# View database logs only
docker-compose logs -f db
```

### Restarting Services
```bash
docker-compose restart
```

### Stopping Services
```bash
docker-compose down
```
*(Database data in `pgdata` and uploaded files in `uploads_data` will be safely preserved).*

### Running Database Migrations Manually
Alembic migrations run automatically on container startup. To inspect or run migrations manually:
```bash
docker-compose exec backend alembic current
docker-compose exec backend alembic upgrade head
```

