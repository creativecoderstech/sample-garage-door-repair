/** Chat inquiry helpers. */

/** Chat inquiries are retained for 7 days, then deleted. */
export const CHAT_INQUIRY_RETENTION_DAYS = 7;

export type ChatInquiryRow = {
  id: number;
  name: string;
  phone: string | null;
  messages_json: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type StoredChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function parseMessagesJson(raw: string): StoredChatMessage[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m): m is StoredChatMessage =>
          !!m &&
          typeof m === "object" &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      )
      .map((m) => ({ role: m.role, content: m.content }));
  } catch {
    return [];
  }
}

export const serializeChatInquiry = (row: ChatInquiryRow) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  messages: parseMessagesJson(row.messages_json),
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function chatInquiryRetentionCutoffIso(
  now = Date.now(),
  days = CHAT_INQUIRY_RETENTION_DAYS,
): string {
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Delete chat inquiries older than the retention window. */
export async function purgeExpiredChatInquiries(
  db: D1Database,
  now = Date.now(),
): Promise<number> {
  const cutoff = chatInquiryRetentionCutoffIso(now);
  const result = await db
    .prepare("DELETE FROM chat_inquiries WHERE created_at < ?")
    .bind(cutoff)
    .run();
  return result.meta.changes ?? 0;
}
