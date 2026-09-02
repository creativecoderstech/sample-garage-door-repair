/**
 * Service card admin panel — add, edit, delete, reorder via sort order.
 */
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  type ServiceItem,
} from '@/lib/admin-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

const ICON_SLUGS = [
  { value: 'zap', label: '⚡ Zap (Electrical)' },
  { value: 'wrench', label: '🔧 Wrench (TV / General)' },
  { value: 'droplet', label: '💧 Droplet (Plumbing)' },
  { value: 'hammer', label: '🔨 Hammer (Furniture)' },
  { value: 'home', label: '🏠 Home (Repairs)' },
  { value: 'sparkles', label: '✨ Sparkles (Cleaning)' },
  { value: 'shield', label: '🛡 Shield (Security)' },
  { value: 'star', label: '⭐ Star (Premium)' },
];

type FormState = {
  title: string;
  benefit: string;
  description: string;
  iconSlug: string;
  sortOrder: string;
  published: boolean;
};

const emptyForm = (): FormState => ({
  title: '',
  benefit: '',
  description: '',
  iconSlug: 'wrench',
  sortOrder: '0',
  published: true,
});

const ADMIN_PAGE_SIZE = 50;

export function ServicesAdmin() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useListServices({
    all: '1',
    limit: ADMIN_PAGE_SIZE,
    offset: page * ADMIN_PAGE_SIZE,
  });
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();
  const deleteMutation = useDeleteService();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ServiceItem | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['/api/services'] });

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setFormError(null);
    setShowForm(false);
  };

  const startCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  };

  const startEdit = (svc: ServiceItem) => {
    setEditingId(svc.id);
    setForm({
      title: svc.title,
      benefit: svc.benefit,
      description: svc.description,
      iconSlug: svc.iconSlug,
      sortOrder: String(svc.sortOrder ?? 0),
      published: svc.published,
    });
    setFormError(null);
    setShowForm(true);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const title = form.title.trim();
    const benefit = form.benefit.trim();
    const description = form.description.trim();
    if (!title) { setFormError('Title is required.'); return; }
    if (!benefit) { setFormError('Benefit line is required.'); return; }
    if (!description) { setFormError('Description is required.'); return; }

    const sortOrder = Number(form.sortOrder);
    const payload = {
      title,
      benefit,
      description,
      iconSlug: form.iconSlug,
      sortOrder: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
      published: form.published,
    };

    try {
      if (editingId == null) {
        await createMutation.mutateAsync({ data: payload });
        setPage(0);
      } else {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
      }
      await invalidate();
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
      if (editingId === pendingDelete.id) resetForm();
      setPendingDelete(null);
      await invalidate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Delete failed');
      setPendingDelete(null);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">Loading services...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-2 border-destructive/30">
        <CardContent className="py-10 text-center text-muted-foreground">
          Could not load services. Check that the API is running.
        </CardContent>
      </Card>
    );
  }

  const list = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-3xl tracking-tight">Services</h2>
          <p className="text-muted-foreground mt-1">
            {total} service{total === 1 ? '' : 's'} total. Lower sort order appears first on the
            homepage.
          </p>
        </div>
        <Button onClick={startCreate} className="font-display font-bold gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Add Service
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              {editingId == null ? 'New Service' : `Edit Service #${editingId}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="svc-title">Title</Label>
                  <Input
                    id="svc-title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    maxLength={100}
                    required
                    placeholder="TV Mounting & Shelving"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="svc-icon">Icon</Label>
                  <select
                    id="svc-icon"
                    value={form.iconSlug}
                    onChange={(e) => setForm((f) => ({ ...f, iconSlug: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {ICON_SLUGS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="svc-benefit">Benefit line <span className="text-muted-foreground text-xs">(short tagline shown on the card)</span></Label>
                <Input
                  id="svc-benefit"
                  value={form.benefit}
                  onChange={(e) => setForm((f) => ({ ...f, benefit: e.target.value }))}
                  maxLength={200}
                  required
                  placeholder="Your TV on the wall, cables invisible."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="svc-description">Description</Label>
                <Textarea
                  id="svc-description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  maxLength={1000}
                  rows={4}
                  required
                  placeholder="Clean installs with no visible wiring. TV mounting, floating shelves..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="svc-sort">Sort order</Label>
                  <Input
                    id="svc-sort"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-3 pt-7">
                  <Switch
                    id="svc-published"
                    checked={form.published}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, published: checked }))
                    }
                  />
                  <Label htmlFor="svc-published">Published on home page</Label>
                </div>
              </div>

              {formError && (
                <p className="text-sm text-destructive font-medium">{formError}</p>
              )}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={saving} className="font-display font-bold">
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingId == null ? 'Create service' : 'Save changes'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {list.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-14 text-center text-muted-foreground">
              No services yet. Add one to show on the home page.
            </CardContent>
          </Card>
        ) : (
          list.map((svc) => (
            <Card key={svc.id} className="border-2 border-card-border">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-display font-bold text-lg">{svc.title}</h3>
                    <Badge variant={svc.published ? 'default' : 'secondary'}>
                      {svc.published ? 'Published' : 'Draft'}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">
                      order {svc.sortOrder} · icon: {svc.iconSlug}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-primary mb-1">{svc.benefit}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {svc.description}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(svc)}
                    className="gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingDelete(svc)}
                    disabled={deleteMutation.isPending}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            Page {page + 1} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPendingDelete(null);
        }}
        title="Delete this service?"
        description={
          pendingDelete ? (
            <>
              Remove <strong>{pendingDelete.title}</strong> from the home page. This cannot be
              undone.
            </>
          ) : null
        }
        confirmLabel="Delete service"
        loading={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
