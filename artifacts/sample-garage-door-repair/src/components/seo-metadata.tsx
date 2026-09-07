import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetPublicBusinessSettings, useListGarageContent } from "@workspace/api-client-react";
import { describeRoute } from "../../cloudflare/site-seo.mjs";
import { publicAssetUrl } from "@/lib/asset-url";

// Only the Pages server may authorize indexing. Vite/static previews lack this
// marker, so a locally edited business profile cannot make a preview indexable.
const runtimeReady = document.querySelector('meta[name="garage-indexing"]')?.getAttribute("content") === "approved";
const canonicalOrigin = document.querySelector('meta[name="garage-canonical-origin"]')?.getAttribute("content") || window.location.origin;
const BRAND = "Cumming Garage Door Service";

export function Metadata({ title, description, noindex = false, ogImage }: {
  title: string;
  description?: string;
  noindex?: boolean;
  ogImage?: string;
}) {
  const [location] = useLocation();
  const { data: settings } = useGetPublicBusinessSettings();
  const { data: content = [] } = useListGarageContent();

  useEffect(() => {
    const route = describeRoute(window.location.href, content, { ...settings, runtimeReady, canonicalOrigin });
    const pageTitle = route.item ? route.title : title.includes(BRAND) ? title : `${title} | ${BRAND}`;
    const pageDescription = route.item ? route.description : description || `Garage-door repair and installation from ${BRAND}.`;
    document.title = pageTitle;
    const meta = (name: string, value: string, property = false) => {
      const attribute = property ? "property" : "name";
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
      if (!value) { el?.remove(); return; }
      if (!el) { el = document.createElement("meta"); el.setAttribute(attribute, name); document.head.appendChild(el); }
      el.content = value;
    };
    const image = ogImage ? new URL(publicAssetUrl(ogImage), canonicalOrigin).href : route.image;
    meta("description", pageDescription);
    meta("robots", noindex ? "noindex, nofollow, noarchive" : route.robots);
    meta("og:title", pageTitle, true);
    meta("og:description", pageDescription, true);
    meta("og:site_name", BRAND, true);
    meta("og:url", route.canonical, true);
    meta("og:type", route.item?.kind === "article" ? "article" : "website", true);
    meta("og:image", image, true);
    meta("twitter:title", pageTitle);
    meta("twitter:description", pageDescription);
    meta("twitter:card", image ? "summary_large_image" : "summary");
    meta("twitter:image", image);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = route.canonical;
    let schema = document.getElementById("garage-route-schema") as HTMLScriptElement | null;
    if (!schema) { schema = document.createElement("script"); schema.id = "garage-route-schema"; schema.type = "application/ld+json"; document.head.appendChild(schema); }
    schema.textContent = JSON.stringify(route.structuredData).replace(/</g, "\\u003c");
  }, [title, description, noindex, ogImage, settings, content, location]);
  return null;
}