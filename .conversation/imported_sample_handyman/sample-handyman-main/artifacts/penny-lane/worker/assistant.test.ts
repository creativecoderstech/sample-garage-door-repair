/**
 * Chat assistant integration tests.
 * Runs inside the Miniflare Workers sandbox via @cloudflare/vitest-pool-workers.
 *
 * Covers:
 *  - POST /api/chat → 200 with reply from gpt-5.4-mini
 *  - Outbound OpenAI request uses model=gpt-5.4-mini and max_completion_tokens
 *  - POST /api/chat → 500 when OpenAI returns an error
 */
import { SELF } from "cloudflare:test";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function req(path: string, opts: RequestInit = {}) {
  return new Request(`http://localhost${path}`, opts);
}

/** Captured outbound fetch calls made during the test. */
let capturedRequests: { url: string; body: unknown }[] = [];

function stubOpenAI(reply: string) {
  capturedRequests = [];
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        input instanceof Request
          ? input.url
          : typeof input === "string"
            ? input
            : input.toString();

      if (url.includes("/chat/completions")) {
        const body = init?.body ? JSON.parse(init.body as string) : null;
        capturedRequests.push({ url, body });
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: reply } }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      // Pass anything else through (e.g. D1 internal calls)
      return fetch(input, init);
    },
  );
}

function stubOpenAIError(status: number, message: string) {
  capturedRequests = [];
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        input instanceof Request
          ? input.url
          : typeof input === "string"
            ? input
            : input.toString();

      if (url.includes("/chat/completions")) {
        capturedRequests.push({ url, body: null });
        return new Response(
          JSON.stringify({ error: { message } }),
          { status, headers: { "content-type": "application/json" } },
        );
      }

      return fetch(input, init);
    },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  capturedRequests = [];
});

// ---------------------------------------------------------------------------
// POST /api/chat — success path
// ---------------------------------------------------------------------------

describe("POST /api/chat", () => {
  beforeEach(() => {
    stubOpenAI("I can help with plumbing repairs, furniture assembly, and more!");
  });

  it("returns 200 with the assistant reply", async () => {
    const res = await SELF.fetch(
      req("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "What services do you offer?" }],
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { reply: string };
    expect(body.reply).toBe(
      "I can help with plumbing repairs, furniture assembly, and more!",
    );
  });

  it("sends a request to the configured OpenAI base URL", async () => {
    await SELF.fetch(
      req("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      }),
    );

    expect(capturedRequests).toHaveLength(1);
    expect(capturedRequests[0].url).toContain("/chat/completions");
  });

  it("uses the gpt-5.4-mini model and max_completion_tokens", async () => {
    await SELF.fetch(
      req("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      }),
    );

    expect(capturedRequests).toHaveLength(1);
    const body = capturedRequests[0].body as {
      model: string;
      max_completion_tokens: number;
      max_tokens?: unknown;
    };
    expect(body.model).toBe("gpt-5.4-mini");
    expect(body.max_completion_tokens).toBe(512);
    expect(body.max_tokens).toBeUndefined();
  });

  it("includes a system prompt as the first message", async () => {
    await SELF.fetch(
      req("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      }),
    );

    const body = capturedRequests[0].body as {
      messages: { role: string; content: string }[];
    };
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("Penny Lane Home Solutions");
  });
});

// ---------------------------------------------------------------------------
// POST /api/chat — error path
// ---------------------------------------------------------------------------

describe("POST /api/chat — OpenAI error", () => {
  it("returns 500 when the OpenAI API responds with an error", async () => {
    stubOpenAIError(500, "Internal server error");

    const res = await SELF.fetch(
      req("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      }),
    );

    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/unavailable/i);
  });
});
