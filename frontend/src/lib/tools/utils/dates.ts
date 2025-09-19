export function formatDateForBackend(dateString: string, isEndDate: boolean = false): string {
  if (!dateString) return dateString;
  if (dateString.includes('T')) return dateString;
  const timeComponent = isEndDate ? 'T23:59:59' : 'T00:00:00';
  return `${dateString}${timeComponent}`;
}



