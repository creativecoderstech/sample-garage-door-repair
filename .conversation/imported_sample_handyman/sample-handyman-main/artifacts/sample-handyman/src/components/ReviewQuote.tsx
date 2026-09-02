import { useEffect, useRef, useState } from 'react';

/**
 * Quote block for a review card in the homepage carousel.
 *
 * Shows a "Read more" toggle only when the rendered text actually overflows
 * its clamped box (scrollHeight > clientHeight), so the decision adapts to
 * card width, font metrics, and wrapping — not a character-count heuristic.
 */
export function ReviewQuote({
  text,
  isExpanded,
  onToggle,
}: {
  text: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const pRef = useRef<HTMLParagraphElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = pRef.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, isExpanded]);

  return (
    <>
      <div className="flex-1 min-h-0 overflow-hidden mb-4">
        <p
          ref={pRef}
          className={`text-muted-foreground leading-relaxed text-lg ${isExpanded ? '' : 'line-clamp-4'}`}
        >
          "{text}"
        </p>
      </div>
      {(overflowing || isExpanded) && (
        <button
          type="button"
          onClick={onToggle}
          className="self-start mb-4 text-sm font-semibold text-primary hover:underline"
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </>
  );
}
