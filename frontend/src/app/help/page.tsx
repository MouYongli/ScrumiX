'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search, ChevronDown, ChevronRight, Mail, MessageCircle, 
  Book, Users, Calendar, Settings, BarChart, FileText,
  ArrowLeft, ExternalLink
} from 'lucide-react';

const HelpPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const faqSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Book,
      questions: [
        {
          question: 'How do I create my first project?',
          answer: 'Navigate to the workspace and click "Create New Project". Fill in the project details including name, description, and team members. Once created, you can start adding sprints and managing your backlog.'
        },
        {
          question: 'How do I invite team members to my project?',
          answer: 'Go to your project settings, then click on "Team Members". You can invite users by their email address or username. They will receive an invitation notification and can join your project workspace.'
        },
        {
          question: 'What is the difference between a task and a user story?',
          answer: 'User stories represent features or requirements from the user\'s perspective, while tasks are specific work items that need to be completed to implement those stories. Tasks are usually smaller and more technical in nature.'
        }
      ]
    },
    {
      id: 'project-management',
      title: 'Project Management',
      icon: Settings,
      questions: [
        {
          question: 'How do I manage my product backlog?',
          answer: 'Access the Backlog Management section from your project dashboard. Here you can create, prioritize, and estimate user stories. Drag and drop items to reorder them by priority.'
        },
        {
          question: 'How do I create and manage sprints?',
          answer: 'In the Sprint Management section, click "Create New Sprint" to set up a sprint with start/end dates and goals. You can then add backlog items to the sprint and track progress through the sprint board.'
        },
        {
          question: 'How do I track sprint progress?',
          answer: 'Use the sprint dashboard to view burndown charts, task completion rates, and team velocity. The system automatically updates progress as team members mark tasks as complete.'
        }
      ]
    },
    {
      id: 'meetings',
      title: 'Meetings & Collaboration',
      icon: Calendar,
      questions: [
        {
          question: 'How do I schedule and manage Scrum meetings?',
          answer: 'Use the Meeting Management feature to schedule daily standups, sprint planning, reviews, and retrospectives. You can create agendas, take notes, and track action items.'
        },
        {
          question: 'How do I document meeting notes and action items?',
          answer: 'During meetings, use the built-in note-taking feature to record discussions. You can assign action items to team members with due dates and track their completion status.'
        },
        {
          question: 'Can I integrate with external calendar systems?',
          answer: 'Currently, ScrumiX supports manual scheduling. Integration with external calendar systems is planned for future releases.'
        }
      ]
    },
    {
      id: 'reporting',
      title: 'Reports & Analytics',
      icon: BarChart,
      questions: [
        {
          question: 'What reports are available?',
          answer: 'ScrumiX provides burndown charts, velocity reports, sprint summaries, and team performance analytics. These help track progress and identify areas for improvement.'
        },
        {
          question: 'How do I export project data?',
          answer: 'Most reports can be exported as PDF or CSV files. Look for the export button in the top-right corner of each report page.'
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: Users,
      questions: [
        {
          question: 'I cannot access my project. What should I do?',
          answer: 'First, check if you have the correct permissions for the project. If you\'re still unable to access it, contact your project administrator or reach out to our support team.'
        },
        {
          question: 'Why are my notifications not working?',
          answer: 'Check your notification settings in your user profile. Ensure your browser allows notifications from ScrumiX. You can also verify your email settings if you\'re missing email notifications.'
        },
        {
          question: 'The application is loading slowly. How can I improve performance?',
          answer: 'Try clearing your browser cache and cookies. If the issue persists, check your internet connection. For persistent performance issues, contact our support team.'
        }
      ]
    }
  ];

  const filteredSections = faqSections.map(section => ({
    ...section,
    questions: section.questions.filter(q => 
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.questions.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>
          
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Help Center
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Find answers to common questions and get support for using ScrumiX
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
              placeholder="Search help topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Quick Links Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Links
              </h2>
              <div className="space-y-3">
                <Link 
                  href="/docs"
                  className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Documentation
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Link>
                <Link 
                  href="/auth/signup"
                  className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Create Account
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Link>
                <Link 
                  href="/workspace"
                  className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Workspace
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Link>
              </div>
            </div>

            {/* Contact Support */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Need More Help?
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Support
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Live Chat
                </button>
              </div>
            </div>
          </div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {filteredSections.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your search terms or browse the categories below.
                  </p>
                </div>
              ) : (
                filteredSections.map((section) => {
                  const IconComponent = section.icon;
                  const isExpanded = expandedSections.includes(section.id);
                  
                  return (
                    <div key={section.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center">
                          <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" />
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {section.title}
                          </h2>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700">
                          {section.questions.map((qa, index) => (
                            <div key={index} className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                                {qa.question}
                              </h3>
                              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                {qa.answer}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Additional Resources */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Additional Resources
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link 
                  href="/docs"
                  className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Documentation</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Comprehensive user guides and tutorials</p>
                  </div>
                </Link>
                
                <div className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-3" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Community Forum</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Connect with other ScrumiX users</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
