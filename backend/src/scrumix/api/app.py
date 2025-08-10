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
    "http://localhost:8080",  # Production frontend
    "https://scrumix.ai",  # Production domain
    settings.FRONTEND_URL,  # From environment
]

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,  # Essential for cookie-based auth
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "User-Agent",
        "DNT",
        "Cache-Control",
        "X-Mx-ReqToken",
        "Keep-Alive",
        "X-Requested-With",
        "If-Modified-Since",
        "X-CSRF-Token",
    ],
    expose_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "ScrumiX API is running"}
