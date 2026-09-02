import type { ReactNode } from 'react';
import { Phone } from 'lucide-react';
import { useCanDial } from '@/hooks/use-can-dial';
import { toTelHref } from '@/lib/phone';
import { cn } from '@/lib/utils';

type PhoneDisplayProps = {
  phone: string;
  className?: string;
  iconClassName?: string;
  /** Show the phone icon (default true). */
  showIcon?: boolean;
  /** Custom leading icon; defaults to Phone. */
  icon?: ReactNode;
};

/**
 * Desktop: plain text (no tel: link).
 * Mobile / touch: tap-to-call via tel: (opens the phone dialer).
 */
export function PhoneDisplay({
  phone,
  className,
  iconClassName,
  showIcon = true,
  icon,
}: PhoneDisplayProps) {
  const canDial = useCanDial();
  const leading =
    icon ??
    (showIcon ? <Phone className={cn('w-4 h-4 shrink-0', iconClassName)} /> : null);

  const content = (
    <>
      {leading}
      <span className="tabular-nums">{phone}</span>
    </>
  );

  if (canDial) {
    return (
      <a
        href={toTelHref(phone)}
        className={cn('inline-flex items-center gap-2', className)}
        aria-label={`Call ${phone}`}
      >
        {content}
      </a>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 cursor-default select-text',
        className,
      )}
    >
      {content}
    </span>
  );
}
