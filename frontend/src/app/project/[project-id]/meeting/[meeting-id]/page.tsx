'use client';

import React, { useState, useEffect } from 'react';
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
import { useDateFormat } from '@/hooks/useDateFormat';
import { api } from '@/utils/api';
import { ApiMeeting, ApiProject, ApiMeetingAgenda, ApiMeetingActionItem, ApiMeetingNote, ApiUser, ApiMeetingParticipantWithUser, MeetingParticipantsResponse } from '@/types/api';
import { MeetingType, MeetingParticipantRole } from '@/types/enums';
import { ProjectMemberResponse } from '@/types/api';

// Component for rendering user-aware formatted dates and times
const FormattedDateTime: React.FC<{ 
  date: Date; 
  includeTime?: boolean; 
  short?: boolean;
}> = ({ date, includeTime = false, short = false }) => {
  const [formattedDateTime, setFormattedDateTime] = useState<string>(
    includeTime 
      ? `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
      : date.toLocaleDateString()
  );
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
          setFormattedDateTime(result);
        }
      } catch (error) {
        console.error('Error formatting date:', error);
        // Fallback to simple formatting
        if (isMounted) {
          setFormattedDateTime(
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

  return <span>{formattedDateTime}</span>;
};

// Meeting type configuration - maps backend enum values to display names
const meetingTypes = {
  [MeetingType.DAILY_STANDUP]: {
    name: 'Daily Standup',
    color: 'bg-blue-500',
    icon: MessageSquare,
  },
  [MeetingType.SPRINT_PLANNING]: {
    name: 'Sprint Planning',
    color: 'bg-green-500',
    icon: Target,
  },
  [MeetingType.SPRINT_REVIEW]: {
    name: 'Sprint Review',
    color: 'bg-purple-500',
    icon: BarChart3,
  },
  [MeetingType.SPRINT_RETROSPECTIVE]: {
    name: 'Sprint Retrospective',
    color: 'bg-orange-500',
    icon: UserCheck,
  },
  [MeetingType.TEAM_MEETING]: {
    name: 'Team Meeting',
    color: 'bg-indigo-500',
    icon: MessageSquare,
  },
  [MeetingType.OTHER]: {
    name: 'Other',
    color: 'bg-gray-500',
    icon: MessageSquare,
  },
};

// Helper function to get user display name with fallback for current user
function getUserDisplayName(user: any, currentUser: ApiUser | null): string {
  // If no user information is available, check if it might be the current user
  if (!user) {
    if (currentUser) {
      const fullName = currentUser.first_name && currentUser.last_name 
        ? `${currentUser.first_name} ${currentUser.last_name}` 
        : null;
      return fullName || currentUser.username || currentUser.email;
    }
    return 'Unknown User';
  }
  
  // Return the best available user name
  return user.full_name || user.username || user.email || 'Unknown User';
}

// Helper function to get user avatar letter
function getUserAvatarLetter(user: any, currentUser: ApiUser | null): string {
  if (!user && currentUser) {
    const fullName = currentUser.first_name && currentUser.last_name 
      ? `${currentUser.first_name} ${currentUser.last_name}` 
      : null;
    return (fullName?.charAt(0) || currentUser.username?.charAt(0) || currentUser.email?.charAt(0) || 'U').toUpperCase();
  }
  
  return (user?.full_name?.charAt(0) || user?.username?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase();
}

// Helper function to format role display names
function formatRoleDisplayName(role: string): string {
  switch (role) {
    case 'scrum_master':
      return 'Scrum Master';
    case 'product_owner':
      return 'Product Owner';
    case 'developer':
      return 'Developer';
    case 'facilitator':
      return 'Facilitator';
    case 'guest':
      return 'Guest';
    default:
      return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
  }
}

// Utility function to safely parse datetime - enhanced to handle various formats
function parseDatetimeSafely(datetimeValue: any): Date | null {
  if (!datetimeValue) return null;
  
  try {
    let dateToTry: Date;
    
    if (typeof datetimeValue === 'string') {
      let normalized = datetimeValue.trim();
      
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(normalized)) {
        normalized = normalized.replace(' ', 'T');
      }
      
      normalized = normalized.replace(/\+00:00$/, 'Z');
      normalized = normalized.replace(/\+00$/, 'Z');
      normalized = normalized.replace(/\.(\d{3})\d+(?=(Z|[+\-]\d{2}:?\d{2})?$)/, '.$1');
      
      dateToTry = new Date(normalized);
      
      if (isNaN(dateToTry.getTime())) {
        const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
        if (isoMatch) {
          const [, year, month, day, hour, minute, second] = isoMatch;
          dateToTry = new Date(
            parseInt(year), 
            parseInt(month) - 1, 
            parseInt(day), 
            parseInt(hour), 
            parseInt(minute), 
            parseInt(second)
          );
        }
      }
    } else {
      dateToTry = new Date(datetimeValue);
    }
    
    if (!isNaN(dateToTry.getTime())) {
      return dateToTry;
    }
  } catch (error) {
    console.error('Error parsing datetime:', error, 'Value:', datetimeValue);
  }
  
  return null;
}

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
                key={`toolbar-${button.label}-${index}`}
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
                key={`tooltip-participant-${index}-${participant}`}
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
                    <div key={`tooltip-list-participant-${index}-${participant}`} className="flex items-center gap-2">
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
        <div key={`participant-${index}-${participant}`} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
  onBulkSave,
  item = null 
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: string) => void;
  onBulkSave?: (items: string[]) => void;
  item?: string | null;
}) => {
  const [agendaItem, setAgendaItem] = useState(item || '');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkItems, setBulkItems] = useState<string[]>(['']);

  const handleSave = () => {
    if (agendaItem.trim()) {
      onSave(agendaItem.trim());
      setAgendaItem('');
      onClose();
    }
  };

  const handleBulkSave = () => {
    const validItems = bulkItems.filter(item => item.trim());
    if (validItems.length > 0 && onBulkSave) {
      onBulkSave(validItems);
      setBulkItems(['']);
      setIsBulkMode(false);
      onClose();
    }
  };

  const addBulkItem = () => {
    setBulkItems([...bulkItems, '']);
  };

  const removeBulkItem = (index: number) => {
    if (bulkItems.length > 1) {
      setBulkItems(bulkItems.filter((_, i) => i !== index));
    }
  };

  const updateBulkItem = (index: number, value: string) => {
    const newItems = [...bulkItems];
    newItems[index] = value;
    setBulkItems(newItems);
  };

  const handleClose = () => {
    setAgendaItem('');
    setBulkItems(['']);
    setIsBulkMode(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {item ? 'Edit Agenda Item' : 'Add Agenda Item'}
        </h3>
          {!item && onBulkSave && (
            <button
              onClick={() => setIsBulkMode(!isBulkMode)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              {isBulkMode ? 'Single Item' : 'Bulk Add'}
            </button>
          )}
        </div>

        {isBulkMode ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add multiple agenda items at once:
            </p>
            {bulkItems.map((item, index) => (
              <div key={`bulk-item-${index}`} className="flex gap-2">
                <textarea
                  value={item}
                  onChange={(e) => updateBulkItem(index, e.target.value)}
                  placeholder={`Agenda item ${index + 1}...`}
                  className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded resize-none h-16
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {bulkItems.length > 1 && (
                  <button
                    onClick={() => removeBulkItem(index)}
                    className="px-2 py-1 text-red-600 hover:text-red-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addBulkItem}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4 mx-auto" />
            </button>
          </div>
        ) : (
        <textarea
          value={agendaItem}
          onChange={(e) => setAgendaItem(e.target.value)}
          placeholder="Enter agenda item..."
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none h-24
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={isBulkMode ? handleBulkSave : handleSave}
            disabled={isBulkMode ? bulkItems.filter(item => item.trim()).length === 0 : !agendaItem.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isBulkMode ? 'Add All' : (item ? 'Update' : 'Add')}
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
  item = null,
  projectMembers = []
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: any) => void;
  item?: any;
  projectMembers?: any[];
}) => {
  const [actionItem, setActionItem] = useState({
    title: '',
    dueDate: ''
  });

  // Update form when editing item changes
  useEffect(() => {
    console.log('ActionItemModal: item prop changed:', item);
    if (item) {
      const dueDate = item.due_date ? new Date(item.due_date).toISOString().split('T')[0] : '';
      console.log('ActionItemModal: Setting form data - title:', item.title, 'dueDate:', dueDate);
      setActionItem({
        title: item.title || '',
        dueDate: dueDate
      });
    } else {
      console.log('ActionItemModal: Clearing form data');
      setActionItem({
        title: '',
        dueDate: ''
      });
    }
  }, [item]);

  const handleSave = () => {
    if (actionItem.title.trim()) {
      onSave({
        ...actionItem,
        id: item?.id,
        title: actionItem.title.trim()
      });
      setActionItem({
        title: '',
        dueDate: ''
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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

        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setActionItem({
                title: '',
                dueDate: ''
              });
              onClose();
            }}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!actionItem.title.trim()}
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
  
  // State management
  const [meeting, setMeeting] = useState<ApiMeeting | null>(null);
  const [project, setProject] = useState<ApiProject | null>(null);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [agendaItems, setAgendaItems] = useState<ApiMeetingAgenda[]>([]);
  const [meetingNotes, setMeetingNotes] = useState<ApiMeetingNote[]>([]);
  const [actionItems, setActionItems] = useState<ApiMeetingActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Overview editing states
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingParticipants, setEditingParticipants] = useState(false);
  const [tempDescription, setTempDescription] = useState('');
  const [allProjectMembers, setAllProjectMembers] = useState<ProjectMemberResponse[]>([]);
  const [meetingParticipants, setMeetingParticipants] = useState<ApiMeetingParticipantWithUser[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<ProjectMemberResponse[]>([]);
  const [showParticipantDropdown, setShowParticipantDropdown] = useState(false);

  // External participant form state
  const [externalParticipantName, setExternalParticipantName] = useState('');
  const [externalParticipantEmail, setExternalParticipantEmail] = useState('');
  const [showExternalParticipantForm, setShowExternalParticipantForm] = useState(false);

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

  // Loading states
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  // Fetch meeting data and related information
  useEffect(() => {
    const fetchMeetingData = async () => {
      if (!meetingId || !projectId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch current user information
        const userResponse = await api.auth.getCurrentUser();
        if (userResponse.data) {
          setCurrentUser(userResponse.data);
        }
        
        // Fetch meeting details
        const meetingResponse = await api.meetings.getById(parseInt(meetingId));
        if (meetingResponse.error) throw new Error(meetingResponse.error);
        if (!meetingResponse.data) throw new Error('Meeting data not found');
        setMeeting(meetingResponse.data);
        
        // Set initial editing values
        setTempDescription(meetingResponse.data.description || '');
        
        // Fetch project information
        const projectResponse = await api.projects.getById(parseInt(projectId));
        if (projectResponse.error) {
          console.warn('Failed to fetch project:', projectResponse.error);
        } else {
          setProject(projectResponse.data);
        }
        
        // Fetch project members for participants
        try {
          const membersResponse = await api.projects.getMembers(parseInt(projectId));
          if (membersResponse.error) {
            console.warn('Failed to fetch project members:', membersResponse.error);
            setAllProjectMembers([]);
            setSelectedParticipants([]);
          } else {
            const members = membersResponse.data || [];
            console.log('DEBUG: Fetched project members from API:', members);
            members.forEach((member, index) => {
              console.log(`DEBUG: Project member ${index}:`, {
                id: member.id,
                username: member.username,
                role: member.role,
                roleType: typeof member.role,
                fullMember: member
              });
            });
            setAllProjectMembers(members);
            // Initialize with no participants selected by default
            setSelectedParticipants([]);
          }
        } catch (error) {
          console.warn('Failed to fetch project members:', error);
          setAllProjectMembers([]);
          setSelectedParticipants([]);
        }
        
        // Fetch agenda items
        try {
          const agendaResponse = await api.meetingAgenda.getByMeeting(parseInt(meetingId));
          if (agendaResponse.data) {
            setAgendaItems(agendaResponse.data);
          }
        } catch (error) {
          console.warn('Failed to fetch agenda items:', error);
        }
        
        // Fetch meeting notes using tree structure for hierarchical display
        try {
          const notesResponse = await api.meetingNotes.getTreeByMeeting(parseInt(meetingId));
          console.log('Meeting notes response:', notesResponse);
          if (notesResponse.data && notesResponse.data.notes) {
            console.log('First note structure:', notesResponse.data.notes[0]);
            setMeetingNotes(notesResponse.data.notes);
          } else {
            setMeetingNotes([]);
          }
        } catch (error) {
          console.warn('Failed to fetch meeting notes:', error);
          setMeetingNotes([]);
        }
        
        // Fetch action items
        try {
          const actionResponse = await api.meetingActionItems.getByMeeting(parseInt(meetingId));
          if (actionResponse.data) {
            console.log('Fetched action items:', actionResponse.data);
            console.log('Sample action item structure:', actionResponse.data[0]);
            setActionItems(actionResponse.data);
          }
        } catch (error) {
          console.warn('Failed to fetch action items:', error);
          setActionItems([]);
        }
        
        // Fetch meeting participants
        try {
          const participantsResponse = await api.meetingParticipants.getByMeeting(parseInt(meetingId));
          if (participantsResponse.data) {
            console.log('DEBUG: Fetched meeting participants raw response:', participantsResponse.data);
            participantsResponse.data.participants.forEach((participant, index) => {
              console.log(`DEBUG: Participant ${index} role details:`, {
                id: participant.id,
                userId: participant.userId,
                role: participant.role,
                roleType: typeof participant.role,
                fullName: participant.fullName,
                username: participant.username,
                externalName: participant.externalName,
                fullParticipant: participant
              });
            });
            setMeetingParticipants(participantsResponse.data.participants);
          }
        } catch (error) {
          console.warn('Failed to fetch meeting participants:', error);
          setMeetingParticipants([]);
        }
        
      } catch (error) {
        console.error('Error fetching meeting data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch meeting data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeetingData();
  }, [meetingId, projectId]);

  // Early return if loading or error
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading meeting details...</p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <FileText className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error Loading Meeting
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || 'Meeting not found'}
          </p>
          <Link
            href={`/project/${projectId}/meeting`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Meetings
          </Link>
        </div>
      </div>
    );
  }

  const meetingType = meetingTypes[meeting.meetingType as keyof typeof meetingTypes] || meetingTypes[MeetingType.OTHER];
  const IconComponent = meetingType.icon;

  // Handle notes change
  const handleNotesChange = (value: string) => {
    setCurrentNote(value);
    setHasUnsavedNotes(value.trim() !== '');
  };

  // Save meeting notes
  const handleSaveNotes = async () => {
    if (!currentNote.trim()) return;
    
    setNotesLoading(true);
    try {
      const response = await api.meetingNotes.create({
        meeting_id: parseInt(meetingId),
        content: currentNote.trim()
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Refresh notes by fetching the complete tree structure
      const notesResponse = await api.meetingNotes.getTreeByMeeting(parseInt(meetingId));
      console.log('Refreshed notes response:', notesResponse);
      if (notesResponse.data && notesResponse.data.notes) {
        console.log('Refreshed notes structure:', notesResponse.data.notes[0]);
        setMeetingNotes(notesResponse.data.notes);
      }
      
      // Clear the input
      setCurrentNote('');
      setHasUnsavedNotes(false);
      
      console.log('Added new meeting note:', response.data);
      // TODO: Show success notification
    } catch (error) {
      console.error('Error adding meeting note:', error);
      // TODO: Show error notification to user
    } finally {
      setNotesLoading(false);
    }
  };

  // Reply to a note
  const handleReply = async (noteId: string) => {
    console.log('handleReply called with noteId:', noteId, 'replyContent:', replyContent.trim());
    
    if (!replyContent.trim()) {
      console.log('Reply content is empty, returning');
      return;
    }
    
    if (!noteId) {
      console.error('Note ID is undefined or empty');
      return;
    }
    
    setNotesLoading(true);
    try {
      console.log('Creating reply for noteId:', noteId, 'content:', replyContent.trim());
      const response = await api.meetingNotes.createReply(parseInt(noteId), replyContent.trim());
      console.log('CreateReply response:', response);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Refresh notes to show the new reply
      console.log('Refreshing notes after reply...');
      const notesResponse = await api.meetingNotes.getTreeByMeeting(parseInt(meetingId));
      if (notesResponse.data && notesResponse.data.notes) {
        setMeetingNotes(notesResponse.data.notes);
      }
      
      setReplyContent('');
      setReplyingTo(null);
      
      console.log('Successfully added reply to note:', response.data);
      // TODO: Show success notification
    } catch (error) {
      console.error('Error adding reply:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      // TODO: Show error notification to user
    } finally {
      setNotesLoading(false);
    }
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyContent('');
  };

  // Overview editing handlers
  const handleSaveDescription = async () => {
    try {
      const updateData = {
        description: tempDescription
      };
      
      const response = await api.meetings.update(parseInt(meetingId), updateData);
      if (response.error) throw new Error(response.error);
      
      setMeeting(prev => prev ? { ...prev, description: tempDescription } : null);
    setEditingDescription(false);
    console.log('Updated description:', tempDescription);
    } catch (error) {
      console.error('Error updating description:', error);
      // TODO: Show error notification to user
    }
  };

  const handleCancelDescription = () => {
    setTempDescription(meeting.description || '');
    setEditingDescription(false);
  };



  const handleSaveParticipants = async () => {
    setParticipantsLoading(true);
    try {
      // Convert selected participants to the format expected by the API
      const participantsToAdd = selectedParticipants.map(member => {
        console.log('DEBUG: Adding participant:', {
          id: member.id,
          username: member.username,
          projectRole: member.role,
          fullMemberObject: member
        });
        
        // For new participants, we can use a placeholder role since the backend will fetch the actual project role
        // The backend will ignore this and use the project role from user_project table
        let meetingRole = MeetingParticipantRole.DEVELOPER; // Placeholder - will be overridden by project role
        
        console.log('DEBUG: Adding participant with placeholder role (will use project role):', {
          userId: member.id,
          projectRole: member.role,
          placeholderRole: meetingRole
        });
        
        return {
          userId: member.id,
          role: meetingRole
        };
      });

      if (participantsToAdd.length > 0) {
        const response = await api.meetingParticipants.addMultipleParticipants(
          parseInt(meetingId),
          participantsToAdd
        );
        
        if (response.error) {
          throw new Error(response.error);
        }
      }

      // Refresh participants list
      const participantsResponse = await api.meetingParticipants.getByMeeting(parseInt(meetingId));
      if (participantsResponse.data) {
        setMeetingParticipants(participantsResponse.data.participants);
      }

      // Reset editing state
      setSelectedParticipants([]);
      setEditingParticipants(false);
      setShowParticipantDropdown(false);
      
      console.log('Successfully updated participants');
    } catch (error) {
      console.error('Error updating participants:', error);
      // TODO: Show error notification to user
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleCancelParticipants = () => {
    // Reset to no participants (current default state)
    setSelectedParticipants([]);
    setEditingParticipants(false);
    setShowParticipantDropdown(false);
  };

  const handleToggleParticipant = (member: ProjectMemberResponse) => {
    const isSelected = selectedParticipants.some(p => p.id === member.id);
    if (isSelected) {
      setSelectedParticipants(selectedParticipants.filter(p => p.id !== member.id));
    } else {
      setSelectedParticipants([...selectedParticipants, member]);
    }
  };

  const handleRemoveParticipant = (memberId: number) => {
    setSelectedParticipants(selectedParticipants.filter(p => p.id !== memberId));
  };

  const handleRemoveMeetingParticipant = async (participantId: number, userId?: number) => {
    setParticipantsLoading(true);
    try {
      let response;
      if (userId) {
        response = await api.meetingParticipants.removeParticipantByUser(parseInt(meetingId), userId);
      } else {
        response = await api.meetingParticipants.removeParticipant(parseInt(meetingId), participantId);
      }

      if (response.error) {
        throw new Error(response.error);
      }

      // Refresh participants list
      const participantsResponse = await api.meetingParticipants.getByMeeting(parseInt(meetingId));
      if (participantsResponse.data) {
        setMeetingParticipants(participantsResponse.data.participants);
      }

      console.log('Successfully removed participant');
    } catch (error) {
      console.error('Error removing participant:', error);
      // TODO: Show error notification to user
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleAddExternalParticipant = async () => {
    if (!externalParticipantName.trim()) return;

    setParticipantsLoading(true);
    try {
      const response = await api.meetingParticipants.addParticipant(
        parseInt(meetingId),
        {
          userId: undefined,
          externalName: externalParticipantName.trim(),
          externalEmail: externalParticipantEmail.trim() || undefined,
          role: MeetingParticipantRole.GUEST
        }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      // Refresh participants list
      const participantsResponse = await api.meetingParticipants.getByMeeting(parseInt(meetingId));
      if (participantsResponse.data) {
        setMeetingParticipants(participantsResponse.data.participants);
      }

      // Reset form
      setExternalParticipantName('');
      setExternalParticipantEmail('');
      setShowExternalParticipantForm(false);

      console.log('Successfully added external participant');
    } catch (error) {
      console.error('Error adding external participant:', error);
      // TODO: Show error notification to user
    } finally {
      setParticipantsLoading(false);
    }
  };



  const getAvailableMembers = () => {
    return allProjectMembers.filter(member => 
      !selectedParticipants.some(selected => selected.id === member.id) &&
      !meetingParticipants.some(participant => participant.userId === member.id)
    );
  };

  // Delete meeting notes
  const handleDeleteNotes = async () => {
    setNotesLoading(true);
    try {
      const response = await api.meetingNotes.deleteAllByMeeting(parseInt(meetingId));
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Clear local state
      setMeetingNotes([]);
      setConfirmModalOpen(false);
      setDeleteTarget(null);
      
      console.log('Deleted all meeting notes:', response.data?.message);
      // TODO: Show success notification
    } catch (error) {
      console.error('Error deleting meeting notes:', error);
      // TODO: Show error notification to user
    } finally {
      setNotesLoading(false);
    }
  };

  // Agenda item handlers
  const handleAddAgendaItem = async (item: string) => {
    setAgendaLoading(true);
    try {
      const response = await api.meetingAgenda.create({
        meeting_id: parseInt(meetingId),
        title: item
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Refresh agenda items
      const agendaResponse = await api.meetingAgenda.getByMeeting(parseInt(meetingId));
      if (agendaResponse.data) {
        setAgendaItems(agendaResponse.data);
      }
      
      console.log('Added agenda item:', response.data);
      // TODO: Show success notification
    } catch (error) {
      console.error('Error adding agenda item:', error);
      // TODO: Show error notification to user
    } finally {
      setAgendaLoading(false);
    }
  };

  const handleEditAgendaItem = async (item: string) => {
    if (editingAgendaIndex !== null) {
      setAgendaLoading(true);
      try {
        const agendaItem = agendaItems[editingAgendaIndex];
        if (!agendaItem) return;
        
        const response = await api.meetingAgenda.update(agendaItem.agendaId, {
          title: item
        });
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        // Refresh agenda items
        const agendaResponse = await api.meetingAgenda.getByMeeting(parseInt(meetingId));
        if (agendaResponse.data) {
          setAgendaItems(agendaResponse.data);
        }
        
      setEditingAgendaIndex(null);
        console.log('Updated agenda item:', response.data);
        // TODO: Show success notification
      } catch (error) {
        console.error('Error updating agenda item:', error);
        // TODO: Show error notification to user
      } finally {
        setAgendaLoading(false);
      }
    }
  };

  const handleDeleteAgendaItem = async (index: number) => {
    setAgendaLoading(true);
    try {
      const agendaItem = agendaItems[index];
      if (!agendaItem) return;
      
      const response = await api.meetingAgenda.delete(agendaItem.agendaId);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Remove from local state
      setAgendaItems(prev => prev.filter((_, i) => i !== index));
    setConfirmModalOpen(false);
    setDeleteTarget(null);
      
      console.log('Deleted agenda item:', agendaItem.agendaId);
      // TODO: Show success notification
    } catch (error) {
      console.error('Error deleting agenda item:', error);
      // TODO: Show error notification to user
    } finally {
      setAgendaLoading(false);
    }
  };

  // Bulk create agenda items
  const handleBulkCreateAgendaItems = async (agendaTitles: string[]) => {
    setAgendaLoading(true);
    try {
      const response = await api.meetingAgenda.bulkCreate(parseInt(meetingId), agendaTitles);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Refresh agenda items
      const agendaResponse = await api.meetingAgenda.getByMeeting(parseInt(meetingId));
      if (agendaResponse.data) {
        setAgendaItems(agendaResponse.data);
      }
      
      console.log('Bulk created agenda items:', response.data);
      // TODO: Show success notification
    } catch (error) {
      console.error('Error bulk creating agenda items:', error);
      // TODO: Show error notification to user
    } finally {
      setAgendaLoading(false);
    }
  };

  // Clear all agenda items
  const handleClearAllAgendaItems = async () => {
    setAgendaLoading(true);
    try {
      const response = await api.meetingAgenda.deleteAllByMeeting(parseInt(meetingId));
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Clear local state
      setAgendaItems([]);
      setConfirmModalOpen(false);
      setDeleteTarget(null);
      
      console.log('Cleared all agenda items');
      // TODO: Show success notification
    } catch (error) {
      console.error('Error clearing agenda items:', error);
      // TODO: Show error notification to user
    } finally {
      setAgendaLoading(false);
    }
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

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newAgenda = [...agendaItems];
    const draggedItem = newAgenda[draggedIndex];
    
    // Remove the dragged item
    newAgenda.splice(draggedIndex, 1);
    
    // Insert at new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newAgenda.splice(insertIndex, 0, draggedItem);

    // Update local state immediately for responsive UI
    setAgendaItems(newAgenda);
    setDraggedIndex(null);

    setAgendaLoading(true);
    try {
      // Send reorder request to backend
      console.log('DEBUG: newAgenda items:', newAgenda);
      
      const agendaIds = newAgenda.map((item, index) => {
        console.log(`DEBUG: Item ${index}:`, item);
        console.log(`DEBUG: Item keys:`, Object.keys(item || {}));
        
        if (!item) {
          throw new Error(`Agenda item at index ${index} is null or undefined`);
        }
        
        // Check for both possible field names
        const id = item.agendaId || item.id;
        if (typeof id !== 'number') {
          console.error('Invalid agenda item:', item);
          throw new Error(`Invalid agenda item at index ${index}: missing or invalid agendaId/id (got ${typeof id})`);
        }
        return id;
      });
      
      const response = await api.meetingAgenda.reorder(agendaIds);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      console.log('Reordered agenda items:', response.data);
      // TODO: Show success notification
    } catch (error) {
      console.error('Error reordering agenda items:', error);
      // Revert to original order on error
      const agendaResponse = await api.meetingAgenda.getByMeeting(parseInt(meetingId));
      if (agendaResponse.data) {
        setAgendaItems(agendaResponse.data);
      }
      // TODO: Show error notification to user
    } finally {
      setAgendaLoading(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Action item handlers
  const handleAddActionItem = async (item: any) => {
    try {
      console.log('Creating action item with data:', item);
      const dueDate = item.dueDate ? new Date(item.dueDate).toISOString() : undefined;
      console.log('Formatted due date:', dueDate);
      
      const response = await api.meetingActionItems.create({
        meeting_id: parseInt(meetingId),
        title: item.title,
        due_date: dueDate
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Refresh action items from API
      const actionResponse = await api.meetingActionItems.getByMeeting(parseInt(meetingId));
      if (actionResponse.data) {
        setActionItems(actionResponse.data);
      }
      
      console.log('Added action item:', response.data);
    } catch (error) {
      console.error('Error adding action item:', error);
      // TODO: Show error notification to user
    }
  };

  const handleEditActionItem = async (item: any) => {
    try {
      console.log('Updating action item with data:', item);
      const dueDate = item.dueDate ? new Date(item.dueDate).toISOString() : undefined;
      console.log('Formatted due date:', dueDate);
      
              const response = await api.meetingActionItems.update(item.id, {
        title: item.title,
        due_date: dueDate
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Refresh action items from API
      const actionResponse = await api.meetingActionItems.getByMeeting(parseInt(meetingId));
      if (actionResponse.data) {
        setActionItems(actionResponse.data);
      }
      
      setEditingActionItem(null);
      console.log('Updated action item:', response.data);
    } catch (error) {
      console.error('Error updating action item:', error);
      // TODO: Show error notification to user
    }
  };

  const handleDeleteActionItem = async (itemId: string) => {
    try {
      const response = await api.meetingActionItems.delete(parseInt(itemId));
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Remove from local state
              setActionItems(prev => prev.filter((action) => action.id !== parseInt(itemId)));
      setConfirmModalOpen(false);
      setDeleteTarget(null);
      
      console.log('Deleted action item:', itemId);
    } catch (error) {
      console.error('Error deleting action item:', error);
      // TODO: Show error notification to user
    }
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
        case 'all-agenda':
          handleClearAllAgendaItems();
          break;
        case 'action':
                  if (deleteTarget.item?.id) {
          handleDeleteActionItem(deleteTarget.item.id.toString());
          }
          break;
        case 'notes':
          handleDeleteNotes();
          break;
      }
    }
  };

  const projectName = project?.name || 'Loading...';

  // Breadcrumb data with icons
  const breadcrumbItems = [
    { label: projectName, href: `/project/${projectId}/dashboard` },
    { label: 'Meetings', href: `/project/${projectId}/meeting` },
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

  // Determine meeting status based on start time
  const getMeetingStatus = (startDatetime: string) => {
    const now = new Date();
    const startTime = parseDatetimeSafely(startDatetime);
    
    if (!startTime) return { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100', text: 'Unknown' };
    
    const endTime = new Date(startTime.getTime() + meeting.duration * 60000);
    
    if (now < startTime) {
      return { className: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100', text: 'Scheduled' };
    } else if (now >= startTime && now <= endTime) {
      return { className: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100', text: 'In Progress' };
    } else {
      return { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100', text: 'Completed' };
    }
  };

  const statusStyle = getMeetingStatus(meeting.startDatetime);

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

            {statusStyle.text === 'In Progress' && (
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
                {(() => {
                  const startDate = parseDatetimeSafely(meeting.startDatetime);
                  if (startDate) {
                    return <FormattedDateTime date={startDate} includeTime={true} short={false} />;
                  }
                  return 'Date not available';
                })()}
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
                {meeting.location || 'No location specified'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-5 h-5" />
              <span>{meetingParticipants.length} {meetingParticipants.length === 1 ? 'participant' : 'participants'}</span>
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
                  {statusStyle.text !== 'Completed' && !editingDescription && (
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

              

              {/* Participants Section */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Participants ({meetingParticipants.length})
                  </h3>
                  {statusStyle.text !== 'Completed' && !editingParticipants && (
                    <button
                      onClick={() => setEditingParticipants(true)}
                      className="flex items-center gap-2 px-3 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">Manage Participants</span>
                    </button>
                  )}
                </div>
                
                {editingParticipants ? (
                  <div className="space-y-4">
                    {/* Selected Participants */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Selected Participants ({selectedParticipants.length})
                      </h4>
                      {selectedParticipants.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          {selectedParticipants.map((participant) => (
                            <div key={`selected-participant-${participant.id}`} className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {participant.full_name?.charAt(0) || participant.username?.charAt(0) || participant.email.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {participant.full_name || participant.username || participant.email}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {participant.role}
                                </p>
                              </div>
                              <button
                                onClick={() => handleRemoveParticipant(participant.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition-colors"
                                title="Remove participant"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 mb-4">
                          <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">No participants selected</p>
                        </div>
                      )}
                    </div>

                    {/* Available Project Members */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Available Project Members ({getAvailableMembers().length})
                      </h4>
                      {getAvailableMembers().length > 0 ? (
                        <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                          {getAvailableMembers().map((member) => (
                            <div key={`available-member-${member.id}`} 
                                 className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 cursor-pointer transition-colors"
                                 onClick={() => handleToggleParticipant(member)}>
                              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm font-medium">
                                {member.full_name?.charAt(0) || member.username?.charAt(0) || member.email.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {member.full_name || member.username || member.email}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {member.role}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleParticipant(member);
                                }}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1 rounded transition-colors"
                                title="Add as participant"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p className="text-sm">All project members are already participants</p>
                        </div>
                      )}
                    </div>

                    {/* External Participant Form */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Add External Participant
                        </h4>
                        <button
                          onClick={() => setShowExternalParticipantForm(!showExternalParticipantForm)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                        >
                          {showExternalParticipantForm ? 'Cancel' : 'Add External'}
                        </button>
                      </div>

                      {showExternalParticipantForm && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Name *
                              </label>
                              <input
                                type="text"
                                value={externalParticipantName}
                                onChange={(e) => setExternalParticipantName(e.target.value)}
                                placeholder="Enter participant name..."
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                         placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={participantsLoading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email (Optional)
                              </label>
                              <input
                                type="email"
                                value={externalParticipantEmail}
                                onChange={(e) => setExternalParticipantEmail(e.target.value)}
                                placeholder="Enter participant email..."
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                         placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={participantsLoading}
                              />
                            </div>
                            <div className="flex justify-end">
                              <button
                                onClick={handleAddExternalParticipant}
                                disabled={!externalParticipantName.trim() || participantsLoading}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
                              >
                                {participantsLoading ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <Plus className="w-4 h-4" />
                                )}
                                {participantsLoading ? 'Adding...' : 'Add Participant'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <p className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Add project members as participants or add external participants using the form above.
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={handleCancelParticipants}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveParticipants}
                        disabled={participantsLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
                      >
                        {participantsLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {participantsLoading ? 'Saving...' : 'Save Participants'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meetingParticipants.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {meetingParticipants.map((participant) => (
                          <div key={`overview-participant-${participant.id}`} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {participant.fullName?.charAt(0) || participant.username?.charAt(0) || participant.email?.charAt(0) || participant.externalName?.charAt(0) || participant.externalEmail?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {participant.fullName || participant.username || participant.externalName || participant.email || participant.externalEmail || 'Unknown Participant'}
                              </p>
                              <div className="flex flex-col gap-1">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatRoleDisplayName(participant.role)}
                                </p>
                                {/* Show email for external participants if available */}
                                {participant.externalEmail && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                    {participant.externalEmail}
                                  </p>
                                )}
                                {/* Show email for internal users if no external email but has user email */}
                                {!participant.externalEmail && participant.email && participant.userId && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                    {participant.email}
                                  </p>
                                )}
                              </div>
                            </div>
                            {statusStyle.text !== 'Completed' && (
                              <button
                                onClick={() => handleRemoveMeetingParticipant(participant.id, participant.userId)}
                                disabled={participantsLoading}
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove participant"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="font-medium">No participants assigned</p>
                        <p className="text-sm mt-2">Click "Manage Participants" to add project members to this meeting</p>
                        {statusStyle.text !== 'Completed' && (
                          <button
                            onClick={() => setEditingParticipants(true)}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
                          >
                            <Plus className="w-4 h-4" />
                            Add Participants
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
                 {statusStyle.text !== 'Completed' && (
                   <div className="flex gap-2">
                  <button 
                    onClick={() => setAgendaModalOpen(true)}
                       disabled={agendaLoading}
                       className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 disabled:cursor-not-allowed"
                  >
                       {agendaLoading ? (
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                       ) : (
                    <Plus className="w-4 h-4" />
                       )}
                       {agendaLoading ? 'Processing...' : 'Add Agenda'}
                  </button>
                     {agendaItems.length > 0 && (
                       <button 
                         onClick={() => {
                           setDeleteTarget({type: 'all-agenda'});
                           setConfirmModalOpen(true);
                         }}
                         disabled={agendaLoading}
                         className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 disabled:cursor-not-allowed"
                       >
                         {agendaLoading ? (
                           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                         ) : (
                           <Trash2 className="w-4 h-4" />
                         )}
                         {agendaLoading ? 'Processing...' : 'Clear All'}
                       </button>
                     )}
                   </div>
                )}
              </div>
              
              <div className="space-y-3">
                 {agendaLoading && (
                   <div className="text-center py-4">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                     <p className="text-sm text-gray-600 dark:text-gray-400">Updating agenda...</p>
                   </div>
                 )}
                 {agendaItems.length > 0 ? agendaItems.map((item, index) => (
                  <div 
                    key={`agenda-${item.agendaId || index}`} 
                     draggable={statusStyle.text !== 'Completed' && !agendaLoading}
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
                       statusStyle.text !== 'Completed' && !agendaLoading ? 'cursor-move' : ''
                    }`}
                  >
                    {statusStyle.text !== 'Completed' && (
                      <div className="flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="flex-1 text-gray-900 dark:text-white">{item.title}</span>
                    {statusStyle.text === 'Completed' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                                         {statusStyle.text !== 'Completed' && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingAgendaIndex(index);
                            setAgendaModalOpen(true);
                          }}
                           disabled={agendaLoading}
                           className="p-1 text-gray-400 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                          title="Edit agenda item"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget({type: 'agenda', index});
                            setConfirmModalOpen(true);
                          }}
                           disabled={agendaLoading}
                           className="p-1 text-gray-400 hover:text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                          title="Delete agenda item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No agenda items yet
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Meeting notes tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Meeting Notes History Section */}
              {meetingNotes.length > 0 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Meeting Notes History ({meetingNotes.length})
                    </h3>
                    <div className="flex items-center gap-3">
                      {statusStyle.text !== 'Completed' && (
                        <button 
                          onClick={() => {
                            setDeleteTarget({type: 'notes'});
                            setConfirmModalOpen(true);
                          }}
                          disabled={notesLoading}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:cursor-not-allowed"
                        >
                          {notesLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          {notesLoading ? 'Processing...' : 'Clear All Notes'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
                    {meetingNotes.map((note, index) => {
                      // Handle both noteId (aliased) and id (fallback) from backend
                      const noteId = note.noteId || (note as any).id;
                      
                      // Debug logging for the first note
                      if (index === 0) {
                        console.log('Rendering note:', note);
                        console.log('noteId:', noteId);
                        console.log('Available fields:', Object.keys(note));
                      }
                      
                      return (
                      <div key={`note-${noteId || (note.createdAt || note.created_at) || Math.random()}`} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        {/* Main note */}
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {getUserAvatarLetter(note.user, currentUser)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {getUserDisplayName(note.user, currentUser)}
                              </span>
                              {note.user?.id === currentUser?.id && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200 px-1.5 py-0.5 rounded">
                                  You
                                </span>
                              )}
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {(note.createdAt || note.created_at) ? <FormattedDateTime date={new Date(note.createdAt || note.created_at!)} includeTime={true} short={true} /> : 'Unknown time'}
                              </span>
                            </div>
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <MarkdownEditor value={note.content} readonly={true} />
                            </div>
                            {statusStyle.text !== 'Completed' && noteId && (
                              <button
                                onClick={() => {
                                  console.log('Reply button clicked for noteId:', noteId);
                                  setReplyingTo(noteId.toString());
                                }}
                                disabled={notesLoading}
                                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                              >
                                Reply
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Child Notes (Replies) */}
                        {note.childNotes && note.childNotes.length > 0 && (
                          <div className="mt-4 ml-11 space-y-3">
                            {note.childNotes.map((childNote) => {
                              const childNoteId = childNote.noteId || (childNote as any).id;
                              return (
                              <div key={`child-note-${childNoteId}`} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                <div className="flex items-start gap-3">
                                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                    {getUserAvatarLetter(childNote.user, currentUser)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                                        {getUserDisplayName(childNote.user, currentUser)}
                                      </span>
                                      {childNote.user?.id === currentUser?.id && (
                                        <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200 px-1.5 py-0.5 rounded">
                                          You
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {(childNote.createdAt || childNote.created_at) ? <FormattedDateTime date={new Date(childNote.createdAt || childNote.created_at!)} includeTime={true} short={true} /> : 'Unknown time'}
                                      </span>
                                    </div>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                      <MarkdownEditor value={childNote.content} readonly={true} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                            })}
                          </div>
                        )}

                        {/* Reply input */}
                        {replyingTo === noteId?.toString() && statusStyle.text !== 'Completed' && noteId && (
                          <div className="mt-4 ml-11">
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  Replying to {getUserDisplayName(note.user, currentUser)}
                                </span>
                              </div>
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
                                  onClick={() => {
                                    console.log('Submit reply button clicked - noteId:', noteId, 'replyContent:', replyContent);
                                    if (noteId) {
                                      handleReply(noteId.toString());
                                    } else {
                                      console.error('Cannot submit reply: noteId is undefined');
                                    }
                                  }}
                                  disabled={!replyContent.trim() || notesLoading || !noteId}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm rounded transition-colors flex items-center gap-1"
                                >
                                  {notesLoading ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  ) : null}
                                  {notesLoading ? 'Replying...' : 'Reply'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes Editor Section */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" data-notes-editor>
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                    {statusStyle.text === 'Completed' ? 'Meeting Notes' : 'Write Meeting Notes'}
                  </h3>
                  <div className="flex items-center gap-2">
                    {hasUnsavedNotes && (
                      <span className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        Unsaved changes
                      </span>
                    )}
                    {statusStyle.text !== 'Completed' && (
                      <button 
                        onClick={handleSaveNotes}
                        disabled={!currentNote.trim() || notesLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                      >
                        {notesLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {notesLoading ? 'Saving...' : 'Add Note'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {statusStyle.text === 'Completed' ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Meeting is completed. No new notes can be added.
                    </div>
                  ) : (
                    <MarkdownEditor 
                      value={currentNote} 
                      readonly={false} 
                      onChange={handleNotesChange}
                    />
                  )}
                </div>
              </div>


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

              {actionItems.length > 0 ? (
                <div className="space-y-3">
                  {actionItems.map((action: any, idx: number) => {
                    const stableKey = action.id ?? `fallback-${idx}`;
                    if (process.env.NODE_ENV !== 'production') {
                      if (stableKey === `fallback-${idx}`) {
                        // eslint-disable-next-line no-console
                        console.warn('Action item missing id, using fallback key', action);
                      }
                    }
                    console.log('Rendering action item:', action);
                    
                    // Parse dates properly
                    const createdDate = action.created_at ? new Date(action.created_at) : null;
                    const dueDate = action.due_date ? new Date(action.due_date) : null;
                    
                    // Get creator display name - prioritize full_name, fallback to username, then email
                    const creatorDisplayName = action.user?.full_name || 
                                             action.user?.username || 
                                             action.user?.email || 
                                             'Unknown User';
                    
                    console.log('Created date:', action.created_at, 'Parsed:', createdDate);
                    console.log('Due date:', action.due_date, 'Parsed:', dueDate);
                    console.log('Creator:', action.user, 'Display name:', creatorDisplayName);
                    
                    return (
                      <div key={stableKey} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg group">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {action.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  console.log('Edit button clicked for action:', action);
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
                          <div className="flex items-center gap-4">
                            <span>Created: {createdDate ? <FormattedDateTime date={createdDate} short={true} /> : 'Unknown'}</span>
                            <span>by: {creatorDisplayName}</span>
                          </div>
                          <span>Due: {dueDate ? <FormattedDateTime date={dueDate} short={true} /> : 'No due date'}</span>
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
         onBulkSave={editingAgendaIndex === null ? handleBulkCreateAgendaItems : undefined}
         item={editingAgendaIndex !== null ? agendaItems[editingAgendaIndex]?.title : null}
      />

      <ActionItemModal
        isOpen={actionModalOpen}
        onClose={() => {
          console.log('ActionItemModal: Closing modal, clearing editingActionItem');
          setActionModalOpen(false);
          setEditingActionItem(null);
        }}
        onSave={editingActionItem ? handleEditActionItem : handleAddActionItem}
        item={editingActionItem}
        projectMembers={selectedParticipants}
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
           deleteTarget?.type === 'all-agenda' ? 'Clear All Agenda Items' :
          deleteTarget?.type === 'action' ? 'Delete Action Item' :
          deleteTarget?.type === 'notes' ? 'Delete Meeting Notes' : 'Confirm Delete'
        }
        message={
          deleteTarget?.type === 'agenda' ? 'Are you sure you want to delete this agenda item? This action cannot be undone.' :
           deleteTarget?.type === 'all-agenda' ? 'Are you sure you want to clear all agenda items? This action cannot be undone.' :
          deleteTarget?.type === 'action' ? 'Are you sure you want to delete this action item? This action cannot be undone.' :
          deleteTarget?.type === 'notes' ? 'Are you sure you want to delete all meeting notes? This action cannot be undone.' :
          'Are you sure you want to delete this item?'
        }
      />
    </div>
  );
};

export default MeetingDetail;
