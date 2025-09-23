"""
Main entry point for the application
"""
import uvicorn
import os

from scrumix.api.app import app

# Initialize database if available
def initialize_database():
    """Initialize database with proper error handling for Railway"""
    try:
        # Check if we have database configuration
        database_url = os.environ.get("DATABASE_URL")
        postgres_server = os.environ.get("POSTGRES_SERVER")
        postgres_password = os.environ.get("POSTGRES_PASSWORD")
        
        if database_url or (postgres_server and postgres_password):
            from scrumix.api.core.init_db import init_db
            init_db()
            print("Database initialized successfully")
            return True
        else:
            print("No database configuration found, starting without database")
            return False
    except Exception as e:
        print(f"Warning: Could not initialize database: {e}")
        print("Application will start without database connection")
        return False

# Initialize database
initialize_database()

if __name__ == "__main__":
    # Railway sets PORT environment variable
    port = int(os.environ.get("PORT", "8000"))
    environment = os.environ.get("ENVIRONMENT", "development").lower()
    
    print(f"Starting ScrumiX API on port {port} in {environment} mode")
    
    uvicorn.run(
        "scrumix.api.app:app",
        host="0.0.0.0",
        port=port,
        reload=(environment != "production"),
        log_level="info" if environment == "production" else "debug"
    )
