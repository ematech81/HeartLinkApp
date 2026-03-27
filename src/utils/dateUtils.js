/**
 * HeartLink Date Utilities
 */

/**
 * Calculate age from a date of birth string or Date object.
 */
export const getAge = (dob) => {
  if (!dob) return null;
  const date = typeof dob === 'string' ? new Date(dob) : dob;
  return Math.floor((Date.now() - date) / (365.25 * 24 * 60 * 60 * 1000));
};

/**
 * Format a date as "Month DD, YYYY" — e.g. "March 5, 1995"
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

/**
 * Format a timestamp for chat conversation lists.
 * - Same day     → "3:45 PM"
 * - Yesterday    → "Yesterday"
 * - Within 7 days → "Mon", "Tue", ...
 * - Older        → "Mar 5"
 */
export const timeAgo = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now  = new Date();

  const diffMs   = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHrs  = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1)   return 'just now';
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffHrs  < 24)  return `${diffHrs}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)   return date.toLocaleDateString('en-US', { weekday: 'short' });

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Format a timestamp for chat message time display.
 * Always returns time — e.g. "10:45 AM"
 */
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format a full date for chat date separators.
 * - Same day  → "Today"
 * - Yesterday → "Yesterday"
 * - This year → "March 5"
 * - Older     → "March 5, 2023"
 */
export const formatChatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now  = new Date();

  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  const isSameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day:   'numeric',
    ...(isSameYear ? {} : { year: 'numeric' }),
  });
};

/**
 * Check if two timestamps are on the same calendar day.
 */
export const isSameDay = (ts1, ts2) => {
  if (!ts1 || !ts2) return false;
  return new Date(ts1).toDateString() === new Date(ts2).toDateString();
};

/**
 * Returns true if a date is within the last N minutes.
 */
export const isWithinMinutes = (timestamp, minutes = 5) => {
  if (!timestamp) return false;
  return Date.now() - new Date(timestamp) < minutes * 60 * 1000;
};