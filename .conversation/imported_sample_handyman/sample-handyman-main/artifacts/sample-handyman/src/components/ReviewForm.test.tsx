/**
 * Tests for the unified ReviewForm flow:
 *  - Every submission is stored via the API (mutate always called).
 *  - The post-submit branch depends on the server's `excellent` verdict and
 *    whether a Google write-review URL is configured:
 *      excellent + URL  → celebration card with a prominent "Post on Google"
 *                         handoff (copy + popup-safe open in one gesture)
 *      otherwise        → thank-you card (with a subtle Google link when a
 *                         URL is configured)
 *  - Popup-blocked detection, retry recovery, and clipboard fallback.
 *  - Rating renders as an accessible radiogroup.
 *
 * Strategy: mock useCreateReview so mutate() calls onSuccess immediately with
 * a configurable created-review payload (mockExcellent flag).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// ── Module mocks ──────────────────────────────────────────────────────────────

let mockExcellent = false;

// Calls onSuccess immediately with the created review payload.
const mutateMock = vi.fn(
  (_payload: unknown, opts: { onSuccess?: (created: unknown) => void }) => {
    opts?.onSuccess?.({
      id: 1,
      name: 'Jane Doe',
      rating: 5,
      text: 'Great service, highly recommend!',
      createdAt: '2026-08-12T00:00:00Z',
      excellent: mockExcellent,
    });
  },
);

vi.mock('@workspace/api-client-react', () => ({
  useCreateReview: () => ({ mutate: mutateMock, isPending: false }),
  getListReviewsQueryKey: () => ['reviews'],
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const GOOGLE_URL = 'https://search.google.com/local/writereview?placeid=TEST_PLACE_ID';
const REVIEW_TEXT = 'Mike fixed our leaking washer valve fast!';

/** Flush pending microtasks without needing real timers. */
async function flushMicrotasks() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Render ReviewForm, fill the required fields, and submit.
 * mutateMock calls onSuccess immediately, so the component transitions to
 * the post-submit card. All async waiting uses only microtasks so it works
 * whether fake timers are active or not.
 */
async function renderAndSubmit(googleWriteReviewUrl?: string) {
  const { ReviewForm } = await import('./ReviewForm');

  await act(async () => {
    render(<ReviewForm googleWriteReviewUrl={googleWriteReviewUrl} />);
    await flushMicrotasks();
  });

  await act(async () => {
    screen.getByTestId('button-rating-5').click();
    await flushMicrotasks();
  });

  await act(async () => {
    setNativeValue(screen.getByTestId('input-review-name') as HTMLInputElement, 'Jane Doe');
    await flushMicrotasks();
  });

  await act(async () => {
    setNativeValue(screen.getByTestId('input-review-text') as HTMLTextAreaElement, REVIEW_TEXT);
    await flushMicrotasks();
  });

  await act(async () => {
    screen.getByTestId('form-review').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await flushMicrotasks();
  });
}

// ── Thank-you card (non-excellent path) ───────────────────────────────────────

describe('ReviewForm thank-you card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExcellent = false;
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores the review and shows the countdown label after submission', async () => {
    await renderAndSubmit();

    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('message-review-success')).toBeInTheDocument();
    expect(screen.getByText(/Closing in 10s/i)).toBeInTheDocument();
  });

  it('dismisses the card immediately when the × close button is clicked', async () => {
    await renderAndSubmit();

    expect(screen.getByTestId('message-review-success')).toBeInTheDocument();

    act(() => {
      screen.getByRole('button', { name: /close confirmation/i }).click();
    });

    expect(screen.queryByTestId('message-review-success')).not.toBeInTheDocument();
    expect(screen.getByTestId('form-review')).toBeInTheDocument();
  });

  it('auto-dismisses the card after 10 seconds', async () => {
    await renderAndSubmit();

    expect(screen.getByTestId('message-review-success')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.queryByTestId('message-review-success')).not.toBeInTheDocument();
    expect(screen.getByTestId('form-review')).toBeInTheDocument();
  });

  it('shows a subtle Google link when a URL is configured (policy-safe option for all)', async () => {
    await renderAndSubmit(GOOGLE_URL);

    const link = screen.getByTestId('link-google-review-subtle');
    expect(link).toHaveAttribute('href', GOOGLE_URL);
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('omits the Google link when no URL is configured', async () => {
    await renderAndSubmit();

    expect(screen.queryByTestId('link-google-review-subtle')).not.toBeInTheDocument();
  });
});

// ── Celebration / Google handoff (excellent path) ─────────────────────────────

describe('ReviewForm excellent-review Google handoff', () => {
  let windowOpenMock: ReturnType<typeof vi.fn>;
  let clipboardWriteMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExcellent = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Browser-accurate success: window.open WITHOUT "noopener" returns a
    // window proxy; blocked popups return null (mocked per-test).
    windowOpenMock = vi.fn().mockReturnValue({ opener: {} } as unknown as Window);
    vi.stubGlobal('open', windowOpenMock);
    clipboardWriteMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardWriteMock },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores the review and shows the celebration card (no auto-open)', async () => {
    await renderAndSubmit(GOOGLE_URL);

    expect(mutateMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('message-review-celebration')).toBeInTheDocument();
    expect(screen.getByTestId('button-post-on-google')).toBeInTheDocument();
    expect(screen.getByTestId('text-composed-review')).toHaveTextContent(REVIEW_TEXT);
    // Google must NOT open without a user gesture (popup blockers + UX)
    expect(windowOpenMock).not.toHaveBeenCalled();
  });

  it('falls back to the plain thank-you when excellent but no Google URL is configured', async () => {
    await renderAndSubmit();

    expect(screen.getByTestId('message-review-success')).toBeInTheDocument();
    expect(screen.queryByTestId('message-review-celebration')).not.toBeInTheDocument();
  });

  it('shows the thank-you card for non-excellent reviews even with a Google URL', async () => {
    mockExcellent = false;
    await renderAndSubmit(GOOGLE_URL);

    expect(screen.getByTestId('message-review-success')).toBeInTheDocument();
    expect(screen.queryByTestId('message-review-celebration')).not.toBeInTheDocument();
  });

  it('"Post on Google" opens Google synchronously in the click gesture, copies, and severs opener', async () => {
    const fakeWin = { opener: {} } as unknown as Window & { opener: unknown };
    windowOpenMock.mockReturnValue(fakeWin);
    await renderAndSubmit(GOOGLE_URL);

    // window.open must fire synchronously inside the click (user activation).
    act(() => {
      screen.getByTestId('button-post-on-google').click();
      expect(windowOpenMock).toHaveBeenCalledWith(GOOGLE_URL, '_blank');
    });
    await act(async () => {
      await flushMicrotasks();
    });

    expect(fakeWin.opener).toBeNull();
    expect(clipboardWriteMock).toHaveBeenCalledWith(REVIEW_TEXT);
    expect(screen.getByTestId('text-handoff-guidance').textContent).not.toMatch(/blocked/i);
    expect(screen.getByTestId('button-reopen-google')).toBeInTheDocument();
    expect(screen.getByTestId('button-copy-again')).toBeInTheDocument();
  });

  it('shows honest guidance when the popup is blocked, and retry clears it', async () => {
    windowOpenMock.mockReturnValue(null);
    await renderAndSubmit(GOOGLE_URL);

    await act(async () => {
      screen.getByTestId('button-post-on-google').click();
      await flushMicrotasks();
    });
    expect(screen.getByTestId('text-handoff-guidance').textContent).toMatch(/blocked/i);

    windowOpenMock.mockReturnValue({ opener: {} } as unknown as Window);
    await act(async () => {
      screen.getByTestId('button-reopen-google').click();
      await flushMicrotasks();
    });
    expect(screen.getByTestId('text-handoff-guidance').textContent).not.toMatch(/blocked/i);
  });

  it('still shows the handoff (text selectable for manual copy) when clipboard fails', async () => {
    clipboardWriteMock.mockRejectedValue(new Error('denied'));
    document.execCommand = vi.fn().mockReturnValue(false);

    await renderAndSubmit(GOOGLE_URL);
    await act(async () => {
      screen.getByTestId('button-post-on-google').click();
      await flushMicrotasks();
    });

    expect(screen.getByTestId('text-composed-review')).toHaveTextContent(REVIEW_TEXT);
    expect(screen.getByTestId('button-copy-again')).toBeInTheDocument();
  });

  it('"Copy review again" re-copies the review text', async () => {
    await renderAndSubmit(GOOGLE_URL);
    await act(async () => {
      screen.getByTestId('button-post-on-google').click();
      await flushMicrotasks();
    });
    clipboardWriteMock.mockClear();

    await act(async () => {
      screen.getByTestId('button-copy-again').click();
      await flushMicrotasks();
    });
    expect(clipboardWriteMock).toHaveBeenCalledWith(REVIEW_TEXT);
  });

  it('exposes the rating as an accessible radiogroup with checked state', async () => {
    const { ReviewForm } = await import('./ReviewForm');
    await act(async () => {
      render(<ReviewForm googleWriteReviewUrl={GOOGLE_URL} />);
      await flushMicrotasks();
    });

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();

    await act(async () => {
      screen.getByTestId('button-rating-4').click();
      await flushMicrotasks();
    });

    expect(screen.getByTestId('button-rating-4')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('button-rating-5')).toHaveAttribute('aria-checked', 'false');
  });
});
