/**
 * Reviews moderation panel.
 * Pending reviews (approved=false) need admin approval before showing on the homepage.
 * Published reviews (approved=true) can be removed (un-approved) or hard-deleted.
 */
import { useQueryClient } from '@tanstack/react-query';
import {
  useAdminListReviews,
  useApproveReview,
  useUnapproveReview,
  useDeleteReview,
  type ReviewItem,
} from '@/lib/admin-api';
import { useListGoogleReviews } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Loader2, CheckCircle, Trash2, EyeOff, Star } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const REVIEWS_QUERY_KEY = ['/api/admin/reviews'] as const;

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </span>
  );
}

function ReviewCard({
  review,
  onApprove,
  onUnapprove,
  onDelete,
  approving,
  unapproving,
  deleting,
}: {
  review: ReviewItem;
  onApprove?: () => void;
  onUnapprove?: () => void;
  onDelete: () => void;
  approving: boolean;
  unapproving: boolean;
  deleting: boolean;
}) {
  const date = new Date(review.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card className="border-2 border-card-border">
      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-display font-bold text-base">{review.name}</span>
            {review.location && (
              <span className="text-xs text-muted-foreground">· {review.location}</span>
            )}
            {review.service && (
              <Badge variant="secondary" className="text-xs">
                {review.service}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mb-2">
            <StarRating rating={review.rating} />
            <span className="text-xs text-muted-foreground">{date}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap">
          {onApprove && (
            <Button
              variant="outline"
              size="sm"
              onClick={onApprove}
              disabled={approving}
              className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 hover:text-green-800"
            >
              {approving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              Approve
            </Button>
          )}
          {onUnapprove && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUnapprove}
              disabled={unapproving}
              className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800"
            >
              {unapproving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              Remove
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReviewsAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, isError } = useAdminListReviews();
  const { data: googleReviewsData } = useListGoogleReviews();
  const approveMutation = useApproveReview();
  const unapproveMutation = useUnapproveReview();
  const deleteMutation = useDeleteReview();

  const [pendingDelete, setPendingDelete] = useState<ReviewItem | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'unapprove' | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY });

  const handleApprove = async (review: ReviewItem) => {
    setActionId(review.id);
    setActionType('approve');
    try {
      await approveMutation.mutateAsync({ id: review.id });
      await invalidate();
      toast({ title: 'Review published', description: `${review.name}'s review is now live on the site.` });
    } catch {
      toast({
        variant: 'destructive',
        title: "Couldn't publish the review",
        description: 'The change was not saved. Please try again.'
      });
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const handleUnapprove = async (review: ReviewItem) => {
    setActionId(review.id);
    setActionType('unapprove');
    try {
      await unapproveMutation.mutateAsync({ id: review.id });
      await invalidate();
      toast({ title: 'Review hidden', description: `${review.name}'s review was removed from the site.` });
    } catch {
      toast({
        variant: 'destructive',
        title: "Couldn't hide the review",
        description: 'The change was not saved. Please try again.'
      });
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
      setPendingDelete(null);
      await invalidate();
    } catch {
      setPendingDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">Loading reviews…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-2 border-destructive/30">
        <CardContent className="py-10 text-center text-muted-foreground">
          Could not load reviews. Check that the API is running.
        </CardContent>
      </Card>
    );
  }

  const all = data?.reviews ?? [];
  const pending = all.filter((r) => !r.approved);
  const published = all.filter((r) => r.approved);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-3xl tracking-tight">Reviews</h2>
        <p className="text-muted-foreground mt-1">
          Approve incoming reviews before they appear on the homepage. Remove any published review
          to hide it without deleting it.
        </p>
      </div>

      {/* Pending section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="font-display font-bold text-xl">Pending</h3>
          {pending.length > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border border-amber-300 font-bold">
              {pending.length}
            </Badge>
          )}
        </div>

        {pending.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground">
              No pending reviews. New submissions will appear here for your approval.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pending.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onApprove={() => void handleApprove(review)}
                onDelete={() => setPendingDelete(review)}
                approving={actionId === review.id && actionType === 'approve'}
                unapproving={false}
                deleting={deleteMutation.isPending && pendingDelete?.id === review.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Published section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="font-display font-bold text-xl">Published</h3>
          <span className="text-sm text-muted-foreground">
            {published.length} showing on homepage
          </span>
        </div>

        {published.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground">
              No published reviews yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {published.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onUnapprove={() => void handleUnapprove(review)}
                onDelete={() => setPendingDelete(review)}
                approving={false}
                unapproving={actionId === review.id && actionType === 'unapprove'}
                deleting={deleteMutation.isPending && pendingDelete?.id === review.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* From Google section */}
      {Array.isArray(googleReviewsData) && googleReviewsData.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="font-display font-bold text-xl">From Google</h3>
            <span className="text-sm text-muted-foreground">
              {googleReviewsData.length} synced · read-only
            </span>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            These are pulled automatically from Google each day. They cannot be edited or deleted here.
          </p>
          <div className="space-y-3">
            {googleReviewsData.map((r) => {
              const date = new Date(r.googleTime * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
              return (
                <Card key={r.id} className="border-2 border-card-border opacity-90">
                  <CardContent className="p-5 flex items-start gap-4">
                    {r.authorPhotoUrl ? (
                      <img
                        src={r.authorPhotoUrl}
                        alt={r.authorName}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-display font-bold text-base shrink-0">
                        {r.authorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-display font-bold text-base">{r.authorName}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4285F4]/10 text-[#4285F4] border border-[#4285F4]/20">
                          Google
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <StarRating rating={r.rating} />
                        <span className="text-xs text-muted-foreground">{date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{r.text}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPendingDelete(null);
        }}
        title="Delete this review?"
        description={
          pendingDelete ? (
            <>
              Permanently delete <strong>{pendingDelete.name}</strong>'s review. This cannot be
              undone.
            </>
          ) : null
        }
        confirmLabel="Delete review"
        loading={deleteMutation.isPending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
