import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';
import {
  applySiteAppearance,
  hasUserAppearancePreference,
  getStoredUserAppearance,
  type ThemeId,
  type ThemeMode,
  type FontId,
  VALID_THEME_IDS,
  VALID_FONT_IDS,
} from './lib/appearance';

/**
 * Appearance initialisation strategy (single source of truth: the DOM)
 *
 *  1. If the visitor has an explicit stored preference →
 *       the no-flash inline script in index.html already applied it to the DOM
 *       before React hydrates. Nothing to do here; the picker reads from DOM.
 *
 *  2. If no stored preference →
 *       Apply hard-coded fallback to DOM (no localStorage write).
 *       Then fetch /api/settings and apply the site owner's chosen default
 *       (again, no localStorage write). A custom event fires so the picker
 *       can react and stay in sync.
 *
 *  In both cases we never write the site default to localStorage, so it
 *  cannot silently become a "user override" that prevents future updates.
 */
if (typeof window !== 'undefined' && !hasUserAppearancePreference()) {
  // Apply a reasonable DOM fallback immediately so the page isn't unstyled.
  applySiteAppearance('craftsman', 'light', 'workhorse');

  // Then load the site owner's chosen default from the worker asynchronously.
  fetch('/api/settings', { credentials: 'include' })
    .then((r) => r.ok ? r.json() : null)
    .then((data: Record<string, string> | null) => {
      if (!data) return;
      // Only apply if the user still has no stored preference; a choice made
      // while the fetch was in-flight takes precedence.
      if (hasUserAppearancePreference()) return;
      const themeId = (VALID_THEME_IDS.includes(data.themeId as ThemeId)
        ? data.themeId : 'craftsman') as ThemeId;
      const mode    = (data.themeMode === 'dark' ? 'dark' : 'light') as ThemeMode;
      const fontId  = (VALID_FONT_IDS.includes(data.fontId as FontId)
        ? data.fontId : 'workhorse') as FontId;
      applySiteAppearance(themeId, mode, fontId);
    })
    .catch(() => { /* stay on fallback */ });
}

createRoot(document.getElementById('root')!).render(<App />);
