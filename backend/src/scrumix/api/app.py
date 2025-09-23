"""
Main application module for ScrumAgents backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from scrumix.api.core.config import settings
from scrumix.api.routes import api_router


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Configure CORS for cookie-based authentication
allowed_origins = [
    "http://localhost:3000",  # Next.js dev server
]

# Support comma-separated FRONTEND_URL(s)
if settings.FRONTEND_URL:
    allowed_origins.extend([o.strip() for o in settings.FRONTEND_URL.split(",") if o.strip()])

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,  # Essential for cookie-based auth
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    """Root endpoint for Railway deployment verification"""
    return {
        "message": "ScrumiX API is running",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for Railway deployment"""
    import os
    from datetime import datetime
    
    return {
        "status": "ok", 
        "message": "ScrumiX API is running",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.environ.get("ENVIRONMENT", "development"),
        "port": os.environ.get("PORT", "8000")
    }