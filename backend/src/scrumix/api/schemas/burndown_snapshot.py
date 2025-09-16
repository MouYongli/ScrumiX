"""
Pydantic schemas for Burndown Snapshots
"""
from typing import Optional, List
import datetime as dt
from pydantic import BaseModel, ConfigDict, Field


class BurndownSnapshotBase(BaseModel):
    """Base schema for burndown snapshots"""
    sprint_id: int = Field(..., gt=0, description="Sprint ID")
    project_id: int = Field(..., gt=0, description="Project ID")
    date: dt.date = Field(..., description="Date of the snapshot")
    completed_story_point: int = Field(..., ge=0, description="Completed story points")
    remaining_story_point: int = Field(..., ge=0, description="Remaining story points")


class BurndownSnapshotCreate(BurndownSnapshotBase):
    """Schema for creating a burndown snapshot"""
    pass


class BurndownSnapshotUpdate(BaseModel):
    """Schema for updating a burndown snapshot"""
    completed_story_point: Optional[int] = Field(None, ge=0, description="Completed story points")
    remaining_story_point: Optional[int] = Field(None, ge=0, description="Remaining story points")


class BurndownSnapshotResponse(BurndownSnapshotBase):
    """Schema for burndown snapshot responses"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: dt.datetime
    updated_at: dt.datetime
    
    @property
    def total_story_points(self) -> int:
        """Calculate total story points for this snapshot"""
        return self.completed_story_point + self.remaining_story_point
    
    @property
    def completion_percentage(self) -> float:
        """Calculate completion percentage for this snapshot"""
        total = self.total_story_points
        if total == 0:
            return 0.0
        return (self.completed_story_point / total) * 100.0


class BurndownChartData(BaseModel):
    """Schema for burndown chart data"""
    dates: List[str] = Field(..., description="List of dates in ISO format")
    remaining_points: List[int] = Field(..., description="Remaining story points for each date")
    completed_points: List[int] = Field(..., description="Completed story points for each date")
    total_points: List[int] = Field(..., description="Total story points for each date")
    ideal_line: List[float] = Field(..., description="Ideal burndown line")


class BurndownTrendAnalysis(BaseModel):
    """Schema for burndown trend analysis"""
    total_snapshots: int = Field(..., description="Total number of snapshots")
    trend: str = Field(..., description="Trend direction: decreasing, increasing, stable, insufficient_data, no_data")
    velocity: float = Field(..., description="Average daily velocity (story points per day)")
    projected_completion: Optional[dt.date] = Field(None, description="Projected completion date")
    is_on_track: bool = Field(..., description="Whether the sprint is on track")
    current_remaining: int = Field(..., description="Current remaining story points")
    current_completed: int = Field(..., description="Current completed story points")


class ProjectBurndownSummary(BaseModel):
    """Schema for project burndown summary"""
    total_snapshots: int = Field(..., description="Total number of snapshots")
    active_sprints: int = Field(..., description="Number of active sprints")
    total_story_points: int = Field(..., description="Total story points across all sprints")
    completed_story_points: int = Field(..., description="Completed story points across all sprints")
    remaining_story_points: int = Field(..., description="Remaining story points across all sprints")
    completion_percentage: float = Field(..., description="Overall completion percentage")
