"""
Health check endpoints for monitoring system status
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from scrumix.api.db.database import get_db, get_database_health
from scrumix.api.core.config import settings

router = APIRouter()

@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": "scrumix-backend",
        "environment": settings.ENVIRONMENT
    }

@router.get("/health/database")
async def database_health_check(db: Session = Depends(get_db)):
    """Database health check with connection pool status"""
    try:
        # Test database connection
        db.execute("SELECT 1")
        
        # Get detailed health information
        health_info = get_database_health()
        
        return {
            "status": "healthy",
            "database": health_info,
            "message": "Database connection successful"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": get_database_health(),
            "error": str(e),
            "message": "Database connection failed"
        }

@router.get("/health/pool")
async def connection_pool_status():
    """Get detailed connection pool status"""
    return get_database_health()
