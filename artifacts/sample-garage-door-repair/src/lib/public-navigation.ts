export const PUBLIC_SECTION_IDS = {
  services: "services",
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

export function getPublicSectionHref(section: PublicSection) {
  return `${import.meta.env.BASE_URL}#${getPublicSectionId(section)}`;
}

export function getPublicSectionRouterHref(section: PublicSection) {
  return `/#${getPublicSectionId(section)}`;
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

  const id = getPublicSectionId(section);
  const basePath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname.replace(/\/$/, "") || "/";
  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";

  if (currentPath !== basePath) {
    window.location.assign(`${basePath === "/" ? "/" : `${basePath}/`}#${id}`);
    return;
  }

  if (window.location.hash !== `#${id}`) {
    window.history.pushState(null, "", `#${id}`);
  }
  scrollToPublicSection(section, behavior);
}