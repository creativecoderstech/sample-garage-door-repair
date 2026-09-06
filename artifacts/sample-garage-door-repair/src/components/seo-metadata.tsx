import { useEffect } from "react";
import { publicAssetUrl } from "@/lib/asset-url";

export function Metadata({
  title,
  description,
  noindex = true, // Force true to always noindex while staff auth is disabled/no auth
  ogImage,
}: {
  title: string;
  description?: string;
  noindex?: boolean;
  ogImage?: string;
}) {
  useEffect(() => {
    document.title = title;

    const updateMeta = (name: string, content: string, isProperty = false) => {
      let el = document.querySelector(
        isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`,
      );
      if (!el) {
        el = document.createElement("meta");
        if (isProperty) el.setAttribute("property", name);
        else el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const removeMeta = (name: string, isProperty = false) => {
      const el = document.querySelector(
        isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`,
      );
      if (el) {
        el.remove();
      }
    };

    if (description) {
      updateMeta("description", description);
      updateMeta("og:description", description, true);
      updateMeta("twitter:description", description);
    } else {
      removeMeta("description");
      removeMeta("og:description", true);
      removeMeta("twitter:description");
    }

    updateMeta("og:title", title, true);
    updateMeta("twitter:title", title);

    if (ogImage) {
      // Ensure absolute URL for og:image
      const absoluteImageUrl = new URL(publicAssetUrl(ogImage), window.location.origin).href;
      updateMeta("og:image", absoluteImageUrl, true);
      updateMeta("twitter:image", absoluteImageUrl);
    } else {
      removeMeta("og:image", true);
      removeMeta("twitter:image");
    }

    // Strip hash and query from og:url
    const cleanUrl = window.location.origin + window.location.pathname;
    updateMeta("og:url", cleanUrl, true);
    
    updateMeta("og:type", "website", true);
    updateMeta("twitter:card", "summary_large_image");

    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", cleanUrl);

    // Always noindex during this phase as requested
    updateMeta("robots", "noindex, nofollow, noarchive");
    
  }, [title, description, noindex, ogImage]);

  return null;
}

