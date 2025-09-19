'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Edit2, Download, Calendar, User, Tag, 
  FileText, BookOpen, Loader2, ExternalLink, Copy, Check
} from 'lucide-react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { useDateFormat } from '@/hooks/useDateFormat';
import { documentationApi } from '@/utils/api';
import { api } from '@/utils/api';
import { Documentation, DocumentationType } from '@/types/api';

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
        if (isMounted) {
          setFormattedDate(
            includeTime 
              ? `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
              : date.toLocaleDateString()
          );
        }
      }
    };
    
    const timeoutId = setTimeout(format, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [date, includeTime, short, formatDate, formatDateShort]);

  return <span>{formattedDate}</span>;
};

interface ViewDocumentationProps {
  params: Promise<{ 'project-id': string; 'doc-id': string }>;
}

const ViewDocumentation: React.FC<ViewDocumentationProps> = ({ params }) => {
  const resolvedParams = React.use(params);
  const projectId = parseInt(resolvedParams['project-id']);
  const docId = parseInt(resolvedParams['doc-id']);
  const router = useRouter();

  const [document, setDocument] = useState<Documentation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('Project');
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch document and project data
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
          setDocument(docResponse.data);
        }

        // Fetch project name
        const projectResponse = await api.projects.getById(projectId);
        if (!projectResponse.error && projectResponse.data?.name) {
          setProjectName(projectResponse.data.name);
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

  // Breadcrumb navigation
  const breadcrumbItems = [
    { label: projectName, href: `/project/${projectId}/dashboard` },
    { label: 'Wiki', href: `/project/${projectId}/documentation`, icon: <BookOpen className="w-4 h-4" /> },
    { label: document?.title || 'Document' }
  ];

  // Get type icon
  const getTypeIcon = (type: DocumentationType) => {
    switch (type) {
      case DocumentationType.SPRINT_REVIEW: return <FileText className="w-5 h-5 text-blue-600" />;
      case DocumentationType.SPRINT_RETROSPECTIVE: return <FileText className="w-5 h-5 text-purple-600" />;
      case DocumentationType.REQUIREMENT: return <FileText className="w-5 h-5 text-green-600" />;
      case DocumentationType.DESIGN_ARCHITECTURE: return <FileText className="w-5 h-5 text-orange-600" />;
      case DocumentationType.MEETING_REPORT: return <FileText className="w-5 h-5 text-indigo-600" />;
      case DocumentationType.USER_GUIDE: return <BookOpen className="w-5 h-5 text-teal-600" />;
      case DocumentationType.OTHER: return <FileText className="w-5 h-5 text-gray-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  // Get type display name
  const getTypeDisplayName = (type: DocumentationType) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Handle edit navigation
  const handleEdit = () => {
    router.push(`/project/${projectId}/documentation/${docId}/edit`);
  };

  // Handle download
  const handleDownload = () => {
    if (!document) return;

    if (document.file_url) {
      // Download file from URL
      const link = document.createElement('a');
      link.href = document.file_url;
      link.download = document.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (document.content) {
      // Download as markdown file
      const fileName = document.title || 'document';
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
      
      // Create markdown content
      let markdownContent = '';
      
      markdownContent += `# ${document.title}\n\n`;
      
      if (document.description) {
        markdownContent += `**Description:** ${document.description}\n\n`;
      }
      
      markdownContent += `**Type:** ${getTypeDisplayName(document.type)}\n\n`;
      
      if (document.authors && document.authors.length > 0) {
        const authorNames = document.authors.map(author => author.full_name).join(', ');
        markdownContent += `**Authors:** ${authorNames}\n\n`;
      }
      
      markdownContent += '---\n\n';
      markdownContent += document.content;

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
    }
  };

  // Handle copy content to clipboard
  const handleCopyContent = async () => {
    if (!document?.content) return;
    
    try {
      await navigator.clipboard.writeText(document.content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  // Render markdown content with proper styling
  const renderMarkdown = (text: string) => {
    return text
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-6 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-white mt-8">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium mb-3 text-gray-900 dark:text-white mt-6">$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4 class="text-lg font-medium mb-2 text-gray-900 dark:text-white mt-4">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 rounded text-sm font-mono border border-gray-200 dark:border-gray-700">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700 my-4"><code class="font-mono text-sm">$1</code></pre>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-2 underline-offset-2">$1 <span class="inline-block w-3 h-3 ml-1">↗</span></a>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 pl-4 py-2 my-4 italic text-gray-700 dark:text-gray-300">$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li class="ml-6 mb-1 list-disc text-gray-700 dark:text-gray-300">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-6 mb-1 list-decimal text-gray-700 dark:text-gray-300">$1</li>')
      .replace(/\n\n/g, '<div class="mb-4"></div>')
      .replace(/\n/g, '<br>');
  };

  // Handle back navigation
  const handleBack = () => {
    router.push(`/project/${projectId}/documentation`);
  };

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

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <Breadcrumb items={breadcrumbItems} />
          <div className="text-center py-12">
            <div className="text-red-600 dark:text-red-400 mb-4">
              <FileText className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Document not found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || 'The document you are looking for could not be found.'}
            </p>
            <button 
              onClick={handleBack}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Wiki
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Wiki</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            {document.content && (
              <button
                onClick={handleCopyContent}
                className="flex items-center space-x-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                {copySuccess ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
              </button>
            )}
            
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            
            <button
              onClick={handleEdit}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Document Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                {getTypeIcon(document.type)}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  {document.title}
                </h1>
                
                {document.description && (
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    {document.description}
                  </p>
                )}

                {/* Document Metadata */}
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Created <FormattedDate date={new Date(document.created_at)} includeTime={true} /></span>
                  </div>
                  
                  {document.updated_at && document.updated_at !== document.created_at && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Updated <FormattedDate date={new Date(document.updated_at)} includeTime={true} /></span>
                    </div>
                  )}
                  
                  {document.authors && document.authors.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>
                        {document.authors.length === 1 
                          ? `Author: ${document.authors[0].full_name}`
                          : `Authors: ${document.authors.map(author => author.full_name).join(', ')}`
                        }
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4" />
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {getTypeDisplayName(document.type)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* File Attachment */}
          {document.file_url && (
            <div className="border-b border-gray-200 dark:border-gray-700 p-6 bg-blue-50 dark:bg-blue-900/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Attached File
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {document.file_url.split('/').pop()}
                    </p>
                  </div>
                </div>
                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open File</span>
                </a>
              </div>
            </div>
          )}

          {/* Document Content */}
          <div className="p-6">
            {document.content ? (
              <div 
                className="prose prose-gray dark:prose-invert max-w-none prose-lg prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-li:text-gray-700 dark:prose-li:text-gray-300"
                dangerouslySetInnerHTML={{ 
                  __html: renderMarkdown(document.content)
                }}
              />
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Content
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  This document doesn't have any written content.
                </p>
                {document.file_url ? (
                  <p className="text-gray-600 dark:text-gray-400">
                    Check the attached file above for the document content.
                  </p>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Add Content
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Quick Actions:
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleEdit}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Document</span>
                </button>
                
                {document.content && (
                  <button
                    onClick={handleCopyContent}
                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/20 px-2 py-1 rounded"
                  >
                    {copySuccess ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copySuccess ? 'Copied!' : 'Copy Content'}</span>
                  </button>
                )}
              </div>
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Document ID: {document.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewDocumentation;
