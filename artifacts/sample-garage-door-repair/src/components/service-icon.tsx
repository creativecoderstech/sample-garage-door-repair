export function ServiceIcon({ serviceCode, className }: { serviceCode?: string; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 160 100",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (serviceCode) {
    case "broken-spring-replacement":
      return (
        <svg {...common}>
          <path d="M10 51h140M18 42v18m124-18v18" />
          <path d="M24 35l10 7v18l-10 7zm112 0-10 7v18l10 7z" fill="currentColor" opacity=".2" />
          <path d="M34 42h92v18H34z" fill="currentColor" opacity=".08" />
          {Array.from({ length: 22 }, (_, index) => {
            const x = 36 + index * 4;
            return <path key={x} d={`M${x} 42l6 18`} />;
          })}
          <circle cx="25" cy="51" r="3" fill="currentColor" stroke="none" />
          <circle cx="135" cy="51" r="3" fill="currentColor" stroke="none" />
          <path d="M19 72h32m58 0h32" strokeWidth="2" />
        </svg>
      );
    case "cable-roller-off-track-repair":
      return (
        <svg {...common}>
          <path d="M116 10h23v78h-23M123 17v64" />
          <circle cx="108" cy="29" r="10" fill="currentColor" opacity=".16" />
          <circle cx="108" cy="29" r="4" />
          <path d="M108 39v13c0 13-8 26-22 30" />
          <path d="M85 82c-19 8-46 1-54-17-8-17 3-34 21-35 17-1 29 13 25 27-4 13-20 19-30 11-8-6-7-17 0-23" />
          <path d="M31 65l-9 5m66 12 9 5" strokeWidth="5" />
          <path d="M119 14h17m-17 70h17" strokeWidth="2" />
        </svg>
      );
    case "garage-door-opener-repair-installation":
      return (
        <svg {...common}>
          <path d="M68 14h76M139 14v9M68 14v17" />
          <path d="M78 12h17v7H78z" fill="currentColor" opacity=".22" />
          <path d="M37 31h57l9 34-13 15H41L28 65z" fill="currentColor" opacity=".13" />
          <path d="M37 31h57l9 34-13 15H41L28 65zM43 31l5-12h35l5 12" />
          <circle cx="66" cy="63" r="10" fill="white" />
          <circle cx="66" cy="63" r="4" fill="currentColor" stroke="none" />
          <path d="M66 80v10M103 48h18l18-25M121 48l12 26" />
          <path d="M139 74h9" />
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
          <path d="M20 20h82v62H20zM20 51h82M61 20v62" />
          <path d="M52 42h18v18H52z" fill="currentColor" opacity=".15" />
          <circle cx="79" cy="51" r="9" fill="white" />
          <circle cx="79" cy="51" r="3" fill="currentColor" stroke="none" />
          <path d="M88 51h30" />
          <path d="M119 31h18v43h-18z" fill="currentColor" opacity=".12" />
          <path d="M119 31h18v43h-18M123 23h10v8M122 74l-6 14m17-14 6 14" />
          <path d="M126 42h5m-5 9h5" strokeWidth="2" />
        </svg>
      );
    case "commercial-garage-door-services":
      return (
        <svg {...common}>
          <path d="M18 89V19h124v70M30 89V33h100v56" />
          <path d="M30 33c15-12 85-12 100 0" />
          <path d="M30 40h100M30 48h100M30 56h100M30 64h100M30 72h100M30 80h100" strokeWidth="2.25" />
          <path d="M24 26h112M12 89h136" />
          <path d="M135 36h10v31h-10z" fill="currentColor" opacity=".18" />
          <circle cx="140" cy="75" r="4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M18 84V19h124v65M30 84V31h100v53M30 48h100M30 65h100" />
          <path d="M45 38h18v18H45z" fill="currentColor" opacity=".12" />
          <circle cx="72" cy="47" r="9" fill="white" />
          <circle cx="72" cy="47" r="3" fill="currentColor" stroke="none" />
          <path d="M81 47h30" />
          <path d="M96 72l10 10 25-28-9-8z" fill="white" />
          <path d="M96 72l10 10 25-28-9-8zM91 67l10 10" />
        </svg>
      );
  }
}