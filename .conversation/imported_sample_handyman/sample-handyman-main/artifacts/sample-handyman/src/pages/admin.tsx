import { useState } from 'react';
import { useGetServiceRequestSummary } from '@workspace/api-client-react';
import { TasksAdmin } from '@/components/TasksAdmin';
import { GalleryAdmin } from '@/components/GalleryAdmin';
import { FaqsAdmin } from '@/components/FaqsAdmin';
import { ServicesAdmin } from '@/components/ServicesAdmin';
import { SettingsAdmin } from '@/components/SettingsAdmin';
import { ChatInquiriesAdmin } from '@/components/ChatInquiriesAdmin';
import { ServiceRequestsAdmin } from '@/components/ServiceRequestsAdmin';
import { BookingsAdmin } from '@/components/BookingsAdmin';
import { UsersAdmin } from '@/components/UsersAdmin';
import { ReviewsAdmin } from '@/components/ReviewsAdmin';
import { useAuth } from '@/lib/auth';
import { siteHomeUrl } from '@/lib/hosts';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

type AdminTab =
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
  const [tab, setTab] = useState<AdminTab>('service-requests');
  const { data: summary } = useGetServiceRequestSummary();
  const pendingCount = summary?.pendingCount ?? 0;
  const { user, isSuperAdmin, signOut } = useAuth();

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'service-requests', label: 'Service Requests' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'chats', label: 'Chat Inquiries' },
    { id: 'tasks', label: 'Before & After Tasks' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'services', label: 'Services' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'settings', label: 'Settings' },
    ...(isSuperAdmin
      ? [{ id: 'users' as const, label: 'Users' }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background noise-overlay">
      <div className="container mx-auto px-6 lg:px-12 py-10 max-w-7xl">
        <div className="mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="font-display font-bold text-4xl md:text-5xl mb-3 tracking-tight">
                Admin
              </h1>
              <p className="text-muted-foreground text-lg">
                Signed in as{' '}
                <span className="text-foreground font-medium">
                  {user?.email}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="font-display font-bold"
                onClick={() => void signOut()}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
              <a
                href={siteHomeUrl()}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold hover:shadow-xl transition-all magnetic-hover"
              >
                ← Back to Site
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-muted/60 border border-border w-fit">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'px-5 py-2.5 rounded-lg font-display font-bold text-sm transition-all inline-flex items-center gap-2',
                  tab === item.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
                {item.id === 'service-requests' && pendingCount > 0 && (
                  <Badge
                    className={cn(
                      'h-5 min-w-5 px-1.5 text-[11px] font-bold',
                      'bg-accent text-accent-foreground',
                    )}
                  >
                    {pendingCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {tab === 'users' && isSuperAdmin ? (
          <UsersAdmin />
        ) : tab === 'settings' ? (
          <SettingsAdmin />
        ) : tab === 'reviews' ? (
          <ReviewsAdmin />
        ) : tab === 'services' ? (
          <ServicesAdmin />
        ) : tab === 'faqs' ? (
          <FaqsAdmin />
        ) : tab === 'gallery' ? (
          <GalleryAdmin />
        ) : tab === 'tasks' ? (
          <TasksAdmin />
        ) : tab === 'chats' ? (
          <ChatInquiriesAdmin />
        ) : tab === 'bookings' ? (
          <BookingsAdmin />
        ) : (
          <ServiceRequestsAdmin />
        )}
      </div>
    </div>
  );
}
