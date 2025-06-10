'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, MessageCircle, FileText, Calendar, Bell, Search,
  Plus, Send, Paperclip, Download, Eye, Heart, MessageSquare,
  Clock, User, FolderOpen, Zap, Activity, Settings, Video,
  Phone, Share2, Edit3, Trash2, MoreHorizontal
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import ChatMessage from '@/components/common/ChatMessage';
import NotificationCenter from '@/components/common/NotificationCenter';
import VideoCallModal from '@/components/common/VideoCallModal';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: string;
  skills: string[];
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  type: 'text' | 'file' | 'image';
  attachments?: {
    name: string;
    size: string;
    type: string;
    url: string;
  }[];
}

interface SharedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  downloads: number;
  category: 'document' | 'image' | 'video' | 'other';
}

interface ActivityItem {
  id: string;
  type: 'story_created' | 'sprint_started' | 'file_uploaded' | 'meeting_scheduled' | 'comment_added';
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  details?: string;
}

interface CollaborationProps {
  params: Promise<{ 'project-id': string }>;
}

// Mock data
const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'Product Manager',
    status: 'online',
    skills: ['Product Strategy', 'User Research', 'Analytics']
  },
  {
    id: '2',
    name: 'Mike Chen',
    role: 'Senior Developer',
    status: 'online',
    skills: ['React', 'Node.js', 'TypeScript', 'AWS']
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    role: 'UX Designer',
    status: 'away',
    lastSeen: '5 minutes ago',
    skills: ['UI/UX Design', 'Figma', 'User Testing']
  },
  {
    id: '4',
    name: 'David Park',
    role: 'Backend Developer',
    status: 'busy',
    skills: ['Python', 'Django', 'PostgreSQL', 'Docker']
  },
  {
    id: '5',
    name: 'Lisa Wang',
    role: 'QA Engineer',
    status: 'offline',
    lastSeen: '2 hours ago',
    skills: ['Test Automation', 'Selenium', 'API Testing']
  }
];

const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    senderId: '1',
    senderName: 'Sarah Johnson',
    content: 'Good morning team! Ready for today\'s sprint review?',
    timestamp: '2024-03-15T09:00:00Z',
    type: 'text'
  },
  {
    id: '2',
    senderId: '2',
    senderName: 'Mike Chen',
    content: 'Yes! I\'ve completed the user authentication module. Here\'s the documentation:',
    timestamp: '2024-03-15T09:05:00Z',
    type: 'file',
    attachments: [{
      name: 'auth-module-docs.pdf',
      size: '2.3 MB',
      type: 'pdf',
      url: '#'
    }]
  },
  {
    id: '3',
    senderId: '3',
    senderName: 'Emily Rodriguez',
    content: 'Great work Mike! I\'ve uploaded the updated wireframes for the dashboard.',
    timestamp: '2024-03-15T09:10:00Z',
    type: 'text'
  },
  {
    id: '4',
    senderId: '4',
    senderName: 'David Park',
    content: 'The API endpoints are ready for testing. Let me know if you need any changes.',
    timestamp: '2024-03-15T09:15:00Z',
    type: 'text'
  }
];

const mockSharedFiles: SharedFile[] = [
  {
    id: '1',
    name: 'Project Requirements.docx',
    size: '1.2 MB',
    type: 'document',
    uploadedBy: 'Sarah Johnson',
    uploadedAt: '2024-03-14T10:30:00Z',
    downloads: 15,
    category: 'document'
  },
  {
    id: '2',
    name: 'UI Mockups.fig',
    size: '5.7 MB',
    type: 'design',
    uploadedBy: 'Emily Rodriguez',
    uploadedAt: '2024-03-14T14:20:00Z',
    downloads: 8,
    category: 'other'
  },
  {
    id: '3',
    name: 'API Documentation.pdf',
    size: '2.3 MB',
    type: 'pdf',
    uploadedBy: 'David Park',
    uploadedAt: '2024-03-15T09:05:00Z',
    downloads: 6,
    category: 'document'
  },
  {
    id: '4',
    name: 'Team Photo.jpg',
    size: '3.1 MB',
    type: 'image',
    uploadedBy: 'Sarah Johnson',
    uploadedAt: '2024-03-13T16:45:00Z',
    downloads: 12,
    category: 'image'
  }
];

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'story_created',
    actor: 'Sarah Johnson',
    action: 'created a new user story',
    target: 'User Registration System',
    timestamp: '2024-03-15T08:30:00Z',
    details: 'Added to Sprint 2 backlog'
  },
  {
    id: '2',
    type: 'file_uploaded',
    actor: 'Mike Chen',
    action: 'uploaded a file',
    target: 'API Documentation.pdf',
    timestamp: '2024-03-15T09:05:00Z'
  },
  {
    id: '3',
    type: 'sprint_started',
    actor: 'Sarah Johnson',
    action: 'started sprint',
    target: 'Sprint 2 - E-commerce Core',
    timestamp: '2024-03-15T09:00:00Z'
  },
  {
    id: '4',
    type: 'meeting_scheduled',
    actor: 'Emily Rodriguez',
    action: 'scheduled a meeting',
    target: 'Daily Standup',
    timestamp: '2024-03-14T17:30:00Z',
    details: 'Tomorrow at 9:00 AM'
  }
];

const TeamCollaboration: React.FC<CollaborationProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];

  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'team' | 'activity'>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Projects', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: 'Project Name', href: `/project/${projectId}/dashboard` },
    { label: 'Team Collaboration', icon: <Users className="w-4 h-4" /> }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
      case 'document':
        return <FileText className="w-8 h-8 text-red-500" />;
      case 'image':
        return <FileText className="w-8 h-8 text-blue-500" />;
      case 'design':
        return <FileText className="w-8 h-8 text-purple-500" />;
      default:
        return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'story_created': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'sprint_started': return <Zap className="w-4 h-4 text-green-500" />;
      case 'file_uploaded': return <FileText className="w-4 h-4 text-purple-500" />;
      case 'meeting_scheduled': return <Calendar className="w-4 h-4 text-orange-500" />;
      case 'comment_added': return <MessageCircle className="w-4 h-4 text-pink-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    if (!isClient) {
      return 'Loading...';
    }
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      // Use consistent date formatting
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Handle sending message
      setNewMessage('');
    }
  };

  const filteredFiles = mockSharedFiles.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Team Collaboration
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Communicate, share files, and collaborate with your team
          </p>
        </div>
        <div className="flex gap-3">
          <NotificationCenter />
          <button 
            onClick={() => setIsVideoCallOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Video className="w-4 h-4" />
            Start Meeting
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Invite Member
          </button>
        </div>
      </div>

      {/* Team Status Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Status</h3>
        <div className="flex flex-wrap gap-4">
          {mockTeamMembers.slice(0, 5).map((member) => (
            <div key={member.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="relative">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-700 ${getStatusColor(member.status)}`}></div>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{member.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {member.status === 'offline' ? member.lastSeen : member.status}
                </p>
              </div>
            </div>
          ))}
          <button className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600">
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add member</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Chat & Main Content */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'chat', label: 'Team Chat', icon: <MessageCircle className="w-4 h-4" /> },
                { id: 'files', label: 'Shared Files', icon: <FileText className="w-4 h-4" /> },
                { id: 'team', label: 'Team Members', icon: <Users className="w-4 h-4" /> },
                { id: 'activity', label: 'Activity Feed', icon: <Activity className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'chat' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Chat</h3>
                    <div className="flex gap-2">
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <Phone className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <Video className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                  {mockChatMessages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      id={message.id}
                      senderId={message.senderId}
                      senderName={message.senderName}
                      content={message.content}
                      timestamp={message.timestamp}
                      type={message.type}
                      attachments={message.attachments}
                      reactions={[
                        { emoji: '👍', count: 2, users: ['Sarah Johnson', 'Mike Chen'] },
                        { emoji: '❤️', count: 1, users: ['Emily Rodriguez'] }
                      ]}
                      onReact={(messageId, emoji) => console.log('React:', messageId, emoji)}
                      onReply={(messageId) => console.log('Reply to:', messageId)}
                    />
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <Paperclip className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={handleSendMessage}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                {/* Files Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Shared Files</h3>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Upload File
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Files List */}
                <div className="p-6">
                  <div className="space-y-4">
                    {filteredFiles.map((file) => (
                      <div key={file.id} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
                        {getFileIcon(file.type)}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">{file.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <span>Uploaded by {file.uploadedBy}</span>
                            <span>{file.size}</span>
                            <span>{file.downloads} downloads</span>
                            <span>{formatTimestamp(file.uploadedAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="text-gray-400 hover:text-blue-600">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-gray-400 hover:text-green-600">
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="text-gray-400 hover:text-gray-600">
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h3>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Invite Member
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {mockTeamMembers.map((member) => (
                    <div key={member.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-700 ${getStatusColor(member.status)}`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white">{member.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{member.role}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {member.status === 'offline' ? member.lastSeen : member.status}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {member.skills.slice(0, 2).map((skill, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                                {skill}
                              </span>
                            ))}
                            {member.skills.length > 2 && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                                +{member.skills.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button className="text-gray-400 hover:text-blue-600">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button className="text-gray-400 hover:text-green-600">
                            <Video className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Activity Feed</h3>
                <div className="space-y-4">
                  {mockActivities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 p-4 border-l-4 border-blue-200 dark:border-blue-800 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="p-2 bg-white dark:bg-gray-600 rounded-full">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-medium">{activity.actor}</span> {activity.action}{' '}
                          <span className="font-medium">{activity.target}</span>
                        </p>
                        {activity.details && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{activity.details}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Quick Actions & Online Team */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setIsVideoCallOpen(true)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                <Video className="w-5 h-5 text-green-600" />
                <span className="text-gray-900 dark:text-white">Start Video Call</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-gray-900 dark:text-white">Schedule Meeting</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="text-gray-900 dark:text-white">Share Document</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
                <span className="text-gray-900 dark:text-white">Invite Team Member</span>
              </button>
            </div>
          </div>

          {/* Online Team Members */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Online Now</h3>
            <div className="space-y-3">
              {mockTeamMembers
                .filter(member => member.status === 'online' || member.status === 'away')
                .map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-700 ${getStatusColor(member.status)}`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{member.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{member.role}</p>
                  </div>
                  <button className="text-gray-400 hover:text-blue-600">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Files */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Files</h3>
            <div className="space-y-3">
              {mockSharedFiles.slice(0, 3).map((file) => (
                <div key={file.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{file.uploadedBy}</p>
                  </div>
                  <button className="text-gray-400 hover:text-blue-600">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={isVideoCallOpen}
        onClose={() => setIsVideoCallOpen(false)}
        meetingTitle="Team Collaboration Meeting"
      />
    </div>
  );
};

export default TeamCollaboration; 