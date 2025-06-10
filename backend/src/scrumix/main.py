"""
Main entry point for the application
"""
import uvicorn
import os

from scrumix.api.app import app

# Only initialize database if it's available
if os.environ.get("POSTGRES_SERVER") and os.environ.get("POSTGRES_PASSWORD"):
    try:
        from scrumix.api.core.init_db import init_db
        init_db()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Warning: Could not initialize database: {e}")
        print("Application will start without database connection")

if __name__ == "__main__":
    uvicorn.run("scrumix.api.app:app", host="0.0.0.0", port=8000, reload=True)
