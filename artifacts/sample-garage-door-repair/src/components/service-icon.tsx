import {
  Cable,
  CircleGauge,
  Cog,
  DoorOpen,
  Hammer,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const SERVICE_ICONS: Record<string, LucideIcon> = {
  "garage-door-repair": Wrench,
  "broken-spring-replacement": CircleGauge,
  "cable-roller-off-track-repair": Cable,
  "garage-door-opener-repair-installation": Cog,
  "new-garage-door-installation": DoorOpen,
  "garage-door-maintenance-tune-ups": Hammer,
  "commercial-garage-door-services": Warehouse,
};

export function ServiceIcon({ serviceCode, className }: { serviceCode?: string; className?: string }) {
  const Icon = SERVICE_ICONS[serviceCode || ""] || Wrench;
  return <Icon className={className} aria-hidden="true" />;
}