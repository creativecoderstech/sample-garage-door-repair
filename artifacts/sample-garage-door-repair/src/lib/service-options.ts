const operationalCodes: Record<string, string> = {
  "garage-door-repair": "repair",
  "broken-spring-replacement": "springs",
  "garage-door-opener-repair-installation": "opener",
  "cable-roller-off-track-repair": "hardware",
  "new-garage-door-installation": "installation",
  "garage-door-maintenance-tune-ups": "maintenance",
  "commercial-garage-door-services": "commercial",
};

export function approvedServiceOptions(services: { slug: string; name: string }[] = []) {
  const options = new Map<string, { value: string; label: string }>();
  for (const service of services) {
    const value = operationalCodes[service.slug] || service.slug;
    options.set(value, { value, label: service.name });
  }
  options.set("other", { value: "other", label: "Not sure / other" });
  return [...options.values()];
}