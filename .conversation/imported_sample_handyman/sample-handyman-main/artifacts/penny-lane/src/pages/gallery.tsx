import { useMemo } from 'react';
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { listGalleryItems, type GalleryList } from '@workspace/api-client-react';
import { BrowseShell } from '@/components/BrowseShell';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

/** Two rows on desktop (4 columns). */
const PAGE_SIZE = 8;
const QUERY_KEY = ['/api/gallery', 'infinite', PAGE_SIZE] as const;

export default function GalleryBrowsePage() {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: QUERY_KEY,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listGalleryItems({ limit: PAGE_SIZE, offset: pageParam as number }),
    getNextPageParam: (last) => {
      const next = last.offset + last.items.length;
      return next < last.total ? next : undefined;
    },
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.total ?? 0;
  const expanded = (query.data?.pages.length ?? 0) > 1;

  const showLess = () => {
    queryClient.setQueryData<InfiniteData<GalleryList>>(QUERY_KEY, (data) => {
      if (!data?.pages.length) return data;
      return { pages: [data.pages[0]], pageParams: [data.pageParams[0]] };
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <BrowseShell
      title="Gallery"
      subtitle={
        total > 0
          ? `Showing ${items.length} of ${total} photos. Browse the full collection at your pace.`
          : 'Photos from recent jobs across Northern Atlanta Metro.'
      }
    >
      {query.isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading gallery...</p>
        </div>
      ) : query.isError ? (
        <p className="text-destructive font-medium">Could not load gallery photos.</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No gallery photos yet.</p>
      ) : (
        <>
          <div className="gallery-grid">
            {items.map((item) => (
              <figure key={item.id} className="gallery-tile group">
                <img src={item.imageUrl} alt={item.alt} loading="lazy" />
                <figcaption>{item.label}</figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {query.hasNextPage ? (
              <Button
                type="button"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                className="font-display font-bold min-w-40"
              >
                {query.isFetchingNextPage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load more (${total - items.length} left)`
                )}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">You’ve reached the end.</p>
            )}
            {expanded && (
              <Button
                type="button"
                variant="ghost"
                onClick={showLess}
                className="font-display font-bold min-w-40"
              >
                Show less
              </Button>
            )}
          </div>
        </>
      )}
    </BrowseShell>
  );
}
