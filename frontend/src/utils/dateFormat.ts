/**
 * Date formatting utilities that respect user timezone and date format preferences
 */

// Cache for user preferences to avoid repeated API calls
let userPreferencesCache: {
  timezone: string;
  dateFormat: string;
  lastFetch: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get user preferences from backend or cache
 */
async function getUserPreferences(): Promise<{ timezone: string; dateFormat: string }> {
  // Check cache first
  if (userPreferencesCache && (Date.now() - userPreferencesCache.lastFetch) < CACHE_DURATION) {
    return {
      timezone: userPreferencesCache.timezone,
      dateFormat: userPreferencesCache.dateFormat
    };
  }

  try {
    // Import authenticatedFetch dynamically to avoid circular imports
    const { authenticatedFetch } = await import('@/utils/auth');
    const response = await authenticatedFetch('/api/v1/users/me/profile');
    
    if (response.ok) {
      const userData = await response.json();
      const preferences = {
        timezone: userData.timezone || 'Europe/Berlin',
        dateFormat: userData.date_format || 'YYYY-MM-DD'
      };
      
      // Update cache
      userPreferencesCache = {
        timezone: preferences.timezone,
        dateFormat: preferences.dateFormat,
        lastFetch: Date.now()
      };
      
      return preferences;
    }
  } catch (error) {
    console.warn('Failed to fetch user preferences, using defaults:', error);
  }

  // Return defaults if API call fails
  return {
    timezone: 'Europe/Berlin',
    dateFormat: 'YYYY-MM-DD'
  };
}

/**
 * Clear the preferences cache (useful when user updates their settings)
 */
export function clearPreferencesCache(): void {
  userPreferencesCache = null;
}

/**
 * Convert date format from backend format to Intl.DateTimeFormat options
 */
function getDateFormatOptions(dateFormat: string): Intl.DateTimeFormatOptions {
  switch (dateFormat) {
    case 'MM/DD/YYYY':
      return { year: 'numeric', month: '2-digit', day: '2-digit' };
    case 'DD/MM/YYYY':
      return { year: 'numeric', month: '2-digit', day: '2-digit' };
    case 'YYYY-MM-DD':
    default:
      return { year: 'numeric', month: '2-digit', day: '2-digit' };
  }
}

/**
 * Get the appropriate locale based on date format preference
 */
function getLocaleFromDateFormat(dateFormat: string): string {
  switch (dateFormat) {
    case 'MM/DD/YYYY':
      return 'en-US';
    case 'DD/MM/YYYY':
      return 'en-GB';
    case 'YYYY-MM-DD':
    default:
      return 'sv-SE'; // Swedish locale uses YYYY-MM-DD format
  }
}

/**
 * Format a date using user's timezone and date format preferences
 */
export async function formatUserDate(
  date: string | Date | undefined,
  options?: {
    includeTime?: boolean;
    timeStyle?: 'short' | 'medium' | 'long';
  }
): Promise<string> {
  if (!date) return 'Unknown date';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid date';
  
  try {
    const preferences = await getUserPreferences();
    const locale = getLocaleFromDateFormat(preferences.dateFormat);
    const dateFormatOptions = getDateFormatOptions(preferences.dateFormat);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      ...dateFormatOptions,
      timeZone: preferences.timezone,
    };
    
    if (options?.includeTime) {
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
      if (options.timeStyle === 'long') {
        formatOptions.second = '2-digit';
      }
    }
    
    return dateObj.toLocaleString(locale, formatOptions);
  } catch (error) {
    console.warn('Error formatting date with user preferences, using fallback:', error);
    // Fallback to simple formatting
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(options?.includeTime && { hour: '2-digit', minute: '2-digit' }),
      timeZone: 'Europe/Berlin'
    });
  }
}

/**
 * Format a date for display in lists (respects user's date format preference)
 */
export async function formatUserDateShort(date: string | Date | undefined): Promise<string> {
  if (!date) return 'Unknown';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid';
  
  try {
    const preferences = await getUserPreferences();
    const locale = getLocaleFromDateFormat(preferences.dateFormat);
    const dateFormatOptions = getDateFormatOptions(preferences.dateFormat);
    
    return dateObj.toLocaleDateString(locale, {
      ...dateFormatOptions,
      timeZone: preferences.timezone,
    });
  } catch (error) {
    console.warn('Error formatting short date, using fallback:', error);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Europe/Berlin'
    });
  }
}

/**
 * Format a timestamp for relative time display (e.g., "2 hours ago")
 */
export function formatTimeAgo(timestamp: string | Date | undefined): string {
  if (!timestamp) return 'Unknown time';
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Invalid time';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  // For older dates, use formatted date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: diffDays > 365 ? 'numeric' : undefined,
    timeZone: 'Europe/Berlin'
  });
}

/**
 * Format a date for input fields (YYYY-MM-DD format)
 */
export function formatDateForInput(date: string | Date | undefined): string {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toISOString().split('T')[0];
}

/**
 * Get current time in user's timezone
 */
export async function getCurrentTimeInUserTimezone(): Promise<Date> {
  try {
    const preferences = await getUserPreferences();
    // Create a date that represents the current time in the user's timezone
    const now = new Date();
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: preferences.timezone }));
    return userTime;
  } catch (error) {
    console.warn('Error getting current time in user timezone, using local time:', error);
    return new Date();
  }
}
