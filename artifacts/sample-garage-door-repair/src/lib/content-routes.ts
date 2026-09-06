import type { GarageContentInput } from "@workspace/api-client-react";

export const CORE_PAGE_ROUTES: Record<string, string> = {
  home: "/",
  services: "/services",
  "service-area": "/service-area",
  about: "/about",
  blog: "/blog",
  contact: "/contact",
  gallery: "/gallery",
  faqs: "/faqs",
};

export function contentRoute(item: Pick<GarageContentInput, "kind" | "slug">): string {
  switch (item.kind) {
    case "page": return CORE_PAGE_ROUTES[item.slug] ?? `/pages/${item.slug}`;
    case "service": return `/services/${item.slug}`;
    case "location": return `/service-area/${item.slug}`;
    case "article": return `/blog/${item.slug}`;
    case "project": return `/gallery#project-${item.slug}`;
    case "faq": return `/faqs#faq-${item.slug}`;
    case "trust": return "/about#verified-facts";
  }
}