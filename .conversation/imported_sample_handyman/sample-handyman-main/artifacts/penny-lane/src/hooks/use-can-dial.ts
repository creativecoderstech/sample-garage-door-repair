import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

/** True when the device should get a tap-to-call phone link. */
function computeCanDial(): boolean {
  if (typeof window === 'undefined') return false;
  const narrow = window.innerWidth < MOBILE_BREAKPOINT;
  const touchPrimary = window.matchMedia(
    '(hover: none) and (pointer: coarse)',
  ).matches;
  return narrow || touchPrimary;
}

/**
 * Whether phone numbers should be dial links (mobile / touch) vs plain text (desktop).
 */
export function useCanDial(): boolean {
  const [canDial, setCanDial] = React.useState(false);

  React.useEffect(() => {
    const widthMql = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
    );
    const touchMql = window.matchMedia('(hover: none) and (pointer: coarse)');
    const update = () => setCanDial(computeCanDial());
    update();
    widthMql.addEventListener('change', update);
    touchMql.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      widthMql.removeEventListener('change', update);
      touchMql.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return canDial;
}
