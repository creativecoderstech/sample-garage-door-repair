import { activePublicBasePath } from "./asset-url";

export const PUBLIC_SECTION_IDS = {
  services: "services",
  serviceArea: "service-area",
  gallery: "work",
  beforeAfter: "before-after",
  booking: "booking",
  faqs: "faq",
} as const;

export type PublicSection = keyof typeof PUBLIC_SECTION_IDS;

const stickyHeaderOffset = 112;

export function getPublicSectionId(section: PublicSection) {
  return PUBLIC_SECTION_IDS[section];
}

export function getPublicSectionRouterHref(section: PublicSection) {
  switch (section) {
    case "services": return "/services";
    case "serviceArea": return "/service-area";
    case "gallery": return "/gallery";
    case "beforeAfter": return "/gallery#before-after";
    case "booking": return "/#booking";
    case "faqs": return "/faqs";
  }
}

export function getPublicSectionHref(section: PublicSection) {
  return `${activePublicBasePath()}${getPublicSectionRouterHref(section)}`;
}

export function scrollToPublicSectionId(id: string, behavior: ScrollBehavior = "smooth") {
  if (typeof window === "undefined") return false;

  const element = document.getElementById(id);
  if (!element) return false;

  const top = element.getBoundingClientRect().top + window.scrollY - stickyHeaderOffset;
  window.scrollTo({ top, behavior });
  return true;
}

export function scrollToPublicSection(section: PublicSection, behavior: ScrollBehavior = "smooth") {
  return scrollToPublicSectionId(getPublicSectionId(section), behavior);
}

export function navigateToPublicSection(section: PublicSection, behavior: ScrollBehavior = "smooth") {
  if (typeof window === "undefined") return;

  const href = getPublicSectionRouterHref(section);
  const basePath = activePublicBasePath() || "/";
  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
  
  const [path, hash] = href.split('#');
  
  const targetPath = `${basePath === "/" ? "" : basePath}${path}`;

  if (currentPath !== (targetPath.replace(/\/$/, "") || "/")) {
    window.location.assign(hash ? `${targetPath}#${hash}` : targetPath);
    return;
  }

  if (hash) {
    if (window.location.hash !== `#${hash}`) {
      window.history.pushState(null, "", `#${hash}`);
    }
    scrollToPublicSectionId(hash, behavior);
  } else {
    window.scrollTo({ top: 0, behavior });
  }
}