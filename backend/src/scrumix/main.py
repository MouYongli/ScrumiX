"""
Main entry point for the application
"""
import uvicorn
import os

from scrumix.api.app import app

# Initialize database with better error handling
try:
    from scrumix.api.core.init_db import init_db
    init_db()
    print("Database initialized successfully")
except Exception as e:
    print(f"Warning: Could not initialize database: {e}")
    print("Application will start without database connection")
    # Don't exit - let the app start anyway for debugging

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    environment = os.environ.get("ENVIRONMENT", "development").lower()
    uvicorn.run(
        "scrumix.api.app:app",
        host="0.0.0.0",
        port=port,
        reload=(environment != "production")
    )
