"""
API routes initialization
"""
from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .projects import router as projects_router
from .workspace import router as workspace_router
from .backlogs import router as backlogs_router
from .documentations import router as documentations_router
from .sprints import router as sprints_router
from .tasks import router as tasks_router
from .meetings import router as meetings_router
from .tags import router as tags_router
from .acceptance_criteria import router as acceptance_criteria_router
from .meeting_agenda import router as meeting_agenda_router
from .meeting_note import router as meeting_note_router
from .meeting_action_item import router as meeting_action_item_router
from .meeting_participants import router as meeting_participants_router
from .notifications import router as notifications_router
from .user_notification_preferences import router as user_notification_preferences_router
from .personal_notes import router as personal_notes_router
from .semantic_search import router as semantic_search_router
from .chat import router as chat_router
from .velocity import router as velocity_router
from .health import router as health_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(projects_router, prefix="/projects", tags=["projects"])
api_router.include_router(workspace_router, prefix="/workspace", tags=["workspace"])
api_router.include_router(backlogs_router, prefix="/backlogs", tags=["backlogs"])
api_router.include_router(documentations_router, prefix="/documentations", tags=["documentation"])
api_router.include_router(sprints_router, prefix="/sprints", tags=["sprints"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
api_router.include_router(meetings_router, prefix="/meetings", tags=["meetings"])
api_router.include_router(tags_router, prefix="/tags", tags=["tags"])
api_router.include_router(acceptance_criteria_router, prefix="/acceptance-criteria", tags=["acceptance-criteria"])
api_router.include_router(meeting_agenda_router, prefix="/meeting-agendas", tags=["meeting-agenda"])
api_router.include_router(meeting_note_router, prefix="/meeting-notes", tags=["meeting-notes"])
api_router.include_router(meeting_action_item_router, prefix="/meeting-action-items", tags=["meeting-action-items"])
api_router.include_router(meeting_participants_router, prefix="/meeting-participants", tags=["meeting-participants"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
api_router.include_router(user_notification_preferences_router, prefix="/notification-preferences", tags=["notification-preferences"])
api_router.include_router(personal_notes_router, prefix="", tags=["personal-notes"])
api_router.include_router(semantic_search_router, prefix="/semantic-search", tags=["semantic-search"])
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])
api_router.include_router(velocity_router, prefix="/velocity", tags=["velocity", "burndown"])
api_router.include_router(health_router, prefix="", tags=["health"])
