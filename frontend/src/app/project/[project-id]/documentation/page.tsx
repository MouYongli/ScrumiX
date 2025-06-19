'use client';

import React, { useState } from 'react';
import { 
  Search, Plus, Upload, Filter, Calendar, User, Tag, 
  Eye, Edit2, Download, Trash2, FileText, FolderOpen,
  BookOpen, Filter as FilterIcon, ChevronDown
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
    description: 'Team retrospective meeting notes and action items for Sprint 5'
  },
  {
    id: '2',
    title: 'Product Requirements Document',
    author: 'J. Anderson',
    createdAt: '2025-06-15',
    tags: ['requirements', 'product'],
    type: 'requirements',
    fileSize: '1.8 MB',
    description: 'Comprehensive product requirements and specifications'
  },
  {
    id: '3',
    title: 'Daily Standup Notes - Week 24',
    author: 'R. Williams',
    createdAt: '2025-06-12',
    tags: ['standup', 'weekly'],
    type: 'meeting',
    fileSize: '0.5 MB',
    description: 'Weekly compilation of daily standup meeting notes'
  },
  {
    id: '4',
    title: 'UI/UX Design Guidelines',
    author: 'S. Johnson',
    createdAt: '2025-06-08',
    tags: ['design', 'guidelines', 'ui'],
    type: 'design',
    fileSize: '5.2 MB',
    description: 'Design system and UI/UX guidelines for the project'
  },
  {
    id: '5',
    title: 'Sprint Planning Meeting',
    author: 'T. Brown',
    createdAt: '2025-06-05',
    tags: ['planning', 'sprint'],
    type: 'meeting',
    fileSize: '1.1 MB',
    description: 'Sprint planning session notes and task assignments'
  }
];

const ProjectDocumentation: React.FC<ProjectDocumentationProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = resolvedParams['project-id'];

  const [documents, setDocuments] = useState<DocumentItem[]>(mockDocuments);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAuthor, setFilterAuthor] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

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

  const handleDeleteDocument = (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      setDocuments(documents.filter(doc => doc.id !== id));
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
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
              <Plus className="w-4 h-4" />
              New Doc
            </button>
            
            <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
              <Upload className="w-4 h-4" />
              Upload File
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
                <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium">
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium">
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium">
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
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors">
            <Plus className="w-4 h-4" />
            Create Document
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectDocumentation; 