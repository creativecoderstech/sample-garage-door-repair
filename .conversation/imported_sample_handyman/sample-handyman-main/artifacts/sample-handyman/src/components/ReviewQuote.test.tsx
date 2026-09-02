/**
 * Tests for the review carousel quote block (ReviewQuote):
 *  - The "Read more" toggle appears based on ACTUAL rendered overflow
 *    (scrollHeight > clientHeight), not on text length — so a short review
 *    that wraps past the 4-line clamp still gets a toggle, and a long-but-
 *    fitting review does not.
 *  - Clicking toggles between expanded ("Show less") and collapsed states.
 *
 * Strategy: happy-dom reports 0 for layout metrics, so we stub
 * scrollHeight/clientHeight on the paragraph before triggering a re-measure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { ReviewQuote } from './ReviewQuote';

// Ensure a ResizeObserver exists and capture the measure callback so tests
// can re-trigger measurement after stubbing layout metrics.
let roCallback: ResizeObserverCallback | null = null;
class FakeResizeObserver {
  constructor(cb: ResizeObserverCallback) {
    roCallback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', FakeResizeObserver);

function Harness({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <ReviewQuote
      text={text}
      isExpanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
    />
  );
}

function stubOverflow(el: HTMLElement, scrollHeight: number, clientHeight: number) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => scrollHeight });
  Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => clientHeight });
}

function triggerMeasure() {
  act(() => {
    roCallback?.([], undefined as unknown as ResizeObserver);
  });
}

beforeEach(() => {
  roCallback = null;
});

describe('ReviewQuote', () => {
  it('shows no toggle when the text fits (even if the string is long)', () => {
    render(<Harness text={'A'.repeat(300)} />);
    const p = screen.getByText(/A{10,}/);
    stubOverflow(p, 100, 100); // fits exactly
    triggerMeasure();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows "Read more" when the rendered text overflows, even under 200 chars', () => {
    // Short string that would fail a length>200 heuristic but overflows at
    // narrow mobile widths.
    render(<Harness text="Short review that still wraps past four lines on narrow screens." />);
    const p = screen.getByText(/Short review/);
    stubOverflow(p, 180, 117); // clamped: content taller than visible box
    triggerMeasure();
    const btn = screen.getByRole('button', { name: 'Read more' });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('expands to full text and collapses again via the toggle', () => {
    render(<Harness text="Overflowing review text for expand/collapse behavior." />);
    const p = screen.getByText(/Overflowing review/);
    stubOverflow(p, 200, 117);
    triggerMeasure();

    // Expand
    fireEvent.click(screen.getByRole('button', { name: 'Read more' }));
    const showLess = screen.getByRole('button', { name: 'Show less' });
    expect(showLess.getAttribute('aria-expanded')).toBe('true');
    // Clamp class removed when expanded
    expect(p.className).not.toContain('line-clamp-4');

    // Collapse
    stubOverflow(p, 200, 117);
    fireEvent.click(showLess);
    triggerMeasure();
    expect(screen.getByRole('button', { name: 'Read more' })).toBeTruthy();
    expect(p.className).toContain('line-clamp-4');
  });
});
