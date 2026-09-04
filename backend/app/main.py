import os
from typing import Optional
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import hash_password
from app.dependencies.auth import get_current_active_user
from app.models import User
from app.models.tenant import Tenant
from app.schemas.tenant import TenantOut
from app.routers import auth, users, rooms, bookings, complaints, bills, food, problems, notifications, admin, tenants, files

# In development mode, auto-create tables if running local SQLite (production uses Alembic migrations)
if settings.ENVIRONMENT != "production" and "sqlite" in settings.DATABASE_URL:
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Multi-Tenant PG Management SaaS system API",
    version="2.0.0"
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
        os.path.join(settings.UPLOAD_DIR, "logos"),
        os.path.join(settings.UPLOAD_DIR, "profiles"),
    ]
    for directory in upload_dirs:
        os.makedirs(directory, exist_ok=True)

    db = SessionLocal()
    try:
        from sqlalchemy import text
        # Lowercase user emails
        db.execute(text("UPDATE users SET email = LOWER(email)"))
        db.commit()


        # 2. Seed Default Tenant: AMIGOS MENS LUXURY PG
        amigos_tenant = db.query(Tenant).filter(Tenant.name == "AMIGOS MENS LUXURY PG").first()
        if not amigos_tenant:
            amigos_tenant = Tenant(
                name="AMIGOS MENS LUXURY PG",
                description="Premium luxury paying guest accommodation for men",
                phone="9876543210",
                email="admin@amigospg.com",
                city="Bengaluru",
                state="Karnataka",
                is_active=True
            )
            db.add(amigos_tenant)
            db.commit()
            db.refresh(amigos_tenant)
            print(f"Migration: Created default tenant AMIGOS MENS LUXURY PG (ID: {amigos_tenant.id}).")

        # Backfill tenant_id = amigos_tenant.id for all records with null tenant_id (except super_admin users)
        for tbl in target_tables:
            try:
                if tbl == "users":
                    db.execute(text(f"UPDATE {tbl} SET tenant_id = {amigos_tenant.id} WHERE tenant_id IS NULL AND role != 'super_admin'"))
                else:
                    db.execute(text(f"UPDATE {tbl} SET tenant_id = {amigos_tenant.id} WHERE tenant_id IS NULL"))
                db.commit()
            except Exception as e:
                db.rollback()

        # Ensure super_admin users always have tenant_id = None
        try:
            db.execute(text("UPDATE users SET tenant_id = NULL WHERE role = 'super_admin'"))
            db.commit()
        except Exception:
            db.rollback()

        # Seed default tenant features for all tenants
        from app.routers.tenants import seed_default_tenant_features
        all_tenants = db.query(Tenant).all()
        for t in all_tenants:
            seed_default_tenant_features(db, t.id)

        # 3. Seed Super Admin account
        super_admin = db.query(User).filter(User.role == "super_admin").first()
        if not super_admin:
            super_admin_user = User(
                first_name="Super",
                last_name="Admin",
                email="superadmin@amigospg.com",
                phone="9999999999",
                state="Karnataka",
                city="Bengaluru",
                password_hash=hash_password("SuperAdmin123"),
                role="super_admin",
                account_status="active",
                tenant_id=None
            )
            db.add(super_admin_user)
            db.commit()
            print("Super Admin created successfully: superadmin@amigospg.com / SuperAdmin123")
        else:
            if super_admin.phone == "0000000000":
                super_admin.phone = "9999999999"
            if super_admin.tenant_id is not None:
                super_admin.tenant_id = None
            db.commit()

        # 4. Seed default PG Admin account if not exists
        admin_email = settings.ADMIN_DEFAULT_EMAIL
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            default_admin = User(
                tenant_id=amigos_tenant.id,
                first_name="Amigos",
                last_name="Owner",
                email=admin_email,
                phone=settings.ADMIN_DEFAULT_PHONE,
                state="Karnataka",
                city="Bengaluru",
                password_hash=hash_password(settings.ADMIN_DEFAULT_PASSWORD),
                role="admin",
                account_status="active"
            )
            db.add(default_admin)
            db.commit()
            print(f"Default admin created successfully with email: {admin_email}")
        elif admin.tenant_id is None:
            admin.tenant_id = amigos_tenant.id
            db.commit()

        # 5. Seed rooms for default tenant
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
                existing_room = db.query(Room).filter(Room.tenant_id == amigos_tenant.id, Room.room_number == str(room_num)).first()
                if not existing_room:
                    new_room = Room(
                        tenant_id=amigos_tenant.id,
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
    except Exception as e:
        print(f"Startup event warning: {e}")
    finally:
        db.close()

# Mount public upload directories statically
if os.path.exists(os.path.join(settings.UPLOAD_DIR, "rooms")):
    app.mount("/uploads/rooms", StaticFiles(directory=os.path.join(settings.UPLOAD_DIR, "rooms")), name="rooms_static")
if os.path.exists(os.path.join(settings.UPLOAD_DIR, "complaints")):
    app.mount("/uploads/complaints", StaticFiles(directory=os.path.join(settings.UPLOAD_DIR, "complaints")), name="complaints_static")
if os.path.exists(os.path.join(settings.UPLOAD_DIR, "logos")):
    app.mount("/uploads/logos", StaticFiles(directory=os.path.join(settings.UPLOAD_DIR, "logos")), name="logos_static")
if os.path.exists(os.path.join(settings.UPLOAD_DIR, "profiles")):
    app.mount("/uploads/profiles", StaticFiles(directory=os.path.join(settings.UPLOAD_DIR, "profiles")), name="profiles_static")

# Include Routers
app.include_router(tenants.public_router, prefix=settings.API_V1_STR)
app.include_router(tenants.router, prefix=settings.API_V1_STR)
app.include_router(tenants.tenant_router, prefix=settings.API_V1_STR)
app.include_router(tenants.super_admin_router, prefix=settings.API_V1_STR)
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
app.include_router(files.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to Multi-Tenant PG Management SaaS API server!"}

@app.get("/health")
def read_health():
    return {"status": "healthy"}

