'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, Plus, Upload, Calendar, User, Tag, 
  Eye, Edit2, Download, Trash2, FileText, FolderOpen,
  BookOpen, ChevronDown, X, Loader2, BarChart3, ArrowRight
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import ConfirmationModal from '@/components/common/ConfirmationModal';
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


const ProjectDocumentation: React.FC<ProjectDocumentationProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = parseInt(resolvedParams['project-id']);
  const router = useRouter();

  const [documents, setDocuments] = useState<Documentation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [projectName, setProjectName] = useState<string>('Project');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Documentation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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


  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: projectName, href: `/project/${projectId}/dashboard` },
    { label: 'Wiki', icon: <BookOpen className="w-4 h-4" /> }
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
    // Navigate to the create page instead of opening modal
    router.push(`/project/${projectId}/documentation/create`);
  };

  const handleEditDocument = (document: Documentation) => {
    // Navigate to the edit page instead of opening modal
    router.push(`/project/${projectId}/documentation/${document.id}/edit`);
  };


  // Handle delete document with confirmation modal
  const handleDeleteDocument = (document: Documentation) => {
    setDocumentToDelete(document);
    setDeleteModalOpen(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await documentationApi.delete(documentToDelete.id);
      if (response.error) {
        throw new Error(response.error);
      }
      
      setDocuments(documents.filter(doc => doc.id !== documentToDelete.id));
      setDeleteModalOpen(false);
      setDocumentToDelete(null);
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
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteDocument = () => {
    setDeleteModalOpen(false);
    setDocumentToDelete(null);
    setIsDeleting(false);
  };


  const handleViewDocument = (doc: Documentation) => {
    // Navigate to the dedicated view page
    router.push(`/project/${projectId}/documentation/${doc.id}`);
  };

  const handleDownloadDocument = (doc: Documentation) => {
    if (doc.file_url) {
      // Download file from URL
      const link = document.createElement('a');
      link.href = doc.file_url;
      link.download = doc.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (doc.content) {
      // Download as markdown file
      const fileName = doc.title || 'document';
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
      
      // Create markdown content
      let markdownContent = '';
      
      markdownContent += `# ${doc.title}\n\n`;
      
      if (doc.description) {
        markdownContent += `**Description:** ${doc.description}\n\n`;
      }
      
      markdownContent += `**Type:** ${doc.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\n`;
      
      if (doc.authors && doc.authors.length > 0) {
        const authorNames = doc.authors.map(author => author.full_name).join(', ');
        markdownContent += `**Authors:** ${authorNames}\n\n`;
      }
      
      markdownContent += '---\n\n';
      markdownContent += doc.content;

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
    } else {
      alert('No file or content available for download.');
    }
  };

  const getTypeIcon = (type: DocumentationType) => {
    switch (type) {
      case DocumentationType.SPRINT_REVIEW: return <BarChart3 className="w-5 h-5 text-blue-600" />;
      case DocumentationType.SPRINT_RETROSPECTIVE: return <ArrowRight className="w-5 h-5 text-purple-600" />;
      case DocumentationType.REQUIREMENT: return <FileText className="w-5 h-5 text-green-600" />;
      case DocumentationType.DESIGN_ARCHITECTURE: return <FolderOpen className="w-5 h-5 text-orange-600" />;
      case DocumentationType.MEETING_REPORT: return <Edit2 className="w-5 h-5 text-indigo-600" />;
      case DocumentationType.USER_GUIDE: return <BookOpen className="w-5 h-5 text-teal-600" />;
      case DocumentationType.OTHER: return <FileText className="w-5 h-5 text-gray-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading wiki pages...</p>
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
            Error loading wiki pages
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
            Wiki
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage project documents and shared resources
          </p>
        </div>
            <button 
              onClick={handleCreateDocument}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Page
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
                placeholder="Search wiki pages..."
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
                <div className="flex-shrink-0">{getTypeIcon(doc.type)}</div>
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
                  onClick={() => handleDeleteDocument(doc)}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded"
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
            No pages found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Get started by creating your first wiki page using the "New Page" button above'}
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={cancelDeleteDocument}
        onConfirm={confirmDeleteDocument}
        title="Delete Document"
        message={
          documentToDelete 
            ? `Are you sure you want to delete "${documentToDelete.title}"? This action cannot be undone and will permanently remove the document from your project.`
            : ''
        }
        confirmText="Delete Document"
        cancelText="Keep Document"
        variant="danger"
        loading={isDeleting}
      />

    </div>
  );
};

export default ProjectDocumentation; 