"""
API routes initialization
"""
from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .projects import router as projects_router
from .backlogs import router as backlogs_router
from .documentations import router as documentations_router
from .sprints import router as sprints_router
from .tasks import router as tasks_router
from .meetings import router as meetings_router
from .tags import router as tags_router
from .acceptance_criteria import router as acceptance_criteria_router
from .meeting_agenda import router as meeting_agenda_router
from .meeting_note import router as meeting_note_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(projects_router, prefix="/projects", tags=["projects"])
api_router.include_router(backlogs_router, prefix="/backlogs", tags=["backlogs"])
api_router.include_router(documentations_router, prefix="/documentations", tags=["documentation"])
api_router.include_router(sprints_router, prefix="/sprints", tags=["sprints"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
api_router.include_router(meetings_router, prefix="/meetings", tags=["meetings"])
api_router.include_router(tags_router, prefix="/tags", tags=["tags"])
api_router.include_router(acceptance_criteria_router, prefix="/acceptance-criteria", tags=["acceptance-criteria"])
api_router.include_router(meeting_agenda_router, prefix="/meeting-agenda", tags=["meeting-agenda"])
api_router.include_router(meeting_note_router, prefix="/meeting-notes", tags=["meeting-notes"])
