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

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend dev server
        "http://localhost:8000",  # Backend dev server
        "http://localhost:8080",  # Keycloak dev server
        "https://scrumix.ai",  # Production domain
    ],
    # allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "ok", "message": "ScrumiX API is running"}
