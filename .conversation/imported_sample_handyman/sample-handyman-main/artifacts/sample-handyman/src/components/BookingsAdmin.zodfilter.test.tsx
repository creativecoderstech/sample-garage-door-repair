/**
 * Verifies the zod-filter logic in BookingsAdmin:
 * when the API returns a mix of valid and malformed rows, the valid booking
 * renders correctly and the malformed one is silently dropped (no crash, no
 * blank page).
 *
 * Unlike BookingsAdmin.test.tsx this file does NOT mock @workspace/api-zod,
 * so ListBookingsResponseItem.safeParse runs for real against the test data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ── Module mocks ─────────────────────────────────────────────────────────────

// NOTE: @workspace/api-zod is intentionally NOT mocked here so that
// ListBookingsResponseItem.safeParse exercises the real zod schema.

const mockUseListBookings = vi.fn();
vi.mock('@workspace/api-client-react', () => ({
  useListBookings: () => mockUseListBookings(),
  useUpdateBooking: () => ({ mutate: vi.fn(), isPending: false }),
  useCreatePhoneBooking: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/DayCalendar', () => ({
  DayCalendar: () => <div data-testid="day-calendar" />,
}));

vi.mock('@/components/PhoneDisplay', () => ({
  PhoneDisplay: ({ phone }: { phone: string }) => <span>{phone}</span>,
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BookingsAdmin zod-filter: mixed valid and invalid rows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders the valid booking and silently drops the malformed one', async () => {
    // Valid booking — all required fields present.
    const validBooking = {
      id: 1,
      serviceRequestId: null,
      name: 'Alice Example',
      email: null,
      phone: '5550001234',
      service: 'Electrical & Lighting',
      description: 'Fix a broken outlet',
      scheduledDate: '2099-06-15',
      scheduledTime: 'morning',
      scheduledSpecificTime: null,
      status: 'confirmed',
      source: 'web',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    // Malformed booking — missing the required `scheduledDate` field.
    // zod will reject this and BookingsAdmin should drop it silently.
    const malformedBooking = {
      id: 2,
      serviceRequestId: null,
      name: 'Bob Broken',
      email: null,
      phone: '5559990000',
      service: 'Plumbing Services',
      description: 'Leaky pipe',
      // scheduledDate intentionally omitted
      scheduledTime: 'afternoon',
      scheduledSpecificTime: null,
      status: 'confirmed',
      source: 'web',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockUseListBookings.mockReturnValue({
      data: [validBooking, malformedBooking],
      isLoading: false,
      isError: false,
    });

    const { BookingsAdmin } = await import('./BookingsAdmin');

    // Must not throw — the page should render despite the bad row.
    expect(() => render(<BookingsAdmin />)).not.toThrow();

    // Page heading confirms the component mounted.
    expect(screen.getByRole('heading', { name: 'Bookings' })).toBeInTheDocument();

    // The valid booking's customer name appears in its card title.
    expect(screen.getByText(/Alice Example/)).toBeInTheDocument();

    // The malformed booking's customer name must NOT appear — it was dropped.
    expect(screen.queryByText(/Bob Broken/)).toBeNull();

    // Only the valid row was kept, so the count reads "1 confirmed appointment".
    expect(screen.getByText(/1 confirmed appointment/)).toBeInTheDocument();

    // The component should have warned about the dropped row.
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[BookingsAdmin] dropping malformed booking'),
      expect.anything(),
      expect.anything(),
    );
  });
});
