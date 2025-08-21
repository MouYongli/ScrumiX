export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  DONE = "done",
  CANCELLED = "cancelled"
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

export enum ProjectStatus {
  PLANNING = "planning",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  ON_HOLD = "on_hold"
}

export enum MeetingType {
  TEAM_MEETING = "team_meeting",
  SPRINT_PLANNING = "sprint_planning",
  SPRINT_REVIEW = "sprint_review",
  SPRINT_RETROSPECTIVE = "sprint_retrospective",
  DAILY_STANDUP = "daily_standup",
  OTHER = "other"
}

export enum MeetingParticipantRole {
  FACILITATOR = "facilitator",
  SCRUM_MASTER = "scrum_master",
  PRODUCT_OWNER = "product_owner",
  DEVELOPER = "developer",
  GUEST = "guest"
}