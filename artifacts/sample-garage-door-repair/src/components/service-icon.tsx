import { publicAssetUrl } from "@/lib/asset-url";

const SERVICE_ILLUSTRATIONS: Record<string, string> = {
  "garage-door-repair": "/images/service-icons/garage-door-repair.png",
  "broken-spring-replacement": "/images/service-icons/torsion-spring.png",
  "cable-roller-off-track-repair": "/images/service-icons/cable-roller-track.png",
  "garage-door-opener-repair-installation": "/images/service-icons/garage-door-opener.png",
  "new-garage-door-installation": "/images/service-icons/sectional-door.png",
  "garage-door-maintenance-tune-ups": "/images/service-icons/maintenance-hardware.png",
  "commercial-garage-door-services": "/images/service-icons/commercial-rollup-door.png",
};

export function ServiceIcon({ serviceCode, className }: { serviceCode?: string; className?: string }) {
  const imagePath =
    SERVICE_ILLUSTRATIONS[serviceCode || ""] ||
    SERVICE_ILLUSTRATIONS["garage-door-repair"];

  return (
    <img
      src={publicAssetUrl(imagePath)}
      alt=""
      aria-hidden="true"
      className={`object-contain object-left mix-blend-multiply ${className || ""}`}
    />
  );
}