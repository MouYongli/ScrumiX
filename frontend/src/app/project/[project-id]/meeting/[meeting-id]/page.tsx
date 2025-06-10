'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, Calendar, Clock, Users, Video, Edit,
  MessageSquare, Target, BarChart3, UserCheck, 
  CheckCircle, Plus, Save, Play, Pause, 
  FileText, ListChecks, Mic, MicOff, Eye, 
  PenTool, Bold, Italic, Code, List,
  Quote, Image, Link as LinkIcon, Hash, FolderOpen
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';

// Meeting type configuration
const meetingTypes = {
  'daily-standup': {
    name: 'Daily Standup',
    color: 'bg-blue-500',
    icon: MessageSquare,
  },
  'sprint-planning': {
    name: 'Sprint Planning',
    color: 'bg-green-500',
    icon: Target,
  },
  'sprint-review': {
    name: 'Sprint Review',
    color: 'bg-purple-500',
    icon: BarChart3,
  },
  'sprint-retrospective': {
    name: 'Sprint Retrospective',
    color: 'bg-orange-500',
    icon: UserCheck,
  },
  'backlog-refinement': {
    name: 'Backlog Refinement',
    color: 'bg-indigo-500',
    icon: Edit,
  },
};

// Mock meeting detail data
const getMeetingData = (id: string) => {
  const meetings = {
    'meeting-1': {
      id: 'meeting-1',
      title: 'Daily Standup - Week 3',
      type: 'daily-standup',
      status: 'scheduled',
      date: '2024-03-15',
      time: '09:00',
      duration: 15,
      location: 'Zoom Meeting Room',
      meetingLink: 'https://zoom.us/j/1234567890',
      facilitator: 'Alice Wang',
      participants: ['John Smith', 'Alice Wang', 'Bob Zhang', 'Carol Li', 'David Zhao'],
      description: 'Daily team sync meeting to share yesterday\'s progress, today\'s plans, and any blockers.',
      agenda: [
        'Work completed yesterday',
        'Today\'s work plan', 
        'Encountered blockers',
        'Items requiring assistance'
      ],
      objectives: [
        'Sync team progress',
        'Identify blocking issues',
        'Coordinate team collaboration'
      ],
    },
    'meeting-4': {
      id: 'meeting-4',
      title: 'Sprint 5 Retrospective Meeting',
      type: 'sprint-retrospective',
      status: 'completed',
      date: '2024-03-13',
      time: '10:00',
      duration: 90,
      location: 'Conference Room A',
      facilitator: 'Alice Wang',
      participants: ['Alice Wang', 'Bob Zhang', 'Carol Li', 'David Zhao'],
      description: 'Review Sprint 5 work process and identify improvement points.',
      agenda: [
        'What went well',
        'Areas for improvement',
        'Action plan for next Sprint',
        'Team feedback collection'
      ],
      objectives: [
        'Identify team strengths',
        'Discover improvement opportunities',
        'Develop action plan'
      ],
      notes: `# Sprint 5 Retrospective Meeting Notes

## Meeting Information
- **Time**: March 13, 2024 10:00-11:30
- **Facilitator**: Alice Wang
- **Participants**: Alice Wang, Bob Zhang, Carol Li, David Zhao

## What Went Well

### Technical Aspects
- **Significant improvement in code quality**: Team started using ESLint and Prettier, code style became more consistent
- **Notable performance optimization results**: Page loading speed improved by 30%
- **Test coverage reached 75%**: 15% improvement from previous Sprint

### Collaboration Aspects
- Team communication became smoother, daily standups were very efficient
- Code Review process was effectively implemented
- Documentation quality improved

## Areas for Improvement

### Process Optimization
1. **Code Review process needs standardization**
   - Lack of unified checklist
   - Review time sometimes too long
   - Need to establish clearer standards

2. **Insufficient automated test coverage**
   - Few integration tests
   - Missing end-to-end tests
   - Need to add more test cases

3. **Deployment process needs optimization**
   - Many manual operation steps
   - Rollback mechanism not perfect enough

### Technical Debt
- Old code modules need refactoring
- API documentation updates not timely
- Database query performance needs optimization

## Team Feedback

> **Bob Zhang**: "Hope to add more technical sharing sessions, especially new technology applications"

> **Carol Li**: "Suggest optimizing development environment configuration to improve development efficiency"

> **David Zhao**: "Need clearer requirement documents to reduce questions during development"

## Decisions & Action Items

### Immediate Actions (Within this week)
- [ ] Establish Code Review checklist - **Owner**: Bob Zhang
- [ ] Update API documentation - **Owner**: Carol Li

### Short-term Goals (Within 2 weeks)  
- [ ] Increase automated test coverage to 80% - **Owner**: Carol Li
- [ ] Optimize deployment process, achieve one-click deployment - **Owner**: David Zhao

### Long-term Planning (Within 1 month)
- [ ] Refactor core module code - **Owner**: Bob Zhang
- [ ] Establish technical sharing mechanism - **Owner**: Alice Wang

## Next Sprint Focus

1. **User Authentication Enhancement**
   - Social login integration
   - Two-factor authentication
   - Permission management optimization

2. **Performance Monitoring System Setup**
   - Error tracking
   - Performance metrics collection
   - Alert mechanism

---

**Meeting Recorder**: Alice Wang  
**Reviewer**: John Smith  
**Published**: March 13, 2024 12:00`,
      actionItems: [
        {
          id: 'action-1',
          title: 'Establish Code Review checklist',
          assignee: 'Bob Zhang',
          dueDate: '2024-03-20',
          status: 'pending',
          priority: 'high'
        },
        {
          id: 'action-2', 
          title: 'Increase automated test coverage to 80%',
          assignee: 'Carol Li',
          dueDate: '2024-03-25',
          status: 'pending',
          priority: 'medium'
        },
        {
          id: 'action-3',
          title: 'Optimize deployment process documentation',
          assignee: 'David Zhao',
          dueDate: '2024-03-18',
          status: 'completed',
          priority: 'low'
        }
      ],
      decisions: [
        'Adopt new Code Review tool',
        'Hold technical sharing sessions every Friday',
        'Add test steps to daily builds'
      ]
    }
  };
  
  return meetings[id as keyof typeof meetings] || meetings['meeting-1'];
};

// Markdown Editor Component
const MarkdownEditor = ({ value, onChange, readonly = false }: { 
  value: string; 
  onChange?: (value: string) => void; 
  readonly?: boolean;
}) => {
  const [isPreview, setIsPreview] = useState(false);
  const [content, setContent] = useState(value);

  // Handle text changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setContent(newValue);
    onChange?.(newValue);
  };

  // Insert Markdown syntax
  const insertMarkdown = (before: string, after = '', placeholder = '') => {
    const textarea = document.getElementById('markdown-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = selectedText || placeholder;
    
    const newText = content.substring(0, start) + before + replacement + after + content.substring(end);
    setContent(newText);
    onChange?.(newText);

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + replacement.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Render Markdown as HTML (simple implementation)
  const renderMarkdown = (text: string) => {
    return text
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-gray-900 dark:text-white mb-3">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // Code
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>')
      // Lists
      .replace(/^- (.*$)/gm, '<li class="list-disc ml-4 text-gray-900 dark:text-white">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="list-decimal ml-4 text-gray-900 dark:text-white">$2</li>')
      // Quotes
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-700 dark:text-gray-300">$1</blockquote>')
      // Line breaks
      .replace(/\n/g, '<br />');
  };

  const toolbarButtons = [
    { icon: Bold, action: () => insertMarkdown('**', '**', 'Bold text'), label: 'Bold' },
    { icon: Italic, action: () => insertMarkdown('*', '*', 'Italic text'), label: 'Italic' },
    { icon: Code, action: () => insertMarkdown('`', '`', 'Code'), label: 'Code' },
    { icon: Hash, action: () => insertMarkdown('## ', '', 'Header'), label: 'Header' },
    { icon: List, action: () => insertMarkdown('- ', '', 'List item'), label: 'List' },
    { icon: Quote, action: () => insertMarkdown('&gt; ', '', 'Quote text'), label: 'Quote' },
    { icon: LinkIcon, action: () => insertMarkdown('[', '](url)', 'Link text'), label: 'Link' },
  ];

  if (readonly) {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <div 
          className="text-gray-900 dark:text-white leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      </div>
    );
  }

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 px-3 py-2">
        <div className="flex items-center gap-1">
          {toolbarButtons.map((button, index) => {
            const IconComponent = button.icon;
            return (
              <button
                key={index}
                onClick={button.action}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title={button.label}
              >
                <IconComponent className="w-4 h-4" />
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isPreview 
                ? 'bg-blue-600 text-white' 
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            {isPreview ? <PenTool className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Editor content */}
      <div className="min-h-[400px]">
        {isPreview ? (
          <div className="p-4 prose prose-sm max-w-none dark:prose-invert">
            <div 
              className="text-gray-900 dark:text-white leading-relaxed min-h-[350px]"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          </div>
        ) : (
          <textarea
            id="markdown-textarea"
            value={content}
            onChange={handleChange}
            placeholder="Enter meeting notes here, Markdown format supported..."
            className="w-full h-[400px] p-4 border-0 resize-none focus:ring-0 focus:outline-none
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     placeholder-gray-500 dark:placeholder-gray-400"
          />
        )}
      </div>

      {/* Help text */}
      <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600 px-3 py-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Supports Markdown syntax: **Bold** *Italic* `Code` ## Header - List &gt; Quote [Link](url)
        </p>
      </div>
    </div>
  );
};

// Participants header tooltip component - simplified version (for header)
const ParticipantsHeaderTooltip = ({ participants, facilitator }: { 
  participants: string[]; 
  facilitator?: string; 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Users className="w-5 h-5 text-gray-400" />
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 dark:text-white">
            {participants.length} people
          </p>
          <div 
            className="relative flex -space-x-1"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            {participants.slice(0, 3).map((participant, index) => (
              <div
                key={index}
                className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center border border-white dark:border-gray-800 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {participant.charAt(0)}
                </span>
              </div>
            ))}
            {participants.length > 3 && (
              <div className="w-5 h-5 bg-gray-300 dark:bg-gray-500 rounded-full flex items-center justify-center border border-white dark:border-gray-800 cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-400 transition-colors">
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  +{participants.length - 3}
                </span>
              </div>
            )}
            
            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 p-3">
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Meeting Participants ({participants.length})
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {participants.map((participant, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {participant.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {participant}
                      </span>
                      {facilitator && participant === facilitator && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200 px-1.5 py-0.5 rounded">
                          Facilitator
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {/* Small triangle arrow */}
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200 dark:border-t-gray-700"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Participants detail view component (for overview page)
const ParticipantsDetailView = ({ participants, facilitator }: { 
  participants: string[]; 
  facilitator?: string; 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {participants.map((participant, index) => (
        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {participant.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{participant}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {participant === facilitator ? 'Facilitator' : 'Participant'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

const MeetingDetail = () => {
  const params = useParams();
  const projectId = params['project-id'] as string;
  const meetingId = params['meeting-id'] as string;
  const meeting = getMeetingData(meetingId);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newActionItem, setNewActionItem] = useState({ title: '', assignee: '' });

  const meetingType = meetingTypes[meeting.type as keyof typeof meetingTypes];
  const IconComponent = meetingType.icon;

  // Get project name
  const getProjectName = (id: string) => {
    const projects = {
      '1': 'E-commerce Platform Rebuild',
      '2': 'Mobile App Development', 
      '3': 'Data Analytics Platform',
    };
    return projects[id as keyof typeof projects] || 'Unknown Project';
  };

  const projectName = getProjectName(projectId);

  // Breadcrumb data with icons
  const breadcrumbItems = [
    { label: 'Project', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: projectName, href: `/project/${projectId}/dashboard` },
    { label: 'Meeting Management', href: `/project/${projectId}/meeting`, icon: <Calendar className="w-4 h-4" /> },
    { label: meeting.title, current: true }
  ];

  // Get status style
  const getStatusStyle = (status: string) => {
    const styles = {
      'scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
      'in-progress': 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
      'completed': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
    };
    
    const texts = {
      'scheduled': 'Scheduled',
      'in-progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
    };

    return {
      className: styles[status as keyof typeof styles],
      text: texts[status as keyof typeof texts],
    };
  };

  const statusStyle = getStatusStyle(meeting.status);

  // Get action item status style
  const getActionItemStatus = (status: string) => {
    const styles = {
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
      'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
      'completed': 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    };
    
    const texts = {
      'pending': 'Pending',
      'in-progress': 'In Progress',
      'completed': 'Completed',
    };

    return {
      className: styles[status as keyof typeof styles],
      text: texts[status as keyof typeof texts],
    };
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'agenda', label: 'Agenda', icon: ListChecks },
    { id: 'notes', label: 'Meeting Notes', icon: Edit },
    { id: 'actions', label: 'Action Items', icon: CheckCircle },
  ];

  return (
    <div className="space-y-8">
      <Breadcrumb items={breadcrumbItems} />

      {/* Meeting header information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`${meetingType.color} p-3 rounded-lg`}>
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {meeting.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {meetingType.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusStyle.className}`}>
              {statusStyle.text}
            </span>
            {meeting.status === 'scheduled' && (
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <Play className="w-4 h-4" />
                Start Meeting
              </button>
            )}
            {meeting.status === 'in-progress' && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2 rounded-lg transition-colors ${
                    isMuted 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsRecording(!isRecording)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    isRecording 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
                <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
                  End Meeting
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Meeting basic information */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Date & Time</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {meeting.date} {meeting.time}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {meeting.duration} minutes
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Location</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {meeting.location}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ParticipantsHeaderTooltip participants={meeting.participants} facilitator={meeting.facilitator} />
          </div>
        </div>
      </div>

      {/* Tab navigation and content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Meeting Description
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {meeting.description}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Meeting Objectives
                </h3>
                <ul className="space-y-2">
                  {meeting.objectives?.map((objective, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="text-gray-600 dark:text-gray-400">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Participants
                </h3>
                <ParticipantsDetailView participants={meeting.participants} facilitator={meeting.facilitator} />
              </div>
            </div>
          )}

          {/* Agenda tab */}
          {activeTab === 'agenda' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Meeting Agenda
                </h3>
                {meeting.status !== 'completed' && (
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Agenda
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {meeting.agenda.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="flex-1 text-gray-900 dark:text-white">{item}</span>
                    {meeting.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meeting notes tab */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Meeting Notes
                </h3>
                {meeting.status !== 'completed' && (
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Save Notes
                  </button>
                )}
              </div>

              {'notes' in meeting && meeting.notes ? (
                <MarkdownEditor 
                  value={meeting.notes} 
                  readonly={meeting.status === 'completed'} 
                  onChange={(value) => setNewNote(value)}
                />
              ) : (
                <MarkdownEditor 
                  value={newNote} 
                  onChange={(value) => setNewNote(value)}
                />
              )}

              {'decisions' in meeting && meeting.decisions && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Meeting Decisions</h4>
                  <ul className="space-y-2">
                    {meeting.decisions.map((decision: string, index: number) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-gray-600 dark:text-gray-400">{decision}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action items tab */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Action Items
                </h3>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Action Item
                </button>
              </div>

              {'actionItems' in meeting && meeting.actionItems ? (
                <div className="space-y-3">
                  {meeting.actionItems.map((action: any) => {
                    const actionStatus = getActionItemStatus(action.status);
                    return (
                      <div key={action.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {action.title}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${actionStatus.className}`}>
                            {actionStatus.text}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                          <span>Assignee: {action.assignee}</span>
                          <span>Due: {action.dueDate}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No action items yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingDetail;
