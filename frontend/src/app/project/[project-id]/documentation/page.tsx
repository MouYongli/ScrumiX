'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Upload, Calendar, User, Tag, 
  Eye, Edit2, Download, Trash2, FileText, FolderOpen,
  BookOpen, ChevronDown, X, Loader2
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { useDateFormat } from '@/hooks/useDateFormat';
import { api } from '@/utils/api';
import { documentationApi } from '@/utils/api';
import { Documentation, DocumentationType, DocumentationCreate, DocumentationUpdate } from '@/types/api';

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

interface ProjectDocumentationProps {
  params: Promise<{ 'project-id': string }>;
}

// Document Modal Component
interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (document: DocumentationCreate | DocumentationUpdate) => void;
  document?: Documentation;
  mode: 'create' | 'edit';
  projectId: number;
  projectUsers: Array<{
    id: number;
    full_name: string;
    email: string;
    username?: string;
  }>;
}

const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose, onSave, document, mode, projectId, projectUsers }) => {
  const [formData, setFormData] = useState({
    title: document?.title || '',
    description: document?.description || '',
    type: document?.type || DocumentationType.OTHER,
    file_url: document?.file_url || ''
  });

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAuthors, setSelectedAuthors] = useState<number[]>(
    document?.authors?.map(author => author.id) || []
  );
  const [isAuthorDropdownOpen, setIsAuthorDropdownOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let fileUrl = formData.file_url;
    
      // In a real implementation, you would upload the file to a file server
      // and get back a URL. For now, we'll use the existing file_url or a placeholder
    if (uploadedFile) {
        // This is a placeholder - in production you'd upload to S3, etc.
        fileUrl = `uploads/${uploadedFile.name}`;
      }
      
      const documentData: DocumentationCreate | DocumentationUpdate = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        file_url: fileUrl,
        author_ids: selectedAuthors.length > 0 ? selectedAuthors : undefined,
        ...(mode === 'create' && { project_id: projectId })
      };

      await onSave(documentData);
    onClose();
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      
      // Create preview URL for supported file types
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        const fileUrl = URL.createObjectURL(file);
        setFilePreview(fileUrl);
      } else {
        setFilePreview(null);
      }
    }
  };

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

  // Cleanup object URLs when component unmounts or file changes
  React.useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  // Handle clicking outside the dropdown to close it
  React.useEffect(() => {
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

  // Update form data when document changes
  React.useEffect(() => {
    if (document) {
      setFormData({
        title: document.title || '',
        description: document.description || '',
        type: document.type || DocumentationType.OTHER,
        file_url: document.file_url || ''
      });
      setSelectedAuthors(document.authors?.map(author => author.id) || []);
    } else {
      setFormData({
        title: '',
        description: '',
        type: DocumentationType.OTHER,
        file_url: ''
      });
      setSelectedAuthors([]);
    }
  }, [document]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-100 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === 'create' ? 'Create New Document' : 'Edit Document'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Document Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter document title"
            />
          </div>

          {/* Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Document Type *
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
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
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of the document"
            />
          </div>

          {/* Authors */}
          <div>
            <label htmlFor="authors" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

          {/* File URL */}
          <div>
            <label htmlFor="file_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              File URL
            </label>
            <input
              type="url"
              id="file_url"
              name="file_url"
              value={formData.file_url}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/document.pdf"
            />
          </div>

          {/* File Upload */}
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload File (Optional)
            </label>
            <input
              type="file"
              id="file"
              name="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
              onChange={handleFileChange}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Supported formats: PDF, DOC, DOCX, TXT, MD
            </p>
          </div>

          {/* File Preview */}
          {filePreview && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                File Preview
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {uploadedFile?.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => window.open(filePreview, '_blank')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Open in New Tab
                  </button>
                </div>
                {uploadedFile?.type === 'application/pdf' ? (
                  <iframe
                    src={filePreview}
                    className="w-full h-64 border border-gray-200 dark:border-gray-600 rounded"
                    title="PDF Preview"
                  />
                ) : uploadedFile?.type.startsWith('image/') ? (
                  <img
                    src={filePreview}
                    alt="Image Preview"
                    className="w-full max-h-64 object-contain rounded"
                  />
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    File uploaded: {uploadedFile?.name}
                    <br />
                    <span className="text-sm">Preview not available for this file type</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'create' ? 'Create Document' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProjectDocumentation: React.FC<ProjectDocumentationProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = parseInt(resolvedParams['project-id']);

  const [documents, setDocuments] = useState<Documentation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingDocument, setEditingDocument] = useState<Documentation | undefined>();
  const [projectName, setProjectName] = useState<string>('Project');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectUsers, setProjectUsers] = useState<Array<{
    id: number;
    full_name: string;
    email: string;
    username?: string;
  }>>([]);

  // Fetch project documentation - only once when component mounts
  useEffect(() => {
    const fetchDocumentation = async () => {
      if (!projectId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await documentationApi.getByProject(projectId);
        
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          setDocuments(response.data);
        }
      } catch (err) {
        setError('Failed to fetch documentation');
        console.error('Error fetching documentation:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentation();
  }, [projectId]);

  // Fetch current project name for breadcrumb
  useEffect(() => {
    const fetchProjectName = async () => {
      if (!projectId) return;
      try {
        const response = await api.projects.getById(projectId);
        if (!response.error && response.data && response.data.name) {
          setProjectName(response.data.name);
        }
      } catch (e) {
        // Silently ignore; fallback 'Project' will be shown
      }
    };
    fetchProjectName();
  }, [projectId]);

  // Fetch project users for author selection
  useEffect(() => {
    const fetchProjectUsers = async () => {
      if (!projectId) return;
      try {
        const response = await documentationApi.getProjectUsers(projectId);
        if (!response.error && response.data) {
          setProjectUsers(response.data);
        }
      } catch (e) {
        console.error('Error fetching project users:', e);
      }
    };
    fetchProjectUsers();
  }, [projectId]);

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: projectName, href: `/project/${projectId}/dashboard` },
    { label: 'Documentation', icon: <BookOpen className="w-4 h-4" /> }
  ];

  // Filter documents client-side for instant search results
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchTerm === '' || 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleCreateDocument = () => {
    setModalMode('create');
    setEditingDocument(undefined);
    setIsModalOpen(true);
  };

  const handleEditDocument = (document: Documentation) => {
    setModalMode('edit');
    setEditingDocument(document);
    setIsModalOpen(true);
  };

  const handleSaveDocument = async (documentData: DocumentationCreate | DocumentationUpdate) => {
    try {
    if (modalMode === 'create') {
        const response = await documentationApi.create(documentData as DocumentationCreate);
        
        if (response.error) {
          throw new Error(response.error);
        }
        if (response.data) {
          setDocuments([response.data, ...documents]);
        } else {
          throw new Error('No data received from server');
        }
    } else {
        if (!editingDocument) {
          throw new Error('No document selected for editing');
        }
        const response = await documentationApi.update(editingDocument.id, documentData);
        
        if (response.error) {
          throw new Error(response.error);
        }
        if (response.data) {
      setDocuments(documents.map(doc => 
            doc.id === editingDocument.id ? response.data! : doc
          ));
        } else {
          throw new Error('No data received from server');
        }
      }
    } catch (error) {
      console.error('Error saving document:', error);
      
      // Better error message handling
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      alert(`Error saving document: ${errorMessage}`);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      const response = await documentationApi.delete(id);
      if (response.error) {
        throw new Error(response.error);
      }
      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (error) {
      console.error('Error deleting document:', error);
      
      // Better error message handling
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      alert(`Error deleting document: ${errorMessage}`);
    }
  };

  const handleViewDocument = (doc: Documentation) => {
    if (doc.file_url) {
      // If document has a file URL, open it in a new tab
      window.open(doc.file_url, '_blank');
    } else if (doc.description) {
      // If document has description but no file, show content in alert
      alert(`Document Content:\n\n${doc.description}`);
    } else {
      // If no file or content, show message
      alert('No content or file available to view.');
    }
  };

  const handleDownloadDocument = (doc: Documentation) => {
    if (doc.file_url) {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = doc.file_url;
      link.download = doc.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('No file available for download.');
    }
  };

  const getTypeIcon = (type: DocumentationType) => {
    switch (type) {
      case DocumentationType.SPRINT_REVIEW: return '📊';
      case DocumentationType.SPRINT_RETROSPECTIVE: return '🔄';
      case DocumentationType.REQUIREMENT: return '📋';
      case DocumentationType.DESIGN_ARCHITECTURE: return '🏗️';
      case DocumentationType.MEETING_REPORT: return '📝';
      case DocumentationType.USER_GUIDE: return '📖';
      case DocumentationType.OTHER: return '📄';
      default: return '📄';
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbItems} />
        <div className="text-center py-12">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <FileText className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error loading documentation
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
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
            Documentation
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage project documents, meeting notes, and shared resources
          </p>
        </div>
            <button 
              onClick={handleCreateDocument}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Doc
            </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
          </div>
        </div>
        
          <div className="flex gap-4">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Types</option>
              <option value={DocumentationType.REQUIREMENT}>Requirement</option>
              <option value={DocumentationType.DESIGN_ARCHITECTURE}>Design Architecture</option>
              <option value={DocumentationType.MEETING_REPORT}>Meeting Report</option>
              <option value={DocumentationType.SPRINT_REVIEW}>Sprint Review</option>
              <option value={DocumentationType.SPRINT_RETROSPECTIVE}>Sprint Retrospective</option>
              <option value={DocumentationType.USER_GUIDE}>User Guide</option>
              <option value={DocumentationType.OTHER}>Other</option>
                </select>
              </div>
            </div>
      </div>

      {/* Document Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredDocuments.map((doc) => (
          <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
            {/* Document Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{getTypeIcon(doc.type)}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {doc.title}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span><FormattedDate date={new Date(doc.created_at)} short={false} /></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {doc.description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {doc.description}
              </p>
            )}

            {/* File Attachment Indicator */}
            {doc.file_url && (
              <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 mb-4">
                <FileText className="w-4 h-4" />
                <span>Attached: {doc.file_url.split('/').pop()}</span>
              </div>
            )}

            {/* Author and Tags */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span>
                  {doc.authors && doc.authors.length > 0 
                    ? `Authors: ${doc.authors.map(author => author.full_name).join(', ')}`
                    : 'No authors assigned'
                  }
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {doc.type}
                  </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => handleViewDocument(doc)}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </button>
                <button 
                  onClick={() => handleEditDocument(doc)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button 
                  onClick={() => handleDownloadDocument(doc)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button 
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No documents found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Get started by creating your first document using the "New Doc" button above'}
          </p>
        </div>
      )}

      {/* Document Modal */}
      <DocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveDocument}
        document={editingDocument}
        mode={modalMode}
        projectId={projectId}
        projectUsers={projectUsers}
      />
    </div>
  );
};

export default ProjectDocumentation; 