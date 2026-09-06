export type ServiceRequestDraft = {
  service: string;
  urgency: "emergency" | "soon" | "flexible";
  details: string;
};

export const SERVICE_REQUEST_DRAFT_KEY = "garage_service_request_draft";
type DraftStorage = Pick<Storage, "getItem" | "removeItem">;

// Multiple forms can observe the handoff before navigation completes. Reading
// must not consume it; the request owns it until successful submission.
export function readServiceRequestDraft(storage: DraftStorage): Partial<ServiceRequestDraft> | null {
  try {
    const saved = storage.getItem(SERVICE_REQUEST_DRAFT_KEY);
    if (!saved) return null;
    const draft = JSON.parse(saved) as Partial<ServiceRequestDraft> | null;
    if (!draft || typeof draft.details !== "string") {
      storage.removeItem(SERVICE_REQUEST_DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    try { storage.removeItem(SERVICE_REQUEST_DRAFT_KEY); } catch { /* Storage unavailable. */ }
    return null;
  }
}

export function clearServiceRequestDraft(storage: DraftStorage): void {
  storage.removeItem(SERVICE_REQUEST_DRAFT_KEY);
}