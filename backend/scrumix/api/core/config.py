"""
Configuration settings for the application
"""
import os
from typing import Any, Optional
from pydantic import PostgresDsn, field_validator, ConfigDict
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    model_config = ConfigDict(env_file=".env", extra="ignore")
    
    """Application settings"""
    PROJECT_NAME: str = "ScrumiX"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "changeme")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # Set default values for the environment variables
    BACKEND_SERVER: str = os.environ.get("BACKEND_SERVER", "localhost")
    BACKEND_PORT: int = os.environ.get("BACKEND_PORT", 8000)
    
    FRONTEND_SERVER: str = os.environ.get("FRONTEND_SERVER", "localhost")
    FRONTEND_PORT: int = os.environ.get("FRONTEND_PORT", 3000)

    KEYCLOAK_AUTH_SERVER: str = os.environ.get("KEYCLOAK_AUTH_SERVER", "localhost")
    KEYCLOAK_AUTH_PORT: int = os.environ.get("KEYCLOAK_AUTH_PORT", 8080)
    KEYCLOAK_AUTH_REALM_ID: str = os.environ.get("KEYCLOAK_AUTH_REALM_ID", "scrumix-app")
    KEYCLOAK_CLIENT_ID: str = os.environ.get("KEYCLOAK_CLIENT_ID", "scrumix-client")
    KEYCLOAK_CLIENT_SECRET: str = os.environ.get("KEYCLOAK_CLIENT_SECRET", "")
    
    POSTGRES_SERVER: str = os.environ.get("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: int = os.environ.get("POSTGRES_PORT", 5432)
    POSTGRES_USER: str = os.environ.get("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.environ.get("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.environ.get("POSTGRES_DB", "scrumix")
     
    # Backend URL
    @property
    def BACKEND_URL(self) -> str:
        return f"http://{self.BACKEND_SERVER}:{self.BACKEND_PORT}"

    # Frontend URL
    @property
    def FRONTEND_URL(self) -> str:
        return f"http://{self.FRONTEND_SERVER}:{self.FRONTEND_PORT}"

    # OAuth URLs
    @property
    def KEYCLOAK_DISCOVERY_URL(self) -> str:
        return f"http://{self.KEYCLOAK_AUTH_SERVER}:{self.KEYCLOAK_AUTH_PORT}/realms/{self.KEYCLOAK_AUTH_REALM_ID}/.well-known/openid_configuration"
    
    @property
    def KEYCLOAK_TOKEN_URL(self) -> str:
        return f"http://{self.KEYCLOAK_AUTH_SERVER}:{self.KEYCLOAK_AUTH_PORT}/realms/{self.KEYCLOAK_AUTH_REALM_ID}/protocol/openid-connect/token"
    
    @property
    def KEYCLOAK_USERINFO_URL(self) -> str:
        return f"http://{self.KEYCLOAK_AUTH_SERVER}:{self.KEYCLOAK_AUTH_PORT}/realms/{self.KEYCLOAK_AUTH_REALM_ID}/protocol/openid-connect/userinfo"

    # SQLAlchemy Database URI
    SQLALCHEMY_DATABASE_URI: Optional[PostgresDsn] = None
    @field_validator("SQLALCHEMY_DATABASE_URI", mode="after")
    def assemble_db_connection(cls, v: Optional[str], info) -> Any:
        if isinstance(v, str):
            return v
        user = info.data.get("POSTGRES_USER") or "admin"
        password = info.data.get("POSTGRES_PASSWORD") or "postgres"
        host = info.data.get("POSTGRES_SERVER") or "localhost"
        port = info.data.get("POSTGRES_PORT") or 5432
        db = info.data.get("POSTGRES_DB") or "scrumix"
        if isinstance(port, str):
            port = int(port)

        return PostgresDsn.build(
            scheme="postgresql",
            username=user,
            password=password,
            host=host,
            port=port,
            path=f"{db or ''}",
        )

settings = Settings() 


if __name__ == "__main__":
    print(settings.SQLALCHEMY_DATABASE_URI)
    print(settings.KEYCLOAK_DISCOVERY_URL)
    print(settings.KEYCLOAK_TOKEN_URL)
    print(settings.KEYCLOAK_USERINFO_URL)

    # # Postgres Configuration
    # POSTGRES_SERVER: str = os.environ.get("POSTGRES_SERVER", "localhost")
    # POSTGRES_USER: str = os.environ.get("POSTGRES_USER", "postgres")
    # POSTGRES_PASSWORD: str = os.environ.get("POSTGRES_PASSWORD", "postgres")
    # POSTGRES_DB: str = os.environ.get("POSTGRES_DB", "scrumix")
    # POSTGRES_PORT: str = os.environ.get("POSTGRES_PORT", "5432")



    # # OAuth/Keycloak Configuration
    # KEYCLOAK_SERVER_URL: str = os.environ.get("KEYCLOAK_SERVER_URL", "http://localhost:8080")
    # KEYCLOAK_REALM: str = os.environ.get("KEYCLOAK_REALM", "scrumix-app")
    # KEYCLOAK_CLIENT_ID: str = os.environ.get("KEYCLOAK_CLIENT_ID", "scrumix-client")
    # KEYCLOAK_CLIENT_SECRET: str = os.environ.get("KEYCLOAK_CLIENT_SECRET", "")
    # KEYCLOAK_AUTH_URL: str = os.environ.get("KEYCLOAK_AUTH_URL", "http://localhost:8080/realms/scrumix-app/protocol/openid-connect/token")