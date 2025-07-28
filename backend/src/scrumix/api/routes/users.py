"""
用户管理相关的API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from scrumix.api.core.security import get_current_user, get_current_superuser
from scrumix.api.db.database import get_db
from scrumix.api.crud.user import user_crud, session_crud
from scrumix.api.schemas.user import (
    UserResponse, UserUpdate, UserSessionResponse
)

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user = Depends(get_current_user)):
    """获取当前用户资料"""
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新当前用户资料"""
    try:
        updated_user = user_crud.update_user(db, current_user.id, user_update)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/me/sessions", response_model=List[UserSessionResponse])
async def get_current_user_sessions(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的所有会话"""
    sessions = session_crud.get_user_sessions(db, current_user.id)
    return sessions

@router.delete("/me/sessions/{session_id}")
async def revoke_user_session(
    session_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """撤销指定会话"""
    success = session_crud.deactivate_session(db, session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return {"message": "Session revoked successfully"}

@router.delete("/me/sessions")
async def revoke_all_user_sessions(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """撤销当前用户的所有会话"""
    count = session_crud.deactivate_user_sessions(db, current_user.id)
    return {"message": f"Revoked {count} sessions"}

# 管理员相关路由
@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """获取用户列表（管理员）"""
    users = user_crud.get_users(db, skip=skip, limit=limit)
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: int,
    current_user = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """根据ID获取用户（管理员）"""
    user = user_crud.get_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user_by_id(
    user_id: int,
    user_update: UserUpdate,
    current_user = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """更新用户信息（管理员）"""
    try:
        updated_user = user_crud.update_user(db, user_id, user_update)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    current_user = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """停用用户（管理员）"""
    success = user_crud.deactivate_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 停用用户的所有会话
    session_crud.deactivate_user_sessions(db, user_id)
    
    return {"message": "User deactivated successfully"}

@router.post("/{user_id}/verify")
async def verify_user(
    user_id: int,
    current_user = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """验证用户邮箱（管理员）"""
    success = user_crud.verify_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return {"message": "User verified successfully"}

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """删除用户（管理员）"""
    success = user_crud.delete_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 删除用户的所有会话
    session_crud.deactivate_user_sessions(db, user_id)
    
    return {"message": "User deleted successfully"} 