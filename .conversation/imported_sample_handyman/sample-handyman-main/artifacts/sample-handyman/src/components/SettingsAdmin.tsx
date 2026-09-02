/**
 * Site settings admin panel (phone, owner email, notify-from, ratings, Google links).
 *
 * Fields are locked (read-only) by default. Each field row — or the platform
 * ratings group — must be explicitly unlocked with its Edit button before it
 * can change, preventing accidental edits/autofill from touching live values.
 * Enter saves, Escape cancels. Members cannot edit phone or owner email.
 */
import { useEffect, useState, useCallback, type KeyboardEvent, type ReactNode } from 'react';
import {
  useGetSiteSettings,
  useUpdateSiteSettings,
  getGetSiteSettingsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Loader2, Palette, Pencil, Phone, Save, Star, X } from 'lucide-react';
import { HeroImageAdmin } from '@/components/HeroImageAdmin';
import { useAuth } from '@/lib/auth';
import {
  applyUserAppearance,
  THEMES,
  FONTS,
  VALID_THEME_IDS,
  VALID_FONT_IDS,
  type ThemeId,
  type ThemeMode,
  type FontId,
} from '@/lib/appearance';
import { cn } from '@/lib/utils';

type SettingsValues = {
  phone: string;
  ownerEmail: string;
  notifyFromEmail: string;
  notifyFromName: string;
  thumbtackRating: string;
  thumbtackReviewCount: string;
  taskrabbitRating: string;
  taskrabbitReviewCount: string;
  googleReviewUrl: string;
  googlePlaceId: string;
};

type FieldKey = keyof SettingsValues;

const EMPTY: SettingsValues = {
  phone: '',
  ownerEmail: '',
  notifyFromEmail: '',
  notifyFromName: '',
  thumbtackRating: '',
  thumbtackReviewCount: '',
  taskrabbitRating: '',
  taskrabbitReviewCount: '',
  googleReviewUrl: '',
  googlePlaceId: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Section = the unit that unlocks together. Ratings unlock as one group. */
type SectionKey =
  | 'phone'
  | 'ownerEmail'
  | 'notifyFromEmail'
  | 'notifyFromName'
  | 'ratings'
  | 'googlePlaceId'
  | 'googleReviewUrl';

const SECTION_FIELDS: Record<SectionKey, FieldKey[]> = {
  phone: ['phone'],
  ownerEmail: ['ownerEmail'],
  notifyFromEmail: ['notifyFromEmail'],
  notifyFromName: ['notifyFromName'],
  ratings: ['thumbtackRating', 'thumbtackReviewCount', 'taskrabbitRating', 'taskrabbitReviewCount'],
  googlePlaceId: ['googlePlaceId'],
  googleReviewUrl: ['googleReviewUrl'],
};

function validateSection(section: SectionKey, draft: Partial<SettingsValues>): string | null {
  if (section === 'phone' && (draft.phone ?? '').trim().length < 7) {
    return 'Enter a valid phone number (at least 7 characters).';
  }
  if (section === 'ownerEmail') {
    const v = (draft.ownerEmail ?? '').trim();
    if (v && !EMAIL_RE.test(v)) return 'Enter a valid owner email.';
  }
  if (section === 'notifyFromEmail') {
    const v = (draft.notifyFromEmail ?? '').trim();
    if (v && !EMAIL_RE.test(v)) return 'Enter a valid from email.';
  }
  return null;
}

export function SettingsAdmin() {
  const queryClient = useQueryClient();
  const { canEditContactSettings } = useAuth();
  const { data, isLoading, isError } = useGetSiteSettings();
  const updateMutation = useUpdateSiteSettings();

  /** Committed (saved) values shown in locked rows. */
  const [values, setValues] = useState<SettingsValues>(EMPTY);
  /** Which section is currently unlocked for editing (one at a time). */
  const [editing, setEditing] = useState<SectionKey | null>(null);
  /** Draft values for the unlocked section only. */
  const [draft, setDraft] = useState<Partial<SettingsValues>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<SectionKey | null>(null);

  // Appearance state (managed independently from the locked-row pattern)
  const [themeId, setThemeId] = useState<ThemeId>('craftsman');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [fontId, setFontId] = useState<FontId>('workhorse');
  const [appearanceSaved, setAppearanceSaved] = useState(false);
  const [appearanceSaving, setAppearanceSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setValues({
      phone: data.phone ?? '',
      ownerEmail: data.ownerEmail ?? '',
      notifyFromEmail: data.notifyFromEmail ?? '',
      notifyFromName: data.notifyFromName ?? '',
      thumbtackRating: data.thumbtackRating ?? '',
      thumbtackReviewCount: data.thumbtackReviewCount ?? '',
      taskrabbitRating: data.taskrabbitRating ?? '',
      taskrabbitReviewCount: data.taskrabbitReviewCount ?? '',
      googleReviewUrl: data.googleReviewUrl ?? '',
      googlePlaceId: data.googlePlaceId ?? '',
    });
    // Sync appearance from server defaults
    const tid = (VALID_THEME_IDS.includes(data.themeId as ThemeId) ? data.themeId : 'craftsman') as ThemeId;
    const tm  = (data.themeMode === 'dark' ? 'dark' : 'light') as ThemeMode;
    const fid = (VALID_FONT_IDS.includes(data.fontId as FontId) ? data.fontId : 'workhorse') as FontId;
    setThemeId(tid);
    setThemeMode(tm);
    setFontId(fid);
  }, [data]);

  const saveAppearance = useCallback(async (tid: ThemeId, tm: ThemeMode, fid: FontId) => {
    if (!data) return;
    setAppearanceSaving(true);
    setAppearanceSaved(false);
    try {
      await updateMutation.mutateAsync({
        data: {
          phone: data.phone ?? '',
          themeId: tid,
          themeMode: tm,
          fontId: fid,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetSiteSettingsQueryKey() });
      // Also apply to the current page so the admin sees the change
      applyUserAppearance(tid, tm, fid);
      setAppearanceSaved(true);
      setTimeout(() => setAppearanceSaved(false), 3000);
    } catch {
      // silent — no user-facing error for appearance
    } finally {
      setAppearanceSaving(false);
    }
  }, [data, updateMutation, queryClient]);

  const startEdit = (section: SectionKey) => {
    setFormError(null);
    setSavedSection(null);
    setEditing(section);
    const d: Partial<SettingsValues> = {};
    for (const f of SECTION_FIELDS[section]) d[f] = values[f];
    setDraft(d);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft({});
    setFormError(null);
  };

  const saveSection = (section: SectionKey) => {
    setFormError(null);
    const err = validateSection(section, draft);
    if (err) {
      setFormError(err);
      return;
    }

    // Merge the edited section into the committed values; untouched fields
    // are re-submitted unchanged (the API takes the full settings object).
    const merged: SettingsValues = { ...values };
    for (const f of SECTION_FIELDS[section]) merged[f] = (draft[f] ?? '').trim();
    if (!merged.notifyFromName) merged.notifyFromName = "Mike's Handyman Service";

    updateMutation.mutate(
      { data: merged },
      {
        onSuccess: async (result) => {
          setValues({
            phone: result.phone,
            ownerEmail: result.ownerEmail,
            notifyFromEmail: result.notifyFromEmail,
            notifyFromName: result.notifyFromName,
            thumbtackRating: result.thumbtackRating,
            thumbtackReviewCount: result.thumbtackReviewCount,
            taskrabbitRating: result.taskrabbitRating,
            taskrabbitReviewCount: result.taskrabbitReviewCount,
            googleReviewUrl: result.googleReviewUrl,
            googlePlaceId: result.googlePlaceId,
          });
          setEditing(null);
          setDraft({});
          setSavedSection(section);
          await queryClient.invalidateQueries({ queryKey: getGetSiteSettingsQueryKey() });
        },
        onError: (err2) => {
          setFormError(err2 instanceof Error ? err2.message : 'Failed to save settings.');
        },
      },
    );
  };

  const onEditKeyDown = (section: SectionKey) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveSection(section);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const setDraftField = (field: FieldKey, v: string) =>
    setDraft((prev) => ({ ...prev, [field]: v }));

  const editActions = (section: SectionKey) => (
    <div className="flex items-center gap-2 pt-1">
      <Button
        type="button"
        size="sm"
        onClick={() => saveSection(section)}
        disabled={updateMutation.isPending}
        className="font-display font-bold min-h-[2.75rem] sm:min-h-0"
      >
        {updateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-1.5" />
            Save
          </>
        )}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={cancelEdit}
        disabled={updateMutation.isPending}
        className="min-h-[2.75rem] sm:min-h-0"
      >
        <X className="w-4 h-4 mr-1.5" />
        Cancel
      </Button>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        Enter to save · Esc to cancel
      </span>
    </div>
  );

  const editButton = (section: SectionKey, label: string) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={() => startEdit(section)}
      disabled={editing !== null}
      className="text-primary hover:text-primary shrink-0 min-h-[2.75rem] min-w-[2.75rem]"
      aria-label={`Edit ${label}`}
    >
      <Pencil className="w-4 h-4 mr-1.5" />
      Edit
    </Button>
  );

  /** Locked display row: label + value + Edit button on the right. */
  const lockedRow = (
    section: SectionKey,
    label: string,
    value: string,
    opts?: { editable?: boolean; lockedNote?: string },
  ) => {
    const editable = opts?.editable ?? true;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-muted-foreground break-words" data-testid={`text-${section}`}>
              {value || <span className="italic text-muted-foreground/60">Not set</span>}
            </p>
          </div>
          {editable ? editButton(section, label) : null}
        </div>
        {!editable && opts?.lockedNote ? (
          <p className="text-xs text-muted-foreground">{opts.lockedNote}</p>
        ) : null}
        {savedSection === section && !formError ? (
          <p className="text-sm text-primary font-medium">Saved.</p>
        ) : null}
      </div>
    );
  };

  const editingWrapper = (children: ReactNode) => (
    <div className="space-y-3 rounded-lg border-2 border-primary/40 bg-primary/5 p-3 -m-1">
      {children}
      {formError ? (
        <p role="alert" className="text-sm text-destructive font-medium">
          {formError}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6 max-w-xl">
      <HeroImageAdmin />

      {/* ── Site Appearance ─────────────────────────────────── */}
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="font-display text-2xl flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Site appearance
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Set the default theme, mode, and font that first-time visitors see.
            Changes apply site-wide; visitors can override with their own preference.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {/* Theme swatches */}
            <div>
              <p className="text-sm font-semibold mb-2.5">Colour theme</p>
              <div className="flex gap-3 flex-wrap">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    title={t.name}
                    onClick={() => setThemeId(t.id)}
                    className={cn(
                      'relative w-9 h-9 rounded-full overflow-hidden border-2 transition-all',
                      themeId === t.id
                        ? 'border-foreground scale-110 shadow-md'
                        : 'border-transparent hover:scale-105',
                    )}
                    aria-label={t.name}
                    aria-pressed={themeId === t.id}
                  >
                    <span className="absolute inset-0" style={{ background: t.primary }} />
                    <span
                      className="absolute inset-0"
                      style={{
                        background: t.accent,
                        clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                      }}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {THEMES.find((t) => t.id === themeId)?.name}
              </p>
            </div>

            {/* Mode toggle */}
            <div>
              <p className="text-sm font-semibold mb-2.5">Default mode</p>
              <div className="flex rounded-lg border border-border overflow-hidden w-fit">
                {(['light', 'dark'] as ThemeMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setThemeMode(m)}
                    className={cn(
                      'px-5 py-1.5 text-sm font-medium capitalize transition-colors',
                      themeMode === m
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted',
                    )}
                  >
                    {m === 'light' ? '☀️ Light' : '🌙 Dark'}
                  </button>
                ))}
              </div>
            </div>

            {/* Font pairings */}
            <div>
              <p className="text-sm font-semibold mb-2">Font pairing</p>
              <div className="flex flex-col gap-1">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFontId(f.id)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left',
                      fontId === f.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                    )}
                    aria-pressed={fontId === f.id}
                  >
                    <span style={{ fontFamily: `'${f.display}', sans-serif` }}>
                      {f.name}
                    </span>
                    <span
                      className="text-xs opacity-60 ml-3"
                      style={{ fontFamily: `'${f.display}', sans-serif` }}
                    >
                      {f.body} + {f.display}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3 pt-1 border-t">
              <Button
                type="button"
                onClick={() => saveAppearance(themeId, themeMode, fontId)}
                disabled={appearanceSaving}
                className="font-display font-bold"
              >
                {appearanceSaving ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-1.5" />Save as site default</>
                )}
              </Button>
              {appearanceSaved && (
                <p className="text-sm text-primary font-medium">Saved.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="min-h-[20vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Loading settings...</p>
          </div>
        </div>
      ) : isError ? (
        <Card className="border-2 border-destructive/30">
          <CardContent className="py-10 text-center text-destructive font-medium">
            Could not load site settings. Try refreshing.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="font-display text-2xl flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Contact, email & ratings
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Phone is shown in the site header. Ratings update the live numbers on the homepage.
              Fields are locked — click Edit next to a field to change it.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {/* Phone */}
              {editing === 'phone' ? (
                editingWrapper(
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="site-phone">Phone number</Label>
                      <Input
                        id="site-phone"
                        type="tel"
                        autoFocus
                        value={draft.phone ?? ''}
                        onChange={(e) => setDraftField('phone', e.target.value)}
                        onKeyDown={onEditKeyDown('phone')}
                        placeholder="(512) 244-8550"
                        maxLength={40}
                        autoComplete="off"
                      />
                    </div>
                    {editActions('phone')}
                  </>,
                )
              ) : (
                lockedRow('phone', 'Phone number', values.phone, {
                  editable: canEditContactSettings,
                  lockedNote: 'Members cannot change the site phone number.',
                })
              )}

              {/* Owner email */}
              {editing === 'ownerEmail' ? (
                editingWrapper(
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="owner-email">Owner email</Label>
                      <Input
                        id="owner-email"
                        type="email"
                        autoFocus
                        value={draft.ownerEmail ?? ''}
                        onChange={(e) => setDraftField('ownerEmail', e.target.value)}
                        onKeyDown={onEditKeyDown('ownerEmail')}
                        placeholder="mike@example.com"
                        maxLength={120}
                        autoComplete="off"
                      />
                    </div>
                    {editActions('ownerEmail')}
                  </>,
                )
              ) : (
                lockedRow('ownerEmail', 'Owner email', values.ownerEmail, {
                  editable: canEditContactSettings,
                  lockedNote: 'Members cannot change the owner email.',
                })
              )}

              {/* From email */}
              {editing === 'notifyFromEmail' ? (
                editingWrapper(
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="notify-from-email">From email</Label>
                      <Input
                        id="notify-from-email"
                        type="email"
                        autoFocus
                        value={draft.notifyFromEmail ?? ''}
                        onChange={(e) => setDraftField('notifyFromEmail', e.target.value)}
                        onKeyDown={onEditKeyDown('notifyFromEmail')}
                        placeholder="bookings@yourdomain.com"
                        maxLength={120}
                        autoComplete="off"
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be on a domain you control (not Gmail/Yahoo). Onboard with{' '}
                        <code className="text-[11px]">
                          wrangler email sending enable yourdomain.com
                        </code>{' '}
                        and add SPF/DKIM DNS records first.
                      </p>
                    </div>
                    {editActions('notifyFromEmail')}
                  </>,
                )
              ) : (
                lockedRow('notifyFromEmail', 'From email', values.notifyFromEmail)
              )}

              {/* From name */}
              {editing === 'notifyFromName' ? (
                editingWrapper(
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="notify-from-name">From name</Label>
                      <Input
                        id="notify-from-name"
                        autoFocus
                        value={draft.notifyFromName ?? ''}
                        onChange={(e) => setDraftField('notifyFromName', e.target.value)}
                        onKeyDown={onEditKeyDown('notifyFromName')}
                        placeholder="Mike's Handyman Service"
                        maxLength={80}
                        autoComplete="off"
                      />
                    </div>
                    {editActions('notifyFromName')}
                  </>,
                )
              ) : (
                lockedRow('notifyFromName', 'From name', values.notifyFromName)
              )}

              {/* Platform ratings (edits as one group) */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-primary" />
                    Platform ratings (shown on homepage)
                  </p>
                  {editing !== 'ratings' ? editButton('ratings', 'platform ratings') : null}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Update these whenever your Thumbtack or TaskRabbit counts change. Numbers appear
                  live on the public site within seconds of saving.
                </p>
                {editing === 'ratings' ? (
                  editingWrapper(
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="thumbtack-rating">Thumbtack rating</Label>
                          <Input
                            id="thumbtack-rating"
                            autoFocus
                            value={draft.thumbtackRating ?? ''}
                            onChange={(e) => setDraftField('thumbtackRating', e.target.value)}
                            onKeyDown={onEditKeyDown('ratings')}
                            placeholder="4.9"
                            maxLength={10}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="thumbtack-count">Thumbtack review count</Label>
                          <Input
                            id="thumbtack-count"
                            value={draft.thumbtackReviewCount ?? ''}
                            onChange={(e) => setDraftField('thumbtackReviewCount', e.target.value)}
                            onKeyDown={onEditKeyDown('ratings')}
                            placeholder="110"
                            maxLength={20}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="taskrabbit-rating">TaskRabbit rating</Label>
                          <Input
                            id="taskrabbit-rating"
                            value={draft.taskrabbitRating ?? ''}
                            onChange={(e) => setDraftField('taskrabbitRating', e.target.value)}
                            onKeyDown={onEditKeyDown('ratings')}
                            placeholder="5.0"
                            maxLength={10}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="taskrabbit-count">TaskRabbit review count</Label>
                          <Input
                            id="taskrabbit-count"
                            value={draft.taskrabbitReviewCount ?? ''}
                            onChange={(e) => setDraftField('taskrabbitReviewCount', e.target.value)}
                            onKeyDown={onEditKeyDown('ratings')}
                            placeholder="384"
                            maxLength={20}
                          />
                        </div>
                      </div>
                      {editActions('ratings')}
                    </>,
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-sm font-medium">Thumbtack rating</p>
                      <p className="text-muted-foreground" data-testid="text-thumbtack-rating">
                        {values.thumbtackRating || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Thumbtack review count</p>
                      <p className="text-muted-foreground" data-testid="text-thumbtack-count">
                        {values.thumbtackReviewCount || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">TaskRabbit rating</p>
                      <p className="text-muted-foreground" data-testid="text-taskrabbit-rating">
                        {values.taskrabbitRating || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">TaskRabbit review count</p>
                      <p className="text-muted-foreground" data-testid="text-taskrabbit-count">
                        {values.taskrabbitReviewCount || '—'}
                      </p>
                    </div>
                    {savedSection === 'ratings' && !formError ? (
                      <p className="text-sm text-primary font-medium col-span-2">Saved.</p>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Google Place ID */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-primary" />
                    Google Place ID
                  </p>
                  {editing !== 'googlePlaceId' ? editButton('googlePlaceId', 'Google Place ID') : null}
                </div>
                {editing === 'googlePlaceId' ? (
                  editingWrapper(
                    <>
                      <p className="text-xs text-muted-foreground">
                        Your Google Place ID lets the site automatically pull your Google reviews
                        daily. Find it at{' '}
                        <a
                          href="https://maps.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          maps.google.com
                        </a>{' '}
                        → search your business → right-click the pin → "What's here?" → copy the
                        place ID from the info card, or use the{' '}
                        <a
                          href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Place ID Finder
                        </a>
                        .
                      </p>
                      <Input
                        id="google-place-id"
                        autoFocus
                        value={draft.googlePlaceId ?? ''}
                        onChange={(e) => setDraftField('googlePlaceId', e.target.value)}
                        onKeyDown={onEditKeyDown('googlePlaceId')}
                        placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                        maxLength={300}
                      />
                      <p className="text-xs text-muted-foreground">
                        Requires a <code className="text-[11px]">GOOGLE_PLACES_API_KEY</code>{' '}
                        Cloudflare secret to activate.
                      </p>
                      {editActions('googlePlaceId')}
                    </>,
                  )
                ) : (
                  <>
                    <p className="text-muted-foreground break-all" data-testid="text-googlePlaceId">
                      {values.googlePlaceId || (
                        <span className="italic text-muted-foreground/60">Not set</span>
                      )}
                    </p>
                    {savedSection === 'googlePlaceId' && !formError ? (
                      <p className="text-sm text-primary font-medium">Saved.</p>
                    ) : null}
                  </>
                )}
              </div>

              {/* Google review link */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-primary" />
                    Google review link
                  </p>
                  {editing !== 'googleReviewUrl'
                    ? editButton('googleReviewUrl', 'Google review link')
                    : null}
                </div>
                {editing === 'googleReviewUrl' ? (
                  editingWrapper(
                    <>
                      <p className="text-xs text-muted-foreground">
                        Paste your Google review shortlink here (find it in your Google Business
                        Profile → "Ask for reviews"). When set, a "Leave us a Google review" button
                        appears on the booking confirmation and homepage.
                      </p>
                      <Input
                        id="google-review-url"
                        type="url"
                        autoFocus
                        value={draft.googleReviewUrl ?? ''}
                        onChange={(e) => setDraftField('googleReviewUrl', e.target.value)}
                        onKeyDown={onEditKeyDown('googleReviewUrl')}
                        placeholder="https://g.page/r/..."
                        maxLength={500}
                      />
                      {editActions('googleReviewUrl')}
                    </>,
                  )
                ) : (
                  <>
                    <p
                      className="text-muted-foreground break-all"
                      data-testid="text-googleReviewUrl"
                    >
                      {values.googleReviewUrl || (
                        <span className="italic text-muted-foreground/60">Not set</span>
                      )}
                    </p>
                    {savedSection === 'googleReviewUrl' && !formError ? (
                      <p className="text-sm text-primary font-medium">Saved.</p>
                    ) : null}
                  </>
                )}
              </div>

              {formError && editing === null ? (
                <p className="text-sm text-destructive font-medium">{formError}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
