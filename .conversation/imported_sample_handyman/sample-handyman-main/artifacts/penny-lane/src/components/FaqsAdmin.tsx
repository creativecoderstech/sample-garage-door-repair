/**
 * Homepage FAQ admin panel — add, edit, delete, reorder via sort order.
 */
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListFaqs,
  useCreateFaq,
  useUpdateFaq,
  useDeleteFaq,
  type FaqItem,
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

type FormState = {
  question: string;
  answer: string;
  sortOrder: string;
  published: boolean;
};

const emptyForm = (): FormState => ({
  question: '',
  answer: '',
  sortOrder: '0',
  published: true,
});

const ADMIN_PAGE_SIZE = 50;

export function FaqsAdmin() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useListFaqs({
    all: '1',
    limit: ADMIN_PAGE_SIZE,
    offset: page * ADMIN_PAGE_SIZE,
  });
  const createMutation = useCreateFaq();
  const updateMutation = useUpdateFaq();
  const deleteMutation = useDeleteFaq();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FaqItem | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['/api/faqs'] });

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

  const startEdit = (faq: FaqItem) => {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      sortOrder: String(faq.sortOrder ?? 0),
      published: faq.published,
    });
    setFormError(null);
    setShowForm(true);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const question = form.question.trim();
    const answer = form.answer.trim();
    if (!question) {
      setFormError('Question is required.');
      return;
    }
    if (!answer) {
      setFormError('Answer is required.');
      return;
    }

    const sortOrder = Number(form.sortOrder);
    const payload = {
      question,
      answer,
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
        <p className="text-muted-foreground font-medium">Loading FAQs...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-2 border-destructive/30">
        <CardContent className="py-10 text-center text-muted-foreground">
          Could not load FAQs. Check that the API is running.
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
          <h2 className="font-display font-bold text-3xl tracking-tight">FAQs</h2>
          <p className="text-muted-foreground mt-1">
            {total} question{total === 1 ? '' : 's'} total. Lower sort order appears first on the
            homepage.
          </p>
        </div>
        <Button onClick={startCreate} className="font-display font-bold gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Add FAQ
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              {editingId == null ? 'New FAQ' : `Edit FAQ #${editingId}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="faq-question">Question</Label>
                <Input
                  id="faq-question"
                  value={form.question}
                  onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                  maxLength={200}
                  required
                  placeholder="What's your service area?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faq-answer">Answer</Label>
                <Textarea
                  id="faq-answer"
                  value={form.answer}
                  onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
                  maxLength={2000}
                  rows={4}
                  required
                  placeholder="I serve Canton, Woodstock, and surrounding communities..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="faq-sort">Sort order</Label>
                  <Input
                    id="faq-sort"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-3 pt-7">
                  <Switch
                    id="faq-published"
                    checked={form.published}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, published: checked }))
                    }
                  />
                  <Label htmlFor="faq-published">Published on home page</Label>
                </div>
              </div>

              {formError && (
                <p className="text-sm text-destructive font-medium">{formError}</p>
              )}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={saving} className="font-display font-bold">
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingId == null ? 'Create FAQ' : 'Save changes'}
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
              No FAQs yet. Add one to show on the home page.
            </CardContent>
          </Card>
        ) : (
          list.map((faq) => (
            <Card key={faq.id} className="border-2 border-card-border">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-display font-bold text-lg">{faq.question}</h3>
                    <Badge variant={faq.published ? 'default' : 'secondary'}>
                      {faq.published ? 'Published' : 'Draft'}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">
                      order {faq.sortOrder}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {faq.answer}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(faq)}
                    className="gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingDelete(faq)}
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
        title="Delete this FAQ?"
        description={
          pendingDelete ? (
            <>
              Remove <strong>{pendingDelete.question}</strong>. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete FAQ"
        loading={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
