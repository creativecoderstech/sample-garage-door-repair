/**
 * Thank-you email on booking completion.
 * PATCH /api/bookings/:id must send the customer a review-request email
 * only on the transition INTO "completed": not on repeat completed updates,
 * not for other statuses, and skipped when the booking has no email.
 * The email is sent via waitUntil and must never block the status update.
 */
import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import worker from "./index";

type EmailMsg = {
  to: string | string[];
  from: { email: string; name?: string } | string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
};

function db() {
  return (env as unknown as { DB: D1Database }).DB;
}

async function seedBooking(opts: { email: string | null; status?: string }): Promise<number> {
  const row = await db()
    .prepare(
      `INSERT INTO bookings (name, email, phone, service, description, scheduled_date, scheduled_time, status, source)
       VALUES ('Casey Customer', ?, '(512) 555-0000', 'Drywall Repair', 'Patch hallway wall', '2026-08-20', 'morning', ?, 'web')
       RETURNING id`,
    )
    .bind(opts.email, opts.status ?? "confirmed")
    .first<{ id: number }>();
  if (!row) throw new Error("seed insert failed");
  return row.id;
}

async function patchStatus(
  id: number,
  status: string,
  emailSend: ReturnType<typeof vi.fn>,
): Promise<Response> {
  const testEnv = {
    ...(env as Record<string, unknown>),
    EMAIL: { send: emailSend },
  };
  const ctx = createExecutionContext();
  const res = await worker.fetch(
    new Request(`http://localhost/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: `pl_session=${session}` },
      body: JSON.stringify({ status }),
    }),
    testEnv as never,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return res;
}

let session: string;

function parseCookies(res: Response): Map<string, string> {
  const map = new Map<string, string>();
  const raw = res.headers as unknown as { getSetCookie?: () => string[] };
  const lines: string[] =
    typeof raw.getSetCookie === "function"
      ? raw.getSetCookie()
      : (res.headers.get("set-cookie") ?? "").split(/,(?=[^;])/);
  for (const line of lines) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    map.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  return map;
}

describe("completion thank-you email", () => {
  beforeEach(async () => {
    await db().prepare("DELETE FROM bookings").run();
    await db()
      .prepare(
        `INSERT INTO site_settings (key, value) VALUES
           ('notify_from_email', 'no-reply@sample-handyman.com'),
           ('owner_email', 'mike@example.com')
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run();
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request("http://localhost/api/auth/dev-login", { redirect: "manual" }),
      env as never,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    const cookie = parseCookies(res).get("pl_session");
    if (!cookie) throw new Error("dev-login did not return a session cookie");
    session = cookie;
  });

  it("sends the review-request email on transition to completed", async () => {
    const id = await seedBooking({ email: "casey@example.com" });
    const send = vi.fn(async (_msg: EmailMsg) => ({ messageId: "m1" }));

    const res = await patchStatus(id, "completed", send);
    expect(res.status).toBe(200);

    expect(send).toHaveBeenCalledTimes(1);
    const msg = send.mock.calls[0][0] as EmailMsg;
    expect(msg.to).toBe("casey@example.com");
    expect(msg.subject).toContain("Thank you");
    expect(msg.text).toContain("https://sample-handyman.com/#testimonials");
    expect(msg.html).toContain("https://sample-handyman.com/#testimonials");
    expect(msg.text).toContain("Drywall Repair");
  });

  it("does not re-send when already completed", async () => {
    const id = await seedBooking({ email: "casey@example.com", status: "completed" });
    const send = vi.fn(async (_msg: EmailMsg) => ({ messageId: "m1" }));

    const res = await patchStatus(id, "completed", send);
    expect(res.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it("does not send for other status changes", async () => {
    const id = await seedBooking({ email: "casey@example.com" });
    const send = vi.fn(async (_msg: EmailMsg) => ({ messageId: "m1" }));

    const res = await patchStatus(id, "cancelled", send);
    expect(res.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it("skips silently when the booking has no email; update still succeeds", async () => {
    const id = await seedBooking({ email: null });
    const send = vi.fn(async (_msg: EmailMsg) => ({ messageId: "m1" }));

    const res = await patchStatus(id, "completed", send);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("completed");
    expect(send).not.toHaveBeenCalled();
  });

  it("status update succeeds even when email sending throws", async () => {
    const id = await seedBooking({ email: "casey@example.com" });
    const send = vi.fn(async () => {
      throw new Error("provider down");
    });

    const res = await patchStatus(id, "completed", send);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("completed");
    expect(send).toHaveBeenCalledTimes(1);
  });
});
