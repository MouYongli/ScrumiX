"""
Configuration settings for the application
"""
import os
from pathlib import Path
from typing import Any, Dict, Optional
from pydantic import PostgresDsn, field_validator, ConfigDict
from pydantic_settings import BaseSettings

# Find the .env file in common locations
def find_env_file():
    """Find the .env file in common locations"""
    possible_paths = [
        ".env",  # Current working directory
        "backend/.env",  # From project root
        Path(__file__).parent.parent.parent.parent.parent / ".env",  # Relative to this file
    ]
    
    for path in possible_paths:
        if Path(path).exists():
            return str(path)
    
    return None

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=find_env_file(), extra="ignore")
    """Application settings"""
    PROJECT_NAME: str = "ScrumiX"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "changeme")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite:///./test.db")
    
    # Environment Configuration
    ENVIRONMENT: str = os.environ.get("ENVIRONMENT", "development")
    
    # Debug Settings (TODO: Remove in production)
    DEBUG_OAUTH: bool = os.environ.get("DEBUG_OAUTH", "true").lower() == "true"
    
    # Security Settings - Environment Aware
    @property
    def SECURE_COOKIES(self) -> bool:
        """Enable secure cookies only in production (requires HTTPS)"""
        return self.ENVIRONMENT in ["production", "staging"]
    
    @property
    def COOKIE_SAMESITE(self) -> str:
        """Strict in production, Lax in development for easier testing"""
        return "strict" if self.ENVIRONMENT == "production" else "lax"
    
    COOKIE_DOMAIN: Optional[str] = os.environ.get("COOKIE_DOMAIN", None)
    SESSION_COOKIE_NAME: str = os.environ.get("SESSION_COOKIE_NAME", "scrumix_session")
    REFRESH_COOKIE_NAME: str = os.environ.get("REFRESH_COOKIE_NAME", "scrumix_refresh")
    
    # URLs
    BACKEND_URL: str = os.environ.get("BACKEND_URL", "http://localhost:8000")
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")

    # Postgres Configuration
    POSTGRES_SERVER: str = os.environ.get("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.environ.get("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.environ.get("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.environ.get("POSTGRES_DB", "scrumix")
    POSTGRES_PORT: str = os.environ.get("POSTGRES_PORT", "5432")

    # OAuth/Keycloak Configuration
    KEYCLOAK_SERVER_URL: str = os.environ.get("KEYCLOAK_SERVER_URL", "http://localhost:8080")
    KEYCLOAK_REALM: str = os.environ.get("KEYCLOAK_REALM", "scrumix-app")
    KEYCLOAK_CLIENT_ID: str = os.environ.get("KEYCLOAK_CLIENT_ID", "scrumix-client")
    KEYCLOAK_CLIENT_SECRET: str = os.environ.get("KEYCLOAK_CLIENT_SECRET", "")
    KEYCLOAK_AUTH_URL: str = os.environ.get("KEYCLOAK_AUTH_URL", "http://localhost:8080/realms/scrumix-app/protocol/openid-connect/token")
    KEYCLOAK_REDIRECT_URI: str = os.environ.get("KEYCLOAK_REDIRECT_URI", "http://localhost:3000/auth/callback")
    
    # OAuth URLs
    @property
    def KEYCLOAK_DISCOVERY_URL(self) -> str:
        return f"{self.KEYCLOAK_SERVER_URL}/realms/{self.KEYCLOAK_REALM}/.well-known/openid_configuration"
    
    @property
    def KEYCLOAK_TOKEN_URL(self) -> str:
        return f"{self.KEYCLOAK_SERVER_URL}/realms/{self.KEYCLOAK_REALM}/protocol/openid-connect/token"
    
    @property
    def KEYCLOAK_USERINFO_URL(self) -> str:
        return f"{self.KEYCLOAK_SERVER_URL}/realms/{self.KEYCLOAK_REALM}/protocol/openid-connect/userinfo"

    SQLALCHEMY_DATABASE_URI: Optional[PostgresDsn] = None
    
    @field_validator("SQLALCHEMY_DATABASE_URI", mode="after")
    def assemble_db_connection(cls, v: Optional[str], info) -> Any:
        if isinstance(v, str):
            return v
        
        # Check if DATABASE_URL is explicitly set (e.g., for testing)
        database_url = os.environ.get("DATABASE_URL")
        if database_url:
            return database_url
            
        data = info.data or {}

        user = data.get("POSTGRES_USER") or "admin"
        password = data.get("POSTGRES_PASSWORD") or "postgres"
        host = data.get("POSTGRES_SERVER") or "localhost"
        port = "53584"  # Use the dynamic port from Docker
        db = data.get("POSTGRES_DB") or "scrumix"
        
        return PostgresDsn.build(
            scheme="postgresql",
            username=user,
            password=password,
            host=host,
            port=int(port),
            path=f"{db or ''}",
        )

settings = Settings() 
