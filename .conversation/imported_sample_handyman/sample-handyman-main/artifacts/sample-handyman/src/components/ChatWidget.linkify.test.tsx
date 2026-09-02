/**
 * Unit tests for the chat message linkification helpers.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { linkifyText, isBookingLink } from './ChatWidget';

function renderText(text: string, onBookingClick?: () => void) {
  return render(<p>{linkifyText(text, onBookingClick)}</p>);
}

describe('isBookingLink', () => {
  it('matches full, relative, and hash forms', () => {
    expect(isBookingLink('https://example.com/#booking')).toBe(true);
    expect(isBookingLink('/#booking')).toBe(true);
    expect(isBookingLink('#booking')).toBe(true);
    expect(isBookingLink('https://example.com/about')).toBe(false);
  });
});

describe('linkifyText', () => {
  it('renders a markdown booking link with its label pointing at /#booking', () => {
    renderText('You can [Request a Quote](https://example.com/#booking) anytime.');
    const link = screen.getByTestId('chat-booking-link');
    expect(link.textContent).toBe('Request a Quote');
    expect(link.getAttribute('href')).toBe('/#booking');
  });

  it('renders a bare booking URL with default action text', () => {
    renderText('Submit at https://example.com/#booking and Mike will call.');
    const link = screen.getByTestId('chat-booking-link');
    expect(link.textContent).toBe('Request a Quote');
    expect(link.getAttribute('href')).toBe('/#booking');
  });

  it('renders other URLs as safe external links and keeps punctuation as text', () => {
    const { container } = renderText('See https://example.com/reviews, please.');
    const link = container.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('https://example.com/reviews');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(container.textContent).toContain(', please.');
  });

  it('leaves plain text and non-http content untouched', () => {
    const { container } = renderText('Just call us at (512) 244-8550.');
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toBe('Just call us at (512) 244-8550.');
  });
});
