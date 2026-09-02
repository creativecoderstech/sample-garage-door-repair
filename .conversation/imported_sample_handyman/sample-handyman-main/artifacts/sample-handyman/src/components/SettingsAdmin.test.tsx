/**
 * Tests for the locked-by-default settings panel:
 *  - Fields render as read-only text (no inputs) until Edit is clicked.
 *  - Edit unlocks a single field with Save/Cancel; Cancel/Escape restores.
 *  - Save submits the full settings object with only the edited field changed.
 *  - Members without contact permission get no Edit button on phone/owner email.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const SETTINGS = {
  phone: '(512) 244-8550',
  ownerEmail: 'mike@example.com',
  notifyFromEmail: 'bookings@sample-handyman.com',
  notifyFromName: "Mike's Handyman Service",
  thumbtackRating: '4.9',
  thumbtackReviewCount: '110',
  taskrabbitRating: '5.0',
  taskrabbitReviewCount: '384',
  googleReviewUrl: '',
  googlePlaceId: '',
};

const mutateMock = vi.fn(
  (payload: { data: typeof SETTINGS }, opts: { onSuccess?: (r: typeof SETTINGS) => void }) => {
    opts?.onSuccess?.({ ...payload.data });
  },
);

vi.mock('@workspace/api-client-react', () => ({
  useGetSiteSettings: () => ({ data: SETTINGS, isLoading: false, isError: false }),
  useUpdateSiteSettings: () => ({ mutate: mutateMock, isPending: false }),
  getGetSiteSettingsQueryKey: () => ['site-settings'],
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@/components/HeroImageAdmin', () => ({
  HeroImageAdmin: () => null,
}));

let mockCanEditContact = true;
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ canEditContactSettings: mockCanEditContact }),
}));

import { SettingsAdmin } from './SettingsAdmin';

beforeEach(() => {
  mutateMock.mockClear();
  mockCanEditContact = true;
});

describe('SettingsAdmin locked fields', () => {
  it('renders values as read-only text with no inputs until Edit is clicked', () => {
    render(<SettingsAdmin />);
    expect(screen.getByText('(512) 244-8550')).toBeTruthy();
    expect(document.querySelectorAll('input').length).toBe(0);
    expect(screen.getByRole('button', { name: 'Edit Phone number' })).toBeTruthy();
  });

  it('unlocks only the edited field, saves the change, and relocks', () => {
    render(<SettingsAdmin />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Phone number' }));
    const inputs = document.querySelectorAll('input');
    expect(inputs.length).toBe(1);
    fireEvent.change(inputs[0], { target: { value: '(512) 555-0000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(mutateMock).toHaveBeenCalledTimes(1);
    const sent = mutateMock.mock.calls[0][0].data;
    expect(sent.phone).toBe('(512) 555-0000');
    expect(sent.ownerEmail).toBe(SETTINGS.ownerEmail); // untouched fields preserved
    // relocked after save
    expect(document.querySelectorAll('input').length).toBe(0);
    expect(screen.getByText('(512) 555-0000')).toBeTruthy();
    expect(screen.getByText('Saved.')).toBeTruthy();
  });

  it('cancel and Escape restore the original value without saving', () => {
    render(<SettingsAdmin />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit From name' }));
    const input = document.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'Oops Typed' } });
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(mutateMock).not.toHaveBeenCalled();
    expect(screen.getByText("Mike's Handyman Service")).toBeTruthy();

    // Escape path
    fireEvent.click(screen.getByRole('button', { name: 'Edit From name' }));
    const input2 = document.querySelector('input')!;
    fireEvent.change(input2, { target: { value: 'Another Typo' } });
    fireEvent.keyDown(input2, { key: 'Escape' });
    expect(mutateMock).not.toHaveBeenCalled();
    expect(document.querySelectorAll('input').length).toBe(0);
  });

  it('validates before saving (invalid phone shows an error, no mutation)', () => {
    render(<SettingsAdmin />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Phone number' }));
    const input = document.querySelector('input')!;
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mutateMock).not.toHaveBeenCalled();
    expect(screen.getByText(/valid phone number/)).toBeTruthy();
  });

  it('members see no Edit button on phone or owner email', () => {
    mockCanEditContact = false;
    render(<SettingsAdmin />);
    expect(screen.queryByRole('button', { name: 'Edit Phone number' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit Owner email' })).toBeNull();
    // Other fields still editable
    expect(screen.getByRole('button', { name: 'Edit From email' })).toBeTruthy();
    expect(screen.getByText('Members cannot change the site phone number.')).toBeTruthy();
  });
});
