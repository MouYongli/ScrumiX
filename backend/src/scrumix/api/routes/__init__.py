from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .projects import router as projects_router
from .backlogs import router as backlogs_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(projects_router, prefix="/projects", tags=["projects"])
api_router.include_router(backlogs_router, prefix="/backlogs", tags=["backlogs"])
