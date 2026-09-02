/**
 * Homepage Gallery admin panel.
 * Write APIs are unauthenticated for now — add token auth later.
 */
import { useEffect, useState, type FormEvent } from 'react';
import {
  useListGalleryItems,
  useCreateGalleryItem,
  useDeleteGalleryItem,
  type GalleryItem,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Loader2, Plus, Trash2, ImageIcon } from 'lucide-react';

type FormState = {
  label: string;
  alt: string;
  sortOrder: string;
  imageFile: File | null;
  imagePreview: string | null;
};

const emptyForm = (): FormState => ({
  label: '',
  alt: '',
  sortOrder: '0',
  imageFile: null,
  imagePreview: null,
});

function revokePreview(url: string | null) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

const ADMIN_PAGE_SIZE = 24;

export function GalleryAdmin() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<GalleryItem | null>(null);
  const { data, isLoading, isError } = useListGalleryItems({
    all: '1',
    limit: ADMIN_PAGE_SIZE,
    offset: page * ADMIN_PAGE_SIZE,
  });
  const createMutation = useCreateGalleryItem();
  const deleteMutation = useDeleteGalleryItem();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    return () => revokePreview(form.imagePreview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });

  const resetForm = () => {
    revokePreview(form.imagePreview);
    setForm(emptyForm());
    setFormError(null);
    setShowForm(false);
  };

  const startCreate = () => {
    revokePreview(form.imagePreview);
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  };

  const onFileChange = (file: File | null) => {
    setForm((prev) => {
      revokePreview(prev.imagePreview?.startsWith('blob:') ? prev.imagePreview : null);
      return {
        ...prev,
        imageFile: file,
        imagePreview: file ? URL.createObjectURL(file) : null,
      };
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const label = form.label.trim();
    if (!label) {
      setFormError('Label is required.');
      return;
    }
    if (!form.imageFile) {
      setFormError('An image is required.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        data: {
          label,
          alt: form.alt.trim() || label,
          sortOrder: form.sortOrder || '0',
          published: '1',
          image: form.imageFile,
        },
      });
      setPage(0);
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
      setPendingDelete(null);
      await invalidate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Delete failed');
      setPendingDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">Loading gallery...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-2 border-destructive/30">
        <CardContent className="py-10 text-center text-muted-foreground">
          Could not load gallery items. Check that the API is running.
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
          <h2 className="font-display font-bold text-3xl tracking-tight">Gallery</h2>
          <p className="text-muted-foreground mt-1">
            {total} photo{total === 1 ? '' : 's'} total. Newest photos appear first; homepage shows 2 rows with Load more.
          </p>
        </div>
        <Button onClick={startCreate} className="font-display font-bold gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Add photo
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="font-display text-xl">New gallery photo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="gallery-label">Label</Label>
                  <Input
                    id="gallery-label"
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    maxLength={80}
                    required
                    placeholder="TV Mounting"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gallery-sort">Sort order</Label>
                  <Input
                    id="gallery-sort"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gallery-alt">Alt text (optional)</Label>
                <Input
                  id="gallery-alt"
                  value={form.alt}
                  onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))}
                  maxLength={160}
                  placeholder="Short description for accessibility"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="gallery-image">Image</Label>
                <Input
                  id="gallery-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                  required
                />
                <div className="aspect-[4/3] max-w-md rounded-xl overflow-hidden border-2 border-border bg-muted/40 flex items-center justify-center">
                  {form.imagePreview ? (
                    <img
                      src={form.imagePreview}
                      alt="Gallery preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                  )}
                </div>
              </div>

              {formError && (
                <p className="text-sm text-destructive font-medium">{formError}</p>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="font-display font-bold"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Add to gallery'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No gallery photos yet. Add one to show on the homepage.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map((item) => (
              <Card key={item.id} className="overflow-hidden border-2 shadow-md">
                <div className="aspect-[4/3] bg-muted">
                  <img
                    src={item.imageUrl}
                    alt={item.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-bold truncate">{item.label}</div>
                    <div className="text-xs text-muted-foreground">Order {item.sortOrder}</div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => setPendingDelete(item)}
                    disabled={deleteMutation.isPending}
                    aria-label={`Delete ${item.label}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
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
        </>
      )}

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPendingDelete(null);
        }}
        title="Delete gallery photo?"
        description={
          pendingDelete ? (
            <>
              Remove <strong>{pendingDelete.label}</strong> from the gallery. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete photo"
        loading={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
