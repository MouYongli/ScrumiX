'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Eye, Type, Bold, Italic, List, 
  ListOrdered, Quote, Code, Link as LinkIcon, Hash,
  ChevronDown, X, Loader2, BookOpen, User, Calendar, Download
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { documentationApi } from '@/utils/api';
import { api } from '@/utils/api';
import { DocumentationType, DocumentationUpdate, Documentation } from '@/types/api';

interface EditDocumentationProps {
  params: Promise<{ 'project-id': string; 'doc-id': string }>;
}

const EditDocumentation: React.FC<EditDocumentationProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = parseInt(resolvedParams['project-id']);
  const docId = parseInt(resolvedParams['doc-id']);
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<DocumentationType>(DocumentationType.OTHER);
  const [selectedAuthors, setSelectedAuthors] = useState<number[]>([]);
  const [isAuthorDropdownOpen, setIsAuthorDropdownOpen] = useState(false);

  // UI state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('Project');
  const [documentTitle, setDocumentTitle] = useState<string>('Document');
  const [projectUsers, setProjectUsers] = useState<Array<{
    id: number;
    full_name: string;
    email: string;
    username?: string;
  }>>([]);

  // Track changes for unsaved detection
  const [originalData, setOriginalData] = useState({
    title: '',
    content: '',
    description: '',
    type: DocumentationType.OTHER,
    selectedAuthors: [] as number[]
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [unsavedChangesModalOpen, setUnsavedChangesModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Editor references
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch project and document data
  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || !docId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch document data
        const docResponse = await documentationApi.getById(docId);
        if (docResponse.error) {
          throw new Error(docResponse.error);
        }
        
        if (docResponse.data) {
          const doc = docResponse.data;
          const docData = {
            title: doc.title,
            content: doc.content || '',
            description: doc.description || '',
            type: doc.type,
            selectedAuthors: doc.authors?.map(author => author.id) || []
          };
          
          setTitle(docData.title);
          setDescription(docData.description);
          setContent(docData.content);
          setType(docData.type);
          setSelectedAuthors(docData.selectedAuthors);
          setDocumentTitle(docData.title);
          
          // Store original data for change detection
          setOriginalData(docData);
        }

        // Fetch project name
        const projectResponse = await api.projects.getById(projectId);
        if (!projectResponse.error && projectResponse.data?.name) {
          setProjectName(projectResponse.data.name);
        }

        // Fetch project users
        const usersResponse = await documentationApi.getProjectUsers(projectId);
        if (!usersResponse.error && usersResponse.data) {
          setProjectUsers(usersResponse.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId, docId]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = (
      title !== originalData.title ||
      content !== originalData.content ||
      description !== originalData.description ||
      type !== originalData.type ||
      JSON.stringify(selectedAuthors.sort()) !== JSON.stringify(originalData.selectedAuthors.sort())
    );
    setHasUnsavedChanges(hasChanges);
  }, [title, content, description, type, selectedAuthors, originalData]);

  // Prevent navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: projectName, href: `/project/${projectId}/dashboard` },
    { label: 'Wiki', href: `/project/${projectId}/documentation`, icon: <BookOpen className="w-4 h-4" /> },
    { label: `Edit: ${documentTitle}` }
  ];

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'p') {
          e.preventDefault();
          setIsPreviewMode(!isPreviewMode);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewMode, title, content, description, type, selectedAuthors]);

  // Text formatting functions
  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  // Formatting toolbar actions
  const formatBold = () => insertText('**', '**');
  const formatItalic = () => insertText('*', '*');
  const formatCode = () => insertText('`', '`');
  const formatQuote = () => insertText('\n> ', '');
  const formatH1 = () => insertText('\n# ', '');
  const formatH2 = () => insertText('\n## ', '');
  const formatH3 = () => insertText('\n### ', '');
  const formatList = () => insertText('\n- ', '');
  const formatOrderedList = () => insertText('\n1. ', '');
  const formatLink = () => insertText('[', '](url)');

  // Author management
  const toggleAuthor = (userId: number) => {
    setSelectedAuthors(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const removeAuthor = (userId: number) => {
    setSelectedAuthors(prev => prev.filter(id => id !== userId));
  };

  const getAuthorDisplayName = (userId: number) => {
    const user = projectUsers.find(u => u.id === userId);
    return user ? (user.full_name || user.username || user.email) : 'Unknown User';
  };

  // Save document
  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a document title');
      return;
    }

    setIsSaving(true);
    
    try {
      const documentData: DocumentationUpdate = {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        content: content.trim() || undefined,
        author_ids: selectedAuthors.length > 0 ? selectedAuthors : undefined
      };

      const response = await documentationApi.update(docId, documentData);
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Mark as saved and navigate back
      setHasUnsavedChanges(false);
      router.push(`/project/${projectId}/documentation`);
    } catch (error) {
      console.error('Error saving document:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      alert(`Error saving document: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle navigation with unsaved changes check
  const handleNavigateAway = (destination: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(destination);
      setUnsavedChangesModalOpen(true);
    } else {
      router.push(destination);
    }
  };

  // Cancel and go back
  const handleCancel = () => {
    handleNavigateAway(`/project/${projectId}/documentation`);
  };

  // Confirm navigation away with unsaved changes
  const confirmNavigateAway = () => {
    if (pendingNavigation) {
      setHasUnsavedChanges(false);
      router.push(pendingNavigation);
    }
    setUnsavedChangesModalOpen(false);
    setPendingNavigation(null);
  };

  const cancelNavigateAway = () => {
    setUnsavedChangesModalOpen(false);
    setPendingNavigation(null);
  };

  // Download document as markdown file
  const handleDownload = () => {
    if (!title.trim() && !content.trim()) {
      alert('Please add a title and content before downloading');
      return;
    }

    const fileName = title.trim() || 'document';
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
    
    // Create markdown content
    let markdownContent = '';
    
    if (title.trim()) {
      markdownContent += `# ${title.trim()}\n\n`;
    }
    
    if (description.trim()) {
      markdownContent += `**Description:** ${description.trim()}\n\n`;
    }
    
    markdownContent += `**Type:** ${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\n`;
    
    if (selectedAuthors.length > 0) {
      const authorNames = selectedAuthors.map(id => getAuthorDisplayName(id)).join(', ');
      markdownContent += `**Authors:** ${authorNames}\n\n`;
    }
    
    markdownContent += '---\n\n';
    
    if (content.trim()) {
      markdownContent += content.trim();
    }

    // Create and download file
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizedFileName}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Render markdown preview (simple implementation)
  const renderMarkdownPreview = (text: string) => {
    return text
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">$1</a>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600 dark:text-gray-400">$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
      .replace(/\n/g, '<br>');
  };

  // Handle clicking outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.author-dropdown')) {
        setIsAuthorDropdownOpen(false);
      }
    };

    window.document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <Breadcrumb items={breadcrumbItems} />
          <div className="text-center py-12">
            <div className="text-red-600 dark:text-red-400 mb-4">
              <BookOpen className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Error loading document
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button 
              onClick={() => router.push(`/project/${projectId}/documentation`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Documentation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCancel}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Wiki</span>
            </button>
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400 text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span>Unsaved changes</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                isPreviewMode
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {isPreviewMode ? <Type className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{isPreviewMode ? 'Write' : 'Preview'}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={!title.trim() && !content.trim()}
              className="flex items-center space-x-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-400 px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            
            <button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Saving...' : 'Save Page'}</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Document Metadata Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Document Settings</h3>
              
              {/* Document Type */}
              <div className="mb-4">
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document Type
                </label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as DocumentationType)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={DocumentationType.REQUIREMENT}>Requirement</option>
                  <option value={DocumentationType.DESIGN_ARCHITECTURE}>Design Architecture</option>
                  <option value={DocumentationType.MEETING_REPORT}>Meeting Report</option>
                  <option value={DocumentationType.SPRINT_REVIEW}>Sprint Review</option>
                  <option value={DocumentationType.SPRINT_RETROSPECTIVE}>Sprint Retrospective</option>
                  <option value={DocumentationType.USER_GUIDE}>User Guide</option>
                  <option value={DocumentationType.OTHER}>Other</option>
                </select>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Brief description of the document"
                />
              </div>

              {/* Authors */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Authors
                </label>
                <div className="relative author-dropdown">
                  <button
                    type="button"
                    onClick={() => setIsAuthorDropdownOpen(!isAuthorDropdownOpen)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent flex justify-between items-center"
                  >
                    <span className="text-gray-500 dark:text-gray-400">
                      {selectedAuthors.length === 0 
                        ? 'Select authors...' 
                        : `${selectedAuthors.length} author${selectedAuthors.length !== 1 ? 's' : ''} selected`
                      }
                    </span>
                    <ChevronDown className={`w-4 h-4 transform transition-transform ${isAuthorDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isAuthorDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {projectUsers.map(user => (
                        <label key={user.id} className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedAuthors.includes(user.id)}
                            onChange={() => toggleAuthor(user.id)}
                            className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-gray-900 dark:text-white">{getAuthorDisplayName(user.id)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                
                {selectedAuthors.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedAuthors.map(userId => (
                      <span
                        key={userId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-sm rounded-full"
                      >
                        {getAuthorDisplayName(userId)}
                        <button
                          type="button"
                          onClick={() => removeAuthor(userId)}
                          className="hover:text-blue-600 dark:hover:text-blue-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Formatting Help */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Markdown Formatting</h4>
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <div><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded"># Header 1</code></div>
                <div><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">## Header 2</code></div>
                <div><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">**Bold text**</code></div>
                <div><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">*Italic text*</code></div>
                <div><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">`Code`</code></div>
                <div><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">- List item</code></div>
                <div><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">1. Numbered item</code></div>
                <div><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'> Quote'}</code></div>
                <div><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">[Link](url)</code></div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <strong>Shortcuts:</strong><br/>
                  Ctrl+S: Save<br/>
                  Ctrl+P: Toggle Preview
                </p>
              </div>
            </div>
          </div>

          {/* Main Editor Area */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Title Input */}
              <div className="border-b border-gray-200 dark:border-gray-700 p-6 pb-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document title"
                  className="w-full text-3xl font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              {/* Toolbar */}
              {!isPreviewMode && (
                <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Heading buttons */}
                    <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-3 mr-3">
                      <button
                        type="button"
                        onClick={formatH1}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Header 1"
                      >
                        <span className="text-sm font-bold">H1</span>
                      </button>
                      <button
                        type="button"
                        onClick={formatH2}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Header 2"
                      >
                        <span className="text-sm font-bold">H2</span>
                      </button>
                      <button
                        type="button"
                        onClick={formatH3}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Header 3"
                      >
                        <span className="text-sm font-bold">H3</span>
                      </button>
                    </div>

                    {/* Text formatting */}
                    <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-3 mr-3">
                      <button
                        type="button"
                        onClick={formatBold}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Bold (Ctrl+B)"
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={formatItalic}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Italic (Ctrl+I)"
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={formatCode}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Inline Code"
                      >
                        <Code className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Lists */}
                    <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-3 mr-3">
                      <button
                        type="button"
                        onClick={formatList}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Bullet List"
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={formatOrderedList}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Numbered List"
                      >
                        <ListOrdered className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Other formatting */}
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={formatQuote}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Quote"
                      >
                        <Quote className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={formatLink}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Link"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Editor/Preview Area */}
              <div className="p-6">
                {isPreviewMode ? (
                  <div 
                    className="prose prose-gray dark:prose-invert max-w-none min-h-[500px]"
                    dangerouslySetInnerHTML={{ 
                      __html: content ? renderMarkdownPreview(content) : '<p class="text-gray-400 italic">No content to preview.</p>' 
                    }}
                  />
                ) : (
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Edit your document content here...

You can use Markdown formatting:
# Large heading
## Medium heading  
### Small heading

**Bold text** and *italic text*

- Bullet points
1. Numbered lists

> Quotes

`Inline code`

[Links](https://example.com)"
                    className="w-full min-h-[500px] text-gray-900 dark:text-white bg-transparent border-none outline-none resize-none focus:ring-0 font-mono text-sm leading-relaxed placeholder-gray-400 dark:placeholder-gray-500"
                    style={{ lineHeight: '1.6' }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Unsaved Changes Confirmation Modal */}
        <ConfirmationModal
          isOpen={unsavedChangesModalOpen}
          onClose={cancelNavigateAway}
          onConfirm={confirmNavigateAway}
          title="Unsaved Changes"
          message="You have unsaved changes that will be lost if you leave this page. Are you sure you want to continue?"
          confirmText="Leave Page"
          cancelText="Stay Here"
          variant="warning"
        />
      </div>
    </div>
  );
};

export default EditDocumentation;
