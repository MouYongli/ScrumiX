// Mappers to convert between API types and Domain types
import { 
  ApiUser, ApiTask, ApiMeeting, ApiProject, ApiSprint 
} from '@/types/api';
import { 
  User, Task, Meeting, Project, ProjectWithDetails, Sprint 
} from '@/types/domain';
import { MeetingType, TaskPriority } from '@/types/enums';

export const mapApiUserToDomain = (apiUser: ApiUser): User => ({
  id: apiUser.id,
  username: apiUser.username,
  email: apiUser.email,
  firstName: apiUser.first_name,
  lastName: apiUser.last_name,
  displayName: apiUser.first_name && apiUser.last_name 
    ? `${apiUser.first_name} ${apiUser.last_name}`
    : apiUser.username,
  isActive: apiUser.is_active ?? true,
});

export const mapApiTaskToDomain = (apiTask: ApiTask): Task => ({
  id: apiTask.id,
  title: apiTask.title,
  description: apiTask.description,
  status: apiTask.status,
  priority: apiTask.priority,
  storyPoint: apiTask.story_point,
  sprintId: apiTask.sprint_id,
  createdAt: new Date(apiTask.created_at),
  updatedAt: new Date(apiTask.updated_at),
  assignedUsers: apiTask.assignedUsers?.map(mapApiUserToDomain) || [],
  // Computed UI properties
  priorityColor: getPriorityColor(apiTask.priority),
});

export const mapApiMeetingToDomain = (apiMeeting: ApiMeeting): Meeting => {
  const startDateTime = new Date(apiMeeting.startDatetime);
  const endDateTime = new Date(startDateTime.getTime() + apiMeeting.duration * 60000);
  const now = new Date();
  
  return {
    id: apiMeeting.id,
    title: apiMeeting.title,
    meetingType: apiMeeting.meetingType,
    startDateTime,
    description: apiMeeting.description,
    duration: apiMeeting.duration,
    location: apiMeeting.location,
    sprintId: apiMeeting.sprintId,
    projectId: apiMeeting.projectId,
    createdAt: new Date(apiMeeting.createdAt),
    updatedAt: new Date(apiMeeting.updatedAt),
    participants: [], // Backend doesn't include participants in MeetingResponse
    // Computed UI properties
    endDateTime,
    isUpcoming: startDateTime > now,
    isOngoing: startDateTime <= now && endDateTime > now,
    displayDuration: formatDuration(apiMeeting.duration),
    meetingTypeDisplay: formatMeetingType(apiMeeting.meetingType),
  };
};

export const mapApiProjectToDomain = (apiProject: ApiProject): Project => ({
  id: apiProject.id,
  name: apiProject.name,
  description: apiProject.description,
  status: apiProject.status,
  startDate: apiProject.start_date ? new Date(apiProject.start_date) : undefined,
  endDate: apiProject.end_date ? new Date(apiProject.end_date) : undefined,
  color: apiProject.color,
  lastActivityAt: new Date(apiProject.last_activity_at),
  createdAt: apiProject.created_at ? new Date(apiProject.created_at) : new Date(),
  updatedAt: apiProject.updated_at ? new Date(apiProject.updated_at) : new Date(),
  progress: apiProject.progress,
  members: [], // Backend returns count only, not array
  tasksCompleted: apiProject.tasks.completed,
  tasksTotal: apiProject.tasks.total,
  // Computed UI properties
  memberCount: apiProject.members,
  isActive: apiProject.status === 'active',
  statusDisplay: formatProjectStatus(apiProject.status),
});

export const mapApiSprintToDomain = (apiSprint: ApiSprint): Sprint => ({
  id: apiSprint.id,
  sprintName: apiSprint.sprintName,
  sprintGoal: apiSprint.sprintGoal,
  startDate: new Date(apiSprint.startDate),
  endDate: new Date(apiSprint.endDate),
  status: apiSprint.status,
  sprintCapacity: apiSprint.sprintCapacity,
  projectId: apiSprint.projectId,
  createdAt: new Date(apiSprint.createdAt),
  updatedAt: new Date(apiSprint.updatedAt),
});

// Helper functions
const getPriorityColor = (priority: TaskPriority): string => {
  switch (priority) {
    case TaskPriority.CRITICAL:
      return 'bg-purple-500 text-white';
    case TaskPriority.HIGH:
      return 'bg-red-500 text-white';
    case TaskPriority.MEDIUM:
      return 'bg-orange-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}${mins > 0 ? ` ${mins} min` : ''}`;
  }
  return `${mins} min`;
};

const formatMeetingType = (meetingType: MeetingType): string => {
  return meetingType.replace(/_/g, ' ').toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
};

const formatProjectStatus = (status: string): string => {
  return status.replace(/_/g, ' ').toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
};

// Create ProjectWithDetails from Project and related data
export const createProjectWithDetails = (
  project: Project,
  tasks: Task[],
  meetings: Meeting[]
): ProjectWithDetails => ({
  ...project,
  tasks,
  upcomingMeetings: meetings,
  todoTasks: tasks.filter(task => task.status === 'todo'),
  inProgressTasks: tasks.filter(task => task.status === 'in_progress'),
  doneTasks: tasks.filter(task => task.status === 'done'),
});
