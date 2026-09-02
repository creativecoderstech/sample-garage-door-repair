/**
 * Regression tests for the defensive guards added to BookingsAdmin:
 *  1. Malformed scheduledDate does not crash the component.
 *  2. Missing (null) scheduledTime does not throw during the sort.
 *
 * Both scenarios bypass zod validation (via the api-zod mock) so the raw
 * data reaches the grouping/sort logic, which is exactly what the guards
 * protect against.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { Booking } from '@workspace/api-client-react';

// ── Module mocks ─────────────────────────────────────────────────────────────

// Bypass the per-item zod parse so raw test data (including null fields)
// reaches the component's sort/grouping logic. This is intentional: we want
// to validate the defensive guards, not the zod filter itself.
vi.mock('@workspace/api-zod', () => ({
  ListBookingsResponseItem: {
    safeParse: (item: unknown) => ({ success: true, data: item }),
  },
}));

// Control what the API hook returns per test.
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

// Stub heavy sub-components so render stays lightweight.
vi.mock('@/components/DayCalendar', () => ({
  DayCalendar: () => <div data-testid="day-calendar" />,
}));

vi.mock('@/components/PhoneDisplay', () => ({
  PhoneDisplay: ({ phone }: { phone: string }) => <span>{phone}</span>,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 1,
    name: 'Alice',
    phone: '5550001234',
    email: null,
    service: 'Electrical & Lighting',
    description: 'Fix an outlet',
    scheduledDate: '2099-06-01',
    scheduledTime: 'morning',
    scheduledSpecificTime: null,
    status: 'confirmed',
    source: 'web',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    serviceRequestId: null,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BookingsAdmin defensive guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Silence the expected console.warn from the zod drop path (not used in
    // these tests because we mock safeParse to always succeed, but guard
    // against noise from other sources).
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('shows all empty-state messages and the phone booking button when the list is empty', async () => {
    mockUseListBookings.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    const { BookingsAdmin } = await import('./BookingsAdmin');
    render(<BookingsAdmin />);

    // All three section empty-state messages must be visible.
    expect(screen.getByText('No bookings scheduled for today.')).toBeInTheDocument();
    expect(screen.getByText('No upcoming bookings yet.')).toBeInTheDocument();
    expect(screen.getByText('No past bookings yet.')).toBeInTheDocument();

    // The owner must still be able to record a phone booking.
    expect(screen.getByRole('button', { name: /record phone booking/i })).toBeInTheDocument();
  });

  it('renders without crashing when a booking has a malformed scheduledDate', async () => {
    // 'not-a-date' is a string (passes zod) but parseISO will throw.
    // The try/catch in the grouping logic must catch it and fall through.
    mockUseListBookings.mockReturnValue({
      data: [makeBooking({ id: 1, scheduledDate: 'not-a-date' })],
      isLoading: false,
      isError: false,
    });

    const { BookingsAdmin } = await import('./BookingsAdmin');

    expect(() => render(<BookingsAdmin />)).not.toThrow();

    // The heading confirms the component mounted successfully.
    expect(screen.getByRole('heading', { name: 'Bookings' })).toBeInTheDocument();
  });

  it('sort completes without throwing when a booking is missing scheduledTime', async () => {
    // Two bookings share the same scheduledDate so the comparator falls
    // through to compare scheduledTime. One has null scheduledTime —
    // the `?? ''` guard prevents a crash.
    mockUseListBookings.mockReturnValue({
      data: [
        makeBooking({ id: 1, scheduledDate: '2099-07-01', scheduledTime: 'afternoon' }),
        // Cast to any so TypeScript does not prevent the null — we are
        // deliberately testing a runtime scenario that TypeScript can't guard.
        makeBooking({ id: 2, scheduledDate: '2099-07-01', scheduledTime: null as unknown as string }),
      ],
      isLoading: false,
      isError: false,
    });

    const { BookingsAdmin } = await import('./BookingsAdmin');

    expect(() => render(<BookingsAdmin />)).not.toThrow();

    // The heading confirms the component mounted and the sort completed.
    expect(screen.getByRole('heading', { name: 'Bookings' })).toBeInTheDocument();
    // Both booking cards should be in the document (name appears in the card title).
    expect(screen.getAllByText(/Alice/).length).toBeGreaterThanOrEqual(2);
  });
});
