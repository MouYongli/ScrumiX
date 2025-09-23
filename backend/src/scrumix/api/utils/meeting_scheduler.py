"""
Meeting reminder scheduler utility
"""
import asyncio
from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..db.database import SessionLocal
from ..utils.notification_helpers import notification_helper


class MeetingReminderScheduler:
    """Scheduler for sending meeting reminders"""
    
    def __init__(self):
        self.is_running = False
        self.check_interval = 60  # Check every minute
        self.reminder_minutes = 30  # Send reminder 30 minutes before
    
    async def start(self):
        """Start the scheduler"""
        self.is_running = True
        print(f" Meeting reminder scheduler started (checking every {self.check_interval}s)")
        
        while self.is_running:
            try:
                await self.check_upcoming_meetings()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                print(f" Error in meeting reminder scheduler: {e}")
                await asyncio.sleep(self.check_interval)
    
    def stop(self):
        """Stop the scheduler"""
        self.is_running = False
        print(" Meeting reminder scheduler stopped")
    
    async def check_upcoming_meetings(self):
        """Check for meetings that need reminders"""
        db = SessionLocal()
        try:
            # Calculate the time window for reminders
            now = datetime.now()
            reminder_time = now + timedelta(minutes=self.reminder_minutes)
            
            # Find meetings that:
            # 1. Start within the reminder window (30 minutes from now)
            # 2. Haven't had a reminder sent yet
            # 3. Are in the future
            
            meetings_query = text("""
                SELECT 
                    m.id, 
                    m.title, 
                    m.start_datetime, 
                    m.project_id,
                    COUNT(n.id) as reminder_count
                FROM meetings m
                LEFT JOIN notifications n ON (
                    n.meeting_id = m.id 
                    AND n.notification_type = 'MEETING_REMINDER'
                    AND n.created_at > :today
                )
                WHERE 
                    m.start_datetime BETWEEN :now AND :reminder_time
                    AND m.start_datetime > :now
                GROUP BY m.id, m.title, m.start_datetime, m.project_id
                HAVING reminder_count = 0
            """)
            
            params = {
                "now": now.isoformat(),
                "reminder_time": reminder_time.isoformat(),
                "today": now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            }
            
            result = db.execute(meetings_query, params).fetchall()
            
            if result:
                print(f" Found {len(result)} meetings needing reminders")
                
                for row in result:
                    meeting_id, title, start_datetime, project_id, _ = row
                    
                    # Convert start_datetime string back to datetime object
                    start_time = datetime.fromisoformat(start_datetime.replace('Z', '+00:00')) if isinstance(start_datetime, str) else start_datetime
                    
                    # Calculate exact minutes until meeting
                    minutes_until = int((start_time - now).total_seconds() / 60)
                    
                    print(f" Sending reminder for meeting '{title}' (starts in {minutes_until} minutes)")
                    
                    try:
                        # Send the reminder notification
                        notification_helper.create_meeting_reminder_notification(
                            db=db,
                            meeting_id=meeting_id,
                            meeting_title=title,
                            meeting_start=start_time,
                            project_id=project_id,
                            minutes_until_meeting=minutes_until
                        )
                        print(f" Reminder sent for meeting '{title}'")
                        
                    except Exception as e:
                        print(f" Failed to send reminder for meeting '{title}': {e}")
            else:
                # Only print this occasionally to avoid spam
                if now.minute % 5 == 0:  # Every 5 minutes
                    print(f" No meetings need reminders (checked at {now.strftime('%H:%M')})")
            
        except Exception as e:
            print(f" Error checking meetings: {e}")
        finally:
            db.close()


# Global instance
meeting_scheduler = MeetingReminderScheduler()


async def start_meeting_scheduler():
    """Start the meeting reminder scheduler"""
    await meeting_scheduler.start()


def stop_meeting_scheduler():
    """Stop the meeting reminder scheduler"""
    meeting_scheduler.stop()


def check_meetings_once():
    """One-time check for upcoming meetings (for testing)"""
    import asyncio
    
    async def run_check():
        await meeting_scheduler.check_upcoming_meetings()
    
    asyncio.run(run_check())
