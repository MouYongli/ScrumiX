"""
CRUD operations initialization
"""
# Import all CRUD classes and instances
from .base import CRUDBase
from .user import user_crud
from .project import project_crud
from .backlog import backlog_crud
from .documentation import documentation_crud
from .sprint import sprint_crud
from .task import task_crud
from .meeting import meeting_crud
from .tag import tag
from .acceptance_criteria import acceptance_criteria
from .meeting_agenda import meeting_agenda
from .meeting_note import meeting_note
from .meeting_action_item import meeting_action_item

# Create backward compatibility aliases
backlog = backlog_crud
project = project_crud  
documentation = documentation_crud
sprint = sprint_crud
task = task_crud
meeting = meeting_crud
