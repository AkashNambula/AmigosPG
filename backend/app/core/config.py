import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    PROJECT_NAME: str = "AMIGOS MENS LUXURY PG"
    API_V1_STR: str = "/api"
    
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", os.getenv("ENV", "development")).lower()
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./amigos_pg.db")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "amigos_pg_super_secret_key_change_me_in_production_123456")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    STORAGE_BACKEND: str = os.getenv("STORAGE_BACKEND", "local").lower()
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "amigos-pg-uploads")
    S3_REGION: str = os.getenv("S3_REGION", "us-east-1")
    S3_ENDPOINT_URL: str = os.getenv("S3_ENDPOINT_URL", "")
    S3_ACCESS_KEY_ID: str = os.getenv("S3_ACCESS_KEY_ID", "")
    S3_SECRET_ACCESS_KEY: str = os.getenv("S3_SECRET_ACCESS_KEY", "")
    
    # Parse CORS_ORIGINS (supports JSON array or comma-separated list)
    cors_origins_raw = os.getenv("CORS_ORIGINS", "").strip()
    CORS_ORIGINS: list = []
    if cors_origins_raw:
        if cors_origins_raw.startswith("["):
            try:
                CORS_ORIGINS = json.loads(cors_origins_raw)
            except Exception:
                CORS_ORIGINS = []
        else:
            CORS_ORIGINS = [orig.strip() for orig in cors_origins_raw.split(",") if orig.strip()]
        
    # Append dev loopback origins ONLY in non-production environments
    if os.getenv("ENVIRONMENT", os.getenv("ENV", "development")).lower() != "production":
        dev_origins = [
            "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
            "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175",
            "http://localhost:3000", "http://127.0.0.1:3000",
            "http://localhost:8001", "http://127.0.0.1:8001"
        ]
        for origin in dev_origins:
            if origin not in CORS_ORIGINS:
                CORS_ORIGINS.append(origin)
        
    ADMIN_DEFAULT_EMAIL: str = os.getenv("ADMIN_DEFAULT_EMAIL", "admin@amigospg.com")
    ADMIN_DEFAULT_PASSWORD: str = os.getenv("ADMIN_DEFAULT_PASSWORD", "AdminAmigos123")
    ADMIN_DEFAULT_PHONE: str = os.getenv("ADMIN_DEFAULT_PHONE", "9876543210")

    SUPERADMIN_DEFAULT_EMAIL: str = os.getenv("SUPERADMIN_DEFAULT_EMAIL", "superadmin@amigospg.com")
    SUPERADMIN_DEFAULT_PASSWORD: str = os.getenv("SUPERADMIN_DEFAULT_PASSWORD", "SuperAdmin123")
    SUPERADMIN_DEFAULT_PHONE: str = os.getenv("SUPERADMIN_DEFAULT_PHONE", "9999999999")

    def validate_production_config(self):
        unsafe_jwt_defaults = [
            "amigos_pg_super_secret_key_change_me_in_production_123456",
            "CHANGE_ME_TO_A_LONG_RANDOM_SECRET",
            "secret",
            "changeme",
            "123456"
        ]
        unsafe_admin_passwords = [
            "AdminAmigos123",
            "SuperAdmin123",
            "admin",
            "password",
            "123456",
            "CHANGE_ME_ADMIN_PASSWORD",
            "CHANGE_ME_SUPERADMIN_PASSWORD"
        ]

        if self.ENVIRONMENT == "production":
            # 1. Database Connection Check
            if not self.DATABASE_URL or "sqlite" in self.DATABASE_URL.lower():
                raise RuntimeError(
                    "CRITICAL PRODUCTION CONFIG ERROR: DATABASE_URL must be configured with a production PostgreSQL database connection when ENVIRONMENT=production."
                )

            # 2. JWT Secret Check
            if not self.JWT_SECRET_KEY or self.JWT_SECRET_KEY in unsafe_jwt_defaults or len(self.JWT_SECRET_KEY) < 32:
                raise RuntimeError(
                    "CRITICAL PRODUCTION CONFIG ERROR: JWT_SECRET_KEY must be configured as a strong, "
                    "cryptographically safe secret (minimum 32 characters) when ENVIRONMENT=production."
                )

            # 3. Admin Seed Password Check
            if not self.ADMIN_DEFAULT_PASSWORD or self.ADMIN_DEFAULT_PASSWORD in unsafe_admin_passwords:
                raise RuntimeError(
                    "CRITICAL PRODUCTION CONFIG ERROR: ADMIN_DEFAULT_PASSWORD must be set to a secure non-default password when ENVIRONMENT=production."
                )

            # 4. Super Admin Seed Password Check
            if not self.SUPERADMIN_DEFAULT_PASSWORD or self.SUPERADMIN_DEFAULT_PASSWORD in unsafe_admin_passwords:
                raise RuntimeError(
                    "CRITICAL PRODUCTION CONFIG ERROR: SUPERADMIN_DEFAULT_PASSWORD must be set to a secure non-default password when ENVIRONMENT=production."
                )

settings = Settings()
settings.validate_production_config()
