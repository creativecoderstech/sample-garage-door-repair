import { useMemo } from 'react';
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { listTasks, type TaskList } from '@workspace/api-client-react';
import { BrowseShell } from '@/components/BrowseShell';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin } from 'lucide-react';

/** Two rows on desktop (2 columns). */
const PAGE_SIZE = 4;
const QUERY_KEY = ['/api/tasks', 'infinite', PAGE_SIZE] as const;

export default function BeforeAfterBrowsePage() {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: QUERY_KEY,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listTasks({ limit: PAGE_SIZE, offset: pageParam as number }),
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
    queryClient.setQueryData<InfiniteData<TaskList>>(QUERY_KEY, (data) => {
      if (!data?.pages.length) return data;
      return { pages: [data.pages[0]], pageParams: [data.pageParams[0]] };
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <BrowseShell
      title="Before & After"
      subtitle={
        total > 0
          ? `Showing ${items.length} of ${total} transformations.`
          : "Real job transformations from Mike's Handyman Service."
      }
    >
      {query.isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading transformations...</p>
        </div>
      ) : query.isError ? (
        <p className="text-destructive font-medium">Could not load before &amp; after photos.</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No transformations yet.</p>
      ) : (
        <>
          <div className="ba-grid">
            {items.map((project) => (
              <article key={project.id} className="ba-card">
                <div className="ba-compare">
                  <div className="ba-pane">
                    <span className="ba-tag ba-tag-before">Before</span>
                    <img
                      src={project.beforeUrl}
                      alt={`${project.title} before`}
                      loading="lazy"
                    />
                  </div>
                  <div className="ba-pane">
                    <span className="ba-tag ba-tag-after">After</span>
                    <img
                      src={project.afterUrl}
                      alt={`${project.title} after`}
                      loading="lazy"
                    />
                  </div>
                </div>
                <div className="ba-meta">
                  <h2 className="font-display font-bold text-lg leading-snug">{project.title}</h2>
                  {project.location && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {project.location}
                    </p>
                  )}
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {project.description}
                    </p>
                  )}
                </div>
              </article>
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
