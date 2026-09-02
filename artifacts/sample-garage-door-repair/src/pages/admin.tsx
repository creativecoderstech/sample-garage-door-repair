import { useEffect, useState } from 'react';
import { 
  useGetGarageDashboard, 
  useListServiceRequests, 
  useUpdateServiceRequest, 
  useGetGoogleReviewFeed,
  getGetGarageDashboardQueryKey, 
  getListServiceRequestsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
import { 
  LogOut, AlertTriangle, CheckCircle2, Clock, Calendar, 
  Search, User, Trash2, Plus, Edit2, Check,
  LayoutGrid, Inbox, CalendarDays, MessageCircle, 
  Wrench, Image as ImageIcon, SplitSquareHorizontal, 
  HelpCircle, Star, Settings, Users, ChevronRight, 
  ExternalLink, Sparkles, Building2, Menu, X, MapPin, Mail, Phone
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ServiceRequestUpdateStatus } from "@workspace/api-client-react";

import AdminSettingsPage from './admin-settings';
import { 
  useListFaqs, useSaveFaq, useDeleteFaq, 
  useListTasks, useSaveTask, useDeleteTask, 
  useListBookings, useListChatInquiries,
  type FAQ, type Task,
} from '@/lib/demo-store';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TIME_WINDOW_LABELS: Record<string, string> = {
  morning: 'Morning (8am - 12pm)',
  afternoon: 'Afternoon (12pm - 4pm)',
  evening: 'Evening (4pm - 8pm)',
};

type AdminTab =
  | 'overview'
  | 'service-requests'
  | 'bookings'
  | 'chats'
  | 'tasks'
  | 'gallery'
  | 'faqs'
  | 'services'
  | 'reviews'
  | 'settings'
  | 'users';

const ADMIN_PAGE_COPY: Record<AdminTab, { title: string; description: string }> = {
  overview: { title: 'Welcome back', description: 'Your business at a glance.' },
  'service-requests': { title: 'Service requests', description: 'Review new leads, confirm job details, and keep every request moving.' },
  bookings: { title: 'Bookings', description: 'See confirmed appointments and the work coming up next.' },
  chats: { title: 'Chat inquiries', description: 'Review conversations started with Maya and your customer-care team.' },
  tasks: { title: 'Before & after', description: 'Manage the project transformations shown on your website.' },
  gallery: { title: 'Gallery', description: 'Curate the garage-door project photography customers see online.' },
  faqs: { title: 'FAQs', description: 'Keep customer answers accurate, useful, and safety focused.' },
  services: { title: 'Services', description: 'Maintain your service catalog, starting prices, and publishing status.' },
  reviews: { title: 'Reviews', description: 'Manage Google review previews and testimonials collected on your site.' },
  settings: { title: 'Site settings', description: 'Configure your storefront, photography, and operational preferences.' },
  users: { title: 'Users', description: 'Manage staff access and operating roles.' },
};

const adminCardClass = 'rounded-2xl border-2 border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900';

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>(() => {
    const requestedTab = window.location.hash.slice(1) as AdminTab;
    const availableTabs: AdminTab[] = ['overview', 'service-requests', 'bookings', 'chats', 'tasks', 'gallery', 'faqs', 'services', 'reviews', 'settings', 'users'];
    return availableTabs.includes(requestedTab) ? requestedTab : 'overview';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: dashboard } = useGetGarageDashboard();
  const pendingCount = dashboard?.newRequests ?? 0;
  const [, setLocation] = useLocation();

  const navGroups = [
    {
      title: 'Today',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutGrid },
        { id: 'service-requests', label: 'Service requests', icon: Inbox, badge: pendingCount },
        { id: 'bookings', label: 'Bookings', icon: CalendarDays },
        { id: 'chats', label: 'Chat inquiries', icon: MessageCircle },
      ]
    },
    {
      title: 'Website',
      items: [
        { id: 'services', label: 'Services', icon: Wrench },
        { id: 'gallery', label: 'Gallery', icon: ImageIcon },
        { id: 'tasks', label: 'Before & after', icon: SplitSquareHorizontal },
        { id: 'faqs', label: 'FAQs', icon: HelpCircle },
        { id: 'reviews', label: 'Reviews', icon: Star },
      ]
    },
    {
      title: 'Manage',
      items: [
        { id: 'settings', label: 'Site settings', icon: Settings },
        { id: 'users', label: 'Users', icon: Users },
      ]
    }
  ] as const;

  const handleSignOut = () => {
    setLocation('/login');
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-full shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-widest uppercase leading-none text-slate-900 dark:text-white">Summit</div>
            <div className="text-[10px] text-primary uppercase font-bold tracking-widest mt-1">Garage Door Co.</div>
          </div>
        </div>
      </div>

      <div className="px-4 mb-6">
        <div className="bg-orange-50/70 dark:bg-orange-950/20 rounded-2xl p-4 border-2 border-orange-100 dark:border-orange-900/40">
          <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-wider">Owner Workspace</div>
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">Admin User</div>
          <div className="text-xs text-slate-500 truncate mt-0.5">admin@summitgaragedoor.demo</div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 pb-6">
        {navGroups.map((group, idx) => (
          <div key={group.title} className={idx > 0 ? "mt-6" : ""}>
            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">
              {group.title}
            </h3>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isActive = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTab(item.id as AdminTab);
                      window.history.replaceState(null, '', `#${item.id}`);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 ${isActive ? 'text-primary-foreground' : 'text-slate-400'}`} />
                      {item.label}
                    </div>
                    {'badge' in item && item.badge ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-primary text-white' : 'bg-primary text-white'
                      }`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            Sign out
          </button>
        </div>
      </ScrollArea>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] dark:bg-slate-950 flex flex-col md:flex-row w-full font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-2">
           <div className="bg-primary text-primary-foreground p-1.5 rounded-full">
             <Building2 className="w-4 h-4" />
           </div>
           <span className="font-bold text-sm uppercase tracking-widest text-slate-900 dark:text-white">Summit</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
        </Button>
      </div>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-[260px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-[100dvh] sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar (Mobile Overlay) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <aside 
            className="w-64 bg-white dark:bg-slate-900 h-full border-r border-slate-200 dark:border-slate-800 shadow-xl flex flex-col" 
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden p-4 sm:p-7 lg:p-10">
        <div className="max-w-6xl">
          <AdminPageHeader title={ADMIN_PAGE_COPY[tab].title} description={ADMIN_PAGE_COPY[tab].description} />
        {tab === 'overview' ? <OverviewTab setTab={setTab} pendingCount={pendingCount} dashboard={dashboard} /> :
         tab === 'settings' ? <AdminSettingsPage /> :
         tab === 'service-requests' ? <ServiceRequestsAdmin /> :
         tab === 'faqs' ? <FaqsAdmin /> :
         tab === 'tasks' ? <TasksAdmin /> :
         tab === 'bookings' ? <BookingsAdmin setTab={setTab} /> :
         tab === 'chats' ? <ChatsAdmin /> :
         tab === 'gallery' ? <GalleryAdmin /> :
         tab === 'services' ? <ServicesAdmin /> :
         tab === 'reviews' ? <ReviewsAdmin /> :
         <UsersAdmin />
        }
        </div>
      </main>
    </div>
  )
}

function AdminPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Summit Garage Door Co.</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-500">admin@summitgaragedoor.demo</span>
        <Button variant="outline" className="h-10 rounded-xl border-2 bg-white font-semibold shadow-sm dark:bg-slate-900" asChild>
          <Link href="/"><ExternalLink className="mr-2 h-4 w-4" /> View site</Link>
        </Button>
      </div>
    </header>
  );
}

function OverviewTab({ setTab, pendingCount, dashboard }: any) {
  const { data: bookings } = useListBookings();
  const { data: chats } = useListChatInquiries();
  
  const upcomingBookings = bookings?.length || 0;
  const recentChats = chats?.length || 0;

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        eyebrow="Today at Summit"
        title="Business pulse"
        description="Start with the newest customer requests, then check the schedule. Everything else is one click away."
        count={`${pendingCount} open request${pendingCount === 1 ? "" : "s"}`}
      />
      {/* Hero Banner */}
      <div className="bg-[#1e293b] rounded-2xl p-8 sm:p-10 text-white relative overflow-hidden mb-8 shadow-sm">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-white/90 mb-6 backdrop-blur-md uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Today at Summit
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">Keep the good work moving.</h2>
          <p className="text-slate-300 max-w-lg mb-8 text-sm sm:text-base leading-relaxed">
            Start with the newest customer requests, then check your schedule. Everything else is one click away.
          </p>
          <Button 
            onClick={() => setTab('service-requests')} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg px-6 py-6 h-auto shadow-sm border-none transition-transform hover:translate-y-[-1px]"
          >
            Open request queue <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        {/* Decorative background shapes */}
        <div className="absolute top-[-15%] right-[-10%] w-[350px] h-[350px] rounded-full border-[30px] border-white/5 pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[10%] w-[200px] h-[200px] rounded-full border-[20px] border-primary/20 pointer-events-none" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <OverviewCard 
          icon={<Inbox className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950"
          title="Open requests"
          value={pendingCount.toString()}
          description="Need your attention"
          onClick={() => setTab('service-requests')}
        />
        <OverviewCard 
          icon={<CalendarDays className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
          iconBg="bg-slate-100 dark:bg-slate-800"
          title="Upcoming bookings"
          value={upcomingBookings.toString()}
          description="Jobs on the schedule"
          onClick={() => setTab('bookings')}
        />
        <OverviewCard 
          icon={<MessageCircle className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
          iconBg="bg-slate-100 dark:bg-slate-800"
          title="Recent conversations"
          value={recentChats.toString()}
          description="From the last 7 days"
          onClick={() => setTab('chats')}
        />
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Needs a response list */}
        <ListCard 
          icon={<Inbox className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />}
          title="Needs a response"
          description="Newest open requests, ready for a call or confirmation."
          linkText="View all >"
          onLinkClick={() => setTab('service-requests')}
        >
          {dashboard?.requests && dashboard.requests.length > 0 ? dashboard.requests.slice(0, 3).map((req: any) => (
             <div key={req.id} className="p-4 border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => setTab('service-requests')}>
               <div>
                 <div className="font-semibold text-sm text-slate-900 dark:text-white mb-0.5">{req.customerName}</div>
                 <div className="text-xs text-slate-500">{req.service} &bull; <span className="capitalize">{req.urgency}</span></div>
               </div>
               <div className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</div>
             </div>
          )) : <div className="p-8 text-center text-sm text-slate-500">No pending requests.</div>}
        </ListCard>

        {/* Coming up list */}
        <ListCard 
          icon={<CalendarDays className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
          title="Coming up"
          description="Your next confirmed jobs."
          linkText="Schedule >"
          onLinkClick={() => setTab('bookings')}
        >
          {bookings && bookings.length > 0 ? bookings.slice(0, 3).map((b: any) => (
             <div key={b.id} className="p-4 border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => setTab('bookings')}>
               <div>
                 <div className="font-semibold text-sm text-slate-900 dark:text-white mb-0.5">{b.title}</div>
                 <div className="text-xs text-slate-500">{b.customer}</div>
               </div>
               <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{b.date}</div>
             </div>
          )) : <div className="p-8 text-center text-sm text-slate-500">No upcoming bookings.</div>}
        </ListCard>
      </div>
    </div>
  )
}

function OverviewCard({ icon, iconBg, title, value, description, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`${adminCardClass} p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between min-h-[150px]`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 dark:text-slate-700 dark:group-hover:text-slate-400 transition-colors" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-0.5">{title}</h3>
        <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-none mb-1.5">{value}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  )
}

function ListCard({ icon, title, description, linkText, onLinkClick, children }: any) {
  return (
    <div className={`${adminCardClass} overflow-hidden flex flex-col`}>
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-bold text-[15px] text-slate-900 dark:text-white">{title}</h3>
          </div>
          <button onClick={onLinkClick} className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            {linkText}
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="flex-1 bg-white dark:bg-slate-900">
        {children}
      </div>
    </div>
  )
}

// === Sub-components (shared Sample Handyman-style detail language) ===

function AdminSectionHeader({
  eyebrow = "Manage this area",
  title,
  description,
  count,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  count?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h2>
          {count ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{count}</span> : null}
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

function AdminStatStrip({ stats }: { stats: { label: string; value: string | number; detail: string; tone?: "default" | "success" | "warning" }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className={`${adminCardClass} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{stat.label}</p>
            <span className={`h-2 w-2 rounded-full ${stat.tone === "success" ? "bg-emerald-500" : stat.tone === "warning" ? "bg-amber-500" : "bg-primary"}`} />
          </div>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${stat.tone === "warning" ? "text-amber-700 dark:text-amber-300" : "text-slate-950 dark:text-white"}`}>{stat.value}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.detail}</p>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone = normalized.includes("published") || normalized.includes("approved") || normalized.includes("active") || normalized.includes("replied")
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900"
    : normalized.includes("pending") || normalized.includes("new") || normalized.includes("draft")
      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900"
      : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tone}`}>{value}</span>;
}

function ChatsAdmin() {
  return (
    <ContentModuleAdmin
      storageKey="garage-admin-chats"
      title="Chat inquiries"
      eyebrow="Customer care"
      description="Review conversations started with Maya, keep follow-ups visible, and give every lead a clear next step."
      fields={["Customer", "Phone", "Latest message", "Started", "Status"]}
      defaults={[
        ["Taylor Morgan", "(214) 555-0178", "The door is stuck halfway and I need help before tonight.", "Today, 9:42 AM", "New"],
        ["Jordan Lee", "(972) 555-0134", "Thanks for the estimate. Can someone confirm the opener model?", "Yesterday, 4:18 PM", "Replied"],
      ]}
      addLabel="Add inquiry"
    />
  );
}

function GalleryAdmin() {
  return (
    <ContentModuleAdmin
      storageKey="garage-admin-gallery-v2"
      title="Gallery"
      eyebrow="Website content"
      description="Curate the garage-door project photography customers see online, with accessible labels and homepage ordering."
      fields={["Project", "Image URL", "Alt text", "Sort order", "Status"]}
      defaults={[
        ["Modern insulated door", "/images/garage/modern-white-home.jpg", "White insulated garage door installation", "1", "Published"],
        ["Classic residential door", "/images/garage/classic-white-door.jpg", "Classic residential garage door", "2", "Published"],
      ]}
      addLabel="Add photo"
      imageField="Image URL"
    />
  );
}

function ServicesAdmin() {
  return (
    <ContentModuleAdmin
      storageKey="garage-admin-services"
      title="Services"
      eyebrow="Website content"
      description="Maintain the service catalog, customer-facing benefits, starting prices, and publishing status shown on the homepage."
      fields={["Service", "Benefit", "Description", "Starting price", "Status"]}
      defaults={[
        ["Broken spring replacement", "Get the door balanced and moving safely again.", "Torsion and extension spring diagnosis and replacement by a trained technician.", "$249", "Published"],
        ["Garage door opener repair", "Quiet, reliable access without the guesswork.", "Troubleshoot motors, remotes, sensors, travel limits, and worn opener parts.", "$179", "Published"],
        ["New door installation", "A better-looking, better-insulated entry.", "Measure, recommend, and install a residential garage door that fits the home.", "$1,299", "Published"],
      ]}
      addLabel="Add service"
    />
  );
}

function ReviewsAdmin() {
  const { data: feed, isLoading } = useGetGoogleReviewFeed();
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Reputation"
        title="Reviews"
        description="Keep Google previews and customer-submitted testimonials trustworthy, current, and ready for the public site."
        count={feed?.connectionStatus === "connected" ? "Google connected" : "Demo review feed"}
      />
      <AdminStatStrip stats={[
        { label: "Google status", value: feed?.connectionStatus === "connected" ? "Live" : "Demo", detail: feed?.locationName || "Previewing local business profile", tone: feed?.connectionStatus === "connected" ? "success" : "default" },
        { label: "Average rating", value: "5.0", detail: "From the current review preview", tone: "success" },
        { label: "Public proof", value: "Ready", detail: "Manual testimonials remain available", tone: "success" },
        { label: "Next step", value: "Moderate", detail: "Review pending submissions below" },
      ]} />
      {/* Google Business Profile Connection Panel */}
      <div className={`${adminCardClass} overflow-hidden`}>
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
               <SiGoogle className="w-6 h-6 text-slate-700 dark:text-slate-300" />
             </div>
             <div>
               <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                 Google Business Profile
                 {isLoading ? (
                   <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Checking...</span>
                 ) : feed?.connectionStatus === 'connected' ? (
                   <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Connected</span>
                 ) : feed?.mode === 'demo' ? (
                   <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Demo Mode</span>
                 ) : (
                   <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Disconnected</span>
                 )}
               </h3>
               <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Sync public reviews directly to your website.</p>
             </div>
          </div>
          <div>
             <Button variant="outline" className="shadow-sm font-medium bg-white dark:bg-slate-900" onClick={() => setShowConnectDialog(true)}>
                Manage Connection
             </Button>
          </div>
        </div>

        {/* Connection Details */}
        {!isLoading && feed && (
          <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {feed.connectionStatus === 'connected' ? 'Actively syncing' :
                 feed.mode === 'demo' ? 'Previewing demo content' : 'Not connected'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Location</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {feed.locationName || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Last Synced</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {feed.lastSyncedAt ? format(new Date(feed.lastSyncedAt), 'MMM d, yyyy h:mm a') : 'Never'}
              </p>
            </div>
          </div>
        )}
      </div>

      {showConnectDialog && (
         <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowConnectDialog(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
               <div className="p-6">
                 <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5 border border-slate-200 dark:border-slate-700">
                   <SiGoogle className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                 </div>
                 <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Google Authorization Required</h2>
                 <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                   Secure OAuth setup is required to connect your Google Business Profile. For your security, this feature requires a registered domain and verified API credentials.
                 </p>
                 <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 mb-6">
                   <p className="text-sm text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                      Google Business Profile OAuth must be enabled for the live domain before this workspace can connect the owner's account.
                   </p>
                 </div>
                 <div className="flex justify-end">
                   <Button onClick={() => setShowConnectDialog(false)}>Understood</Button>
                 </div>
               </div>
            </div>
         </div>
      )}

      <ContentModuleAdmin
        storageKey="garage-admin-reviews"
        title="Manual Reviews"
        eyebrow="Customer proof"
        description="Moderate customer reviews captured directly on your site before they appear publicly. These remain available when Google is disconnected."
        fields={['Customer', 'Rating', 'Review quote', 'Source', 'Status']}
        defaults={[
          ['Elena Rodriguez', '5 stars', 'Fast, careful, and honest about the repair options. The door is quieter than it has ever been.', 'Website form', 'Approved'],
          ['Marcus Bennett', '5 stars', 'They arrived when promised, explained the spring issue, and got us back on the road.', 'Website form', 'Approved'],
          ['Priya Shah', '5 stars', 'Great communication so far. Waiting for the installation date to be confirmed.', 'Website form', 'Pending'],
        ]}
        addLabel="Add review"
      />
    </div>
  )
}

function UsersAdmin() {
  return (
    <ContentModuleAdmin
      storageKey="garage-admin-users"
      title="Users"
      eyebrow="Workspace access"
      description="Keep staff access easy to review. Roles below are demo controls for the Summit workspace and do not replace production authentication."
      fields={["Team member", "Role", "Access scope", "Last active", "Status"]}
      defaults={[
        ["admin@summitgaragedoor.demo", "Super Admin", "Everything", "Today, 10:12 AM", "Active"],
        ["dispatch@summitgaragedoor.demo", "Dispatcher", "Requests + bookings", "Yesterday, 4:42 PM", "Active"],
      ]}
      addLabel="Invite user"
    />
  );
}


type ContentRow = {
  id: string;
  values: string[];
};

function AdminImagePreview({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 text-center text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-950">
        Image unavailable
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-16 w-24 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover dark:border-slate-700 dark:bg-slate-800"
      onError={() => setHasError(true)}
    />
  );
}

function DeleteConfirmationDialog({
  open,
  itemLabel,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  itemLabel: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove “{itemLabel}” from this browser’s demo state. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ContentModuleAdmin({
  storageKey,
  title,
  description,
  fields,
  defaults,
  eyebrow,
  addLabel = "Add new",
  imageField,
}: {
  storageKey: string;
  title: string;
  description: string;
  fields: string[];
  defaults: string[][];
  eyebrow?: string;
  addLabel?: string;
  imageField?: string;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ContentRow[]>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (stored) {
      const parsed = JSON.parse(stored) as ContentRow[];
      return parsed.map((row) => normalizeContentRow(storageKey, row, fields));
    }
    return defaults.map((values, index) => ({ id: `${storageKey}-${index}`, values }));
  });
  const [draft, setDraft] = useState<string[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentRow | null>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(rows));
  }, [rows, storageKey]);

  const addRow = () => {
    if (!draft || draft.some((value) => !value.trim())) return;
    setRows((current) => editingId
      ? current.map((row) => row.id === editingId ? { ...row, values: draft } : row)
      : [...current, { id: `${storageKey}-${Date.now()}`, values: draft }]);
    setDraft(null);
    setEditingId(null);
    toast({ title: editingId ? `${title} updated` : `${title} item added` });
  };

  const startEdit = (row: ContentRow) => {
    setEditingId(row.id);
    setDraft([...row.values, ...Array(Math.max(0, fields.length - row.values.length)).fill("")].slice(0, fields.length));
  };

  const cancelDraft = () => {
    setDraft(null);
    setEditingId(null);
  };

  const statusValues = rows.map((row) => row.values[row.values.length - 1] || "").filter(Boolean);
  const publishedCount = statusValues.filter((value) => /published|approved|active|replied/i.test(value)).length;
  const hasImages = Boolean(imageField);
  const imageIndex = imageField ? fields.indexOf(imageField) : -1;

  return (
    <section className="space-y-6">
      <AdminSectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        count={`${rows.length} ${rows.length === 1 ? "item" : "items"}`}
        action={<Button onClick={() => { setEditingId(null); setDraft(fields.map(() => "")); }} className="h-10 rounded-xl font-bold shadow-sm"><Plus className="mr-2 h-4 w-4" /> {addLabel}</Button>}
      />

      <AdminStatStrip stats={[
        { label: "Total records", value: rows.length, detail: "Stored in this browser's demo state" },
        { label: "Active / visible", value: publishedCount, detail: "Ready for the customer experience", tone: "success" },
        { label: "Needs attention", value: Math.max(rows.length - publishedCount, 0), detail: "Draft, pending, or inactive records", tone: rows.length - publishedCount > 0 ? "warning" : "default" },
        { label: "Action", value: addLabel, detail: "Use the button above to keep this area current" },
      ]} />

      {draft && (
        <div className={`${adminCardClass} overflow-hidden border-primary/30`}>
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{editingId ? "Edit record" : "New record"}</p>
            <h3 className="mt-1 font-display text-lg font-bold text-slate-950 dark:text-white">{editingId ? `Update ${title.toLowerCase()} details` : `Add to ${title.toLowerCase()}`}</h3>
            <p className="mt-1 text-sm text-slate-500">Complete each field so the customer-facing content stays clear and useful.</p>
          </div>
          <div className="p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field, index) => (
              <div key={field} className={field.toLowerCase().includes("description") || field.toLowerCase().includes("message") || field.toLowerCase().includes("quote") ? "md:col-span-2" : ""}>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{field}</label>
                {field.toLowerCase().includes("description") || field.toLowerCase().includes("message") || field.toLowerCase().includes("quote") ? (
                  <Textarea
                    placeholder={field}
                    value={draft[index] || ""}
                    rows={3}
                    onChange={(event) => setDraft((current) => current?.map((value, i) => i === index ? event.target.value : value) ?? null)}
                    className="bg-white dark:bg-slate-900"
                  />
                ) : (
                  <Input
                    placeholder={field}
                    value={draft[index] || ""}
                    onChange={(event) => setDraft((current) => current?.map((value, i) => i === index ? event.target.value : value) ?? null)}
                    className="bg-white dark:bg-slate-900"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={cancelDraft}>Cancel</Button>
            <Button onClick={addRow}><Check className="mr-2 h-4 w-4" /> {editingId ? "Save changes" : "Save record"}</Button>
          </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {rows.map((row) => (
          <article key={row.id} className={`${adminCardClass} overflow-hidden transition-shadow hover:shadow-lg`}>
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800">
              <div className="flex min-w-0 gap-4">
                {hasImages && row.values[imageIndex] ? <AdminImagePreview src={row.values[imageIndex]} alt={`${row.values[0] || title} preview`} /> : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-primary dark:bg-orange-950/30"><Wrench className="h-6 w-6" /></div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-display text-lg font-bold text-slate-950 dark:text-white">{row.values[0] || "Untitled item"}</h3>
                    {row.values[row.values.length - 1] ? <StatusBadge value={row.values[row.values.length - 1]} /> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{title} record · Browser demo state</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-9 gap-1.5 rounded-lg" onClick={() => startEdit(row)}><Edit2 className="h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="outline" className="h-9 gap-1.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeleteTarget(row)}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              </div>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-2 lg:grid-cols-4">
              {row.values.map((value, index) => {
                const field = fields[index] || `Detail ${index + 1}`;
                if (index === 0 || index === imageIndex) return null;
                return (
                  <div key={`${row.id}-${field}`} className={field.toLowerCase().includes("description") || field.toLowerCase().includes("message") || field.toLowerCase().includes("quote") ? "md:col-span-2 lg:col-span-2" : ""}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{field}</p>
                    <p className={`mt-1 text-sm ${field.toLowerCase().includes("description") || field.toLowerCase().includes("message") || field.toLowerCase().includes("quote") ? "leading-6 text-slate-600 dark:text-slate-300" : "font-semibold text-slate-900 dark:text-white"} break-words`}>{value || "—"}</p>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
        {rows.length === 0 && <EmptyState title={`No ${title.toLowerCase()} yet`} description="Add your first item to get started." />}
      </div>
      <DeleteConfirmationDialog
        open={Boolean(deleteTarget)}
        itemLabel={deleteTarget?.values[0] || title}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          setRows((current) => current.filter((item) => item.id !== deleteTarget.id));
          setDeleteTarget(null);
          toast({ title: `${title} item deleted` });
        }}
      />
    </section>
  );
}

function normalizeContentRow(storageKey: string, row: ContentRow, fields: string[]): ContentRow {
  if (row.values.length >= fields.length) return row;
  const values = [...row.values];
  if (storageKey === "garage-admin-services" && values.length === 3) {
    return { ...row, values: [values[0], "Professional garage door service.", "Clear, careful work from diagnosis through completion.", values[1], values[2]] };
  }
  if (storageKey === "garage-admin-gallery-v2" && values.length === 3) {
    return { ...row, values: [values[0], values[1], `${values[0]} project photo`, "1", values[2]] };
  }
  if (storageKey === "garage-admin-reviews" && values.length === 3) {
    return { ...row, values: [values[0], values[1], "A customer review awaiting a longer quote.", "Website form", values[2]] };
  }
  if (storageKey === "garage-admin-users" && values.length === 3) {
    return { ...row, values: [values[0], values[1], "Workspace access", "Recently", values[2]] };
  }
  if (storageKey === "garage-admin-chats" && values.length === 3) {
    return { ...row, values: [values[0], values[1], "Conversation imported from the customer-care inbox.", "Recently", values[2]] };
  }
  return { ...row, values: [...values, ...Array(fields.length - values.length).fill("—")] };
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className={`${adminCardClass} border-dashed px-6 py-14 text-center`}>
      <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ServiceRequestsAdmin() {
  const { data: dashboard, isLoading } = useGetGarageDashboard();
  const { data: allRequests } = useListServiceRequests();
  const updateRequest = useUpdateServiceRequest();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  const requests = allRequests || dashboard?.requests || [];
  
  const filteredRequests = requests.filter(req => 
    req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.streetAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.zip.includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
      case 'scheduled': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300';
      case 'dispatched': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300';
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
      case 'soon': return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      case 'flexible': return <Calendar className="h-3.5 w-3.5 text-blue-500" />;
      default: return null;
    }
  };

  const handleStatusChange = (id: number, newStatus: ServiceRequestUpdateStatus) => {
    updateRequest.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGarageDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <AdminSectionHeader
        eyebrow="Today · Lead pipeline"
        title="Service requests"
        description="Review new leads, confirm job details, and keep every request moving toward a safe, scheduled visit."
        count={`${filteredRequests.length} visible`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${adminCardClass} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-500">New Requests</h4>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{dashboard?.newRequests || 0}</p>
        </div>
        <div className={`${adminCardClass} p-5 ${dashboard?.emergencyCalls ? '!border-red-200 !bg-red-50/30' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-sm font-medium ${dashboard?.emergencyCalls ? 'text-red-600 font-bold' : 'text-slate-500'}`}>Emergencies</h4>
            <AlertTriangle className={`h-4 w-4 ${dashboard?.emergencyCalls ? 'text-red-500' : 'text-slate-400'}`} />
          </div>
          <p className={`text-3xl font-bold tracking-tight ${dashboard?.emergencyCalls ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>{dashboard?.emergencyCalls || 0}</p>
        </div>
        <div className={`${adminCardClass} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-500">Scheduled</h4>
            <Calendar className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{dashboard?.scheduledToday || 0}</p>
        </div>
        <div className={`${adminCardClass} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-500">Pipeline Rev</h4>
            <Clock className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">${dashboard?.estimatedRevenue?.toLocaleString() || 0}</p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Active Service Requests</h3>
            <p className="mt-1 text-sm text-slate-500">Each card includes the contact, location, schedule, and dispatch status.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search customers..."
              className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
          {filteredRequests.length === 0 ? (
            <EmptyState title="No requests found" description="Try a different search or wait for a new customer request." />
          ) : (
            <div className="grid gap-5">
              {filteredRequests.map((req) => (
                <article key={req.id} className={`${adminCardClass} overflow-hidden`}>
                  <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6 dark:border-slate-800">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-950 dark:text-white">{req.customerName}</h3>
                        <Badge variant="outline" className="gap-1 capitalize">{getUrgencyIcon(req.urgency)}{req.urgency}</Badge>
                        <Badge variant="outline" className={`capitalize ${getStatusColor(req.status)}`}>{req.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">Request #{req.id} · {format(new Date(req.createdAt), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                    <Select value={req.status} onValueChange={(val) => handleStatusChange(req.id, val as ServiceRequestUpdateStatus)}>
                      <SelectTrigger className="w-full sm:w-52 h-10 rounded-xl border-2 bg-white font-semibold dark:bg-slate-900"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New / Unassigned</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="dispatched">Dispatched</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_1fr]">
                    <div className="space-y-4">
                      <MetadataRow icon={<Phone />} label="Phone"><a className="font-semibold text-slate-900 hover:text-primary dark:text-white" href={`tel:${req.phone}`}>{req.phone}</a></MetadataRow>
                      <MetadataRow icon={<Mail />} label="Email"><a className="break-all font-semibold text-slate-900 hover:text-primary dark:text-white" href={`mailto:${req.email}`}>{req.email}</a></MetadataRow>
                      <MetadataRow icon={<MapPin />} label="Job location">{[req.streetAddress, req.city, req.state, req.zip].filter(Boolean).join(', ')}</MetadataRow>
                    </div>
                    <div className="space-y-4">
                      <MetadataRow icon={<Wrench />} label="Service">{req.service}</MetadataRow>
                      <MetadataRow icon={<CalendarDays />} label="Preferred schedule">{req.preferredDate || 'No date'}{req.preferredTime ? ` · ${TIME_WINDOW_LABELS[req.preferredTime] ?? req.preferredTime}` : ' · Any time'}</MetadataRow>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Job description</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{req.details || 'No additional details provided.'}</p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
      </section>
    </div>
  );
}

function MetadataRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-primary [&>svg]:h-4 [&>svg]:w-4 dark:bg-orange-950/30">{icon}</span>
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><div className="mt-0.5 font-medium">{children}</div></div>
    </div>
  );
}

function BookingsAdmin({ setTab }: { setTab: (tab: AdminTab) => void }) {
  const { data: bookings } = useListBookings();
  
  return (
    <div className="space-y-6">
      <AdminSectionHeader
        eyebrow="Today · Schedule"
        title="Confirmed appointments"
        description="See the work coming up next, with the customer and service context needed for a quick dispatch review."
        count={`${bookings?.length || 0} scheduled`}
      />
      <AdminStatStrip stats={[
        { label: "Upcoming", value: bookings?.length || 0, detail: "Appointments in the demo schedule", tone: bookings?.length ? "success" : "default" },
        { label: "Confirmed", value: bookings?.length || 0, detail: "Ready for the dispatch team" },
        { label: "Customer detail", value: "Attached", detail: "Each card shows the available booking context" },
        { label: "Schedule source", value: "Local", detail: "Stored in this browser's demo state" },
      ]} />
      
      {(!bookings || bookings.length === 0) ? (
        <EmptyState title="No bookings scheduled yet" description="Confirmed customer appointments will appear here." />
      ) : (
        <div className="grid gap-4">
           {bookings.map(b => (
             <article key={b.id} className={`${adminCardClass} overflow-hidden`}>
               <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800">
                 <div>
                   <div className="flex flex-wrap items-center gap-2">
                     <h3 className="font-display text-lg font-bold text-slate-950 dark:text-white">{b.title}</h3>
                     <StatusBadge value="Confirmed" />
                   </div>
                   <p className="mt-1 text-xs text-slate-400">Booking #{b.id} · Confirmed customer appointment</p>
                 </div>
                 <div className="inline-flex items-center gap-2 rounded-xl border-2 border-primary/20 bg-orange-50 px-3 py-2 text-sm font-bold text-slate-900 dark:bg-orange-950/20 dark:text-white">
                   <CalendarDays className="h-4 w-4 text-primary" /> {b.date}
                 </div>
               </div>
               <div className="grid gap-5 p-5 sm:grid-cols-3">
                 <MetadataRow icon={<User />} label="Customer">{b.customer}</MetadataRow>
                 <MetadataRow icon={<Wrench />} label="Service">{b.title}</MetadataRow>
                 <MetadataRow icon={<Clock />} label="Dispatch note">Confirm arrival window before sending the technician.</MetadataRow>
               </div>
               <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/30">
                 <p className="text-xs text-slate-500">Use the service request record for phone, email, and full job location.</p>
                 <Button
                   variant="outline"
                   size="sm"
                   className="rounded-lg"
                   onClick={() => {
                     setTab("service-requests");
                     window.history.replaceState(null, "", "#service-requests");
                   }}
                 >
                   Open request queue <ChevronRight className="ml-1 h-3.5 w-3.5" />
                 </Button>
               </div>
             </article>
           ))}
        </div>
      )}
    </div>
  );
}

function FaqsAdmin() {
  const { data: faqs } = useListFaqs();
  const saveFaq = useSaveFaq();
  const deleteFaq = useDeleteFaq();
  const { toast } = useToast();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FAQ | null>(null);

  const handleSave = () => {
    if (!q || !a) return;
    saveFaq.mutate({ id: editingId || "", question: q, answer: a }, {
      onSuccess: () => {
        toast({ title: "FAQ saved" });
        setEditingId(null);
        setQ("");
        setA("");
      }
    });
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        eyebrow="Website content · Safety answers"
        title="Published questions"
        description="Keep customer answers accurate, useful, and safety focused. Changes are saved in this browser's demo state."
        count={`${faqs?.length || 0} questions`}
        action={<Button size="sm" className="h-10 rounded-xl font-bold" onClick={() => { setEditingId(""); setQ(""); setA(""); }}><Plus className="mr-2 h-4 w-4" /> Add FAQ</Button>}
      />
      <AdminStatStrip stats={[
        { label: "Questions", value: faqs?.length || 0, detail: "Customer answers currently available" },
        { label: "Safety coverage", value: "Strong", detail: "Answers include high-tension warnings", tone: "success" },
        { label: "Publishing", value: "Live", detail: "FAQ content is ready for the homepage", tone: "success" },
        { label: "Storage", value: "Browser", detail: "Demo changes stay on this device" },
      ]} />

      {editingId !== null && (
        <div className={`${adminCardClass} overflow-hidden border-primary/30`}>
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{editingId ? "Edit question" : "New question"}</p>
            <h3 className="mt-1 font-display text-lg font-bold text-slate-950 dark:text-white">{editingId ? "Update customer guidance" : "Add a customer question"}</h3>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Question</label>
              <Input placeholder="What areas do you serve?" value={q} onChange={e => setQ(e.target.value)} className="font-semibold bg-white dark:bg-slate-900" />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Answer</label>
              <Textarea placeholder="Write a clear, customer-safe answer." value={a} onChange={e => setA(e.target.value)} rows={4} className="bg-white dark:bg-slate-900" />
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveFaq.isPending}>{saveFaq.isPending ? "Saving..." : "Save FAQ"}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {faqs?.map(faq => (
          <article key={faq.id} className={`${adminCardClass} overflow-hidden transition-shadow hover:shadow-lg`}>
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-primary dark:bg-orange-950/30"><HelpCircle className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-slate-950 dark:text-white">{faq.question}</h3>
                    <StatusBadge value="Published" />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">FAQ #{faq.id} · Safety-focused customer guidance</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-9 rounded-lg" aria-label={`Edit FAQ: ${faq.question}`} onClick={() => { setEditingId(faq.id); setQ(faq.question); setA(faq.answer); }}><Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="outline" className="h-9 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700" aria-label={`Delete FAQ: ${faq.question}`} onClick={() => setDeleteTarget(faq)}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
              </div>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer answer</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{faq.answer}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Content notes</p>
                <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Visible on the public FAQ section</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Review after changes to services, service areas, or safety policies.</p>
              </div>
            </div>
          </article>
        ))}
        {(!faqs || faqs.length === 0) && <EmptyState title="No FAQs yet" description="Add the first customer question and answer." />}
      </div>
       <DeleteConfirmationDialog
         open={Boolean(deleteTarget)}
         itemLabel={deleteTarget?.question || "FAQ"}
         onOpenChange={(open) => !open && setDeleteTarget(null)}
         onConfirm={() => {
           if (!deleteTarget) return;
           deleteFaq.mutate(deleteTarget.id, {
             onSuccess: () => {
               toast({ title: "FAQ deleted" });
               setDeleteTarget(null);
             },
           });
         }}
       />
    </div>
  );
}

function TasksAdmin() {
  const { data: tasks } = useListTasks();
  const saveTask = useSaveTask();
  const deleteTask = useDeleteTask();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [beforeImg, setBeforeImg] = useState("");
  const [afterImg, setAfterImg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const handleSave = () => {
    if (!title || !beforeImg || !afterImg) return;
    saveTask.mutate({ id: editingId || "", title, description: desc, beforeImageUrl: beforeImg, afterImageUrl: afterImg }, {
      onSuccess: () => {
        toast({ title: "Task saved" });
        setEditingId(null);
        setTitle(""); setDesc(""); setBeforeImg(""); setAfterImg("");
      }
    });
  };

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        eyebrow="Website content · Proof of work"
        title="Project transformations"
        description="Pair before and after images to show the quality of your garage-door repairs, upgrades, and installations."
        count={`${tasks?.length || 0} projects`}
        action={<Button size="sm" className="h-10 rounded-xl font-bold" onClick={() => { setEditingId(""); setTitle(""); setDesc(""); setBeforeImg(""); setAfterImg(""); }}><Plus className="mr-2 h-4 w-4" /> Add project</Button>}
      />
      <AdminStatStrip stats={[
        { label: "Projects", value: tasks?.length || 0, detail: "Transformation stories on the site" },
        { label: "Image pairs", value: tasks?.length || 0, detail: "Each project has before and after views", tone: tasks?.length ? "success" : "default" },
        { label: "Customer trust", value: "Visual", detail: "Use matching photos from the same project", tone: "success" },
        { label: "Storage", value: "Browser", detail: "Demo changes stay on this device" },
      ]} />

      {editingId !== null && (
        <div className={`${adminCardClass} overflow-hidden border-primary/30`}>
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{editingId ? "Edit project" : "New project"}</p>
            <h3 className="mt-1 font-display text-lg font-bold text-slate-950 dark:text-white">{editingId ? "Update transformation details" : "Add a before-and-after project"}</h3>
          </div>
          <div className="space-y-4 p-5">
            <Input placeholder="Project title" value={title} onChange={e => setTitle(e.target.value)} className="font-semibold bg-white dark:bg-slate-900" />
            <Textarea placeholder="Describe the transformation and the customer benefit." value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="bg-white dark:bg-slate-900" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Before image URL</label><Input placeholder="/images/garage/before.jpg" value={beforeImg} onChange={e => setBeforeImg(e.target.value)} className="bg-white dark:bg-slate-900" /></div>
              <div><label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">After image URL</label><Input placeholder="/images/garage/after.jpg" value={afterImg} onChange={e => setAfterImg(e.target.value)} className="bg-white dark:bg-slate-900" /></div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveTask.isPending}>{saveTask.isPending ? "Saving..." : "Save project"}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {tasks?.map(task => (
          <article key={task.id} className={`${adminCardClass} overflow-hidden flex flex-col transition-shadow hover:shadow-lg`}>
            <div className="grid grid-cols-2 border-b border-slate-100 dark:border-slate-800">
              <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800"><img src={task.beforeImageUrl} className="h-full w-full object-cover" alt={`${task.title} before`} /><span className="absolute left-3 top-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Before</span></div>
              <div className="relative aspect-[4/3] border-l border-slate-100 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"><img src={task.afterImageUrl} className="h-full w-full object-cover" alt={`${task.title} after`} /><span className="absolute left-3 top-3 rounded-full bg-primary/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">After</span></div>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-display text-lg font-bold text-slate-950 dark:text-white">{task.title}</h3><p className="mt-1 text-xs text-slate-400">Project #{task.id} · Published transformation</p></div>
                <StatusBadge value="Published" />
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{task.description || "No project description added yet."}</p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500">Matched image pair</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-9 rounded-lg" onClick={() => { setEditingId(task.id); setTitle(task.title); setDesc(task.description); setBeforeImg(task.beforeImageUrl); setAfterImg(task.afterImageUrl); }}><Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                  <Button size="sm" variant="outline" className="h-9 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeleteTarget(task)}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
                </div>
              </div>
            </div>
          </article>
        ))}
        {(!tasks || tasks.length === 0) && <div className="md:col-span-2"><EmptyState title="No transformations yet" description="Add a before-and-after project to get started." /></div>}
      </div>
       <DeleteConfirmationDialog
         open={Boolean(deleteTarget)}
         itemLabel={deleteTarget?.title || "project transformation"}
         onOpenChange={(open) => !open && setDeleteTarget(null)}
         onConfirm={() => {
           if (!deleteTarget) return;
           deleteTask.mutate(deleteTarget.id, {
             onSuccess: () => {
               toast({ title: "Project transformation deleted" });
               setDeleteTarget(null);
             },
           });
         }}
       />
    </div>
  );
}
