/**
 * Tests that the phone-booking dialog detects conflicts with existing bookings:
 *  1. A window already occupied on the chosen date is labelled "(Already booked)"
 *     in the dropdown so the owner sees it at a glance.
 *  2. Submitting with a conflicting window fires a toast error and does NOT
 *     call the create-phone-booking mutation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { Booking } from '@workspace/api-client-react';

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@workspace/api-zod', () => ({
  ListBookingsResponseItem: {
    safeParse: (item: unknown) => ({ success: true, data: item }),
  },
}));

const mockMutate = vi.fn();
const mockUseListBookings = vi.fn();
vi.mock('@workspace/api-client-react', () => ({
  useListBookings: () => mockUseListBookings(),
  useUpdateBooking: () => ({ mutate: vi.fn(), isPending: false }),
  useCreatePhoneBooking: () => ({ mutate: mockMutate, isPending: false }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/components/DayCalendar', () => ({
  DayCalendar: () => <div data-testid="day-calendar" />,
}));

vi.mock('@/components/PhoneDisplay', () => ({
  PhoneDisplay: ({ phone }: { phone: string }) => <span>{phone}</span>,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const FUTURE_DATE = '2099-08-15'; // far future — always passes the "today" guard

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 1,
    name: 'Alice',
    phone: '5550001234',
    email: null,
    service: 'Electrical & Lighting',
    description: 'Fix an outlet',
    scheduledDate: FUTURE_DATE,
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

describe('BookingsAdmin phone-booking conflict detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('labels an already-booked window in the dropdown trigger', async () => {
    // All three windows booked so the label is visible in the trigger regardless
    // of which window the dialog defaults to (default is time-of-day dependent).
    mockUseListBookings.mockReturnValue({
      data: [
        makeBooking({ id: 1, scheduledDate: FUTURE_DATE, scheduledTime: 'morning',   status: 'confirmed' }),
        makeBooking({ id: 2, scheduledDate: FUTURE_DATE, scheduledTime: 'afternoon', status: 'confirmed' }),
        makeBooking({ id: 3, scheduledDate: FUTURE_DATE, scheduledTime: 'evening',   status: 'confirmed' }),
      ],
      isLoading: false,
      isError: false,
    });

    const { BookingsAdmin } = await import('./BookingsAdmin');
    render(<BookingsAdmin />);

    // Open the phone booking dialog.
    fireEvent.click(screen.getByRole('button', { name: /record phone booking/i }));

    // Set the date to match the booked date.
    const dateInput = screen.getByLabelText(/confirmed date/i);
    fireEvent.change(dateInput, { target: { value: FUTURE_DATE } });

    // The Select trigger renders the currently-selected item's text (always
    // visible, no need to open the dropdown). Since all windows are booked,
    // the trigger should show "(Already booked)" next to whichever is selected.
    expect(screen.getByText(/already booked/i)).toBeInTheDocument();
  });

  it('shows a toast error and does not call the mutation when the window is already booked', async () => {
    // All three windows are booked on FUTURE_DATE so the conflict fires
    // regardless of which window the dialog defaults to (time-dependent).
    mockUseListBookings.mockReturnValue({
      data: [
        makeBooking({ id: 1, scheduledDate: FUTURE_DATE, scheduledTime: 'morning',   status: 'confirmed' }),
        makeBooking({ id: 2, scheduledDate: FUTURE_DATE, scheduledTime: 'afternoon', status: 'confirmed' }),
        makeBooking({ id: 3, scheduledDate: FUTURE_DATE, scheduledTime: 'evening',   status: 'confirmed' }),
      ],
      isLoading: false,
      isError: false,
    });

    const { BookingsAdmin } = await import('./BookingsAdmin');
    render(<BookingsAdmin />);

    // Open the dialog.
    fireEvent.click(screen.getByRole('button', { name: /record phone booking/i }));

    // Set the date to the conflicting date.
    const dateInput = screen.getByLabelText(/confirmed date/i);
    fireEvent.change(dateInput, { target: { value: FUTURE_DATE } });

    // Click "Save booking" — the window defaults to morning which is booked.
    // The conflict guard fires first (before the required-fields check), so we
    // do not need to fill any other fields to observe it.
    fireEvent.click(screen.getByRole('button', { name: /save booking/i }));

    // Conflict toast must have fired.
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: expect.stringMatching(/already booked/i),
      }),
    );

    // The mutation must NOT have been called.
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does NOT flag a cancelled booking as a conflict', async () => {
    // Cancelled booking — slot should be free.
    mockUseListBookings.mockReturnValue({
      data: [makeBooking({ scheduledDate: FUTURE_DATE, scheduledTime: 'morning', status: 'cancelled' })],
      isLoading: false,
      isError: false,
    });

    const { BookingsAdmin } = await import('./BookingsAdmin');
    render(<BookingsAdmin />);

    fireEvent.click(screen.getByRole('button', { name: /record phone booking/i }));

    const dateInput = screen.getByLabelText(/confirmed date/i);
    fireEvent.change(dateInput, { target: { value: FUTURE_DATE } });

    // The morning option should NOT carry the "(Already booked)" suffix.
    expect(screen.queryByText(/morning.*already booked/i)).toBeNull();
  });
});
