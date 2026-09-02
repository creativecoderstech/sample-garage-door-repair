/**
 * Appearance system — themes, dark mode, and font pairings.
 *
 * Single source of truth: the DOM (<html> data-theme / data-font / .dark).
 * localStorage stores ONLY explicit user choices, never site defaults.
 */

export type ThemeId = 'craftsman' | 'blueprint' | 'toolbelt' | 'cedar-ridge' | 'austin-steel';
export type ThemeMode = 'light' | 'dark';
export type FontId = 'workhorse' | 'trademaster' | 'hometown' | 'established';

export const VALID_THEME_IDS: ThemeId[] = [
  'craftsman',
  'blueprint',
  'toolbelt',
  'cedar-ridge',
  'austin-steel',
];

export const VALID_FONT_IDS: FontId[] = [
  'workhorse',
  'trademaster',
  'hometown',
  'established',
];

export const THEMES: { id: ThemeId; name: string; primary: string; accent: string }[] = [
  { id: 'craftsman',    name: 'Craftsman',    primary: '#2d6a4f', accent: '#e07b30' },
  { id: 'blueprint',   name: 'Blueprint',    primary: '#1e5bb5', accent: '#2a9bb5' },
  { id: 'toolbelt',    name: 'Toolbelt',     primary: '#8b4a1a', accent: '#f0901a' },
  { id: 'cedar-ridge', name: 'Cedar Ridge',  primary: '#a03820', accent: '#2a8fb0' },
  { id: 'austin-steel',name: 'Austin Steel', primary: '#364059', accent: '#e84e26' },
];

export const FONTS: { id: FontId; name: string; body: string; display: string }[] = [
  { id: 'workhorse',   name: 'Workhorse',   body: 'Inter',         display: 'Outfit'    },
  { id: 'trademaster', name: 'Trademaster', body: 'Source Sans 3', display: 'Barlow'    },
  { id: 'hometown',    name: 'Hometown',    body: 'Nunito',        display: 'Poppins'   },
  { id: 'established', name: 'Established', body: 'Lato',          display: 'Raleway'   },
];

// Custom event fired whenever the active appearance changes so any UI
// (e.g. AppearancePicker) can react without polling or prop-drilling.
export const APPEARANCE_CHANGED_EVENT = 'app:appearance-changed';

export interface AppearanceDetail {
  themeId: ThemeId;
  mode: ThemeMode;
  fontId: FontId;
}

const STORAGE_THEME = 'app-theme-id';
const STORAGE_MODE  = 'app-theme-mode';
const STORAGE_FONT  = 'app-font-id';

/** Apply appearance to DOM and fire the changed event. Does NOT persist to localStorage. */
function applyToDOM(themeId: ThemeId, mode: ThemeMode, fontId: FontId) {
  const html = document.documentElement;
  html.setAttribute('data-theme', themeId);
  html.setAttribute('data-font', fontId);
  if (mode === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
  html.dispatchEvent(
    new CustomEvent<AppearanceDetail>(APPEARANCE_CHANGED_EVENT, {
      detail: { themeId, mode, fontId },
      bubbles: false,
    }),
  );
}

/**
 * Apply a user-chosen appearance: updates the DOM AND persists to localStorage.
 * Call this only in response to explicit user interaction (picker clicks).
 */
export function applyUserAppearance(themeId: ThemeId, mode: ThemeMode, fontId: FontId) {
  applyToDOM(themeId, mode, fontId);
  try {
    localStorage.setItem(STORAGE_THEME, themeId);
    localStorage.setItem(STORAGE_MODE,  mode);
    localStorage.setItem(STORAGE_FONT,  fontId);
  } catch {
    // private browsing may reject
  }
}

/**
 * Apply a site-default appearance: updates the DOM but does NOT write to localStorage.
 * Call this during initial load when no user preference exists.
 */
export function applySiteAppearance(themeId: ThemeId, mode: ThemeMode, fontId: FontId) {
  applyToDOM(themeId, mode, fontId);
}

/** Read the currently active appearance from the DOM (the single source of truth). */
export function readAppearanceFromDOM(): AppearanceDetail {
  const html = document.documentElement;
  let themeId = (html.getAttribute('data-theme') ?? 'craftsman') as ThemeId;
  let fontId  = (html.getAttribute('data-font')  ?? 'workhorse') as FontId;
  const mode: ThemeMode = html.classList.contains('dark') ? 'dark' : 'light';

  if (!VALID_THEME_IDS.includes(themeId)) themeId = 'craftsman';
  if (!VALID_FONT_IDS.includes(fontId))   fontId  = 'workhorse';

  return { themeId, mode, fontId };
}

/**
 * Returns true when the user has explicitly chosen an appearance preference.
 * Site defaults fetched from the server do NOT count.
 */
export function hasUserAppearancePreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_THEME) !== null;
  } catch {
    return false;
  }
}

/** Read and validate the stored user preference (only call when hasUserAppearancePreference is true). */
export function getStoredUserAppearance(): AppearanceDetail {
  let themeId = (localStorage.getItem(STORAGE_THEME) ?? 'craftsman') as ThemeId;
  let mode    = (localStorage.getItem(STORAGE_MODE)  ?? 'light')     as ThemeMode;
  let fontId  = (localStorage.getItem(STORAGE_FONT)  ?? 'workhorse') as FontId;

  if (!VALID_THEME_IDS.includes(themeId)) themeId = 'craftsman';
  if (mode !== 'light' && mode !== 'dark') mode = 'light';
  if (!VALID_FONT_IDS.includes(fontId))   fontId  = 'workhorse';

  return { themeId, mode, fontId };
}

// ─── Back-compat aliases (kept so existing callers outside this module
//     can still be updated gradually) ────────────────────────────────────────
/** @deprecated Use applyUserAppearance for user choices, applySiteAppearance for defaults */
export const applyAppearance = applyUserAppearance;
/** @deprecated Use hasUserAppearancePreference */
export const hasStoredAppearance = hasUserAppearancePreference;
