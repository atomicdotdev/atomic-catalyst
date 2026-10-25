import { describe, expect, test } from 'bun:test';
import { formatRelativeTime, priorityTone, shortTicketId, statusTone } from '../webview/src/helpers/ticketPresentation.ts';

describe('ticket presentation helpers', () => {
  test('status tones map recorded status words to a small palette without inventing states', () => {
    expect(statusTone('done')).toBe('done');
    expect(statusTone('met')).toBe('done');
    expect(statusTone('in_progress')).toBe('progress');
    expect(statusTone('in-progress')).toBe('progress');
    expect(statusTone('needs-review')).toBe('review');
    expect(statusTone('needs_review')).toBe('review');
    expect(statusTone('planned')).toBe('planned');
    expect(statusTone('blocked')).toBe('blocked');
    expect(statusTone('failed')).toBe('blocked');
    expect(statusTone('open')).toBe('neutral');
    expect(statusTone('unmet')).toBe('neutral');
    expect(statusTone('backlog')).toBe('neutral');
    expect(statusTone('')).toBe('neutral');
    expect(statusTone(undefined)).toBe('neutral');
    expect(statusTone('Something Else')).toBe('neutral');
  });
  test('priority tones', () => {
    expect(priorityTone('high')).toBe('high');
    expect(priorityTone('critical')).toBe('high');
    expect(priorityTone('urgent')).toBe('high');
    expect(priorityTone('medium')).toBe('medium');
    expect(priorityTone('low')).toBe('low');
    expect(priorityTone('')).toBe('neutral');
    expect(priorityTone(undefined)).toBe('neutral');
  });
  test('short ticket ids strip only the owning intent UID prefix', () => {
    expect(shortTicketId('01M4REEBQZEK2QC1ATSBF3CCHC-ac-1', '01M4REEBQZEK2QC1ATSBF3CCHC')).toBe('ac-1');
    expect(shortTicketId('01M4REEBQZEK2QC1ATSBF3CCHC-1', '01M4REEBQZEK2QC1ATSBF3CCHC')).toBe('1');
    expect(shortTicketId('ac-1', '01M4REEBQZEK2QC1ATSBF3CCHC')).toBe('ac-1');
    expect(shortTicketId('ac-1', '')).toBe('ac-1');
    expect(shortTicketId('01M4REEBQZEK2QC1ATSBF3CCHC', '01M4REEBQZEK2QC1ATSBF3CCHC')).toBe('01M4REEBQZEK2QC1ATSBF3CCHC');
    expect(shortTicketId('', 'uid')).toBe('');
    expect(shortTicketId(undefined, 'uid')).toBe('');
  });
  test('relative time is coarse, past-only and empty for unparseable input', () => {
    const now = new Date('2026-10-19T12:00:00Z');
    expect(formatRelativeTime('2026-10-19T11:59:50Z', now)).toBe('just now');
    expect(formatRelativeTime('2026-10-19T11:59:00Z', now)).toBe('1 minute ago');
    expect(formatRelativeTime('2026-10-19T11:35:00Z', now)).toBe('25 minutes ago');
    expect(formatRelativeTime('2026-10-19T10:50:00Z', now)).toBe('1 hour ago');
    expect(formatRelativeTime('2026-10-19T03:00:00Z', now)).toBe('9 hours ago');
    expect(formatRelativeTime('2026-10-18T10:00:00Z', now)).toBe('1 day ago');
    expect(formatRelativeTime('2026-10-12T16:25:28.947816+00:00', now)).toBe('7 days ago');
    expect(formatRelativeTime('2026-09-10T12:00:00Z', now)).toBe('1 month ago');
    expect(formatRelativeTime('2026-04-10T12:00:00Z', now)).toBe('6 months ago');
    expect(formatRelativeTime('2024-04-10T12:00:00Z', now)).toBe('2 years ago');
    expect(formatRelativeTime('2026-10-19T13:00:00Z', now)).toBe('just now');
    expect(formatRelativeTime('not a date', now)).toBe('');
    expect(formatRelativeTime('', now)).toBe('');
    expect(formatRelativeTime(undefined, now)).toBe('');
  });
});
