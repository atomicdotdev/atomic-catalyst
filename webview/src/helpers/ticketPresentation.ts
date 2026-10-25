// Presentation-only helpers for the intent ticket surface. They never change
// the recorded values; they only decide how a recorded value is shown.
export type StatusTone = 'done' | 'progress' | 'review' | 'planned' | 'blocked' | 'neutral';
export type PriorityTone = 'high' | 'medium' | 'low' | 'neutral';

const STATUS_TONES: Record<string, StatusTone> = {
  done: 'done', met: 'done', complete: 'done', completed: 'done', verified: 'done',
  in_progress: 'progress', doing: 'progress', active: 'progress',
  needs_review: 'review', review: 'review', in_review: 'review',
  planned: 'planned', ready: 'planned',
  blocked: 'blocked', failed: 'blocked', rejected: 'blocked'
};
const HIGH_PRIORITIES = ['high', 'critical', 'urgent', 'p0', 'p1'];
const MEDIUM_PRIORITIES = ['medium', 'normal', 'p2'];
const LOW_PRIORITIES = ['low', 'minor', 'p3', 'p4'];

function normalize(value?: string): string {
  return (value ?? '').trim().toLowerCase().replace(/[-\s]+/g, '_');
}

export function statusTone(value?: string): StatusTone {
  return STATUS_TONES[normalize(value)] ?? 'neutral';
}

export function priorityTone(value?: string): PriorityTone {
  const key = normalize(value);
  if (HIGH_PRIORITIES.includes(key)) return 'high';
  if (MEDIUM_PRIORITIES.includes(key)) return 'medium';
  if (LOW_PRIORITIES.includes(key)) return 'low';
  return 'neutral';
}

/** Show `ac-1` instead of `<intent uid>-ac-1`; the full ID stays available in tooltips. */
export function shortTicketId(id?: string, uid?: string): string {
  if (!id) return '';
  if (uid && id.length > uid.length + 1 && id.startsWith(`${uid}-`)) return id.slice(uid.length + 1);
  return id;
}

export function formatRelativeTime(value?: string, now: Date = new Date()): string {
  if (!value) return '';
  const time = Date.parse(value);
  if (Number.isNaN(time)) return '';
  const seconds = Math.max(0, Math.round((now.getTime() - time) / 1000));
  const minutes = seconds / 60, hours = minutes / 60, days = hours / 24;
  if (seconds < 45) return 'just now';
  if (seconds < 90) return '1 minute ago';
  if (minutes < 45) return `${Math.round(minutes)} minutes ago`;
  if (minutes < 90) return '1 hour ago';
  if (hours < 22) return `${Math.round(hours)} hours ago`;
  if (hours < 36) return '1 day ago';
  if (days < 26) return `${Math.round(days)} days ago`;
  if (days < 45) return '1 month ago';
  if (days < 320) return `${Math.floor(days / 30)} months ago`;
  const years = Math.floor(days / 365);
  return years <= 1 ? '1 year ago' : `${years} years ago`;
}

export function formatAbsoluteTime(value?: string): string {
  if (!value) return '—';
  const time = Date.parse(value);
  if (Number.isNaN(time)) return value;
  return new Date(time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
