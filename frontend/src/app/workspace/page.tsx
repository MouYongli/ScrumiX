'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Calendar, Users, CheckCircle2, Clock, Plus, ExternalLink, ArrowRight, Target, BarChart3
} from 'lucide-react';

interface Task {
  id: number;
  title: string;
  priority: 'low' | 'medium' | 'high';
}

interface TodoTask extends Task {
  dueDate: string;
}

interface InProgressTask extends Task {
  assignedTo: string;
  startedDate: string;
}

interface Meeting {
  id: number;
  title: string;
  date: string;
  time: string;
  participants: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
  role: string;
  status: string;
  color: string;
  progress: number;
  members: number;
  todoTasks: TodoTask[];
  inProgressTasks: InProgressTask[];
  upcomingMeetings: Meeting[];
}

// Mock data for projects
const projects: Project[] = [
  {
    id: '1',
    name: 'E-commerce Platform Rebuild',
    description: 'Modern e-commerce platform based on React',
    role: 'Product Owner',
    status: 'active',
    color: 'bg-blue-500',
    progress: 32,
    members: 8,
    todoTasks: [
      {
        id: 1,
        title: 'Design user authentication flow',
        dueDate: '2024-01-16',
        priority: 'medium',
      },
      {
        id: 2,
        title: 'Setup database migrations',
        dueDate: '2024-01-16',
        priority: 'medium',
      },
    ] as TodoTask[],
    inProgressTasks: [
      {
        id: 3,
        title: 'Implement payment gateway integration',
        assignedTo: 'You',
        startedDate: '2024-01-08',
        priority: 'high'
      },
      {
        id: 4,
        title: 'State responsive product catalog',
        assignedTo: 'You',
        startedDate: '2024-01-12',
        priority: 'medium'
      },
    ] as InProgressTask[],
    upcomingMeetings: [
      {
        id: 1,
        title: 'Sprint Planning',
        date: '2024-01-16',
        time: '4 hr',
        participants: 6,
      },
      {
        id: 2,
        title: 'Daily Standup',
        date: '2024-01-16',
        time: '± 5',
        participants: 4,
      },
    ],
  },
  {
    id: '2',
    name: 'Mobile App Development',
    description: 'Cross-platform mobile application project',
    role: 'Scrum Master',
    status: 'active',
    color: 'bg-green-500',
    progress: 65,
    members: 5,
    todoTasks: [
      {
        id: 5,
        title: 'Design onboarding screens',
        dueDate: '2024-01-17',
        priority: 'high',
      },
    ] as TodoTask[],
    inProgressTasks: [
      {
        id: 7,
        title: 'User profile management',
        assignedTo: 'You',
        startedDate: '2024-01-11',
        priority: 'medium'
      },
    ] as InProgressTask[],
    upcomingMeetings: [],
  },
];

const MyWorkspacePage = () => {
  const getStatusBadge = (status: string) => {
    return (
      <span className="px-3 py-1 text-xs font-medium rounded-md bg-green-600 text-white">
        Active
      </span>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="min-h-screen text-white p-8" style={{backgroundColor: '#131625'}}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            My Workspace
          </h1>
          <p className="text-gray-400 text-sm">
            Overview of all your projects & tasks
          </p>
        </div>

        {/* Projects */}
        <div className="space-y-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-[#1e2530] rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-colors"
            >
              {/* Project Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-4">
                  <div className={`w-3 h-3 ${project.color} rounded-sm mt-2`}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Link 
                        href={`/project/${project.id}/dashboard`}
                        className="text-xl font-semibold text-white hover:text-gray-300 transition-colors"
                      >
                        {project.name}
                      </Link>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">{project.members}</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-base mt-1 mb-2">
                      {project.description}
                    </p>
                    <p className="text-gray-500 text-base">
                      Role: {project.role}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(project.status)}
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-2xl font-bold text-white">{project.progress}%</span>
                      <div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden min-w-[200px]">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Sections Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Todo Section */}
                <div className="bg-[#232b3a] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-white">Todo</h3>
                    <span className="text-xs text-gray-400">
                      {project.todoTasks.length} tasks
                    </span>
                  </div>
                  <div className="space-y-3">
                    {project.todoTasks.map((task) => (
                      <div key={task.id} className="space-y-2 bg-[#293043] rounded-lg p-3">
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {task.title}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Due: {task.dueDate}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* In Progress Section */}
                <div className="bg-[#232b3a] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-white">In Progress</h3>
                    <span className="text-xs text-gray-400">
                      {project.inProgressTasks.length} task{project.inProgressTasks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {project.inProgressTasks.map((task) => (
                      <div key={task.id} className="space-y-2 bg-[#293043] rounded-lg p-3">
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {task.title}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                            <span className="text-xs text-gray-500">
                              Start {task.startedDate}
                            </span>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Meetings Section */}
                <div className="bg-[#232b3a] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-white">Meetings</h3>
                    <span className="text-xs text-gray-400">
                      {project.upcomingMeetings.length} upcoming
                    </span>
                  </div>
                  <div className="space-y-3">
                    {project.upcomingMeetings.length > 0 ? (
                      project.upcomingMeetings.map((meeting) => (
                        <div key={meeting.id} className="space-y-2 bg-[#293043] rounded-lg p-3">
                          <p className="text-sm text-gray-300 leading-relaxed">
                            {meeting.title}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>{meeting.date}</span>
                              <span>• {meeting.participants}</span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {meeting.time}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <Calendar className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                        <p className="text-xs text-gray-500">No upcoming meetings</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyWorkspacePage; 