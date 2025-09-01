'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ArrowLeft, TrendingUp, BarChart3, Target, Clock, AlertCircle } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { api } from '@/utils/api';

interface ProjectVelocityProps {
  params: Promise<{ 'project-id': string }>;
}

// Interface matching backend API response
interface Sprint {
  id: number;
  sprintName: string;
  sprintGoal?: string;
  startDate: string;
  endDate: string;
  status: string;
  sprintCapacity?: number;
  projectId: number;
  createdAt: string;
  updatedAt: string;
}

// Interface for velocity data point
interface VelocityDataPoint {
  sprint: string;
  velocity: number;
  completedStories: number;
  totalStories: number;
  startDate: string;
  endDate: string;
}

// Interface for backlog item with story points
interface BacklogItem {
  id: number;
  title: string;
  story_point: number;
  status: string;
  sprint_id?: number;
}

const ProjectVelocity: React.FC<ProjectVelocityProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [velocityData, setVelocityData] = useState<VelocityDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('Project');
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: projectName, href: `/project/${projectId}/dashboard` },
    { label: 'Velocity', icon: <TrendingUp className="w-4 h-4" /> }
  ];

  // Fetch project details
  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        const response = await api.projects.getById(parseInt(projectId, 10));
        if (response.data) {
          setProjectName(response.data.name);
        }
      } catch (error) {
        console.error('Error fetching project details:', error);
        // Keep default project name if fetch fails
      }
    };

    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  // Fetch sprints and calculate velocity
  useEffect(() => {
    const fetchSprintsAndVelocity = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all sprints for the project
        const sprintsResponse = await api.sprints.getByProject(parseInt(projectId, 10));
        if (!sprintsResponse.data) {
          throw new Error(sprintsResponse.error || 'Failed to fetch sprints');
        }

        const projectSprints = sprintsResponse.data;
        setSprints(projectSprints);

        // Filter for completed sprints only (as per requirements)
        const completedSprints = projectSprints.filter(sprint => sprint.status === 'completed');
        
        // Sort by completion date (end date)
        completedSprints.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

        // Fetch backlog items for each completed sprint to get story points
        const velocityDataPoints: VelocityDataPoint[] = [];
        
        for (const sprint of completedSprints) {
          try {
            // Get sprint backlog items
            const backlogResponse = await api.sprints.getSprintBacklog(sprint.id);
            if (backlogResponse.data) {
              const backlogItems: BacklogItem[] = backlogResponse.data;
              
              // Calculate completed story points (only items with status 'done')
              const completedItems = backlogItems.filter(item => item.status === 'done');
              const completedStoryPoints = completedItems.reduce((sum, item) => sum + (item.story_point || 0), 0);
              const totalStoryPoints = backlogItems.reduce((sum, item) => sum + (item.story_point || 0), 0);
              
              velocityDataPoints.push({
                sprint: sprint.sprintName,
                velocity: completedStoryPoints,
                completedStories: completedItems.length,
                totalStories: backlogItems.length,
                startDate: sprint.startDate,
                endDate: sprint.endDate
              });
            } else {
              // If no backlog data, create entry with 0 velocity
              velocityDataPoints.push({
                sprint: sprint.sprintName,
                velocity: 0,
                completedStories: 0,
                totalStories: 0,
                startDate: sprint.startDate,
                endDate: sprint.endDate
              });
            }
          } catch (backlogError) {
            console.error(`Error fetching backlog for sprint ${sprint.id}:`, backlogError);
            // Add sprint with 0 velocity if backlog fetch fails
            velocityDataPoints.push({
              sprint: sprint.sprintName,
              velocity: 0,
              completedStories: 0,
              totalStories: 0,
              startDate: sprint.startDate,
              endDate: sprint.endDate
            });
          }
        }

        setVelocityData(velocityDataPoints);
      } catch (error) {
        console.error('Error fetching velocity data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch velocity data');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchSprintsAndVelocity();
    }
  }, [projectId]);

  // Calculate velocity statistics
  const averageVelocity = velocityData.length > 0 
    ? Math.round(velocityData.reduce((sum, data) => sum + data.velocity, 0) / velocityData.length)
    : 0;

  const highestVelocity = velocityData.length > 0 
    ? Math.max(...velocityData.map(d => d.velocity))
    : 0;

  const lowestVelocity = velocityData.length > 0 
    ? Math.min(...velocityData.map(d => d.velocity))
    : 0;

  const totalCompletedStoryPoints = velocityData.reduce((sum, data) => sum + data.velocity, 0);
  const totalCompletedStories = velocityData.reduce((sum, data) => sum + data.completedStories, 0);

  // Early return for loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbItems} />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading velocity data...</p>
        </div>
      </div>
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbItems} />
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error Loading Velocity Data
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Velocity Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your team's velocity and sprint performance over time
          </p>
        </div>
        <Link 
          href={`/project/${projectId}/sprint`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sprints
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed Sprints</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{velocityData.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Story Points</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCompletedStoryPoints}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Stories</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCompletedStories}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Velocity</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageVelocity}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Velocity Range</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{lowestVelocity}-{highestVelocity}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Velocity Chart */}
      {velocityData.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Velocity Trend</h2>
          <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={velocityData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="sprint" 
                  angle={-20} 
                  textAnchor="end" 
                  height={60} 
                  interval={0} 
                  tick={{ fill: '#6B7280' }} 
                  label={{ 
                    value: 'Sprint', 
                    position: 'insideBottom', 
                    offset: -10, 
                    fill: '#6B7280' 
                  }} 
                />
                <YAxis 
                  allowDecimals={false} 
                  tick={{ fill: '#6B7280' }} 
                  label={{ 
                    value: 'Story Points Completed', 
                    angle: -90, 
                    position: 'insideLeft', 
                    fill: '#6B7280' 
                  }} 
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
            <Legend verticalAlign="top" />
                <Line 
                  type="monotone" 
                  dataKey="velocity" 
                  name="Completed Story Points" 
                  stroke="#3B82F6" 
                  strokeWidth={3} 
                  dot={{ 
                    stroke: '#3B82F6', 
                    strokeWidth: 2, 
                    fill: '#FFFFFF', 
                    r: 6 
                  }} 
                  activeDot={{ r: 8, stroke: '#1E40AF' }} 
                />
          </LineChart>
        </ResponsiveContainer>
      </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Velocity Data Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Complete some sprints to start tracking your team's velocity.
          </p>
          <Link 
            href={`/project/${projectId}/sprint`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            View Sprints
          </Link>
        </div>
      )}



      {/* Sprint Details Table */}
      {velocityData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sprint Performance Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sprint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Completed Story Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Stories Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Period
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {velocityData.map((data, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {data.sprint}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400">
                        {data.velocity} pts
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {data.completedStories} / {data.totalStories}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(data.startDate).toLocaleDateString()} - {new Date(data.endDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectVelocity; 