"""
Permission checking utilities and middleware
"""
from typing import List, Union, Callable
from functools import wraps
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session

from scrumix.api.models.user_project import ScrumRole
from scrumix.api.crud.user_project import user_project_crud
from scrumix.api.db.session import get_db
from scrumix.api.core.security import get_current_user

def check_project_access(
    required_roles: Union[ScrumRole, List[ScrumRole]]
) -> Callable:
    """Dependency for checking user's project access"""
    if isinstance(required_roles, ScrumRole):
        required_roles = [required_roles]

    async def check_access(
        project_id: int,
        current_user = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        user_role = user_project_crud.get_user_role(db, current_user.id, project_id)
        
        if not user_role or user_role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have required permissions for this operation"
            )
        
        return current_user

    return check_access

def require_project_role(
    required_roles: Union[ScrumRole, List[ScrumRole]]
) -> Callable:
    """Decorator for checking user's project role"""
    if isinstance(required_roles, ScrumRole):
        required_roles = [required_roles]

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            project_id = kwargs.get('project_id')
            if not project_id:
                raise ValueError("project_id parameter is required")

            current_user = kwargs.get('current_user')
            if not current_user:
                raise ValueError("current_user parameter is required")

            db = kwargs.get('db')
            if not db:
                raise ValueError("db parameter is required")

            user_role = user_project_crud.get_user_role(db, current_user.id, project_id)
            
            if not user_role or user_role not in required_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User does not have required permissions for this operation"
                )

            return await func(*args, **kwargs)

        return wrapper

    return decorator