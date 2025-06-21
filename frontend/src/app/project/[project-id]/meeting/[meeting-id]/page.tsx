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
  Quote, Image, Link as LinkIcon, Hash, FolderOpen,
  Trash2, X, Check, GripVertical
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

// Confirmation Modal Component
const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Delete',
  confirmStyle = 'bg-red-600 hover:bg-red-700'
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmStyle?: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${confirmStyle}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Agenda Item Modal Component
const AgendaItemModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  item = null 
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: string) => void;
  item?: string | null;
}) => {
  const [agendaItem, setAgendaItem] = useState(item || '');

  const handleSave = () => {
    if (agendaItem.trim()) {
      onSave(agendaItem.trim());
      setAgendaItem('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {item ? 'Edit Agenda Item' : 'Add Agenda Item'}
        </h3>
        <textarea
          value={agendaItem}
          onChange={(e) => setAgendaItem(e.target.value)}
          placeholder="Enter agenda item..."
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none h-24
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={() => {
              setAgendaItem('');
              onClose();
            }}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!agendaItem.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {item ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Action Item Modal Component
const ActionItemModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  item = null 
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: any) => void;
  item?: any;
}) => {
  const [actionItem, setActionItem] = useState({
    title: item?.title || '',
    assignee: item?.assignee || '',
    dueDate: item?.dueDate || '',
    priority: item?.priority || 'medium',
    status: item?.status || 'pending'
  });

  const handleSave = () => {
    if (actionItem.title.trim() && actionItem.assignee.trim()) {
      onSave({
        ...actionItem,
        id: item?.id || `action-${Date.now()}`,
        title: actionItem.title.trim(),
        assignee: actionItem.assignee.trim()
      });
      setActionItem({
        title: '',
        assignee: '',
        dueDate: '',
        priority: 'medium',
        status: 'pending'
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {item ? 'Edit Action Item' : 'Add Action Item'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={actionItem.title}
              onChange={(e) => setActionItem({...actionItem, title: e.target.value})}
              placeholder="Enter action item title..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assignee *
            </label>
            <input
              type="text"
              value={actionItem.assignee}
              onChange={(e) => setActionItem({...actionItem, assignee: e.target.value})}
              placeholder="Enter assignee name..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={actionItem.dueDate}
              onChange={(e) => setActionItem({...actionItem, dueDate: e.target.value})}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={actionItem.priority}
                onChange={(e) => setActionItem({...actionItem, priority: e.target.value})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={actionItem.status}
                onChange={(e) => setActionItem({...actionItem, status: e.target.value})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setActionItem({
                title: '',
                assignee: '',
                dueDate: '',
                priority: 'medium',
                status: 'pending'
              });
              onClose();
            }}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!actionItem.title.trim() || !actionItem.assignee.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {item ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

const MeetingDetail = () => {
  const params = useParams();
  const projectId = params['project-id'] as string;
  const meetingId = params['meeting-id'] as string;
  const initialMeeting = getMeetingData(meetingId);
  
  // State management
  const [meeting, setMeeting] = useState(initialMeeting);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);
  const [notesHistory, setNotesHistory] = useState<Array<{
    id: string;
    content: string;
    timestamp: string;
    author: string;
    replies?: Array<{
      id: string;
      content: string;
      timestamp: string;
      author: string;
    }>;
  }>>(() => {
    if ('notesHistory' in meeting && Array.isArray(meeting.notesHistory)) {
      return meeting.notesHistory;
    }
    return [];
  });
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Overview editing states
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingObjectives, setEditingObjectives] = useState(false);
  const [editingParticipants, setEditingParticipants] = useState(false);
  const [tempDescription, setTempDescription] = useState(meeting.description);
  const [tempObjectives, setTempObjectives] = useState([...(meeting.objectives || [])]);
  const [tempParticipants, setTempParticipants] = useState([...meeting.participants]);
  const [newObjective, setNewObjective] = useState('');
  const [newParticipant, setNewParticipant] = useState('');

  // Modal states
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [editingAgendaIndex, setEditingAgendaIndex] = useState<number | null>(null);
  const [editingActionItem, setEditingActionItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{type: string, index?: number, item?: any} | null>(null);

  // Drag and drop states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const meetingType = meetingTypes[meeting.type as keyof typeof meetingTypes];
  const IconComponent = meetingType.icon;

  // Handle notes change
  const handleNotesChange = (value: string) => {
    setMeetingNotes(value);
    setHasUnsavedNotes(value !== (('notes' in meeting ? meeting.notes : '') || ''));
  };

  // Save meeting notes
  const handleSaveNotes = () => {
    if (!meetingNotes.trim()) return;
    
    const newNote = {
      id: `note-${Date.now()}`,
      content: meetingNotes.trim(),
      timestamp: new Date().toLocaleString(),
      author: 'Current User', // In real app, this would be the current user's name
      replies: []
    };
    
    const updateHistory = [...notesHistory, newNote];
    setNotesHistory(updateHistory);
    setMeeting(prev => ({...prev, notesHistory: updateHistory}));
    setMeetingNotes(''); // Clear the input field after saving
    setHasUnsavedNotes(false);
    // Here you would typically make an API call to save the notes
    console.log('Adding new meeting note:', newNote);
  };

  // Reply to a note
  const handleReply = (noteId: string) => {
    if (!replyContent.trim()) return;
    
    const newReply = {
      id: `reply-${Date.now()}`,
      content: replyContent.trim(),
      timestamp: new Date().toLocaleString(),
      author: 'Current User' // In real app, this would be the current user's name
    };
    
    const updatedHistory = notesHistory.map(note => 
      note.id === noteId 
        ? { ...note, replies: [...(note.replies || []), newReply] }
        : note
    );
    
    setNotesHistory(updatedHistory);
    setMeeting(prev => ({...prev, notesHistory: updatedHistory}));
    setReplyContent('');
    setReplyingTo(null);
    // Here you would typically make an API call to save the reply
    console.log('Adding reply to note:', noteId, newReply);
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyContent('');
  };

  // Overview editing handlers
  const handleSaveDescription = () => {
    setMeeting(prev => ({...prev, description: tempDescription}));
    setEditingDescription(false);
    console.log('Updated description:', tempDescription);
  };

  const handleCancelDescription = () => {
    setTempDescription(meeting.description);
    setEditingDescription(false);
  };

  const handleSaveObjectives = () => {
    setMeeting(prev => ({...prev, objectives: tempObjectives}));
    setEditingObjectives(false);
    setNewObjective('');
    console.log('Updated objectives:', tempObjectives);
  };

  const handleCancelObjectives = () => {
    setTempObjectives([...(meeting.objectives || [])]);
    setEditingObjectives(false);
    setNewObjective('');
  };

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      setTempObjectives([...tempObjectives, newObjective.trim()]);
      setNewObjective('');
    }
  };

  const handleRemoveObjective = (index: number) => {
    setTempObjectives(tempObjectives.filter((_, i) => i !== index));
  };

  const handleSaveParticipants = () => {
    setMeeting(prev => ({...prev, participants: tempParticipants}));
    setEditingParticipants(false);
    setNewParticipant('');
    console.log('Updated participants:', tempParticipants);
  };

  const handleCancelParticipants = () => {
    setTempParticipants([...meeting.participants]);
    setEditingParticipants(false);
    setNewParticipant('');
  };

  const handleAddParticipant = () => {
    if (newParticipant.trim() && !tempParticipants.includes(newParticipant.trim())) {
      setTempParticipants([...tempParticipants, newParticipant.trim()]);
      setNewParticipant('');
    }
  };

  const handleRemoveParticipant = (index: number) => {
    setTempParticipants(tempParticipants.filter((_, i) => i !== index));
  };

  // Delete meeting notes
  const handleDeleteNotes = () => {
    setNotesHistory([]);
    setMeeting(prev => ({...prev, notesHistory: []}));
    setConfirmModalOpen(false);
    setDeleteTarget(null);
    // Here you would typically make an API call to delete the notes
    console.log('Deleting all meeting notes');
  };

  // Agenda item handlers
  const handleAddAgendaItem = (item: string) => {
    setMeeting(prev => ({
      ...prev,
      agenda: [...prev.agenda, item]
    }));
    // Here you would typically make an API call
    console.log('Adding agenda item:', item);
  };

  const handleEditAgendaItem = (item: string) => {
    if (editingAgendaIndex !== null) {
      setMeeting(prev => ({
        ...prev,
        agenda: prev.agenda.map((agendaItem, index) => 
          index === editingAgendaIndex ? item : agendaItem
        )
      }));
      setEditingAgendaIndex(null);
      // Here you would typically make an API call
      console.log('Editing agenda item:', item);
    }
  };

  const handleDeleteAgendaItem = (index: number) => {
    setMeeting(prev => ({
      ...prev,
      agenda: prev.agenda.filter((_, i) => i !== index)
    }));
    setConfirmModalOpen(false);
    setDeleteTarget(null);
    // Here you would typically make an API call
    console.log('Deleting agenda item at index:', index);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', ''); // Required for Firefox
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newAgenda = [...meeting.agenda];
    const draggedItem = newAgenda[draggedIndex];
    
    // Remove the dragged item
    newAgenda.splice(draggedIndex, 1);
    
    // Insert at new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newAgenda.splice(insertIndex, 0, draggedItem);

    setMeeting(prev => ({
      ...prev,
      agenda: newAgenda
    }));

    setDraggedIndex(null);
    // Here you would typically make an API call to save the new order
    console.log('Reordered agenda items:', newAgenda);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Action item handlers
  const handleAddActionItem = (item: any) => {
    const actionItems = ('actionItems' in meeting ? meeting.actionItems : []) || [];
    setMeeting(prev => ({
      ...prev,
      actionItems: [...actionItems, item]
    }));
    // Here you would typically make an API call
    console.log('Adding action item:', item);
  };

  const handleEditActionItem = (item: any) => {
    const actionItems = ('actionItems' in meeting ? meeting.actionItems : []) || [];
    setMeeting(prev => ({
      ...prev,
      actionItems: actionItems.map((action: any) => 
        action.id === item.id ? item : action
      )
    }));
    setEditingActionItem(null);
    // Here you would typically make an API call
    console.log('Editing action item:', item);
  };

  const handleDeleteActionItem = (itemId: string) => {
    const actionItems = ('actionItems' in meeting ? meeting.actionItems : []) || [];
    setMeeting(prev => ({
      ...prev,
      actionItems: actionItems.filter((action: any) => action.id !== itemId)
    }));
    setConfirmModalOpen(false);
    setDeleteTarget(null);
    // Here you would typically make an API call
    console.log('Deleting action item:', itemId);
  };

  // Confirmation handlers
  const handleConfirmDelete = () => {
    if (deleteTarget) {
      switch (deleteTarget.type) {
        case 'agenda':
          if (deleteTarget.index !== undefined) {
            handleDeleteAgendaItem(deleteTarget.index);
          }
          break;
        case 'action':
          if (deleteTarget.item?.id) {
            handleDeleteActionItem(deleteTarget.item.id);
          }
          break;
        case 'notes':
          handleDeleteNotes();
          break;
      }
    }
  };

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
              {/* Meeting Description Section */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Meeting Description
                  </h3>
                  {meeting.status !== 'completed' && !editingDescription && (
                    <button
                      onClick={() => setEditingDescription(true)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {editingDescription ? (
                  <div className="space-y-3">
                    <textarea
                      value={tempDescription}
                      onChange={(e) => setTempDescription(e.target.value)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none h-24
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                               placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter meeting description..."
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleCancelDescription}
                        className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveDescription}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">
                    {meeting.description}
                  </p>
                )}
              </div>

              {/* Meeting Objectives Section */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Meeting Objectives
                  </h3>
                  {meeting.status !== 'completed' && !editingObjectives && (
                    <button
                      onClick={() => setEditingObjectives(true)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {editingObjectives ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {tempObjectives.map((objective, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <Target className="w-4 h-4 text-blue-500" />
                          <span className="flex-1 text-gray-900 dark:text-white">{objective}</span>
                          <button
                            onClick={() => handleRemoveObjective(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newObjective}
                        onChange={(e) => setNewObjective(e.target.value)}
                        placeholder="Add new objective..."
                        className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddObjective()}
                      />
                      <button
                        onClick={handleAddObjective}
                        disabled={!newObjective.trim()}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleCancelObjectives}
                        className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveObjectives}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {meeting.objectives?.map((objective, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-600 dark:text-gray-400">{objective}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Participants Section */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Participants
                  </h3>
                  {meeting.status !== 'completed' && !editingParticipants && (
                    <button
                      onClick={() => setEditingParticipants(true)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {editingParticipants ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tempParticipants.map((participant, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              {participant.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{participant}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {participant === meeting.facilitator ? 'Facilitator' : 'Participant'}
                            </p>
                          </div>
                          {participant !== meeting.facilitator && (
                            <button
                              onClick={() => handleRemoveParticipant(index)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newParticipant}
                        onChange={(e) => setNewParticipant(e.target.value)}
                        placeholder="Add participant name..."
                        className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddParticipant()}
                      />
                      <button
                        onClick={handleAddParticipant}
                        disabled={!newParticipant.trim() || tempParticipants.includes(newParticipant.trim())}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleCancelParticipants}
                        className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveParticipants}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <ParticipantsDetailView participants={meeting.participants} facilitator={meeting.facilitator} />
                )}
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
                  <button 
                    onClick={() => setAgendaModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Agenda
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {meeting.agenda.map((item, index) => (
                  <div 
                    key={index} 
                    draggable={meeting.status !== 'completed'}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-4 rounded-lg group transition-all duration-200 ${
                      draggedIndex === index 
                        ? 'bg-blue-100 dark:bg-blue-900 opacity-50 scale-95' 
                        : dragOverIndex === index && draggedIndex !== null
                        ? 'bg-blue-50 dark:bg-blue-800 border-2 border-blue-300 dark:border-blue-600'
                        : 'bg-gray-50 dark:bg-gray-700'
                    } ${
                      meeting.status !== 'completed' ? 'cursor-move' : ''
                    }`}
                  >
                    {meeting.status !== 'completed' && (
                      <div className="flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="flex-1 text-gray-900 dark:text-white">{item}</span>
                    {meeting.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {meeting.status !== 'completed' && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingAgendaIndex(index);
                            setAgendaModalOpen(true);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit agenda item"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget({type: 'agenda', index});
                            setConfirmModalOpen(true);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete agenda item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meeting notes tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Meeting Notes History Section */}
              {notesHistory.length > 0 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Meeting Notes History ({notesHistory.length})
                    </h3>
                    <div className="flex items-center gap-3">
                      {meeting.status !== 'completed' && (
                        <button 
                          onClick={() => {
                            setDeleteTarget({type: 'notes'});
                            setConfirmModalOpen(true);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Clear All Notes
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
                    {notesHistory.map((note) => (
                      <div key={note.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        {/* Main note */}
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {note.author.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 dark:text-white">{note.author}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">{note.timestamp}</span>
                            </div>
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <MarkdownEditor value={note.content} readonly={true} />
                            </div>
                            {meeting.status !== 'completed' && (
                              <button
                                onClick={() => setReplyingTo(note.id)}
                                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                              >
                                Reply
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Replies */}
                        {note.replies && note.replies.length > 0 && (
                          <div className="mt-4 ml-11 space-y-3">
                            {note.replies.map((reply) => (
                              <div key={reply.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                <div className="flex items-start gap-3">
                                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                    {reply.author.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-gray-900 dark:text-white text-sm">{reply.author}</span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">{reply.timestamp}</span>
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                      <MarkdownEditor value={reply.content} readonly={true} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply input */}
                        {replyingTo === note.id && meeting.status !== 'completed' && (
                          <div className="mt-4 ml-11">
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-3">
                              <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Write a reply..."
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded resize-none
                                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                         placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={3}
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  onClick={handleCancelReply}
                                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleReply(note.id)}
                                  disabled={!replyContent.trim()}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Editor Section */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" data-notes-editor>
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                    {meeting.status === 'completed' ? 'Meeting Notes' : 'Write Meeting Notes'}
                  </h3>
                  <div className="flex items-center gap-2">
                    {hasUnsavedNotes && (
                      <span className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        Unsaved changes
                      </span>
                    )}
                    {meeting.status !== 'completed' && (
                      <button 
                        onClick={handleSaveNotes}
                        disabled={!meetingNotes.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Add Note
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {meeting.status === 'completed' ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Meeting is completed. No new notes can be added.
                    </div>
                  ) : (
                    <MarkdownEditor 
                      value={meetingNotes} 
                      readonly={false} 
                      onChange={handleNotesChange}
                    />
                  )}
                </div>
              </div>

              {/* Meeting Decisions Section */}
              {'decisions' in meeting && meeting.decisions && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Meeting Decisions
                    </h4>
                  </div>
                  <div className="px-6 py-4">
                    <ul className="space-y-3">
                      {meeting.decisions.map((decision: string, index: number) => (
                        <li key={index} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{decision}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
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
                <button 
                  onClick={() => setActionModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Action Item
                </button>
              </div>

              {'actionItems' in meeting && meeting.actionItems && meeting.actionItems.length > 0 ? (
                <div className="space-y-3">
                  {meeting.actionItems.map((action: any) => {
                    const actionStatus = getActionItemStatus(action.status);
                    const priorityColors = {
                      low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
                      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
                      high: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                    };
                    return (
                      <div key={action.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg group">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {action.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[action.priority as keyof typeof priorityColors]}`}>
                              {action.priority}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${actionStatus.className}`}>
                              {actionStatus.text}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingActionItem(action);
                                  setActionModalOpen(true);
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit action item"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteTarget({type: 'action', item: action});
                                  setConfirmModalOpen(true);
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete action item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                          <span>Assignee: {action.assignee}</span>
                          <span>Due: {action.dueDate || 'No due date'}</span>
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

      {/* Modals */}
      <AgendaItemModal
        isOpen={agendaModalOpen}
        onClose={() => {
          setAgendaModalOpen(false);
          setEditingAgendaIndex(null);
        }}
        onSave={editingAgendaIndex !== null ? handleEditAgendaItem : handleAddAgendaItem}
        item={editingAgendaIndex !== null ? meeting.agenda[editingAgendaIndex] : null}
      />

      <ActionItemModal
        isOpen={actionModalOpen}
        onClose={() => {
          setActionModalOpen(false);
          setEditingActionItem(null);
        }}
        onSave={editingActionItem ? handleEditActionItem : handleAddActionItem}
        item={editingActionItem}
      />

      <ConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title={
          deleteTarget?.type === 'agenda' ? 'Delete Agenda Item' :
          deleteTarget?.type === 'action' ? 'Delete Action Item' :
          deleteTarget?.type === 'notes' ? 'Delete Meeting Notes' : 'Confirm Delete'
        }
        message={
          deleteTarget?.type === 'agenda' ? 'Are you sure you want to delete this agenda item? This action cannot be undone.' :
          deleteTarget?.type === 'action' ? 'Are you sure you want to delete this action item? This action cannot be undone.' :
          deleteTarget?.type === 'notes' ? 'Are you sure you want to delete all meeting notes? This action cannot be undone.' :
          'Are you sure you want to delete this item?'
        }
      />
    </div>
  );
};

export default MeetingDetail;
