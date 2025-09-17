'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ArrowLeft, TrendingUp, BarChart3, Target, Clock, AlertCircle } from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { useDateFormat } from '@/hooks/useDateFormat';
import { api } from '@/utils/api';

// Component for rendering user-aware formatted dates
const FormattedDate: React.FC<{ 
  date: Date; 
  includeTime?: boolean; 
  short?: boolean;
}> = ({ date, includeTime = false, short = false }) => {
  const [formattedDate, setFormattedDate] = useState<string>(date.toLocaleDateString());
  const { formatDate, formatDateShort } = useDateFormat();

  useEffect(() => {
    let isMounted = true;
    
    const format = async () => {
      try {
        // When includeTime is true, always use formatDate regardless of short flag
        // formatDateShort doesn't support time display
        const result = includeTime 
          ? await formatDate(date, true)
          : short 
            ? await formatDateShort(date)
            : await formatDate(date, false);
        
        if (isMounted) {
          setFormattedDate(result);
        }
      } catch (error) {
        console.error('Error formatting date:', error);
        // Fallback to simple formatting
        if (isMounted) {
          setFormattedDate(
            includeTime 
              ? `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
              : date.toLocaleDateString()
          );
        }
      }
    };
    
    // Add a small delay to batch API calls
    const timeoutId = setTimeout(format, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [date, includeTime, short, formatDate, formatDateShort]);

  return <span>{formattedDate}</span>;
};

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

// Interface for velocity data point from backend
interface VelocityTrendPoint {
  sprint_id: number;
  sprint_name: string;
  velocity_points: number;
  end_date: string | null;
}

// Interface for project velocity metrics from backend
interface ProjectVelocityMetrics {
  project_id: number;
  total_completed_sprints: number;
  average_velocity: number;
  min_velocity: number;
  max_velocity: number;
  velocity_trend: VelocityTrendPoint[];
  total_story_points: number;
}

// Interface for chart data display
interface VelocityDataPoint {
  sprint: string;
  velocity: number;
  completedStories: number;
  totalStories: number;
  startDate: string;
  endDate: string;
  sortOrder?: number;
}

const ProjectVelocity: React.FC<ProjectVelocityProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];

  const [velocityMetrics, setVelocityMetrics] = useState<ProjectVelocityMetrics | null>(null);
  const [velocityData, setVelocityData] = useState<VelocityDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('Project');

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

  // Fetch velocity metrics from backend
  useEffect(() => {
    const fetchVelocityData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch project velocity metrics from the new velocity tracking API
        const metricsResponse = await api.velocity.getProjectVelocityMetrics(parseInt(projectId, 10));
        if (!metricsResponse.data) {
          throw new Error(metricsResponse.error || 'Failed to fetch velocity metrics');
        }

        const metrics = metricsResponse.data;
        setVelocityMetrics(metrics);

        // Transform backend velocity trend data to frontend display format
        // Backend already returns data in chronological order (earliest first)
        const velocityDataPoints: VelocityDataPoint[] = metrics.velocity_trend.map((trend, index) => {
          // For display purposes, we'll estimate story counts based on velocity
          // In a real scenario, you might want to fetch additional data or store this in the backend
          const estimatedTotalStories = Math.ceil(trend.velocity_points / 3); // Assume avg 3 points per story
          const estimatedCompletedStories = estimatedTotalStories; // Since these are completed sprints
          
          return {
            sprint: trend.sprint_name,
            velocity: trend.velocity_points,
            completedStories: estimatedCompletedStories,
            totalStories: estimatedTotalStories,
            startDate: trend.end_date || '', // We only have end_date from backend
            endDate: trend.end_date || '',
            // Add sort key to ensure proper ordering
            sortOrder: index
          };
        });

        // Ensure data is sorted chronologically (should already be, but double-check)
        velocityDataPoints.sort((a, b) => {
          if (a.endDate && b.endDate) {
            return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
          }
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        });

        setVelocityData(velocityDataPoints);
      } catch (error) {
        console.error('Error fetching velocity data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch velocity data');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchVelocityData();
    }
  }, [projectId]);

  // Use velocity statistics from backend or calculate from frontend data as fallback
  const averageVelocity = velocityMetrics?.average_velocity || 0;
  const highestVelocity = velocityMetrics?.max_velocity || 0;
  const lowestVelocity = velocityMetrics?.min_velocity || 0;
  const totalCompletedStoryPoints = velocityMetrics?.total_story_points || 0;
  const totalCompletedStories = velocityData.reduce((sum, data) => sum + data.completedStories, 0);
  const totalCompletedSprints = velocityMetrics?.total_completed_sprints || 0;

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
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCompletedSprints}</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Velocity</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(averageVelocity)}</p>
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Velocity Trend</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {velocityData.length} completed sprint{velocityData.length !== 1 ? 's' : ''} (chronological order)
            </p>
          </div>
          <div className="w-full h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={velocityData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="sprint" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                  interval={0} 
                  tick={{ fill: '#6B7280', fontSize: 12 }} 
                  label={{ 
                    value: 'Sprint (Chronological Order)', 
                    position: 'insideBottom', 
                    offset: -5, 
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
                  formatter={(value, name) => [
                    `${value} points`,
                    'Story Points Completed'
                  ]}
                  labelFormatter={(label) => `Sprint: ${label}`}
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
                    End Date
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
                      {data.endDate ? (
                        <FormattedDate date={new Date(data.endDate)} short={true} />
                      ) : (
                        'No date'
                      )}
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