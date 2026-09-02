/**
 * Tests for the appearance initialisation logic.
 * Runs in happy-dom (vitest.component.config.ts).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  applyUserAppearance,
  applySiteAppearance,
  readAppearanceFromDOM,
  hasUserAppearancePreference,
  getStoredUserAppearance,
  APPEARANCE_CHANGED_EVENT,
  type AppearanceDetail,
} from './appearance';

/** Reset DOM and localStorage before each test. */
beforeEach(() => {
  const html = document.documentElement;
  html.removeAttribute('data-theme');
  html.removeAttribute('data-font');
  html.classList.remove('dark');
  localStorage.clear();
});

// ─── readAppearanceFromDOM ────────────────────────────────────────────────────

describe('readAppearanceFromDOM', () => {
  it('returns craftsman/light/workhorse defaults when DOM has no attributes', () => {
    const result = readAppearanceFromDOM();
    expect(result).toEqual({ themeId: 'craftsman', mode: 'light', fontId: 'workhorse' });
  });

  it('reads an explicitly set non-default theme from the DOM', () => {
    document.documentElement.setAttribute('data-theme', 'blueprint');
    document.documentElement.setAttribute('data-font', 'trademaster');
    document.documentElement.classList.add('dark');
    expect(readAppearanceFromDOM()).toEqual({
      themeId: 'blueprint',
      mode: 'dark',
      fontId: 'trademaster',
    });
  });

  it('falls back to craftsman/workhorse for invalid attribute values', () => {
    document.documentElement.setAttribute('data-theme', 'invalid-theme');
    document.documentElement.setAttribute('data-font', 'comic-sans');
    const result = readAppearanceFromDOM();
    expect(result.themeId).toBe('craftsman');
    expect(result.fontId).toBe('workhorse');
  });
});

// ─── applySiteAppearance (site defaults — no localStorage) ───────────────────

describe('applySiteAppearance', () => {
  it('applies the given appearance to the DOM', () => {
    applySiteAppearance('toolbelt', 'dark', 'hometown');
    expect(document.documentElement.getAttribute('data-theme')).toBe('toolbelt');
    expect(document.documentElement.getAttribute('data-font')).toBe('hometown');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('does NOT write to localStorage', () => {
    applySiteAppearance('blueprint', 'dark', 'trademaster');
    expect(localStorage.getItem('app-theme-id')).toBeNull();
    expect(localStorage.getItem('app-theme-mode')).toBeNull();
    expect(localStorage.getItem('app-font-id')).toBeNull();
  });

  it('fires APPEARANCE_CHANGED_EVENT with the new values', () => {
    const received: AppearanceDetail[] = [];
    document.documentElement.addEventListener(APPEARANCE_CHANGED_EVENT, (e) => {
      received.push((e as CustomEvent<AppearanceDetail>).detail);
    });
    applySiteAppearance('cedar-ridge', 'light', 'established');
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ themeId: 'cedar-ridge', mode: 'light', fontId: 'established' });
  });

  it('removes the dark class when switching to light mode', () => {
    document.documentElement.classList.add('dark');
    applySiteAppearance('craftsman', 'light', 'workhorse');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

// ─── applyUserAppearance (user choice — persists) ────────────────────────────

describe('applyUserAppearance', () => {
  it('applies to DOM and writes to localStorage', () => {
    applyUserAppearance('austin-steel', 'dark', 'established');
    expect(document.documentElement.getAttribute('data-theme')).toBe('austin-steel');
    expect(localStorage.getItem('app-theme-id')).toBe('austin-steel');
    expect(localStorage.getItem('app-theme-mode')).toBe('dark');
    expect(localStorage.getItem('app-font-id')).toBe('established');
  });

  it('also fires APPEARANCE_CHANGED_EVENT', () => {
    let fired = false;
    document.documentElement.addEventListener(APPEARANCE_CHANGED_EVENT, () => { fired = true; });
    applyUserAppearance('blueprint', 'light', 'workhorse');
    expect(fired).toBe(true);
  });
});

// ─── hasUserAppearancePreference ─────────────────────────────────────────────

describe('hasUserAppearancePreference', () => {
  it('returns false on first visit (empty localStorage)', () => {
    expect(hasUserAppearancePreference()).toBe(false);
  });

  it('returns true after a user choice', () => {
    applyUserAppearance('blueprint', 'light', 'workhorse');
    expect(hasUserAppearancePreference()).toBe(true);
  });

  it('returns false after a site-default-only load (applySiteAppearance)', () => {
    applySiteAppearance('toolbelt', 'dark', 'hometown');
    expect(hasUserAppearancePreference()).toBe(false);
  });
});

// ─── User choice made before settings fetch resolves ─────────────────────────

describe('user choice races the settings fetch', () => {
  it('user choice wins when made before site default arrives', () => {
    // Simulate: no preference yet
    expect(hasUserAppearancePreference()).toBe(false);

    // User picks a theme before the async fetch resolves
    applyUserAppearance('blueprint', 'dark', 'trademaster');

    // Now the "fetch" resolves with a different server default
    // main.tsx guard: if (hasUserAppearancePreference()) return;
    if (!hasUserAppearancePreference()) {
      applySiteAppearance('craftsman', 'light', 'workhorse');
    }

    // User's choice should still be active
    const dom = readAppearanceFromDOM();
    expect(dom.themeId).toBe('blueprint');
    expect(dom.mode).toBe('dark');
    expect(dom.fontId).toBe('trademaster');
    // And localStorage should have the user's choice
    expect(localStorage.getItem('app-theme-id')).toBe('blueprint');
  });
});

// ─── getStoredUserAppearance ─────────────────────────────────────────────────

describe('getStoredUserAppearance', () => {
  it('returns stored values correctly', () => {
    applyUserAppearance('cedar-ridge', 'dark', 'hometown');
    const stored = getStoredUserAppearance();
    expect(stored).toEqual({ themeId: 'cedar-ridge', mode: 'dark', fontId: 'hometown' });
  });

  it('falls back to craftsman/light/workhorse for corrupted storage', () => {
    localStorage.setItem('app-theme-id', 'garbage');
    localStorage.setItem('app-theme-mode', 'blah');
    localStorage.setItem('app-font-id', 'nonsense');
    const stored = getStoredUserAppearance();
    expect(stored.themeId).toBe('craftsman');
    expect(stored.mode).toBe('light');
    expect(stored.fontId).toBe('workhorse');
  });
});

// ─── Non-default server setting applied on first visit ───────────────────────

describe('non-default server setting on first visit', () => {
  it('applies a server-chosen non-default theme without persisting it', () => {
    // Simulate what main.tsx does: no preference → apply site default from server
    expect(hasUserAppearancePreference()).toBe(false);
    applySiteAppearance('austin-steel', 'dark', 'established');

    // DOM reflects the server default
    expect(readAppearanceFromDOM()).toEqual({
      themeId: 'austin-steel',
      mode: 'dark',
      fontId: 'established',
    });
    // But localStorage is still empty — it's NOT a user preference
    expect(hasUserAppearancePreference()).toBe(false);
  });
});
