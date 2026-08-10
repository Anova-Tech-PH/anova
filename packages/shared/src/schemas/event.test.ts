import { describe, it, expect } from 'vitest';
import { createEventSchema, createSessionSchema, createSpeakerSchema } from './event';

describe('createEventSchema', () => {
  const validEvent = {
    title: 'Tech Summit 2026',
    slug: 'tech-summit-2026',
    start_date: '2026-09-15T09:00:00Z',
    end_date: '2026-09-17T18:00:00Z',
  };

  it('accepts valid event data', () => {
    const result = createEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createEventSchema.safeParse({ ...validEvent, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid slug format', () => {
    const result = createEventSchema.safeParse({ ...validEvent, slug: 'Invalid Slug!' });
    expect(result.success).toBe(false);
  });

  it('rejects title over 200 characters', () => {
    const result = createEventSchema.safeParse({ ...validEvent, title: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('defaults status to draft', () => {
    const result = createEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('draft');
    }
  });

  it('rejects invalid status values', () => {
    const result = createEventSchema.safeParse({ ...validEvent, status: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('createSpeakerSchema', () => {
  it('accepts valid speaker data', () => {
    const result = createSpeakerSchema.safeParse({
      event_id: '00000000-0000-0000-0000-000000000010',
      name: 'Dr. Aisha Patel',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = createSpeakerSchema.safeParse({
      event_id: '00000000-0000-0000-0000-000000000010',
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = createSpeakerSchema.safeParse({
      event_id: '00000000-0000-0000-0000-000000000010',
      name: 'Test Speaker',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('createSessionSchema', () => {
  it('accepts valid session data', () => {
    const result = createSessionSchema.safeParse({
      event_id: '00000000-0000-0000-0000-000000000010',
      title: 'Opening Keynote',
      start_time: '2026-09-15T09:00:00Z',
      end_time: '2026-09-15T10:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('defaults type to talk', () => {
    const result = createSessionSchema.safeParse({
      event_id: '00000000-0000-0000-0000-000000000010',
      title: 'Test Session',
      start_time: '2026-09-15T09:00:00Z',
      end_time: '2026-09-15T10:00:00Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('talk');
    }
  });

  it('rejects invalid session type', () => {
    const result = createSessionSchema.safeParse({
      event_id: '00000000-0000-0000-0000-000000000010',
      title: 'Test',
      type: 'invalid',
      start_time: '2026-09-15T09:00:00Z',
      end_time: '2026-09-15T10:00:00Z',
    });
    expect(result.success).toBe(false);
  });
});
