"""
API routes for velocity and burndown tracking
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import date

from ..core.security import get_current_user
from ..db.database import get_db
from ..crud.burndown_snapshot import burndown_snapshot_crud
from ..services.velocity_tracking import velocity_tracking_service
from ..schemas.burndown_snapshot import (
    BurndownSnapshotResponse,
    BurndownChartData,
    BurndownTrendAnalysis,
    ProjectBurndownSummary
)


router = APIRouter()


@router.get("/sprint/{sprint_id}/burndown", response_model=BurndownChartData)
async def get_sprint_burndown_chart(
    sprint_id: int,
    start_date: Optional[date] = Query(None, description="Start date for chart data"),
    end_date: Optional[date] = Query(None, description="End date for chart data"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get burndown chart data for a sprint"""
    try:
        # Respect optional date filters
        if start_date or end_date:
            snapshots = burndown_snapshot_crud.get_sprint_snapshots(db, sprint_id, start_date, end_date)
            # Build chart data from filtered snapshots
            if not snapshots:
                return {
                    "dates": [],
                    "remaining_points": [],
                    "completed_points": [],
                    "total_points": [],
                    "ideal_line": []
                }

            snapshots.sort(key=lambda x: x.date)
            dates = [s.date.isoformat() for s in snapshots]
            remaining_points = [s.remaining_story_point for s in snapshots]
            completed_points = [s.completed_story_point for s in snapshots]
            total_points = [s.completed_story_point + s.remaining_story_point for s in snapshots]

            start_total = total_points[0]
            num_days = len(snapshots)
            ideal_line = []
            for i in range(num_days):
                ideal_remaining = start_total * (1 - (i / (num_days - 1))) if num_days > 1 else start_total
                ideal_line.append(max(0, ideal_remaining))

            chart_data = {
                "dates": dates,
                "remaining_points": remaining_points,
                "completed_points": completed_points,
                "total_points": total_points,
                "ideal_line": ideal_line
            }
        else:
            chart_data = burndown_snapshot_crud.get_burndown_chart_data(db, sprint_id)
        return chart_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sprint/{sprint_id}/burndown/snapshots", response_model=List[BurndownSnapshotResponse])
async def get_sprint_burndown_snapshots(
    sprint_id: int,
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get burndown snapshots for a sprint"""
    try:
        snapshots = burndown_snapshot_crud.get_sprint_snapshots(
            db, sprint_id, start_date, end_date
        )
        return snapshots
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sprint/{sprint_id}/burndown/trend", response_model=BurndownTrendAnalysis)
async def get_sprint_burndown_trend(
    sprint_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get burndown trend analysis for a sprint"""
    try:
        trend_analysis = burndown_snapshot_crud.calculate_burndown_trend(db, sprint_id)
        return trend_analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sprint/{sprint_id}/burndown/backfill")
async def backfill_sprint_burndown_snapshots(
    sprint_id: int,
    start_date: Optional[date] = Query(None, description="Start date for backfill"),
    end_date: Optional[date] = Query(None, description="End date for backfill"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Backfill missing burndown snapshots for a sprint"""
    try:
        snapshots_created = velocity_tracking_service.create_daily_burndown_snapshots(
            db, sprint_id, start_date, end_date
        )
        return {
            "message": f"Created {snapshots_created} burndown snapshots",
            "snapshots_created": snapshots_created
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/project/{project_id}/velocity/average")
async def get_project_average_velocity(
    project_id: int,
    exclude_sprint_id: Optional[int] = Query(None, description="Sprint ID to exclude from calculation"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get average velocity for a project across completed sprints"""
    try:
        average_velocity = velocity_tracking_service.calculate_sprint_velocity_average(
            db, project_id, exclude_sprint_id
        )
        return {
            "project_id": project_id,
            "average_velocity": average_velocity
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/project/{project_id}/velocity/trend")
async def get_project_velocity_trend(
    project_id: int,
    limit: int = Query(5, ge=1, le=20, description="Number of recent sprints to include"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get velocity trend for recent sprints in a project"""
    try:
        trend_data = velocity_tracking_service.get_sprint_velocity_trend(
            db, project_id, limit
        )
        return {
            "project_id": project_id,
            "velocity_trend": trend_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/project/{project_id}/velocity/metrics")
async def get_project_velocity_metrics(
    project_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive velocity metrics for a project"""
    try:
        metrics = velocity_tracking_service.get_project_velocity_metrics(db, project_id)
        return {
            "project_id": project_id,
            **metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/project/{project_id}/burndown/summary", response_model=ProjectBurndownSummary)
async def get_project_burndown_summary(
    project_id: int,
    days: int = Query(30, ge=1, le=365, description="Number of days to include in summary"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get burndown summary for all sprints in a project"""
    try:
        summary = burndown_snapshot_crud.get_project_burndown_summary(db, project_id, days)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/project/{project_id}/burndown/snapshots", response_model=List[BurndownSnapshotResponse])
async def get_project_burndown_snapshots(
    project_id: int,
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get burndown snapshots for all sprints in a project"""
    try:
        snapshots = burndown_snapshot_crud.get_project_snapshots(
            db, project_id, start_date, end_date
        )
        return snapshots
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sprint/{sprint_id}/burndown/snapshots")
async def delete_sprint_burndown_snapshots(
    sprint_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all burndown snapshots for a sprint"""
    try:
        deleted_count = burndown_snapshot_crud.delete_sprint_snapshots(db, sprint_id)
        return {
            "message": f"Deleted {deleted_count} burndown snapshots",
            "deleted_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def velocity_health_check():
    """Health check endpoint for velocity tracking"""
    return {"status": "healthy", "service": "velocity_tracking"}
