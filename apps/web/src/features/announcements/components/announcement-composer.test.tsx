import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnnouncementComposer } from './announcement-composer';

// Mock server actions
vi.mock('@/features/announcements/actions', () => ({
  createAnnouncement: vi.fn(() => Promise.resolve({ error: null })),
  sendAnnouncement: vi.fn(() => Promise.resolve({ error: null })),
}));

describe('AnnouncementComposer', () => {
  it('renders subject and body fields', () => {
    render(<AnnouncementComposer eventId="test-event" />);
    expect(screen.getByPlaceholderText(/schedule update/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/write your announcement/i)).toBeInTheDocument();
  });

  it('renders channel checkboxes with in-app checked by default', () => {
    render(<AnnouncementComposer eventId="test-event" />);
    const inAppCheckbox = screen.getByLabelText(/in-app/i);
    expect(inAppCheckbox).toBeChecked();
  });

  it('disables save/send buttons when subject is empty', () => {
    render(<AnnouncementComposer eventId="test-event" />);
    expect(screen.getByRole('button', { name: /save draft/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /send now/i })).toBeDisabled();
  });

  it('enables buttons when subject has content', async () => {
    const user = userEvent.setup();
    render(<AnnouncementComposer eventId="test-event" />);

    await user.type(screen.getByPlaceholderText(/schedule update/i), 'Test Subject');

    expect(screen.getByRole('button', { name: /save draft/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /send now/i })).not.toBeDisabled();
  });

  it('toggles email channel checkbox', async () => {
    const user = userEvent.setup();
    render(<AnnouncementComposer eventId="test-event" />);

    const emailCheckbox = screen.getByLabelText(/email/i);
    expect(emailCheckbox).not.toBeChecked();

    await user.click(emailCheckbox);
    expect(emailCheckbox).toBeChecked();
  });
});
