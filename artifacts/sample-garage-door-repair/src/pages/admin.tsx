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
  Search, ArrowRight, User, Trash2, Plus, Edit2, Check,
  LayoutGrid, Inbox, CalendarDays, MessageCircle, 
  Wrench, Image as ImageIcon, SplitSquareHorizontal, 
  HelpCircle, Star, Settings, Users, ChevronRight, 
  ExternalLink, Sparkles, Building2, Menu, X, MapPin
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
  useListBookings, useListChatInquiries 
} from '@/lib/demo-store';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

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
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
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
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-400'}`} />
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
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-10 max-w-7xl">
        {tab === 'overview' ? <OverviewTab setTab={setTab} pendingCount={pendingCount} dashboard={dashboard} /> :
         tab === 'settings' ? <AdminSettingsPage /> :
         tab === 'service-requests' ? <ServiceRequestsAdmin /> :
         tab === 'faqs' ? <FaqsAdmin /> :
         tab === 'tasks' ? <TasksAdmin /> :
         tab === 'bookings' ? <BookingsAdmin /> :
         tab === 'chats' ? <ChatsAdmin /> :
         tab === 'gallery' ? <GalleryAdmin /> :
         tab === 'services' ? <ServicesAdmin /> :
         tab === 'reviews' ? <ReviewsAdmin /> :
         <UsersAdmin />
        }
      </main>
    </div>
  )
}

function OverviewTab({ setTab, pendingCount, dashboard }: any) {
  const { data: bookings } = useListBookings();
  const { data: chats } = useListChatInquiries();
  
  const upcomingBookings = bookings?.length || 0;
  const recentChats = chats?.length || 0;

  return (
    <div className="max-w-5xl space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Summit Garage Door Co.</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back</h1>
          <p className="text-slate-500 mt-1">Your business at a glance.</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 hidden sm:inline-block">admin@summitgaragedoor.demo</span>
          <Button variant="outline" className="bg-white dark:bg-slate-900 rounded-lg shadow-sm font-medium border-slate-200 dark:border-slate-800" asChild>
            <Link href="/">
              <ExternalLink className="w-4 h-4 mr-2" /> View site
            </Link>
          </Button>
        </div>
      </header>

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
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[150px]"
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
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

// === Sub-components (Restyled to match flat/clean look) ===

function ChatsAdmin() {
  return <ContentModuleAdmin storageKey="garage-admin-chats" title="Chat Inquiries" description="Review and track customer conversations captured by the diagnostic assistant." fields={['Customer', 'Phone', 'Status']} defaults={[
    ['Taylor Morgan', '(214) 555-0178', 'New'],
    ['Jordan Lee', '(972) 555-0134', 'Replied'],
  ]} />
}

function GalleryAdmin() {
  return <ContentModuleAdmin storageKey="garage-admin-gallery-v2" title="Gallery" description="Manage the project photographs shown throughout the customer website." fields={['Project', 'Image URL', 'Status']} defaults={[
    ['Modern insulated door', '/images/garage/modern-white-home.jpg', 'Published'],
    ['Classic residential door', '/images/garage/classic-white-door.jpg', 'Published'],
  ]} />
}

function ServicesAdmin() {
  return <ContentModuleAdmin storageKey="garage-admin-services" title="Services" description="Maintain the service catalog and customer-facing starting prices." fields={['Service', 'Starting Price', 'Status']} defaults={[
    ['Broken spring replacement', '$249', 'Published'],
    ['Garage door opener repair', '$179', 'Published'],
    ['New door installation', '$1,299', 'Published'],
  ]} />
}

function ReviewsAdmin() {
  const { data: feed, isLoading } = useGetGoogleReviewFeed();
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Google Business Profile Connection Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
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

      {/* Existing Manual Reviews Module */}
      <ContentModuleAdmin
        storageKey="garage-admin-reviews"
        title="Manual Reviews"
        description="Moderate customer reviews captured directly on your site before they appear publicly. These remain available when Google is disconnected."
        fields={['Customer', 'Rating', 'Status']}
        defaults={[
          ['Elena Rodriguez', '5 stars', 'Approved'],
          ['Marcus Bennett', '5 stars', 'Approved'],
          ['Priya Shah', '5 stars', 'Pending'],
        ]}
      />
    </div>
  )
}

function UsersAdmin() {
  return <ContentModuleAdmin storageKey="garage-admin-users" title="Users" description="Manage staff access and operating roles for this service sample." fields={['Team Member', 'Role', 'Status']} defaults={[
    ['admin@summitgaragedoor.demo', 'Super Admin', 'Active'],
    ['dispatch@summitgaragedoor.demo', 'Dispatcher', 'Active'],
  ]} />
}


type ContentRow = {
  id: string;
  values: string[];
};

function ContentModuleAdmin({
  storageKey,
  title,
  description,
  fields,
  defaults,
}: {
  storageKey: string;
  title: string;
  description: string;
  fields: string[];
  defaults: string[][];
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ContentRow[]>(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) return JSON.parse(stored) as ContentRow[];
    return defaults.map((values, index) => ({ id: `${storageKey}-${index}`, values }));
  });
  const [draft, setDraft] = useState<string[] | null>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(rows));
  }, [rows, storageKey]);

  const addRow = () => {
    if (!draft || draft.some((value) => !value.trim())) return;
    setRows((current) => [...current, { id: `${storageKey}-${Date.now()}`, values: draft }]);
    setDraft(null);
    toast({ title: `${title} updated` });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden max-w-5xl">
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        </div>
        <Button onClick={() => setDraft(fields.map(() => ''))} size="sm" className="shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Add New
        </Button>
      </div>

      {draft && (
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="grid gap-3 md:grid-cols-3">
            {fields.map((field, index) => (
              <Input
                key={field}
                placeholder={field}
                value={draft[index]}
                onChange={(event) => setDraft((current) => current?.map((value, i) => i === index ? event.target.value : value) ?? null)}
                className="bg-white dark:bg-slate-900"
              />
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDraft(null)}>Cancel</Button>
            <Button size="sm" onClick={addRow}><Check className="w-4 h-4 mr-2" /> Save</Button>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row) => (
          <div key={row.id} className="p-5 grid grid-cols-[1fr_auto] gap-5 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="grid sm:grid-cols-3 gap-3">
              {row.values.map((value, index) => (
                <div key={`${row.id}-${fields[index]}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{fields[index]}</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white break-all">{value}</p>
                </div>
              ))}
            </div>
            <Button size="icon" variant="ghost" aria-label={`Delete ${title} item`} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ))}
        {rows.length === 0 && <p className="p-12 text-center text-sm text-slate-500">No items yet.</p>}
      </div>
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
    <div className="space-y-6 max-w-6xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-500">New Requests</h4>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{dashboard?.newRequests || 0}</p>
        </div>
        <div className={`bg-white dark:bg-slate-900 border ${dashboard?.emergencyCalls ? 'border-red-200 bg-red-50/30' : 'border-slate-200 dark:border-slate-800'} rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-sm font-medium ${dashboard?.emergencyCalls ? 'text-red-600 font-bold' : 'text-slate-500'}`}>Emergencies</h4>
            <AlertTriangle className={`h-4 w-4 ${dashboard?.emergencyCalls ? 'text-red-500' : 'text-slate-400'}`} />
          </div>
          <p className={`text-3xl font-bold tracking-tight ${dashboard?.emergencyCalls ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>{dashboard?.emergencyCalls || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-500">Scheduled</h4>
            <Calendar className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{dashboard?.scheduledToday || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-500">Pipeline Rev</h4>
            <Clock className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">${dashboard?.estimatedRevenue?.toLocaleString() || 0}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Active Service Requests</h3>
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
        
        <ScrollArea className="h-[600px] w-full">
          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <p className="text-sm text-slate-500">No requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRequests.map((req) => (
                <div key={req.id} className="p-5 flex flex-col lg:flex-row gap-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getUrgencyIcon(req.urgency)}
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">{req.customerName}</h3>
                      </div>
                      <div className="space-y-1 text-sm text-slate-500 mt-2">
                        <p className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> {req.phone}</p>
                        <p>{req.email}</p>
                        <p className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {[req.streetAddress, req.city, req.state, req.zip].filter(Boolean).join(', ')}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold mb-1 text-[10px] uppercase tracking-wider text-slate-400">Service Required</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{req.service}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Preferred: {req.preferredDate || 'No date'}{req.preferredTime ? ` · ${TIME_WINDOW_LABELS[req.preferredTime] ?? req.preferredTime}` : ' · Any time'}
                      </p>
                      <p className="text-sm text-slate-500 mt-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-3 rounded-lg line-clamp-3">
                        {req.details || "No additional details provided."}
                      </p>
                      <div className="mt-3 text-[11px] text-slate-400 font-mono">
                         {format(new Date(req.createdAt), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-64 flex flex-col justify-between gap-4 lg:border-l lg:border-slate-100 lg:dark:border-slate-800 lg:pl-6">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Status</p>
                      <Select 
                        value={req.status} 
                        onValueChange={(val) => handleStatusChange(req.id, val as ServiceRequestUpdateStatus)}
                      >
                        <SelectTrigger className={`w-full font-medium ${getStatusColor(req.status)} border h-9 text-sm`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New / Unassigned</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="dispatched">Dispatched</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" size="sm" className="w-full font-medium text-xs border-slate-200">
                       Full Details <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

function BookingsAdmin() {
  const { data: bookings } = useListBookings();
  
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden p-5 sm:p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Bookings</h3>
          <p className="text-sm text-slate-500 mt-1">Confirmed calendar appointments (localStorage demo state).</p>
        </div>
      </div>
      
      {(!bookings || bookings.length === 0) ? (
        <div className="py-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          No bookings scheduled yet.
        </div>
      ) : (
        <div className="space-y-3">
           {bookings.map(b => (
             <div key={b.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
               <div>
                 <p className="font-bold text-sm text-slate-900 dark:text-white">{b.title}</p>
                 <p className="text-xs text-slate-500 mt-0.5">{b.customer}</p>
               </div>
               <div className="font-medium text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
                 {b.date}
               </div>
             </div>
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden p-5 sm:p-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Manage FAQs</h3>
          <p className="text-sm text-slate-500 mt-1">Demo state persisted in localStorage.</p>
        </div>
        <Button size="sm" onClick={() => { setEditingId(""); setQ(""); setA(""); }}>
          <Plus className="w-4 h-4 mr-2" /> Add FAQ
        </Button>
      </div>

      {editingId !== null && (
        <div className="mb-6 p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-4">
          <Input placeholder="Question" value={q} onChange={e => setQ(e.target.value)} className="font-semibold bg-white dark:bg-slate-900" />
          <Textarea placeholder="Answer" value={a} onChange={e => setA(e.target.value)} rows={3} className="bg-white dark:bg-slate-900" />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save FAQ</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {faqs?.map(faq => (
          <div key={faq.id} className="p-5 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between gap-4 group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">{faq.question}</p>
              <p className="text-sm text-slate-500">{faq.answer}</p>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { setEditingId(faq.id); setQ(faq.question); setA(faq.answer); }}>
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteFaq.mutate(faq.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden p-5 sm:p-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Before & After Tasks</h3>
          <p className="text-sm text-slate-500 mt-1">Manage project transformations (localStorage demo state).</p>
        </div>
        <Button size="sm" onClick={() => { setEditingId(""); setTitle(""); setDesc(""); setBeforeImg(""); setAfterImg(""); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Task
        </Button>
      </div>

      {editingId !== null && (
        <div className="mb-6 p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 space-y-4">
          <Input placeholder="Project Title" value={title} onChange={e => setTitle(e.target.value)} className="font-semibold bg-white dark:bg-slate-900" />
          <Textarea placeholder="Description (Optional)" value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="bg-white dark:bg-slate-900" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input placeholder="Before Image URL" value={beforeImg} onChange={e => setBeforeImg(e.target.value)} className="bg-white dark:bg-slate-900" />
            <Input placeholder="After Image URL" value={afterImg} onChange={e => setAfterImg(e.target.value)} className="bg-white dark:bg-slate-900" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save Task</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {tasks?.map(task => (
          <div key={task.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col group bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
            <div className="grid grid-cols-2 h-32 border-b border-slate-100 dark:border-slate-800">
              <img src={task.beforeImageUrl} className="w-full h-full object-cover" alt="Before" />
              <img src={task.afterImageUrl} className="w-full h-full object-cover border-l border-slate-100 dark:border-slate-800" alt="After" />
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{task.title}</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4 line-clamp-2">{task.description}</p>
              <div className="mt-auto flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingId(task.id); setTitle(task.title); setDesc(task.description); setBeforeImg(task.beforeImageUrl); setAfterImg(task.afterImageUrl); }}>
                  Edit
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 border-slate-200" onClick={() => deleteTask.mutate(task.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
