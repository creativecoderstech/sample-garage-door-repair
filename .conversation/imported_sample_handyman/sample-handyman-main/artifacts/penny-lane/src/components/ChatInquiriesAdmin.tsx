/**
 * Chat inquiries admin panel — visitors who started the AI chat.
 * Status updates are unauthenticated for now — add token auth later.
 */
import { useState } from 'react';
import {
  useListChatInquiries,
  useUpdateChatInquiry,
  useDeleteChatInquiry,
  type ChatInquiry,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PhoneDisplay } from '@/components/PhoneDisplay';
import { Loader2, MessageCircle, Phone, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const statusStyles: Record<string, string> = {
  new: 'bg-accent text-accent-foreground',
  contacted: 'bg-chart-3 text-white',
  closed: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  closed: 'Closed',
};

export function ChatInquiriesAdmin() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatInquiry | null>(null);
  const { data, isLoading, isError } = useListChatInquiries({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });
  const updateMutation = useUpdateChatInquiry();
  const deleteMutation = useDeleteChatInquiry();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['/api/chat/inquiries'] });

  const setStatus = (inquiry: ChatInquiry, status: 'new' | 'contacted' | 'closed') => {
    updateMutation.mutate(
      { id: inquiry.id, data: { status } },
      { onSuccess: () => invalidate() },
    );
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const inquiry = pendingDelete;
    deleteMutation.mutate(
      { id: inquiry.id },
      {
        onSuccess: () => {
          if (expandedId === inquiry.id) setExpandedId(null);
          setPendingDelete(null);
          invalidate();
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading chat inquiries...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive font-medium">
        Could not load chat inquiries. Check that the API is running.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-3xl tracking-tight">Chat Inquiries</h2>
        <p className="text-muted-foreground mt-1">
          {total} chat{total === 1 ? '' : 's'} from the last 7 days. Older inquiries are deleted automatically.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No chat inquiries yet. They appear when someone starts a chat and shares their name.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((inquiry) => {
            const expanded = expandedId === inquiry.id;
            const userTurns = inquiry.messages.filter((m) => m.role === 'user').length;
            return (
              <Card key={inquiry.id} className="border-2 shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="font-display text-xl flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary shrink-0" />
                        {inquiry.name}
                      </CardTitle>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {inquiry.phone ? (
                          <PhoneDisplay
                            phone={inquiry.phone}
                            className="font-medium text-foreground"
                            iconClassName="w-3.5 h-3.5"
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            No phone
                          </span>
                        )}
                        <span>
                          {formatDistanceToNow(new Date(inquiry.createdAt), { addSuffix: true })}
                        </span>
                        <span>
                          {userTurns} message{userTurns === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                    <Badge className={cn('font-semibold', statusStyles[inquiry.status] ?? statusStyles.new)}>
                      {statusLabels[inquiry.status] ?? inquiry.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedId(expanded ? null : inquiry.id)}
                      className="font-display font-bold"
                    >
                      {expanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Hide transcript
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          View transcript
                        </>
                      )}
                    </Button>
                    {inquiry.status !== 'contacted' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={updateMutation.isPending}
                        onClick={() => setStatus(inquiry, 'contacted')}
                        className="font-display font-bold"
                      >
                        Mark contacted
                      </Button>
                    )}
                    {inquiry.status !== 'closed' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={updateMutation.isPending}
                        onClick={() => setStatus(inquiry, 'closed')}
                        className="font-display font-bold"
                      >
                        Close
                      </Button>
                    )}
                    {inquiry.status !== 'new' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={updateMutation.isPending}
                        onClick={() => setStatus(inquiry, 'new')}
                        className="font-display font-bold"
                      >
                        Reopen
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={deleteMutation.isPending}
                      onClick={() => setPendingDelete(inquiry)}
                      className="font-display font-bold text-destructive hover:text-destructive"
                      data-testid={`button-delete-chat-${inquiry.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete chat
                    </Button>
                  </div>

                  {expanded && (
                    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 max-h-80 overflow-y-auto">
                      {inquiry.messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Started chat but hasn’t sent a message yet.
                        </p>
                      ) : (
                        inquiry.messages.map((message, i) => (
                          <div
                            key={i}
                            className={cn(
                              'text-sm rounded-lg px-3 py-2 max-w-[90%]',
                              message.role === 'user'
                                ? 'ml-auto bg-primary text-primary-foreground'
                                : 'mr-auto bg-card border border-border',
                            )}
                          >
                            <p className="text-[10px] uppercase tracking-wide font-bold opacity-70 mb-1">
                              {message.role === 'user' ? inquiry.name : 'Assistant'}
                            </p>
                            <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="font-display font-bold"
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
            className="font-display font-bold"
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
        title="Delete this chat?"
        description={
          pendingDelete ? (
            <>
              Remove the conversation with <strong>{pendingDelete.name}</strong>
              {pendingDelete.phone ? ` (${pendingDelete.phone})` : ''}. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete chat"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
