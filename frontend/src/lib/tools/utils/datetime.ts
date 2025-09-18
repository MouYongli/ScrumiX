/**
 * Date and time utilities
 */

import { requestWithAuth, type AuthContext } from './http';

export interface TimezoneFormattedDateTime {
  formattedDatetime: string;
  displayDateTime: string;
  timezone?: string;
}

/**
 * Get user timezone and format datetime string
 * This is a simplified implementation that returns the input datetime
 * In a real implementation, this would:
 * 1. Get the user's timezone preference from their profile
 * 2. Convert the datetime to the user's timezone
 * 3. Format it according to their preferences
 */
export async function getUserTimezoneAndFormatDatetime(
  datetime: string,
  context: AuthContext
): Promise<TimezoneFormattedDateTime> {
  try {
    // For now, just return the input datetime
    // In the future, this could:
    // 1. Make an API call to get user timezone preferences
    // 2. Convert the datetime to user's timezone
    // 3. Format according to user preferences
    
    const date = new Date(datetime);
    const formattedDatetime = date.toISOString();
    const displayDateTime = date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    return {
      formattedDatetime,
      displayDateTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  } catch (error) {
    console.error('Error formatting datetime:', error);
    
    // Fallback to simple formatting
    return {
      formattedDatetime: datetime,
      displayDateTime: datetime,
      timezone: 'UTC'
    };
  }
}

/**
 * Convert simple date to ISO format
 * Helper function for date conversions
 */
export function simpleToISO(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toISOString();
  } catch (error) {
    console.error('Error converting date to ISO:', error);
    return dateStr;
  }
}
