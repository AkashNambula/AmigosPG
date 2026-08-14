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
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./amigos_pg.db")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "amigos_pg_super_secret_key_change_me_in_production_123456")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    
    # Parse CORS_ORIGINS
    cors_origins_raw = os.getenv("CORS_ORIGINS", '[]')
    try:
        CORS_ORIGINS: list = json.loads(cors_origins_raw)
    except Exception:
        CORS_ORIGINS: list = []
        
    # Append common dev loopbacks automatically
    dev_origins = [
        "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
        "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175",
        "http://localhost:3000", "http://127.0.0.1:3000"
    ]
    for origin in dev_origins:
        if origin not in CORS_ORIGINS:
            CORS_ORIGINS.append(origin)
        
    ADMIN_DEFAULT_EMAIL: str = os.getenv("ADMIN_DEFAULT_EMAIL", "admin@amigospg.com")
    ADMIN_DEFAULT_PASSWORD: str = os.getenv("ADMIN_DEFAULT_PASSWORD", "AdminAmigos123")
    ADMIN_DEFAULT_PHONE: str = os.getenv("ADMIN_DEFAULT_PHONE", "9876543210")

settings = Settings()
