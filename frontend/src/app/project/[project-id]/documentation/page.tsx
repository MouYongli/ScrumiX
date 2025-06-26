'use client';

import React, { useState } from 'react';
import { 
  Search, Plus, Upload, Filter, Calendar, User, Tag, 
  Eye, Edit2, Download, Trash2, FileText, FolderOpen,
  BookOpen, Filter as FilterIcon, ChevronDown, X
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';

interface DocumentItem {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  tags: string[];
  type: 'retrospective' | 'meeting' | 'requirements' | 'design' | 'other';
  fileSize?: string;
  description?: string;
  content?: string;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
}

interface ProjectDocumentationProps {
  params: Promise<{ 'project-id': string }>;
}

// Mock documentation data
const mockDocuments: DocumentItem[] = [
  {
    id: '1',
    title: 'Sprint 5 Retrospective',
    author: 'M. Schmidt',
    createdAt: '2025-06-19',
    tags: ['retrospective', 'team'],
    type: 'retrospective',
    fileSize: '2.3 MB',
    description: 'Team retrospective meeting notes and action items for Sprint 5',
    content: 'Sprint 5 retrospective content...'
  },
  {
    id: '2',
    title: 'Product Requirements Document',
    author: 'J. Anderson',
    createdAt: '2025-06-15',
    tags: ['requirements', 'product'],
    type: 'requirements',
    fileSize: '1.8 MB',
    description: 'Comprehensive product requirements and specifications',
    content: 'Product requirements content...'
  },
  {
    id: '3',
    title: 'Daily Standup Notes - Week 24',
    author: 'R. Williams',
    createdAt: '2025-06-12',
    tags: ['standup', 'weekly'],
    type: 'meeting',
    fileSize: '0.5 MB',
    description: 'Weekly compilation of daily standup meeting notes',
    content: 'Daily standup notes content...'
  },
  {
    id: '4',
    title: 'UI/UX Design Guidelines',
    author: 'S. Johnson',
    createdAt: '2025-06-08',
    tags: ['design', 'guidelines', 'ui'],
    type: 'design',
    fileSize: '5.2 MB',
    description: 'Design system and UI/UX guidelines for the project',
    content: 'UI/UX design guidelines content...'
  },
  {
    id: '5',
    title: 'Sprint Planning Meeting',
    author: 'T. Brown',
    createdAt: '2025-06-05',
    tags: ['planning', 'sprint'],
    type: 'meeting',
    fileSize: '1.1 MB',
    description: 'Sprint planning session notes and task assignments',
    content: 'Sprint planning meeting content...'
  },
  {
    id: '6',
    title: 'System Architecture Diagram',
    author: 'K. Chen',
    createdAt: '2025-06-01',
    tags: ['architecture', 'technical'],
    type: 'design',
    fileSize: '2.8 MB',
    description: 'Complete system architecture overview with detailed diagrams',
    content: 'Architecture documentation content...',
    fileName: 'system-architecture.pdf',
    fileUrl: 'data:application/pdf;base64,sample', // This would be a real file URL in practice
    fileType: 'application/pdf'
  }
];

// Document Modal Component
interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (document: Partial<DocumentItem>) => void;
  document?: DocumentItem;
  mode: 'create' | 'edit';
}

const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose, onSave, document, mode }) => {
  const [formData, setFormData] = useState({
    title: document?.title || '',
    description: document?.description || '',
    type: document?.type || 'other' as DocumentItem['type'],
    author: document?.author || 'Current User'
  });

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let fileData = {};
    if (uploadedFile) {
      const fileUrl = URL.createObjectURL(uploadedFile);
      fileData = {
        fileName: uploadedFile.name,
        fileUrl: fileUrl,
        fileType: uploadedFile.type,
        fileSize: `${(uploadedFile.size / 1024 / 1024).toFixed(1)} MB`
      };
    }
    
    const documentData: Partial<DocumentItem> = {
      ...formData,
      ...fileData,
      tags: document?.tags || [],
      createdAt: document?.createdAt || new Date().toISOString().split('T')[0],
      id: document?.id || Math.random().toString(36).substr(2, 9)
    };

    onSave(documentData);
    onClose();
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

  // Cleanup object URLs when component unmounts or file changes
  React.useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

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
              <option value="retrospective">Retrospective</option>
              <option value="meeting">Meeting</option>
              <option value="requirements">Requirements</option>
              <option value="design">Design</option>
              <option value="other">Other</option>
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

          {/* Author (for create mode) */}
          {mode === 'create' && (
            <div>
              <label htmlFor="author" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Author
              </label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Document author"
              />
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
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
  const projectId = resolvedParams['project-id'];

  const [documents, setDocuments] = useState<DocumentItem[]>(mockDocuments);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAuthor, setFilterAuthor] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingDocument, setEditingDocument] = useState<DocumentItem | undefined>();

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: 'Projects', href: '/project', icon: <FolderOpen className="w-4 h-4" /> },
    { label: 'Project Name', href: `/project/${projectId}/dashboard` },
    { label: 'Documentation', icon: <BookOpen className="w-4 h-4" /> }
  ];

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || doc.type === filterType;
    const matchesAuthor = filterAuthor === 'all' || doc.author === filterAuthor;
    return matchesSearch && matchesType && matchesAuthor;
  });

  // Get unique authors for filter
  const uniqueAuthors = [...new Set(documents.map(doc => doc.author))];

  const handleCreateDocument = () => {
    setModalMode('create');
    setEditingDocument(undefined);
    setIsModalOpen(true);
  };

  const handleEditDocument = (document: DocumentItem) => {
    setModalMode('edit');
    setEditingDocument(document);
    setIsModalOpen(true);
  };

  const handleSaveDocument = (documentData: Partial<DocumentItem>) => {
    if (modalMode === 'create') {
      const newDocument: DocumentItem = {
        id: documentData.id!,
        title: documentData.title!,
        author: documentData.author!,
        createdAt: documentData.createdAt!,
        tags: documentData.tags!,
        type: documentData.type!,
        description: documentData.description,
        content: documentData.content,
        fileSize: '0.1 MB' // Mock file size for new documents
      };
      setDocuments([newDocument, ...documents]);
    } else {
      setDocuments(documents.map(doc => 
        doc.id === editingDocument?.id 
          ? { ...doc, ...documentData }
          : doc
      ));
    }
  };

  const handleDeleteDocument = (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      setDocuments(documents.filter(doc => doc.id !== id));
    }
  };

  const handleViewDocument = (doc: DocumentItem) => {
    if (doc.fileUrl) {
      // If document has a file, open it in a new tab
      window.open(doc.fileUrl, '_blank');
    } else if (doc.content) {
      // If document has content but no file, show content in alert (you might want to create a proper modal for this)
      alert(`Document Content:\n\n${doc.content}`);
    } else {
      // If no file or content, show message
      alert('No content or file available to view.');
    }
  };

  const handleDownloadDocument = (doc: DocumentItem) => {
    if (doc.fileUrl && doc.fileName) {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('No file available for download.');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'retrospective': return '🔄';
      case 'meeting': return '👥';
      case 'requirements': return '📋';
      case 'design': return '🎨';
      default: return '📄';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

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
      </div>

      {/* Navigation Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button 
              onClick={handleCreateDocument}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Doc
            </button>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                showFilters 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-300' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <FilterIcon className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>
        
        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Document Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="retrospective">Retrospective</option>
                  <option value="meeting">Meeting</option>
                  <option value="requirements">Requirements</option>
                  <option value="design">Design</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Author
                </label>
                <select
                  value={filterAuthor}
                  onChange={(e) => setFilterAuthor(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">All Authors</option>
                  {uniqueAuthors.map(author => (
                    <option key={author} value={author}>{author}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
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
                      <span>{formatDate(doc.createdAt)}</span>
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
            {doc.fileName && (
              <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 mb-4">
                <FileText className="w-4 h-4" />
                <span>Attached: {doc.fileName}</span>
              </div>
            )}

            {/* Author and Tags */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span>Author: {doc.author}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {doc.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
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
              {doc.fileSize && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {doc.fileSize}
                </span>
              )}
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm || filterType !== 'all' || filterAuthor !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Get started by creating your first document'}
          </p>
          <button 
            onClick={handleCreateDocument}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Document
          </button>
        </div>
      )}

      {/* Document Modal */}
      <DocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveDocument}
        document={editingDocument}
        mode={modalMode}
      />
    </div>
  );
};

export default ProjectDocumentation; 