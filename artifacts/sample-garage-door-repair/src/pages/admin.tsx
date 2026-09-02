import { useEffect, useState } from 'react';
import { useGetGarageDashboard, useListServiceRequests, useUpdateServiceRequest, getGetGarageDashboardQueryKey, getListServiceRequestsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { LogOut, AlertTriangle, CheckCircle2, Clock, Calendar, Search, ArrowRight, User, Trash2, Plus, Edit2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ServiceRequestUpdateStatus } from "@workspace/api-client-react";

import AdminSettingsPage from './admin-settings';
import { useListFaqs, useSaveFaq, useDeleteFaq, useListTasks, useSaveTask, useDeleteTask, useListBookings } from '@/lib/demo-store';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

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
  const { data: dashboard } = useGetGarageDashboard();
  const pendingCount = dashboard?.newRequests ?? 0;

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
    { id: 'users', label: 'Users' }
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
                Signed in as <span className="text-foreground font-medium">admin@summitgaragedoor.demo</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" className="font-display font-bold" asChild>
                <Link href="/login"><LogOut className="w-4 h-4 mr-2" /> Sign out</Link>
              </Button>
              <Button asChild className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold hover:shadow-xl transition-all">
                <Link href="/">← Back to Site</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-muted/60 border border-border w-fit">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-5 py-2.5 rounded-lg font-display font-bold text-sm transition-all inline-flex items-center gap-2 ${
                  tab === item.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
                {item.id === 'service-requests' && pendingCount > 0 && (
                  <Badge className="h-5 min-w-5 px-1.5 text-[11px] font-bold bg-accent text-accent-foreground border-transparent">
                    {pendingCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {tab === 'settings' ? (
          <AdminSettingsPage />
        ) : tab === 'service-requests' ? (
          <ServiceRequestsAdmin />
        ) : tab === 'faqs' ? (
          <FaqsAdmin />
        ) : tab === 'tasks' ? (
          <TasksAdmin />
        ) : tab === 'bookings' ? (
          <BookingsAdmin />
        ) : tab === 'chats' ? (
          <ContentModuleAdmin storageKey="garage-admin-chats" title="Chat Inquiries" description="Review and track customer conversations captured by the diagnostic assistant." fields={['Customer', 'Phone', 'Status']} defaults={[
            ['Taylor Morgan', '(214) 555-0178', 'New'],
            ['Jordan Lee', '(972) 555-0134', 'Replied'],
          ]} />
        ) : tab === 'gallery' ? (
          <ContentModuleAdmin storageKey="garage-admin-gallery-v2" title="Gallery" description="Manage the project photographs shown throughout the customer website." fields={['Project', 'Image URL', 'Status']} defaults={[
            ['Modern insulated door', '/images/garage/modern-white-home.jpg', 'Published'],
            ['Classic residential door', '/images/garage/classic-white-door.jpg', 'Published'],
          ]} />
        ) : tab === 'services' ? (
          <ContentModuleAdmin storageKey="garage-admin-services" title="Services" description="Maintain the service catalog and customer-facing starting prices." fields={['Service', 'Starting Price', 'Status']} defaults={[
            ['Broken spring replacement', '$249', 'Published'],
            ['Garage door opener repair', '$179', 'Published'],
            ['New door installation', '$1,299', 'Published'],
          ]} />
        ) : tab === 'reviews' ? (
          <ContentModuleAdmin storageKey="garage-admin-reviews" title="Reviews" description="Moderate customer reviews before they appear publicly." fields={['Customer', 'Rating', 'Status']} defaults={[
            ['Elena Rodriguez', '5 stars', 'Approved'],
            ['Marcus Bennett', '5 stars', 'Approved'],
            ['Priya Shah', '5 stars', 'Pending'],
          ]} />
        ) : (
          <ContentModuleAdmin storageKey="garage-admin-users" title="Users" description="Manage staff access and operating roles for this service sample." fields={['Team Member', 'Role', 'Status']} defaults={[
            ['admin@summitgaragedoor.demo', 'Super Admin', 'Active'],
            ['dispatch@summitgaragedoor.demo', 'Dispatcher', 'Active'],
          ]} />
        )}
      </div>
    </div>
  );
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
    <div className="bg-card border rounded-2xl shadow-xl overflow-hidden">
      <div className="p-6 border-b flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h3 className="text-2xl font-display font-bold">{title}</h3>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        <Button onClick={() => setDraft(fields.map(() => ''))}>
          <Plus className="w-4 h-4 mr-2" /> Add New
        </Button>
      </div>

      {draft && (
        <div className="p-6 border-b bg-muted/20">
          <div className="grid gap-3 md:grid-cols-3">
            {fields.map((field, index) => (
              <Input
                key={field}
                placeholder={field}
                value={draft[index]}
                onChange={(event) => setDraft((current) => current?.map((value, i) => i === index ? event.target.value : value) ?? null)}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={addRow}><Check className="w-4 h-4 mr-2" /> Save</Button>
          </div>
        </div>
      )}

      <div className="divide-y">
        {rows.map((row) => (
          <div key={row.id} className="p-5 grid grid-cols-[1fr_auto] gap-5 items-center hover:bg-muted/20 transition-colors">
            <div className="grid sm:grid-cols-3 gap-3">
              {row.values.map((value, index) => (
                <div key={`${row.id}-${fields[index]}`}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{fields[index]}</p>
                  <p className="font-medium mt-1 break-all">{value}</p>
                </div>
              ))}
            </div>
            <Button size="icon" variant="ghost" aria-label={`Delete ${title} item`} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        {rows.length === 0 && <p className="p-12 text-center text-muted-foreground">No items yet.</p>}
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
    req.zip.includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'scheduled': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'dispatched': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'soon': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'flexible': return <Calendar className="h-4 w-4 text-blue-500" />;
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-muted-foreground">New Requests</h4>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <p className="text-3xl font-display font-bold">{dashboard?.newRequests || 0}</p>
        </div>
        <div className={`bg-card border rounded-2xl p-6 shadow-sm ${dashboard?.emergencyCalls ? 'border-destructive/50 bg-destructive/5' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className={`text-sm font-medium ${dashboard?.emergencyCalls ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>Emergencies</h4>
            <AlertTriangle className={`h-5 w-5 ${dashboard?.emergencyCalls ? 'text-destructive' : 'text-muted-foreground'}`} />
          </div>
          <p className={`text-3xl font-display font-bold ${dashboard?.emergencyCalls ? 'text-destructive' : ''}`}>{dashboard?.emergencyCalls || 0}</p>
        </div>
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-muted-foreground">Scheduled</h4>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-3xl font-display font-bold">{dashboard?.scheduledToday || 0}</p>
        </div>
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-muted-foreground">Pipeline Rev</h4>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-3xl font-display font-bold">${dashboard?.estimatedRevenue?.toLocaleString() || 0}</p>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-display font-bold text-xl">Active Service Requests</h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-9 bg-muted/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="h-[600px] w-full">
          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <p className="text-lg font-medium text-muted-foreground">No requests found</p>
            </div>
          ) : (
            <div className="divide-y border-t-0">
              {filteredRequests.map((req) => (
                <div key={req.id} className="p-6 flex flex-col lg:flex-row gap-6 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getUrgencyIcon(req.urgency)}
                        <h3 className="font-bold text-lg">{req.customerName}</h3>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground mt-2">
                        <p className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> {req.phone}</p>
                        <p>{req.email}</p>
                        <p>ZIP: <span className="font-medium text-foreground">{req.zip}</span></p>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold mb-1 text-xs uppercase tracking-wider text-muted-foreground">Service Required</p>
                      <p className="font-medium">{req.service}</p>
                      <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-3 rounded-lg line-clamp-3">
                        {req.details || "No additional details provided."}
                      </p>
                      <div className="mt-3 text-xs text-muted-foreground font-mono">
                         {format(new Date(req.createdAt), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-64 flex flex-col justify-between gap-4 lg:border-l lg:pl-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</p>
                      <Select 
                        value={req.status} 
                        onValueChange={(val) => handleStatusChange(req.id, val as ServiceRequestUpdateStatus)}
                      >
                        <SelectTrigger className={`w-full font-bold ${getStatusColor(req.status)} border-transparent h-10`}>
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
                    <Button variant="outline" size="sm" className="w-full font-bold hover-elevate">
                       Full Details <ArrowRight className="ml-2 h-4 w-4" />
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
    <div className="bg-card border rounded-2xl shadow-xl overflow-hidden p-6">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h3 className="text-2xl font-display font-bold">Bookings</h3>
          <p className="text-muted-foreground">Confirmed calendar appointments (localStorage demo state).</p>
        </div>
      </div>
      
      {(!bookings || bookings.length === 0) ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl">
          No bookings scheduled yet.
        </div>
      ) : (
        <div className="space-y-4">
           {bookings.map(b => (
             <div key={b.id} className="p-4 border rounded-xl flex justify-between items-center bg-muted/10">
               <div>
                 <p className="font-bold">{b.title}</p>
                 <p className="text-sm text-muted-foreground">{b.customer}</p>
               </div>
               <div className="font-mono text-sm">
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
    <div className="bg-card border rounded-2xl shadow-xl overflow-hidden p-6">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h3 className="text-2xl font-display font-bold">Manage FAQs</h3>
          <p className="text-muted-foreground">Demo state persisted in localStorage.</p>
        </div>
        <Button onClick={() => { setEditingId(""); setQ(""); setA(""); }}>
          <Plus className="w-4 h-4 mr-2" /> Add FAQ
        </Button>
      </div>

      {editingId !== null && (
        <div className="mb-6 p-4 border rounded-xl bg-muted/20 space-y-4">
          <Input placeholder="Question" value={q} onChange={e => setQ(e.target.value)} className="font-bold" />
          <Textarea placeholder="Answer" value={a} onChange={e => setA(e.target.value)} rows={3} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button onClick={handleSave}>Save FAQ</Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {faqs?.map(faq => (
          <div key={faq.id} className="p-4 border rounded-xl flex justify-between gap-4 group">
            <div>
              <p className="font-bold mb-1">{faq.question}</p>
              <p className="text-sm text-muted-foreground">{faq.answer}</p>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="outline" onClick={() => { setEditingId(faq.id); setQ(faq.question); setA(faq.answer); }}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="destructive" onClick={() => deleteFaq.mutate(faq.id)}>
                <Trash2 className="w-4 h-4" />
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
    <div className="bg-card border rounded-2xl shadow-xl overflow-hidden p-6">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h3 className="text-2xl font-display font-bold">Before & After Tasks</h3>
          <p className="text-muted-foreground">Manage project transformations (localStorage demo state).</p>
        </div>
        <Button onClick={() => { setEditingId(""); setTitle(""); setDesc(""); setBeforeImg(""); setAfterImg(""); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Task
        </Button>
      </div>

      {editingId !== null && (
        <div className="mb-6 p-4 border rounded-xl bg-muted/20 space-y-4">
          <Input placeholder="Project Title" value={title} onChange={e => setTitle(e.target.value)} className="font-bold" />
          <Textarea placeholder="Description (Optional)" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Before Image URL" value={beforeImg} onChange={e => setBeforeImg(e.target.value)} />
            <Input placeholder="After Image URL" value={afterImg} onChange={e => setAfterImg(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button onClick={handleSave}>Save Task</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tasks?.map(task => (
          <div key={task.id} className="border rounded-xl overflow-hidden flex flex-col group">
            <div className="grid grid-cols-2 h-32 border-b">
              <img src={task.beforeImageUrl} className="w-full h-full object-cover" alt="Before" />
              <img src={task.afterImageUrl} className="w-full h-full object-cover" alt="After" />
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h4 className="font-bold">{task.title}</h4>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{task.description}</p>
              <div className="mt-auto flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="outline" onClick={() => { setEditingId(task.id); setTitle(task.title); setDesc(task.description); setBeforeImg(task.beforeImageUrl); setAfterImg(task.afterImageUrl); }}>
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteTask.mutate(task.id)}>
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