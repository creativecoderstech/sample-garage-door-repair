export function activePublicBasePath(): string {
  const configured = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (typeof window === "undefined") return configured;
  const pathname = window.location.pathname;
  for (const candidate of [configured, "/sample-garage-door-repair"]) {
    if (candidate && (pathname === candidate || pathname.startsWith(`${candidate}/`))) return candidate;
  }
  return "";
}

export function publicAssetUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const basePath = activePublicBasePath();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (basePath && (cleanPath === basePath || cleanPath.startsWith(`${basePath}/`))) return cleanPath;
  return `${basePath}${cleanPath}`;
}
