'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search, Book, Users, Calendar, Settings, BarChart, FileText,
  ArrowLeft, ExternalLink, ChevronRight, Play, Download,
  Zap, ListTodo, LayoutDashboard, BookOpen
} from 'lucide-react';
import { useAuthStatus } from '@/hooks/useAuthStatus';

const DocsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { isAuthenticated: isUserAuth, isLoading: authLoading } = useAuthStatus();

  const docSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Learn the basics of ScrumiX and set up your first project',
      icon: Play,
      color: 'blue',
      guides: [
        { title: 'Quick Start Guide', description: 'Get up and running in 5 minutes', readTime: '5 min' },
        { title: 'Creating Your First Project', description: 'Step-by-step project setup', readTime: '10 min' },
        { title: 'Inviting Team Members', description: 'Build your team workspace', readTime: '3 min' },
        { title: 'Understanding Scrum Basics', description: 'Scrum methodology overview', readTime: '15 min' }
      ]
    },
    {
      id: 'project-management',
      title: 'Project Management',
      description: 'Master project setup, backlog management, and sprint planning',
      icon: LayoutDashboard,
      color: 'green',
      guides: [
        { title: 'Project Dashboard Overview', description: 'Navigate your project workspace', readTime: '8 min' },
        { title: 'Backlog Management', description: 'Create and prioritize user stories', readTime: '12 min' },
        { title: 'Sprint Planning Guide', description: 'Plan effective sprints', readTime: '15 min' },
        { title: 'Task Management', description: 'Create and assign tasks', readTime: '10 min' },
        { title: 'Story Point Estimation', description: 'Estimate work complexity', readTime: '8 min' }
      ]
    },
    {
      id: 'sprint-management',
      title: 'Sprint Management',
      description: 'Run successful sprints from planning to retrospective',
      icon: Zap,
      color: 'purple',
      guides: [
        { title: 'Sprint Board Usage', description: 'Track sprint progress effectively', readTime: '10 min' },
        { title: 'Daily Standups', description: 'Conduct efficient daily meetings', readTime: '6 min' },
        { title: 'Sprint Reviews', description: 'Demonstrate completed work', readTime: '8 min' },
        { title: 'Sprint Retrospectives', description: 'Improve team processes', readTime: '12 min' },
        { title: 'Burndown Charts', description: 'Monitor sprint progress', readTime: '5 min' }
      ]
    },
    {
      id: 'meetings',
      title: 'Meetings & Collaboration',
      description: 'Organize effective Scrum ceremonies and team collaboration',
      icon: Calendar,
      color: 'orange',
      guides: [
        { title: 'Meeting Management', description: 'Schedule and organize meetings', readTime: '7 min' },
        { title: 'Meeting Agendas', description: 'Create structured meeting agendas', readTime: '5 min' },
        { title: 'Note Taking', description: 'Document meeting discussions', readTime: '4 min' },
        { title: 'Action Item Tracking', description: 'Follow up on meeting outcomes', readTime: '6 min' }
      ]
    },
    {
      id: 'documentation',
      title: 'Documentation & Wiki',
      description: 'Create and maintain project documentation',
      icon: BookOpen,
      color: 'indigo',
      guides: [
        { title: 'Wiki Management', description: 'Create project documentation', readTime: '10 min' },
        { title: 'Markdown Guide', description: 'Format your documentation', readTime: '8 min' },
        { title: 'Document Organization', description: 'Structure your knowledge base', readTime: '6 min' },
        { title: 'Version Control', description: 'Track document changes', readTime: '5 min' }
      ]
    },
    {
      id: 'reporting',
      title: 'Reports & Analytics',
      description: 'Generate insights and track team performance',
      icon: BarChart,
      color: 'red',
      guides: [
        { title: 'Team Velocity Reports', description: 'Measure team productivity', readTime: '8 min' },
        { title: 'Sprint Analytics', description: 'Analyze sprint performance', readTime: '10 min' },
        { title: 'Custom Reports', description: 'Create tailored reports', readTime: '12 min' },
        { title: 'Data Export', description: 'Export data for external analysis', readTime: '5 min' }
      ]
    }
  ];

  const filteredSections = docSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.guides.some(guide => 
      guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guide.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
      purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      indigo: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
      red: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {!authLoading && !isUserAuth && (
                <Link 
                  href="/"
                  className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Home
                </Link>
              )}
            </div>
          </div>
          
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Documentation
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Comprehensive guides and tutorials to help you master ScrumiX
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Quick Start Banner */}
        <div className="mb-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">New to ScrumiX?</h2>
              <p className="text-blue-100">Start with our quick setup guide to get your team up and running in minutes.</p>
            </div>
            <button className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
              Quick Start
            </button>
          </div>
        </div>

        {/* Documentation Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSections.map((section) => {
            const IconComponent = section.icon;
            
            return (
              <div key={section.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Section Header */}
                <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${getColorClasses(section.color)}`}>
                  <div className="flex items-center">
                    <IconComponent className="w-6 h-6 mr-3" />
                    <div>
                      <h2 className="text-lg font-semibold">{section.title}</h2>
                      <p className="text-sm opacity-80 mt-1">{section.description}</p>
                    </div>
                  </div>
                </div>

                {/* Guides List */}
                <div className="p-6">
                  <div className="space-y-3">
                    {section.guides.map((guide, index) => (
                      <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer group">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {guide.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {guide.description}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {guide.readTime} read
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* API Documentation Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">API Documentation</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Integrate ScrumiX with your existing tools and workflows
              </p>
            </div>
            <button className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <ExternalLink className="w-4 h-4 mr-2" />
              View API Docs
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">REST API</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Complete REST API reference for all ScrumiX features
              </p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Webhooks</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Real-time notifications for project events
              </p>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">SDKs</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Official SDKs for popular programming languages
              </p>
            </div>
          </div>
        </div>

        {/* Video Tutorials Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Video Tutorials</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'ScrumiX Overview', duration: '5:30', thumbnail: 'overview' },
              { title: 'Sprint Planning Demo', duration: '8:45', thumbnail: 'sprint' },
              { title: 'Team Collaboration', duration: '6:20', thumbnail: 'team' },
              { title: 'Reporting & Analytics', duration: '7:15', thumbnail: 'reports' },
              { title: 'Advanced Features', duration: '12:00', thumbnail: 'advanced' },
              { title: 'Best Practices', duration: '9:30', thumbnail: 'practices' }
            ].map((video, index) => (
              <div key={index} className="group cursor-pointer">
                <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg aspect-video mb-3 flex items-center justify-center">
                  <Play className="w-12 h-12 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {video.duration}
                  </div>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {video.title}
                </h3>
              </div>
            ))}
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">
              Still Need Help?
            </h2>
            <p className="text-blue-700 dark:text-blue-300 mb-4">
              Our support team is ready to assist you with any questions about ScrumiX.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link 
                href="/help"
                className="flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Book className="w-4 h-4 mr-2" />
                Help Center
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsPage;
