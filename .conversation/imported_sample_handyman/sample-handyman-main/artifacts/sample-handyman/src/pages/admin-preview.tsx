/**
 * /admin-preview — Same-origin admin mockup for iframe embedding.
 *
 * Served from the main domain so the for-businesses page can iframe it
 * without hitting X-Frame-Options: SAMEORIGIN (which only blocks
 * cross-domain embeds). No auth, no API calls — fictional demo data only.
 */

import { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Image,
  ImagePlus,
  Inbox,
  MapPin,
  Settings,
  Star,
  Upload,
  Wrench,
  MessageSquare,
} from 'lucide-react';

import tvMountingImage    from '@assets/generated_images/tv-mounting.jpg';
import plumbingImage      from '@assets/generated_images/plumbing-repair.jpg';
import furnitureImage     from '@assets/generated_images/furniture-assembly.jpg';
import toolsImage         from '@assets/generated_images/tools-workbench.jpg';
import handsWorkingImage  from '@assets/generated_images/hands-working.jpg';

const logoFullImage = '/logo-full.svg';

// ─── Mock data ────────────────────────────────────────────────────────────────

const REQUESTS = [
  {
    id: '1',
    name: 'Carlos M.',
    service: 'TV Mounting',
    status: 'New',
    time: '2 min ago',
    city: 'Austin, TX',
    address: '1842 Lamar Blvd, Austin, TX 78701',
    phone: '(512) 555-0192',
    note: 'Would like to mount a 65" TV above the fireplace. Cables hidden in wall.',
  },
  {
    id: '2',
    name: 'Jennifer P.',
    service: 'Furniture Assembly',
    status: 'Contacted',
    time: '1 hr ago',
    city: 'Round Rock, TX',
    address: '304 Palm Valley Blvd, Round Rock, TX 78664',
    phone: '(512) 555-0247',
    note: 'Full bedroom set from IKEA — bed frame, dresser, two nightstands.',
  },
  {
    id: '3',
    name: 'David K.',
    service: 'Plumbing Repair',
    status: 'Scheduled',
    time: '3 hr ago',
    city: 'Cedar Park, TX',
    address: '901 Quest Pkwy, Cedar Park, TX 78613',
    phone: '(512) 555-0318',
    note: 'Leaky kitchen faucet and slow bathroom drain.',
  },
  {
    id: '4',
    name: 'Rosa L.',
    service: 'Drywall Patch',
    status: 'Completed',
    time: 'Yesterday',
    city: 'Georgetown, TX',
    address: '3220 Williams Dr, Georgetown, TX 78628',
    phone: '(512) 555-0461',
    note: 'Two small holes from old TV bracket.',
  },
];

const STATUS_STYLES: Record<string, string> = {
  New:       'bg-blue-100 text-blue-700',
  Contacted: 'bg-amber-100 text-amber-700',
  Scheduled: 'bg-emerald-100 text-emerald-700',
  Completed: 'bg-gray-100 text-gray-600',
};

const GALLERY_PHOTOS = [
  { src: tvMountingImage,   label: 'TV Mounting' },
  { src: plumbingImage,     label: 'Plumbing Repair' },
  { src: furnitureImage,    label: 'Furniture Assembly' },
  { src: toolsImage,        label: 'Tools Workbench' },
  { src: handsWorkingImage, label: 'Cabinet Work' },
  { src: tvMountingImage,   label: 'Shelving Install' },
];

const REVIEWS = [
  {
    name: 'Sarah M.',
    rating: 5,
    text: 'Mike mounted our 65" TV and ran all the cables through the wall. Flawless work.',
    date: 'Aug 12, 2026',
    city: 'Austin, TX',
  },
  {
    name: 'Marcus J.',
    rating: 5,
    text: 'Fixed a leaky faucet and installed two ceiling fans. Done in under two hours.',
    date: 'Aug 8, 2026',
    city: 'Round Rock, TX',
  },
  {
    name: 'Jennifer P.',
    rating: 5,
    text: "Assembled an entire office's worth of furniture. Professional and efficient.",
    date: 'Aug 3, 2026',
    city: 'Cedar Park, TX',
  },
];

const BRAND_COLORS = ['#16a34a', '#2563eb', '#dc2626', '#9333ea', '#ea580c'];

type Tab = 'requests' | 'gallery' | 'reviews' | 'settings';

// ─── Sub-panels ───────────────────────────────────────────────────────────────

function RequestsPanel() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>(
    Object.fromEntries(REQUESTS.map((r) => [r.id, r.status]))
  );

  const cycleStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const order = ['New', 'Contacted', 'Scheduled', 'Completed'];
    const cur = statuses[id] ?? 'New';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    setStatuses((prev) => ({ ...prev, [id]: next }));
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-sm text-foreground">Service Requests</h2>
        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
          1 new
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {REQUESTS.map((r) => {
          const isOpen = expanded === r.id;
          const status = statuses[r.id] ?? r.status;
          return (
            <div
              key={r.id}
              className="border border-border rounded-xl overflow-hidden bg-card cursor-pointer select-none"
              onClick={() => setExpanded(isOpen ? null : r.id)}
            >
              <div className="flex items-center justify-between gap-2 p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-xs">
                    {r.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-xs truncate">{r.name}</p>
                    <p className="text-muted-foreground text-[10px]">{r.service} · {r.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full cursor-pointer ${STATUS_STYLES[status]}`}
                    onClick={(e) => cycleStatus(r.id, e)}
                    title="Click to advance status"
                  >
                    {status}
                  </span>
                  <span className="text-muted-foreground text-[9px] hidden sm:block">{r.time}</span>
                  {isOpen
                    ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  }
                </div>
              </div>
              {isOpen && (
                <div className="border-t border-border bg-muted/30 px-3 py-2.5 text-[10px] space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground">{r.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground font-medium">Phone:</span>
                    <span className="text-foreground">{r.phone}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-muted-foreground font-medium shrink-0">Note:</span>
                    <span className="text-foreground">{r.note}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      className="bg-primary text-primary-foreground text-[9px] font-bold px-2 py-1 rounded-md"
                      onClick={(e) => { e.stopPropagation(); cycleStatus(r.id, e); }}
                    >
                      Mark as {['New','Contacted','Scheduled','Completed'][((['New','Contacted','Scheduled','Completed'].indexOf(status) + 1) % 4)]}
                    </button>
                    <button className="border border-border text-[9px] font-semibold px-2 py-1 rounded-md text-foreground">
                      View Maps
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GalleryPanel() {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-sm text-foreground">Photo Gallery</h2>
        <button className="flex items-center gap-1 text-[10px] font-bold bg-primary text-primary-foreground px-2.5 py-1.5 rounded-lg">
          <Upload className="w-3 h-3" />
          Upload
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {GALLERY_PHOTOS.map((photo) => (
          <div key={photo.label} className="aspect-square rounded-lg overflow-hidden bg-muted relative group cursor-pointer">
            <img src={photo.src} alt={photo.label} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-4 pb-1 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-[9px] font-medium truncate">{photo.label}</p>
            </div>
          </div>
        ))}
        <div className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition-colors">
          <ImagePlus className="w-4 h-4" />
          <span className="text-[9px] font-medium">Add photo</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-3">
        6 photos · Drag photos here or click Upload
      </p>
    </div>
  );
}

function ReviewsPanel() {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-sm text-foreground">Customer Reviews</h2>
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-bold text-xs text-foreground">4.9</span>
          <span className="text-[10px] text-muted-foreground">({REVIEWS.length} shown)</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {REVIEWS.map((r) => (
          <div key={r.name} className="border border-border rounded-xl p-3 bg-card">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                  {r.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-[11px]">{r.name}</p>
                  <p className="text-muted-foreground text-[9px]">{r.city}</p>
                </div>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">"{r.text}"</p>
            <p className="text-[9px] text-muted-foreground/70 mt-1">{r.date}</p>
          </div>
        ))}
        <button className="w-full border border-dashed border-border rounded-xl py-2.5 text-[10px] font-semibold text-muted-foreground hover:text-primary hover:border-primary transition-colors">
          + Invite customer to leave a review
        </button>
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [selectedColor, setSelectedColor] = useState(BRAND_COLORS[0]);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4">
      <h2 className="font-bold text-sm text-foreground mb-4">Site Settings</h2>
      <div className="flex flex-col gap-3">
        {[
          { label: 'Business Name', value: "Mike's Handyman Service" },
          { label: 'Phone Number',  value: '(512) 244-8550' },
          { label: 'Service Area',  value: 'Greater Austin Area, TX' },
          { label: 'Email',         value: 'mike@mikeshandyman.com' },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{label}</p>
            <div className="border border-border rounded-lg px-2.5 py-1.5 bg-muted/20 text-foreground text-[11px]">
              {value}
            </div>
          </div>
        ))}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Brand Color</p>
          <div className="flex items-center gap-2">
            {BRAND_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`w-6 h-6 rounded-full transition-all ${c === selectedColor ? 'ring-2 ring-offset-1 ring-foreground scale-110' : 'hover:scale-110'}`}
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">
            Selected: {selectedColor} · Applied across your entire website
          </p>
        </div>
        <button
          onClick={save}
          className={`mt-1 w-full text-[11px] font-bold rounded-lg py-2 transition-colors ${
            saved
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {saved ? '✓ Saved!' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Tab; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'requests', label: 'Service Requests', icon: Inbox, badge: '1' },
  { id: 'gallery',  label: 'Gallery',          icon: Image },
  { id: 'reviews',  label: 'Reviews',          icon: Star },
  { id: 'settings', label: 'Site Settings',    icon: Settings },
];

export default function AdminPreviewPage() {
  const [tab, setTab] = useState<Tab>('requests');

  return (
    <div className="min-h-screen bg-background flex text-sm overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-48 shrink-0 bg-muted/50 border-r border-border flex flex-col py-4 gap-0.5">
        {/* Brand */}
        <div className="px-4 mb-4 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground text-xs leading-tight truncate">Mike's Admin</p>
            <p className="text-[9px] text-muted-foreground truncate">sample-handyman</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2">
          {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                tab === id
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1">{label}</span>
              {badge && tab !== id && (
                <span className="bg-blue-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom spacer with view site link */}
        <div className="mt-auto px-4 pt-4 border-t border-border">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
          >
            <CheckCircle2 className="w-3 h-3" />
            View your site
          </a>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto">
        {tab === 'requests' && <RequestsPanel />}
        {tab === 'gallery'  && <GalleryPanel />}
        {tab === 'reviews'  && <ReviewsPanel />}
        {tab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
}
