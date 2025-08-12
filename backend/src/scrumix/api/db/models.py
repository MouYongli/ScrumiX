"""
Import all models to ensure proper table creation order
"""
# Import base
from scrumix.api.db.base import Base

# Import all models in proper order
from scrumix.api.models.user import User, UserOAuth, UserSession
from scrumix.api.models.project import Project
from scrumix.api.models.user_project import UserProject
from scrumix.api.models.backlog import Backlog
from scrumix.api.models.sprint import Sprint
from scrumix.api.models.task import Task
from scrumix.api.models.meeting import Meeting
from scrumix.api.models.tag import Tag
from scrumix.api.models.documentation import Documentation
from scrumix.api.models.acceptance_criteria import AcceptanceCriteria
from scrumix.api.models.meeting_agenda import MeetingAgenda
from scrumix.api.models.meeting_note import MeetingNote
from scrumix.api.models.meeting_action_item import MeetingActionItem

# Import all association tables
from scrumix.api.models.user_project import UserProject
from scrumix.api.models.user_task import UserTask
from scrumix.api.models.user_meeting import UserMeeting
from scrumix.api.models.user_documentation import UserDocumentation
from scrumix.api.models.tag_task import TagTask
from scrumix.api.models.tag_documentation import TagDocumentation

# Make sure all models are loaded
__all__ = [
    'Base',
    'User', 'UserOAuth', 'UserSession',
    'Project',
    'UserProject',
    'Backlog',
    'Sprint',
    'Task',
    'Meeting',
    'Tag',
    'Documentation',
    'AcceptanceCriteria',
    'MeetingAgenda',
    'MeetingNote',
    'MeetingActionItem',
    'UserTask',
    'UserMeeting',
    'UserDocumentation',
    'TagTask',
    'TagDocumentation'
]
