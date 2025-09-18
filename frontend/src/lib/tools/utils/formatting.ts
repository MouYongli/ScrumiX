/**
 * Shared formatting utilities for markdown, tables, and ASCII visualization
 */

/**
 * Format a percentage with proper display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a number with proper thousand separators
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Create a simple ASCII progress bar
 */
export function createProgressBar(completed: number, total: number, width: number = 20): string {
  if (total === 0) return '░'.repeat(width);
  
  const filledWidth = Math.round((completed / total) * width);
  const emptyWidth = width - filledWidth;
  
  return '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
}

/**
 * Create a visual representation for burndown charts
 */
export function createBurndownVisualization(
  completed: number, 
  remaining: number, 
  scale: number = 2
): string {
  const completedBlocks = Math.max(1, Math.round(completed / scale));
  const remainingBlocks = Math.max(1, Math.round(remaining / scale));
  
  return '█'.repeat(completedBlocks) + '░'.repeat(remainingBlocks);
}

/**
 * Format a date for display in reports
 */
export function formatDisplayDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Format a duration in days with proper pluralization
 */
export function formatDuration(days: number): string {
  return `${days} day${days === 1 ? '' : 's'}`;
}

/**
 * Create a markdown table from data
 */
export function createMarkdownTable(
  headers: string[], 
  rows: (string | number)[][]
): string {
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `|${headers.map(() => '---').join('|')}|`;
  const dataRows = rows.map(row => `| ${row.join(' | ')} |`);
  
  return [headerRow, separatorRow, ...dataRows].join('\n');
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter of each word
 */
export function toTitleCase(text: string): string {
  return text.replace('_', ' ').split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

/**
 * Format status with proper display
 */
export function formatStatus(status: string): string {
  return status.replace('_', ' ').split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

/**
 * Create a visual velocity trend chart
 */
export function createVelocityChart(velocities: number[], scale: number = 2): string {
  return velocities.map((velocity, index) => 
    `Sprint ${index + 1}: ${'█'.repeat(Math.max(1, Math.round(velocity / scale)))} ${velocity} pts`
  ).join('\n');
}

/**
 * Format similarity score as percentage
 */
export function formatSimilarityScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

/**
 * Create section divider for markdown reports
 */
export function createSectionDivider(title: string, level: number = 2): string {
  const hashes = '#'.repeat(level);
  return `${hashes} ${title}`;
}

/**
 * Format field scores for multi-field search results
 */
export function formatFieldScores(scores: Record<string, number>): string {
  return Object.entries(scores)
    .map(([field, score]) => `${field}: ${formatSimilarityScore(score)}`)
    .join(' | ');
}
