'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Filter, Mail, Phone, MapPin, Edit2, Trash2, 
  FolderOpen, Users, Crown, Shield, Code, Settings, MoreHorizontal,
  Calendar, Clock, CheckCircle2, UserPlus, MessageSquare, Star
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import FavoriteButton from '@/components/common/FavoriteButton';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'product_owner' | 'scrum_master' | 'developer' | 'designer' | 'tester' | 'analyst';
  avatar?: string;
  phone?: string;
  location?: string;
  joinedAt: string;
  lastActive: string;
  skills: string[];
  currentTasks: number;
  completedTasks: number;
  status: 'online' | 'offline' | 'away' | 'busy';
  isAdmin: boolean;
}

interface ProjectTeamProps {
  params: Promise<{ 'project-id': string }>;
}

// Mock team data
const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@company.com',
    role: 'product_owner',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    joinedAt: '2024-01-15',
    lastActive: '2024-03-12T10:30:00Z',
    skills: ['Product Strategy', 'User Research', 'Stakeholder Management'],
    currentTasks: 3,
    completedTasks: 45,
    status: 'online',
    isAdmin: true,
  },
  {
    id: '2',
    name: 'Jane Doe',
    email: 'jane.doe@company.com',
    role: 'scrum_master',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    phone: '+1 (555) 234-5678',
    location: 'New York, NY',
    joinedAt: '2024-01-20',
    lastActive: '2024-03-12T09:45:00Z',
    skills: ['Agile Coaching', 'Team Facilitation', 'Process Improvement'],
    currentTasks: 2,
    completedTasks: 38,
    status: 'online',
    isAdmin: true,
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike.johnson@company.com',
    role: 'developer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    phone: '+1 (555) 345-6789',
    location: 'Austin, TX',
    joinedAt: '2024-02-01',
    lastActive: '2024-03-12T11:15:00Z',
    skills: ['React', 'Node.js', 'TypeScript', 'GraphQL'],
    currentTasks: 5,
    completedTasks: 32,
    status: 'online',
    isAdmin: false,
  },
  {
    id: '4',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@company.com',
    role: 'designer',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    phone: '+1 (555) 456-7890',
    location: 'Seattle, WA',
    joinedAt: '2024-02-10',
    lastActive: '2024-03-12T08:20:00Z',
    skills: ['UI/UX Design', 'Figma', 'Prototyping', 'User Testing'],
    currentTasks: 4,
    completedTasks: 28,
    status: 'away',
    isAdmin: false,
  },
  {
    id: '5',
    name: 'David Chen',
    email: 'david.chen@company.com',
    role: 'developer',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    location: 'Los Angeles, CA',
    joinedAt: '2024-02-15',
    lastActive: '2024-03-11T16:30:00Z',
    skills: ['Python', 'Django', 'PostgreSQL', 'Docker'],
    currentTasks: 3,
    completedTasks: 25,
    status: 'offline',
    isAdmin: false,
  },
  {
    id: '6',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@company.com',
    role: 'tester',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
    phone: '+1 (555) 567-8901',
    location: 'Miami, FL',
    joinedAt: '2024-02-20',
    lastActive: '2024-03-12T07:45:00Z',
    skills: ['Manual Testing', 'Automation', 'Selenium', 'Test Planning'],
    currentTasks: 2,
    completedTasks: 22,
    status: 'busy',
    isAdmin: false,
  },
];

const ProjectTeam: React.FC<ProjectTeamProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(mockTeamMembers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Projects', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: 'E-commerce Platform', href: `/project/${projectId}/dashboard` },
    { label: 'Team Members', icon: <Users className="w-4 h-4" /> }
  ];

  // Filter team members
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'product_owner': return <Crown className="w-4 h-4" />;
      case 'scrum_master': return <Shield className="w-4 h-4" />;
      case 'developer': return <Code className="w-4 h-4" />;
      case 'designer': return <Star className="w-4 h-4" />;
      case 'tester': return <CheckCircle2 className="w-4 h-4" />;
      case 'analyst': return <Settings className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'product_owner': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'scrum_master': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'developer': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'designer': return 'text-pink-600 bg-pink-50 dark:bg-pink-900/20';
      case 'tester': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'analyst': return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'product_owner': return 'Product Owner';
      case 'scrum_master': return 'Scrum Master';
      case 'developer': return 'Developer';
      case 'designer': return 'Designer';
      case 'tester': return 'Tester';
      case 'analyst': return 'Analyst';
      default: return 'Team Member';
    }
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const teamStats = {
    total: teamMembers.length,
    online: teamMembers.filter(m => m.status === 'online').length,
    productOwners: teamMembers.filter(m => m.role === 'product_owner').length,
    scrumMasters: teamMembers.filter(m => m.role === 'scrum_master').length,
    developers: teamMembers.filter(m => m.role === 'developer').length,
    designers: teamMembers.filter(m => m.role === 'designer').length,
    testers: teamMembers.filter(m => m.role === 'tester').length,
  };

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Team Members
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your project team members and their roles
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        </div>
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Online Now</p>
              <p className="text-2xl font-bold text-green-600">{teamStats.online}</p>
            </div>
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Developers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.developers}</p>
            </div>
            <Code className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Designers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.designers}</p>
            </div>
            <Star className="w-8 h-8 text-pink-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Testers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.testers}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Leadership</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.productOwners + teamStats.scrumMasters}</p>
            </div>
            <Crown className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Roles</option>
              <option value="product_owner">Product Owner</option>
              <option value="scrum_master">Scrum Master</option>
              <option value="developer">Developer</option>
              <option value="designer">Designer</option>
              <option value="tester">Tester</option>
              <option value="analyst">Analyst</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="away">Away</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>

            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(member.status)} rounded-full border-2 border-white dark:border-gray-800`}></div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                      {getRoleIcon(member.role)}
                      {getRoleDisplayName(member.role)}
                    </div>
                  </div>
                </div>
                {member.isAdmin && (
                  <Crown className="w-4 h-4 text-yellow-500" title="Admin" />
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  {member.email}
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4" />
                    {member.phone}
                  </div>
                )}
                {member.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4" />
                    {member.location}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  Last active: {formatLastActive(member.lastActive)}
                </div>
              </div>

              <div className="flex justify-between text-sm mb-4">
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">{member.currentTasks}</div>
                  <div className="text-gray-600 dark:text-gray-400">Current</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">{member.completedTasks}</div>
                  <div className="text-gray-600 dark:text-gray-400">Completed</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">{member.skills.length}</div>
                  <div className="text-gray-600 dark:text-gray-400">Skills</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {member.skills.slice(0, 3).map((skill, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                    {skill}
                  </span>
                ))}
                {member.skills.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                    +{member.skills.length - 3} more
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-colors">
                  Message
                </button>
                <button className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tasks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div className={`absolute bottom-0 right-0 w-2 h-2 ${getStatusColor(member.status)} rounded-full border border-white dark:border-gray-800`}></div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900 dark:text-white">{member.name}</div>
                            {member.isAdmin && <Crown className="w-3 h-3 text-yellow-500" />}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                        {getRoleIcon(member.role)}
                        {getRoleDisplayName(member.role)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 ${getStatusColor(member.status)} rounded-full`}></div>
                        <span className="text-sm text-gray-900 dark:text-white capitalize">{member.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {member.currentTasks} active, {member.completedTasks} completed
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatLastActive(member.lastActive)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredMembers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No team members found</h3>
          <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
};

export default ProjectTeam;
