/**
 * Utility functions for handling multimodal chat messages with file attachments
 */

import { MessagePart } from '@/types/chat';

/**
 * Convert FileList to data URLs for sending to AI models
 */
export async function convertFilesToDataURLs(files: FileList): Promise<MessagePart[]> {
  return Promise.all(
    Array.from(files).map(
      file =>
        new Promise<MessagePart>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              type: 'file',
              mediaType: file.type,
              url: reader.result as string,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }),
    ),
  );
}

/**
 * Check if a file type is supported for multimodal input
 */
export function isSupportedFileType(fileType: string): boolean {
  const supportedTypes = [
    // Images - Widely supported by major vision models (GPT-4o, Claude Sonnet, Gemini)
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    // Documents - PDF analysis supported by vision models
    'application/pdf',
  ];
  
  return supportedTypes.includes(fileType);
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!isSupportedFileType(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not supported. Please use images (JPEG, PNG, GIF, WebP) or PDF files only.`
    };
  }
  
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size ${formatFileSize(file.size)} exceeds the 10MB limit.`
    };
  }
  
  return { isValid: true };
}

/**
 * Get file type category for display purposes
 */
export function getFileCategory(mediaType: string): 'image' | 'pdf' | 'other' {
  if (mediaType.startsWith('image/')) return 'image';
  if (mediaType === 'application/pdf') return 'pdf';
  return 'other';
}

/**
 * Handle drag and drop events
 */
export function handleDragOver(e: React.DragEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function handleDragEnter(e: React.DragEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function handleDragLeave(e: React.DragEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function handleDrop(e: React.DragEvent): FileList | null {
  e.preventDefault();
  e.stopPropagation();
  
  const files = e.dataTransfer.files;
  return files.length > 0 ? files : null;
}

/**
 * Get supported file formats as human-readable string
 */
export function getSupportedFormatsString(): string {
  return 'Images: JPEG, PNG, GIF, WebP • Documents: PDF';
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}
