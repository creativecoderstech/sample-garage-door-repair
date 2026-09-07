// Request-time metadata uses the same published, claim-filtered records as the API.
// A production origin AND runtime-validated launch approval are required to index.
const CORE_ROUTES = {
  home: "/", services: "/services", "service-area": "/service-area",
  about: "/about", blog: "/blog", contact: "/contact", gallery: "/gallery", faqs: "/faqs",
};
const DETAIL_ROUTES = { service: "/services", location: "/service-area", article: "/blog" };
const LEGACY_ROUTES = {
  "/book": "/contact#booking", "/booking": "/contact#booking",
  "/before-after": "/gallery#before-after", "/faq": "/faqs",
};
const PREVIEW_PREFIX = "/sample-garage-door-repair";
const BRAND = "Cumming Garage Door Service";
const PRIVATE_ROUTE = /^\/(?:admin|login|sign-in|sign-up)(?:\/|$)/;
const visible = item => item.status === "published" &&
  (item.verificationStatus === "verified" || item.reviewedSeed === true) &&
  (!["trust", "location"].includes(item.kind) || item.verificationStatus === "verified");
const noindex = "noindex, nofollow, noarchive";
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export function contentPath(item) {
  if (item.kind === "page") return CORE_ROUTES[item.slug] || `/pages/${item.slug}`;
  return DETAIL_ROUTES[item.kind] ? `${DETAIL_ROUTES[item.kind]}/${item.slug}` : null;
}

export function normalizePublicPath(path) {
  const unprefixed = path === PREVIEW_PREFIX ? "/" :
    path.startsWith(`${PREVIEW_PREFIX}/`) ? path.slice(PREVIEW_PREFIX.length) : path;
  return unprefixed.replace(/\/+$/, "") || "/";
}

export function describeRoute(requestUrl, content, settings = {}) {
  const url = new URL(requestUrl);
  const path = normalizePublicPath(url.pathname);
  const publicRecords = content.filter(visible);
  const item = publicRecords.find(record => contentPath(record) === path);
  const alias = publicRecords.find(record => (record.aliases || []).some(slug =>
    contentPath({ ...record, slug }) === path));
  const legacy = LEGACY_ROUTES[path];
  const redirect = legacy || (alias ? contentPath(alias) : null);
  const isAdmin = PRIVATE_ROUTE.test(path);
  const rawTitle = item ? item.seoTitle || item.title : isAdmin ? "Staff sign-in" : "Page not found";
  const title = rawTitle.includes(BRAND) ? rawTitle : `${rawTitle} | ${BRAND}`;
  const description = item ? item.seoDescription || item.summary :
    isAdmin ? `Authorized staff access for ${BRAND}.` :
      "This page is unavailable. Explore our garage-door services or send a service request.";
  const origin = canonicalOrigin(requestUrl, settings);
  const indexable = canIndex(requestUrl, settings) && !!item && !isAdmin;
  const canonical = new URL(item ? contentPath(item) : path, origin).href;
  const name = BRAND;
  const pageType = item?.kind === "article" ? "Article" : "WebPage";
  const graph = item ? [
    { "@type": "WebSite", "@id": `${origin}/#website`, name, url: `${origin}/` },
    {
      "@type": pageType, "@id": `${canonical}#page`, url: canonical,
      name: title, ...(pageType === "Article" ? { headline: item.title } : {}),
      description, isPartOf: { "@id": `${origin}/#website` },
      ...(item.updatedAt ? { dateModified: item.updatedAt } : {}),
    },
    ...(path !== "/" ? [{
      "@type": "BreadcrumbList",
      itemListElement: [
         { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: item.title, item: canonical },
      ],
    }] : []),
  ] : [];
  if (indexable && settings.phone && settings.email && settings.serviceArea) {
    graph.push({
      "@type": "HomeAndConstructionBusiness", "@id": `${origin}/#business`,
      name, url: `${origin}/`, telephone: settings.phone, email: settings.email,
      areaServed: settings.serviceArea,
      // Do not fabricate a street address, ratings, prices, or opening-hours syntax.
    });
  }
  let image = "";
  if (item?.imageUrl && /^(?:\/(?!\/)|https:\/\/)/i.test(item.imageUrl)) {
    image = new URL(item.imageUrl, origin).href;
  }
  return {
    item, title, description, canonical, image, name, redirect, path,
    status: item || isAdmin ? 200 : 404,
    robots: indexable ? "index, follow" : noindex,
    origin,
    indexable,
    indexingAllowed: canIndex(requestUrl, settings),
    structuredData: { "@context": "https://schema.org", "@graph": graph },
  };
}

export function canonicalOrigin(requestUrl, settings = {}) {
  try {
    const configured = new URL(settings.canonicalOrigin);
    if (configured.protocol === "https:" && configured.pathname === "/" && !configured.username && !configured.password) {
      return configured.origin;
    }
  } catch { /* An unconfigured preview uses its own origin, never a guessed live URL. */ }
  return new URL(requestUrl).origin;
}

export function canIndex(requestUrl, settings = {}) {
  return settings.launchReady === true && settings.runtimeReady === true &&
    typeof settings.canonicalOrigin === "string" &&
    new URL(requestUrl).origin === canonicalOrigin(requestUrl, settings) &&
    !new URL(requestUrl).pathname.startsWith(PREVIEW_PREFIX);
}

export function renderSitemap(requestUrl, content, settings = {}) {
  const origin = canonicalOrigin(requestUrl, settings);
  const routes = new Map((canIndex(requestUrl, settings) ? content : [])
    .filter(visible)
    .map(item => [contentPath(item), item])
    .filter(([path]) => path));
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [...routes].map(([path, item]) => {
      const date = new Date(item.updatedAt);
      const lastmod = Number.isFinite(date.getTime()) ? `<lastmod>${date.toISOString()}</lastmod>` : "";
      return `  <url><loc>${escapeHtml(new URL(path, origin).href)}</loc>${lastmod}</url>`;
    }).join("\n") + "\n</urlset>";
}

export function renderRobots(requestUrl, settings = {}) {
  if (!canIndex(requestUrl, settings)) return "User-agent: *\nDisallow: /\n";
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\nDisallow: /sign-in\nDisallow: /sign-up\nDisallow: /api/\n\nSitemap: ${canonicalOrigin(requestUrl, settings)}/sitemap.xml\n`;
}

export function renderMetadata(route) {
  const attribute = value => escapeHtml(value);
  const json = JSON.stringify(route.structuredData).replace(/</g, "\\u003c");
  return [
    `<title>${escapeHtml(route.title)}</title>`,
    `<meta name="description" content="${attribute(route.description)}">`,
    `<meta name="robots" content="${route.robots}">`,
    `<meta name="garage-indexing" content="${route.indexingAllowed ? "approved" : "blocked"}">`,
    `<meta name="garage-canonical-origin" content="${attribute(route.origin)}">`,
    `<link rel="canonical" href="${attribute(route.canonical)}">`,
    `<meta property="og:title" content="${attribute(route.title)}">`,
    `<meta property="og:description" content="${attribute(route.description)}">`,
    `<meta property="og:url" content="${attribute(route.canonical)}">`,
    `<meta property="og:site_name" content="${attribute(route.name)}">`,
    `<meta property="og:type" content="${route.item?.kind === "article" ? "article" : "website"}">`,
    `<meta name="twitter:card" content="${route.image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${attribute(route.title)}">`,
    `<meta name="twitter:description" content="${attribute(route.description)}">`,
    ...(route.image ? [
      `<meta property="og:image" content="${attribute(route.image)}">`,
      `<meta name="twitter:image" content="${attribute(route.image)}">`,
    ] : []),
    `<script id="garage-route-schema" type="application/ld+json">${json}</script>`,
  ].join("\n");
}

export async function serveSiteDocument(request, assetResponse, content, settings) {
  const url = new URL(request.url);
  const route = describeRoute(request.url, content, settings);
  const prefixed = url.pathname === PREVIEW_PREFIX || url.pathname.startsWith(`${PREVIEW_PREFIX}/`);
  if (route.redirect || prefixed) {
    return new Response(null, {
      status: 301,
      headers: { location: new URL(route.redirect || `${route.path}${url.search}`, url.origin).href, "cache-control": "no-store" },
    });
  }
  if (!assetResponse.ok || !assetResponse.headers.get("content-type")?.includes("text/html")) {
    return assetResponse;
  }
  let html = await assetResponse.text();
  html = html
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, "")
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, "")
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "")
    .replace("</head>", `${renderMetadata(route)}\n</head>`);
  const headers = new Headers(assetResponse.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("cache-control", "no-store");
  headers.set("x-robots-tag", route.robots);
  return new Response(request.method === "HEAD" ? null : html, { status: route.status, headers });
}