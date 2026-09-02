/**
 * Before & After Tasks admin panel.
 * Write APIs are unauthenticated for now — add token auth later.
 */
import { useEffect, useState, type FormEvent } from 'react';
import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  type Task,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Loader2, Pencil, Plus, Trash2, ImageIcon } from 'lucide-react';

type FormState = {
  title: string;
  location: string;
  description: string;
  sortOrder: string;
  published: boolean;
  beforeFile: File | null;
  afterFile: File | null;
  beforePreview: string | null;
  afterPreview: string | null;
};

const emptyForm = (): FormState => ({
  title: '',
  location: '',
  description: '',
  sortOrder: '0',
  published: true,
  beforeFile: null,
  afterFile: null,
  beforePreview: null,
  afterPreview: null,
});

function revokePreview(url: string | null) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

const ADMIN_PAGE_SIZE = 12;

export function TasksAdmin() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useListTasks({
    all: '1',
    limit: ADMIN_PAGE_SIZE,
    offset: page * ADMIN_PAGE_SIZE,
  });
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  useEffect(() => {
    return () => {
      revokePreview(form.beforePreview);
      revokePreview(form.afterPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });

  const resetForm = () => {
    revokePreview(form.beforePreview);
    revokePreview(form.afterPreview);
    setForm(emptyForm());
    setEditingId(null);
    setFormError(null);
    setShowForm(false);
  };

  const startCreate = () => {
    revokePreview(form.beforePreview);
    revokePreview(form.afterPreview);
    setForm(emptyForm());
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  };

  const startEdit = (task: Task) => {
    revokePreview(form.beforePreview);
    revokePreview(form.afterPreview);
    setEditingId(task.id);
    setForm({
      title: task.title,
      location: task.location ?? '',
      description: task.description ?? '',
      sortOrder: String(task.sortOrder ?? 0),
      published: task.published,
      beforeFile: null,
      afterFile: null,
      beforePreview: task.beforeUrl,
      afterPreview: task.afterUrl,
    });
    setFormError(null);
    setShowForm(true);
  };

  const onFileChange = (kind: 'before' | 'after', file: File | null) => {
    setForm((prev) => {
      const previewKey = kind === 'before' ? 'beforePreview' : 'afterPreview';
      const fileKey = kind === 'before' ? 'beforeFile' : 'afterFile';
      revokePreview(prev[previewKey]?.startsWith('blob:') ? prev[previewKey] : null);
      return {
        ...prev,
        [fileKey]: file,
        [previewKey]: file ? URL.createObjectURL(file) : prev[previewKey],
      };
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const title = form.title.trim();
    if (!title) {
      setFormError('Title is required.');
      return;
    }

    try {
      if (editingId == null) {
        if (!form.beforeFile || !form.afterFile) {
          setFormError('Before and after images are required.');
          return;
        }
        await createMutation.mutateAsync({
          data: {
            title,
            location: form.location.trim() || undefined,
            description: form.description.trim() || undefined,
            sortOrder: form.sortOrder || '0',
            published: form.published ? '1' : '0',
            before: form.beforeFile,
            after: form.afterFile,
          },
        });
        setPage(0);
      } else {
        await updateMutation.mutateAsync({
          id: editingId,
          data: {
            title,
            location: form.location.trim(),
            description: form.description.trim(),
            sortOrder: form.sortOrder || '0',
            published: form.published ? '1' : '0',
            ...(form.beforeFile ? { before: form.beforeFile } : {}),
            ...(form.afterFile ? { after: form.afterFile } : {}),
          },
        });
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
        <p className="text-muted-foreground font-medium">Loading tasks...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-2 border-destructive/30">
        <CardContent className="py-10 text-center text-muted-foreground">
          Could not load tasks. Check that the API is running.
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
          <h2 className="font-display font-bold text-3xl tracking-tight">Before & After Tasks</h2>
          <p className="text-muted-foreground mt-1">
            {total} transformation{total === 1 ? '' : 's'} total. Newest appear first; homepage shows 2 rows with Load more.
          </p>
        </div>
        <Button onClick={startCreate} className="font-display font-bold gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Add task
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              {editingId == null ? 'New task' : `Edit task #${editingId}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="task-title">Title</Label>
                  <Input
                    id="task-title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    maxLength={120}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-location">Location</Label>
                  <Input
                    id="task-location"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    maxLength={80}
                    placeholder="Canton"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">Short description (optional)</Label>
                <Textarea
                  id="task-description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="task-sort">Sort order</Label>
                  <Input
                    id="task-sort"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-3 pt-7">
                  <Switch
                    id="task-published"
                    checked={form.published}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, published: checked }))}
                  />
                  <Label htmlFor="task-published">Published on home page</Label>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {(['before', 'after'] as const).map((kind) => {
                  const preview = kind === 'before' ? form.beforePreview : form.afterPreview;
                  return (
                    <div key={kind} className="space-y-3">
                      <Label htmlFor={`task-${kind}`}>
                        {kind === 'before' ? 'Before' : 'After'} image
                        {editingId == null ? '' : ' (optional replace)'}
                      </Label>
                      <Input
                        id={`task-${kind}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => onFileChange(kind, e.target.files?.[0] ?? null)}
                        required={editingId == null}
                      />
                      <div className="aspect-[4/3] rounded-xl overflow-hidden border-2 border-border bg-muted/40 flex items-center justify-center">
                        {preview ? (
                          <img src={preview} alt={`${kind} preview`} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {formError && (
                <p className="text-sm text-destructive font-medium">{formError}</p>
              )}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={saving} className="font-display font-bold">
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingId == null ? 'Create task' : 'Save changes'}
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
              No tasks yet. Add a before/after pair to show on the home page.
            </CardContent>
          </Card>
        ) : (
          list.map((task) => (
            <Card key={task.id} className="border-2 border-card-border overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row gap-0">
                  <div className="grid grid-cols-2 md:w-72 shrink-0">
                    <img
                      src={task.beforeUrl}
                      alt={`Before ${task.title}`}
                      className="h-36 w-full object-cover"
                    />
                    <img
                      src={task.afterUrl}
                      alt={`After ${task.title}`}
                      className="h-36 w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-xl">{task.title}</h3>
                        <Badge variant={task.published ? 'default' : 'secondary'}>
                          {task.published ? 'Published' : 'Draft'}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          order {task.sortOrder}
                        </span>
                      </div>
                      {task.location && (
                        <p className="text-sm text-muted-foreground font-medium">{task.location}</p>
                      )}
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => startEdit(task)} className="gap-1.5">
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPendingDelete(task)}
                        disabled={deleteMutation.isPending}
                        className="gap-1.5 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
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
        title="Delete this task?"
        description={
          pendingDelete ? (
            <>
              Remove <strong>{pendingDelete.title}</strong> and both before/after images. This cannot
              be undone.
            </>
          ) : null
        }
        confirmLabel="Delete task"
        loading={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
