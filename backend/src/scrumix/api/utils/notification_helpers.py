"""
Notification helper utilities for triggering notifications on important events
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from ..models.notification import NotificationType, NotificationPriority
from ..schemas.notification import NotificationCreate, NotificationBroadcast
from ..crud.notification import notification_crud
from ..crud.user_project import user_project_crud
from ..crud.meeting_participant import meeting_participant_crud


class NotificationHelper:
    """Helper class for creating and sending notifications for various events"""
    
    @staticmethod
    def create_task_assigned_notification(
        db: Session,
        task_id: int,
        task_title: str,
        assigned_user_ids: List[int],
        assigner_user_id: int,
        project_id: int,
        sprint_id: Optional[int] = None
    ):
        """Create notification when task is assigned to users"""
        if not assigned_user_ids:
            return
        
        # Don't notify the person who assigned the task
        recipient_ids = [uid for uid in assigned_user_ids if uid != assigner_user_id]
        if not recipient_ids:
            return
        
        notification_data = NotificationCreate(
            title=f"New task assigned: {task_title}",
            message=f"You have been assigned to work on the task '{task_title}'",
            notification_type=NotificationType.TASK_ASSIGNED,
            priority=NotificationPriority.MEDIUM,
            action_url=f"/project/{project_id}/kanban",
            action_text="View Task",
            recipient_user_ids=recipient_ids,
            project_id=project_id,
            sprint_id=sprint_id,
            task_id=task_id
        )
        
        return notification_crud.create_with_recipients(
            db=db,
            obj_in=notification_data,
            created_by_id=assigner_user_id
        )
    
    @staticmethod
    def create_task_status_changed_notification(
        db: Session,
        task_id: int,
        task_title: str,
        old_status: str,
        new_status: str,
        changed_by_user_id: int,
        project_id: int,
        assigned_user_ids: List[int],
        sprint_id: Optional[int] = None
    ):
        """Create notification when task status changes"""
        # Only notify for significant status changes
        significant_changes = {
            ('todo', 'in_progress'): ('started', NotificationPriority.LOW),
            ('in_progress', 'done'): ('completed', NotificationPriority.MEDIUM),
            ('done', 'in_progress'): ('reopened', NotificationPriority.MEDIUM),
            ('in_progress', 'cancelled'): ('cancelled', NotificationPriority.HIGH),
        }
        
        change_key = (old_status, new_status)
        if change_key not in significant_changes:
            return
        
        action_text, priority = significant_changes[change_key]
        
        # Notify assigned users (except the one who made the change)
        recipient_ids = [uid for uid in assigned_user_ids if uid != changed_by_user_id]
        if not recipient_ids:
            return
        
        notification_data = NotificationCreate(
            title=f"Task {action_text}: {task_title}",
            message=f"The task '{task_title}' has been {action_text}",
            notification_type=NotificationType.TASK_STATUS_CHANGED,
            priority=priority,
            action_url=f"/project/{project_id}/kanban",
            action_text="View Task",
            recipient_user_ids=recipient_ids,
            project_id=project_id,
            sprint_id=sprint_id,
            task_id=task_id
        )
        
        return notification_crud.create_with_recipients(
            db=db,
            obj_in=notification_data,
            created_by_id=changed_by_user_id
        )
    
    @staticmethod
    def create_meeting_created_notification(
        db: Session,
        meeting_id: int,
        meeting_title: str,
        meeting_start: datetime,
        creator_user_id: int,
        project_id: int,
        sprint_id: Optional[int] = None
    ):
        """Create notification when meeting is created - notify all participants"""
        # Get meeting participants
        participants = meeting_participant_crud.get_by_meeting(db=db, meeting_id=meeting_id)
        participant_user_ids = [p.user_id for p in participants if p.user_id and p.user_id != creator_user_id]
        
        if not participant_user_ids:
            return
        
        start_time = meeting_start.strftime("%B %d at %I:%M %p")
        
        notification_data = NotificationCreate(
            title=f"New meeting: {meeting_title}",
            message=f"You've been invited to '{meeting_title}' on {start_time}",
            notification_type=NotificationType.MEETING_CREATED,
            priority=NotificationPriority.MEDIUM,
            action_url=f"/project/{project_id}/meeting/{meeting_id}",
            action_text="View Meeting",
            recipient_user_ids=participant_user_ids,
            project_id=project_id,
            sprint_id=sprint_id,
            meeting_id=meeting_id
        )
        
        return notification_crud.create_with_recipients(
            db=db,
            obj_in=notification_data,
            created_by_id=creator_user_id
        )
    
    @staticmethod
    def create_meeting_participant_added_notification(
        db: Session,
        meeting_id: int,
        meeting_title: str,
        meeting_start: datetime,
        new_participant_user_id: int,
        added_by_user_id: int,
        project_id: int,
        sprint_id: Optional[int] = None
    ):
        """Create notification when user is added to a meeting as participant"""
        if new_participant_user_id == added_by_user_id:
            return  # Don't notify when adding yourself
        
        start_time = meeting_start.strftime("%B %d at %I:%M %p")
        
        notification_data = NotificationCreate(
            title=f"Added to meeting: {meeting_title}",
            message=f"You've been added to the meeting '{meeting_title}' on {start_time}",
            notification_type=NotificationType.MEETING_CREATED,
            priority=NotificationPriority.MEDIUM,
            action_url=f"/project/{project_id}/meeting/{meeting_id}",
            action_text="View Meeting",
            recipient_user_ids=[new_participant_user_id],
            project_id=project_id,
            sprint_id=sprint_id,
            meeting_id=meeting_id
        )
        
        return notification_crud.create_with_recipients(
            db=db,
            obj_in=notification_data,
            created_by_id=added_by_user_id
        )
    
    @staticmethod
    def create_sprint_started_notification(
        db: Session,
        sprint_id: int,
        sprint_name: str,
        sprint_goal: Optional[str],
        start_date: datetime,
        end_date: datetime,
        project_id: int,
        started_by_user_id: int
    ):
        """Create notification when sprint is started"""
        # Get all project members
        project_members = user_project_crud.get_project_members(db, project_id)
        member_ids = [member["user"].id for member in project_members if member["user"].id != started_by_user_id]
        
        if not member_ids:
            return
        
        start_date_str = start_date.strftime("%B %d") if start_date else "now"
        end_date_str = end_date.strftime("%B %d") if end_date else "TBD"
        
        goal_text = f" with goal: {sprint_goal}" if sprint_goal else ""
        
        notification_data = NotificationCreate(
            title=f"Sprint started: {sprint_name}",
            message=f"The sprint '{sprint_name}' has started from {start_date_str} to {end_date_str}{goal_text}",
            notification_type=NotificationType.SPRINT_STARTED,
            priority=NotificationPriority.MEDIUM,
            action_url=f"/project/{project_id}/sprint/{sprint_id}",
            action_text="View Sprint",
            recipient_user_ids=member_ids,
            project_id=project_id,
            sprint_id=sprint_id
        )
        
        return notification_crud.create_with_recipients(
            db=db,
            obj_in=notification_data,
            created_by_id=started_by_user_id
        )
    
    @staticmethod
    def create_sprint_ending_notification(
        db: Session,
        sprint_id: int,
        sprint_name: str,
        end_date: datetime,
        project_id: int,
        days_until_end: int
    ):
        """Create notification when sprint is approaching its end"""
        # Get all project members
        project_members = user_project_crud.get_project_members(db, project_id)
        member_ids = [member["user"].id for member in project_members]
        
        if not member_ids:
            return
        
        day_text = "day" if days_until_end == 1 else "days"
        urgency = NotificationPriority.HIGH if days_until_end <= 1 else NotificationPriority.MEDIUM
        
        notification_data = NotificationCreate(
            title=f"Sprint ending soon: {sprint_name}",
            message=f"The sprint '{sprint_name}' ends in {days_until_end} {day_text}. Time to prepare for sprint review!",
            notification_type=NotificationType.SPRINT_ENDING,
            priority=urgency,
            action_url=f"/project/{project_id}/sprint/{sprint_id}",
            action_text="View Sprint",
            recipient_user_ids=member_ids,
            project_id=project_id,
            sprint_id=sprint_id
        )
        
        return notification_crud.create_with_recipients(
            db=db,
            obj_in=notification_data,
            created_by_id=None  # System notification
        )
    
    @staticmethod
    def create_documentation_added_notification(
        db: Session,
        documentation_id: int,
        documentation_title: str,
        documentation_type: str,
        project_id: int,
        created_by_user_id: int
    ):
        """Create notification when new documentation is added"""
        # Get all project members except the creator
        project_members = user_project_crud.get_project_members(db, project_id)
        member_ids = [member["user"].id for member in project_members if member["user"].id != created_by_user_id]
        
        if not member_ids:
            return
        
        # Format documentation type for display
        type_display = documentation_type.replace('_', ' ').title()
        
        notification_data = NotificationCreate(
            title=f"New documentation: {documentation_title}",
            message=f"New {type_display} documentation '{documentation_title}' has been added to the project",
            notification_type=NotificationType.DOCUMENTATION_ADDED,
            priority=NotificationPriority.LOW,
            action_url=f"/project/{project_id}/documentation",
            action_text="View Documentation",
            recipient_user_ids=member_ids,
            project_id=project_id
        )
        
        return notification_crud.create_with_recipients(
            db=db,
            obj_in=notification_data,
            created_by_id=created_by_user_id
        )
    
    @staticmethod
    def create_meeting_reminder_notification(
        db: Session,
        meeting_id: int,
        meeting_title: str,
        meeting_start: datetime,
        project_id: int,
        sprint_id: Optional[int] = None
    ):
        """Create meeting reminder notification (called by scheduler)"""
        # Get meeting participants
        participants = meeting_participant_crud.get_by_meeting(db=db, meeting_id=meeting_id)
        participant_user_ids = [p.user_id for p in participants if p.user_id]
        
        if not participant_user_ids:
            return
        
        # Calculate time until meeting
        time_diff = meeting_start - datetime.utcnow()
        if time_diff.total_seconds() > 0:
            if time_diff.total_seconds() < 3600:  # Less than 1 hour
                time_text = f"in {int(time_diff.total_seconds() / 60)} minutes"
            else:
                time_text = f"in {int(time_diff.total_seconds() / 3600)} hours"
        else:
            time_text = "now"
        
        notification_data = NotificationCreate(
            title=f"Meeting reminder: {meeting_title}",
            message=f"Your meeting '{meeting_title}' starts {time_text}",
            notification_type=NotificationType.MEETING_REMINDER,
            priority=NotificationPriority.HIGH,
            action_url=f"/project/{project_id}/meeting/{meeting_id}",
            action_text="Join Meeting",
            expires_at=meeting_start + timedelta(hours=2),  # Expire 2 hours after meeting start
            recipient_user_ids=participant_user_ids,
            project_id=project_id,
            sprint_id=sprint_id,
            meeting_id=meeting_id
        )
        
        return notification_crud.create_with_recipients(
            db=db,
            obj_in=notification_data,
            created_by_id=None  # System notification
        )
    
    @staticmethod
    def create_sprint_started_notification(
        db: Session,
        sprint_id: int,
        sprint_name: str,
        project_id: int,
        started_by_user_id: int
    ):
        """Create notification when sprint starts"""
        # Broadcast to all project members
        notification_data = {
            "title": f"Sprint started: {sprint_name}",
            "message": f"Sprint '{sprint_name}' has officially started. Time to get to work!",
            "notification_type": NotificationType.SPRINT_STARTED,
            "priority": NotificationPriority.MEDIUM,
            "action_url": f"/project/{project_id}/sprint/{sprint_id}",
            "action_text": "View Sprint"
        }
        
        return notification_crud.broadcast_to_project_members(
            db=db,
            project_id=project_id,
            notification_data=notification_data,
            created_by_id=started_by_user_id,
            exclude_user_ids=[started_by_user_id]
        )
    
    @staticmethod
    def create_sprint_completed_notification(
        db: Session,
        sprint_id: int,
        sprint_name: str,
        project_id: int,
        completed_by_user_id: int,
        tasks_completed: int,
        tasks_total: int
    ):
        """Create notification when sprint is completed"""
        completion_rate = (tasks_completed / tasks_total * 100) if tasks_total > 0 else 0
        
        notification_data = {
            "title": f"Sprint completed: {sprint_name}",
            "message": f"Sprint '{sprint_name}' has been completed with {completion_rate:.0f}% of tasks finished ({tasks_completed}/{tasks_total})",
            "notification_type": NotificationType.SPRINT_COMPLETED,
            "priority": NotificationPriority.MEDIUM,
            "action_url": f"/project/{project_id}/sprint/{sprint_id}",
            "action_text": "View Results"
        }
        
        return notification_crud.broadcast_to_project_members(
            db=db,
            project_id=project_id,
            notification_data=notification_data,
            created_by_id=completed_by_user_id,
            exclude_user_ids=[completed_by_user_id]
        )
    
    @staticmethod
    def create_backlog_assigned_notification(
        db: Session,
        backlog_id: int,
        backlog_title: str,
        assigned_user_id: int,
        assigner_user_id: int,
        project_id: int,
        sprint_id: Optional[int] = None
    ):
        """Create notification when backlog item is assigned"""
        if assigned_user_id == assigner_user_id:
            return  # Don't notify self-assignment
        
        notification_data = NotificationCreate(
            title=f"Backlog item assigned: {backlog_title}",
            message=f"You have been assigned to work on '{backlog_title}'",
            notification_type=NotificationType.BACKLOG_ASSIGNED,
            priority=NotificationPriority.MEDIUM,
            action_url=f"/project/{project_id}/backlog",
            action_text="View Item",
            recipient_user_ids=[assigned_user_id],
            project_id=project_id,
            sprint_id=sprint_id,
            backlog_item_id=backlog_id
        )
        
        return notification_crud.create_with_recipients(
            db=db,
            obj_in=notification_data,
            created_by_id=assigner_user_id
        )
    
    @staticmethod
    def create_project_member_added_notification(
        db: Session,
        project_id: int,
        project_name: str,
        new_user_id: int,
        added_by_user_id: int,
        role: str
    ):
        """Create notification when user is added to project"""
        if new_user_id == added_by_user_id:
            return  # Don't notify when adding yourself
        
        notification_data = NotificationCreate(
            title=f"Added to project: {project_name}",
            message=f"You have been added to the project '{project_name}' as a {role}",
            notification_type=NotificationType.PROJECT_MEMBER_ADDED,
            priority=NotificationPriority.MEDIUM,
            action_url=f"/project/{project_id}/dashboard",
            action_text="View Project",
            recipient_user_ids=[new_user_id],
            project_id=project_id
        )
        
        return notification_crud.create_with_recipients(
            db=db,
            obj_in=notification_data,
            created_by_id=added_by_user_id
        )
    
    @staticmethod
    def create_backlog_created_notification(
        db: Session,
        backlog_id: int,
        backlog_title: str,
        backlog_type: str,
        project_id: int,
        created_by_user_id: int
    ):
        """Create notification when new backlog item is created"""
        # Get all project members except the creator
        project_members = user_project_crud.get_project_members(db, project_id)
        member_ids = [member["user"].id for member in project_members if member["user"].id != created_by_user_id]
        
        if not member_ids:
            return
        
        # Format backlog type for display
        type_display = backlog_type.replace('_', ' ').title()
        
        notification_data = NotificationCreate(
            title=f"New {type_display}: {backlog_title}",
            message=f"New {type_display.lower()} '{backlog_title}' has been added to the project backlog",
            notification_type=NotificationType.BACKLOG_CREATED,
            priority=NotificationPriority.LOW,
            action_url=f"/project/{project_id}/backlog",
            action_text="View Backlog",
            recipient_user_ids=member_ids,
            project_id=project_id,
            backlog_item_id=backlog_id
        )
        
        return notification_crud.create_with_recipients(
            db=db,
            obj_in=notification_data,
            created_by_id=created_by_user_id
        )
    
    @staticmethod
    def create_deadline_approaching_notification(
        db: Session,
        entity_type: str,  # 'task', 'sprint', 'project'
        entity_id: int,
        entity_title: str,
        deadline: datetime,
        project_id: int,
        assigned_user_ids: List[int],
        days_until_deadline: int
    ):
        """Create notification for approaching deadlines"""
        if days_until_deadline <= 0:
            return  # Don't create for past deadlines
        
        urgency = NotificationPriority.HIGH if days_until_deadline <= 1 else NotificationPriority.MEDIUM
        day_text = "day" if days_until_deadline == 1 else "days"
        
        action_urls = {
            'task': f"/project/{project_id}/kanban",
            'sprint': f"/project/{project_id}/sprint/{entity_id}",
            'project': f"/project/{project_id}/dashboard"
        }
        
        notification_data = NotificationCreate(
            title=f"Deadline approaching: {entity_title}",
            message=f"The {entity_type} '{entity_title}' is due in {days_until_deadline} {day_text}",
            notification_type=NotificationType.DEADLINE_APPROACHING,
            priority=urgency,
            action_url=action_urls.get(entity_type, f"/project/{project_id}"),
            action_text=f"View {entity_type.title()}",
            expires_at=deadline + timedelta(days=1),  # Expire 1 day after deadline
            recipient_user_ids=assigned_user_ids,
            project_id=project_id,
            **({"task_id": entity_id} if entity_type == 'task' else {}),
            **({"sprint_id": entity_id} if entity_type == 'sprint' else {})
        )
        
        return notification_crud.create_with_recipients(
            db=db,
            obj_in=notification_data,
            created_by_id=None  # System notification
        )


# Create a global instance
notification_helper = NotificationHelper()
