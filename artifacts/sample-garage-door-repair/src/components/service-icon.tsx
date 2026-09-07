export function ServiceIcon({ serviceCode, className }: { serviceCode?: string; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 160 100",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (serviceCode) {
    case "broken-spring-replacement":
      return (
        <svg {...common}>
          <path d="M16 48h12m104 0h12M28 39v18m104-18v18" />
          <path d="M30 48c5-24 12-24 17 0s12 24 17 0 12-24 17 0 12 24 17 0 12-24 17 0 12 24 17 0" />
          <path d="M22 34h12v28H22zm104 0h12v28h-12z" fill="currentColor" stroke="none" opacity=".22" />
        </svg>
      );
    case "cable-roller-off-track-repair":
      return (
        <svg {...common}>
          <circle cx="52" cy="52" r="28" />
          <circle cx="108" cy="52" r="28" />
          <path d="M52 24c22 10 34 24 56 56M24 16l12 10m88 48 12 10M28 12l9 14-17 1m112 60-9-14 17-1" />
        </svg>
      );
    case "garage-door-opener-repair-installation":
      return (
        <svg {...common}>
          <path d="M49 25h62l10 39H39z" fill="currentColor" opacity=".2" />
          <path d="M39 64h82l-13 16H52zM59 25l5-11h32l5 11" />
          <circle cx="80" cy="65" r="10" fill="white" />
          <circle cx="80" cy="65" r="3" fill="currentColor" stroke="none" />
          <path d="M80 80v10" />
        </svg>
      );
    case "new-garage-door-installation":
      return (
        <svg {...common}>
          <path d="M25 89V16h110v73M35 89V27h90v62" />
          <path d="M35 43h90M35 59h90M35 75h90M53 27v62m54-62v62" />
          <path d="M20 89h120" />
        </svg>
      );
    case "garage-door-maintenance-tune-ups":
      return (
        <svg {...common}>
          <path d="M33 82l35-35M57 29l16 16-9 9-16-16z" />
          <path d="M92 18a22 22 0 0 0-5 25L55 75l15 15 32-32a22 22 0 0 0 28-28l-14 14-14-3-3-14 14-14a22 22 0 0 0-21 5z" fill="currentColor" opacity=".18" />
          <path d="M92 18a22 22 0 0 0-5 25L55 75l15 15 32-32a22 22 0 0 0 28-28l-14 14-14-3-3-14 14-14a22 22 0 0 0-21 5z" />
        </svg>
      );
    case "commercial-garage-door-services":
      return (
        <svg {...common}>
          <path d="M17 89V20h126v69M28 89V33h104v56" />
          <path d="M28 47h104M28 61h104M28 75h104M18 20h124M11 89h138" />
          <circle cx="119" cy="82" r="3" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M23 87V19h114v68M34 87V31h92v56M34 49h92M34 67h92" />
          <path d="M79 40a22 22 0 0 0 4 25L65 83l12 12 18-18a22 22 0 0 0 25-4l-15-4-7-12 4-15a22 22 0 0 0-23-2z" fill="white" />
          <path d="M79 40a22 22 0 0 0 4 25L65 83l12 12 18-18a22 22 0 0 0 25-4l-15-4-7-12 4-15a22 22 0 0 0-23-2z" />
        </svg>
      );
  }
}