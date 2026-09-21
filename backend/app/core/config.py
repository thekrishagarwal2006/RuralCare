import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "RuralCare API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database URL defaults to local SQLite if Postgres is not configured
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ruralcare.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # JWT Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "ruralcare_super_secret_jwt_key_2026_academic_project")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # Routing API
    OSRM_SERVER_URL: str = "http://router.project-osrm.org"
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
