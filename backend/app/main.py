import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import hash_password
from app.models import User
from app.routers import auth, users, rooms, bookings, complaints, bills, food, problems, notifications, admin

# Create database tables dynamically if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-stack PG Management system API for AMIGOS MENS LUXURY PG",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    errors = exc.errors()
    if errors:
        first_error = errors[0]
        msg = first_error.get("msg", "Invalid input data.")
        if msg.startswith("Value error, "):
            msg = msg.replace("Value error, ", "", 1)
        loc = first_error.get("loc", [])
        if loc and len(loc) > 1:
            field = str(loc[-1])
            if "valid email" in msg:
                msg = "Please enter a valid email address."
            elif field == "phone" and "10-digit" not in msg:
                msg = "Please enter a valid 10-digit mobile number."
        return JSONResponse(
            status_code=400,
            content={"detail": msg}
        )
    return JSONResponse(
        status_code=400,
        content={"detail": "Invalid input data."}
    )

# Startup directories creation and database admin seeding
@app.on_event("startup")
def startup_event():
    # 1. Create upload folders
    upload_dirs = [
        os.path.join(settings.UPLOAD_DIR, "rooms"),
        os.path.join(settings.UPLOAD_DIR, "complaints"),
        os.path.join(settings.UPLOAD_DIR, "documents"),
        os.path.join(settings.UPLOAD_DIR, "problems"),
    ]
    for directory in upload_dirs:
        os.makedirs(directory, exist_ok=True)

    # 2. Seed default admin if not exists
    db = SessionLocal()
    # Migration: lowercase all existing user emails to prevent case sensitivity issues
    try:
        from sqlalchemy import text
        db.execute(text("UPDATE users SET email = LOWER(email)"))
        db.commit()
        print("Migration: Lowercased all existing user emails.")
    except Exception as e:
        db.rollback()
        
    # Migrations check: check and add reference_id and target_route to notifications table if missing
    try:
        from sqlalchemy import text
        # SQLite check
        columns = [c[1] for c in db.execute(text("PRAGMA table_info(notifications)")).fetchall()]
        if columns:
            if "reference_id" not in columns:
                db.execute(text("ALTER TABLE notifications ADD COLUMN reference_id INTEGER"))
                print("Migration: Added column reference_id to notifications.")
            if "target_route" not in columns:
                db.execute(text("ALTER TABLE notifications ADD COLUMN target_route VARCHAR"))
                print("Migration: Added column target_route to notifications.")
            db.commit()
    except Exception as e:
        # Fallback for PostgreSQL or other database engines
        try:
            db.execute(text("ALTER TABLE notifications ADD COLUMN reference_id INTEGER"))
            db.commit()
        except Exception:
            db.rollback()
        try:
            db.execute(text("ALTER TABLE notifications ADD COLUMN target_route VARCHAR"))
            db.commit()
        except Exception:
            db.rollback()

    # Migrations check: check and add new columns to payments table if missing
    try:
        payment_cols = [c[1] for c in db.execute(text("PRAGMA table_info(payments)")).fetchall()]
        if payment_cols:
            if "screenshot_path" not in payment_cols:
                db.execute(text("ALTER TABLE payments ADD COLUMN screenshot_path VARCHAR"))
            if "submitted_at" not in payment_cols:
                db.execute(text("ALTER TABLE payments ADD COLUMN submitted_at TIMESTAMP"))
            if "verified_at" not in payment_cols:
                db.execute(text("ALTER TABLE payments ADD COLUMN verified_at TIMESTAMP"))
            if "verified_by" not in payment_cols:
                db.execute(text("ALTER TABLE payments ADD COLUMN verified_by INTEGER"))
            if "admin_notes" not in payment_cols:
                db.execute(text("ALTER TABLE payments ADD COLUMN admin_notes VARCHAR"))
            db.commit()
    except Exception as e:
        # Fallback for Postgres
        for col_def in [
            ("screenshot_path", "VARCHAR"),
            ("submitted_at", "TIMESTAMP"),
            ("verified_at", "TIMESTAMP"),
            ("verified_by", "INTEGER"),
            ("admin_notes", "VARCHAR")
        ]:
            try:
                db.execute(text(f"ALTER TABLE payments ADD COLUMN {col_def[0]} {col_def[1]}"))
                db.commit()
            except Exception:
                db.rollback()

    # Seed default payment settings
    try:
        from app.models.bill import PaymentSettings
        settings_record = db.query(PaymentSettings).first()
        if not settings_record:
            db.add(PaymentSettings(upi_id="amigospg@upi"))
            db.commit()
            print("Migration: Seeded default payment settings.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding payment settings: {e}")

    try:
        admin_email = settings.ADMIN_DEFAULT_EMAIL
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            hashed_pwd = hash_password(settings.ADMIN_DEFAULT_PASSWORD)
            default_admin = User(
                first_name="Amigos",
                last_name="Owner",
                email=admin_email,
                phone=settings.ADMIN_DEFAULT_PHONE,
                state="Karnataka",
                city="Bengaluru",
                password_hash=hashed_pwd,
                role="admin",
                account_status="active"
            )
            db.add(default_admin)
            db.commit()
            print(f"Default admin created successfully with email: {admin_email}")

        # 3. Seed exactly 30 rooms (Floors 1-5, Rooms X01-X06)
        from app.models.room import Room
        floors = {
            1: [101, 102, 103, 104, 105, 106],
            2: [201, 202, 203, 204, 205, 206],
            3: [301, 302, 303, 304, 305, 306],
            4: [401, 402, 403, 404, 405, 406],
            5: [501, 502, 503, 504, 505, 506]
        }
        for floor_num, room_list in floors.items():
            for room_num in room_list:
                existing_room = db.query(Room).filter(Room.room_number == str(room_num)).first()
                if not existing_room:
                    new_room = Room(
                        room_number=str(room_num),
                        floor=floor_num,
                        sharing_type="3 Sharing",
                        total_capacity=3,
                        occupied_beds=0,
                        available_beds=3,
                        monthly_price=7000.0,
                        security_deposit=7000.0,
                        availability_status="available",
                        description=f"Standard comfortable room {room_num} located on Floor {floor_num}."
                    )
                    db.add(new_room)
                    db.flush()
                    from app.models.room import RoomFacility
                    for fac in ["WiFi", "Hot Water", "Daily Cleaning"]:
                        db.add(RoomFacility(room_id=new_room.id, facility_name=fac))
                else:
                    existing_room.floor = floor_num
        db.commit()
        print("Successfully seeded all 30 rooms (101-506).")
    except Exception as e:
        print(f"Error seeding default admin or rooms: {e}")
    finally:
        db.close()

# Mount public upload directories statically
# Note: uploads/documents and uploads/problems are NOT mounted, keeping them private!
if os.path.exists(os.path.join(settings.UPLOAD_DIR, "rooms")):
    app.mount("/uploads/rooms", StaticFiles(directory=os.path.join(settings.UPLOAD_DIR, "rooms")), name="rooms_static")
if os.path.exists(os.path.join(settings.UPLOAD_DIR, "complaints")):
    app.mount("/uploads/complaints", StaticFiles(directory=os.path.join(settings.UPLOAD_DIR, "complaints")), name="complaints_static")

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(rooms.router, prefix=settings.API_V1_STR)
app.include_router(bookings.router, prefix=settings.API_V1_STR)
app.include_router(complaints.router, prefix=settings.API_V1_STR)
app.include_router(bills.router, prefix=settings.API_V1_STR)
app.include_router(food.router, prefix=settings.API_V1_STR)
app.include_router(problems.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to AMIGOS MENS LUXURY PG API server!"}

@app.get("/health")
def read_health():
    return {"status": "healthy"}
