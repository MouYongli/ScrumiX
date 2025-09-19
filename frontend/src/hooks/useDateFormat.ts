/**
 * React hook for user-aware date formatting
 */
import { useState, useEffect } from 'react';
import { formatUserDate, formatUserDateShort, formatTimeAgo } from '@/utils/dateFormat';

interface DateFormatHook {
  formatDate: (date: string | Date | undefined, includeTime?: boolean) => Promise<string>;
  formatDateShort: (date: string | Date | undefined) => Promise<string>;
  formatTimeAgo: (timestamp: string | Date | undefined) => string;
  isLoading: boolean;
}

/**
 * Hook to provide user-aware date formatting functions
 */
export function useDateFormat(): DateFormatHook {
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = async (date: string | Date | undefined, includeTime?: boolean): Promise<string> => {
    setIsLoading(true);
    try {
      const result = await formatUserDate(date, { includeTime });
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateShort = async (date: string | Date | undefined): Promise<string> => {
    setIsLoading(true);
    try {
      const result = await formatUserDateShort(date);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formatDate,
    formatDateShort,
    formatTimeAgo,
    isLoading
  };
}

/**
 * Simple synchronous date formatting component for immediate rendering
 * Uses Europe/Berlin timezone as default when user preferences are not available
 */
export function formatDateSync(
  date: string | Date | undefined,
  options?: {
    includeTime?: boolean;
    format?: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
  }
): string {
  if (!date) return 'Unknown date';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  const format = options?.format || 'YYYY-MM-DD';
  let locale = 'sv-SE'; // Default to Swedish for YYYY-MM-DD
  
  switch (format) {
    case 'MM/DD/YYYY':
      locale = 'en-US';
      break;
    case 'DD/MM/YYYY':
      locale = 'en-GB';
      break;
    case 'YYYY-MM-DD':
    default:
      locale = 'sv-SE';
      break;
  }
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Berlin',
  };
  
  if (options?.includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
  }
  
  return dateObj.toLocaleString(locale, formatOptions);
}

/**
 * Format date for display in Berlin timezone with default format (fallback)
 */
export function formatDateShortSync(date: string | Date | undefined): string {
  if (!date) return 'Unknown';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid';
  
  return dateObj.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Berlin'
  });
}
