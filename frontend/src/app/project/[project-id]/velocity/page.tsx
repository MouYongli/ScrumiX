'use client';

import React from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from 'lucide-react';

interface ProjectVelocityProps {
  params: Promise<{ 'project-id': string }>;
}

// Mock Sprint type and data (should be imported/shared in real app)
interface Sprint {
  id: string;
  name: string;
  goal: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  capacity: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  totalStories: number;
  completedStories: number;
  teamMembers: string[];
  createdAt: string;
}

// TODO: Replace with real data source or context
const mockSprints: Sprint[] = [
  {
    id: '1',
    name: 'Sprint 1 - Authentication Foundation',
    goal: 'Implement core user authentication system and basic user management features',
    status: 'completed',
    startDate: '2025-06-15',
    endDate: '2025-07-05',
    capacity: 40,
    totalStoryPoints: 38,
    completedStoryPoints: 38,
    totalStories: 8,
    completedStories: 8,
    teamMembers: ['Sarah Johnson', 'Mike Chen', 'Emily Rodriguez'],
    createdAt: '2025-06-15',
  },
  {
    id: '2',
    name: 'Sprint 2 - E-commerce Core',
    goal: 'Build shopping cart, product catalog, and basic checkout functionality',
    status: 'active',
    startDate: '2025-07-15',
    endDate: '2025-07-29',
    capacity: 45,
    totalStoryPoints: 42,
    completedStoryPoints: 28,
    totalStories: 10,
    completedStories: 6,
    teamMembers: ['Sarah Johnson', 'Mike Chen', 'Emily Rodriguez', 'David Park'],
    createdAt: '2024-02-25',
  },
  {
    id: '3',
    name: 'Sprint 3 - Payment Integration',
    goal: 'Integrate payment gateway and complete order processing workflow',
    status: 'planning',
    startDate: '2025-07-30',
    endDate: '2025-08-13',
    capacity: 50,
    totalStoryPoints: 0,
    completedStoryPoints: 0,
    totalStories: 0,
    completedStories: 0,
    teamMembers: ['Sarah Johnson', 'Mike Chen', 'Emily Rodriguez', 'David Park'],
    createdAt: '2024-03-01',
  },
];

const calculateVelocity = () => {
  // Only include completed and active sprints, in order
  const relevantSprints = mockSprints.filter(sprint => sprint.status === 'completed' || sprint.status === 'active');
  return relevantSprints.map((sprint, index) => ({
    sprint: `Sprint ${sprint.id}`,
    velocity: sprint.completedStoryPoints
  }));
};

const velocityData = calculateVelocity();
const averageVelocity = velocityData.length > 0 
  ? Math.round(velocityData.reduce((sum, data) => sum + data.velocity, 0) / velocityData.length)
  : 0;

const ProjectVelocity: React.FC<ProjectVelocityProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/project/${projectId}/sprint`} className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          Back to Sprints
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Velocity Graph</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        This chart shows the actual velocity (completed story points) for each completed and active sprint.
      </p>
      <div className="w-full h-96 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={velocityData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="sprint" angle={-20} textAnchor="end" height={60} interval={0} tick={{ fill: '#374151' }} label={{ value: 'Sprint', position: 'insideBottom', offset: -10, fill: '#374151' }} />
            <YAxis allowDecimals={false} tick={{ fill: '#374151' }} label={{ value: 'Velocity', angle: -90, position: 'insideLeft', fill: '#374151' }} />
            <Tooltip />
            <Legend verticalAlign="top" />
            <Line type="monotone" dataKey="velocity" name="Actual" stroke="#dc2626" strokeWidth={3} dot={{ stroke: '#dc2626', strokeWidth: 2, fill: '#fff', r: 6 }} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Average Velocity</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageVelocity}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Highest Velocity</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.max(...velocityData.map(d => d.velocity), 0)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Lowest Velocity</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.min(...velocityData.map(d => d.velocity), 0)}</p>
        </div>
      </div>
    </div>
  );
};

export default ProjectVelocity; 