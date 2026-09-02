/**
 * Chat assistant tests.
 *
 * Split into two sections:
 *
 * 1. Unit tests — call getChatReply / buildSystemPrompt directly with a mock
 *    AI binding. No Worker sandbox required; run in the vitest-pool-workers
 *    context like all other worker tests.
 *
 * 2. Integration tests — exercise POST /api/chat via SELF.fetch. The test
 *    wrangler config omits the AI binding (adding it would require a remote
 *    Cloudflare proxy session unavailable in CI), so c.env.AI is undefined and
 *    the route returns 503. These tests verify the fallback / error paths.
 */
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { getChatReply, buildSystemPrompt, type AssistantContext } from "./assistant";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function req(path: string, opts: RequestInit = {}) {
  return new Request(`http://localhost${path}`, opts);
}

const BASE_CTX: AssistantContext = {
  services: [{ title: "Plumbing", description: "Leak repairs" }],
  faqs: [],
  phone: "(512) 244-8550",
  bookingUrl: "https://example.com/#booking",
};

// ---------------------------------------------------------------------------
// Unit: buildSystemPrompt
// ---------------------------------------------------------------------------

describe("buildSystemPrompt", () => {
  it("includes the business name", () => {
    const prompt = buildSystemPrompt(BASE_CTX);
    expect(prompt).toContain("Mike's Handyman Service");
  });

  it("includes the phone number from context", () => {
    const prompt = buildSystemPrompt(BASE_CTX);
    expect(prompt).toContain("(512) 244-8550");
  });

  it("lists services", () => {
    const prompt = buildSystemPrompt(BASE_CTX);
    expect(prompt).toContain("Plumbing");
  });

  it("includes FAQs when present", () => {
    const ctx: AssistantContext = {
      ...BASE_CTX,
      faqs: [{ question: "Do you work weekends?", answer: "Yes!" }],
    };
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("Do you work weekends?");
  });

  it("introduces the assistant as Sarah, a human team member", () => {
    const prompt = buildSystemPrompt(BASE_CTX);
    expect(prompt).toContain("You are Sarah");
    expect(prompt).toContain("Never say or imply that you are an AI");
  });

  it("includes the booking URL with markdown-link instructions", () => {
    const prompt = buildSystemPrompt(BASE_CTX);
    expect(prompt).toContain("https://example.com/#booking");
    expect(prompt).toContain("[Request a Quote](https://example.com/#booking)");
    expect(prompt).toContain("markdown link");
  });
});

// ---------------------------------------------------------------------------
// Unit: getChatReply — directly with a mock AI binding
// ---------------------------------------------------------------------------

describe("getChatReply", () => {
  it("returns the response text from Workers AI", async () => {
    const mockAi = {
      run: async (_model: string, _input: Record<string, unknown>) => ({
        response: "I can help with plumbing!",
      }),
    };
    const reply = await getChatReply(
      mockAi,
      [{ role: "user", content: "What can you fix?" }],
      BASE_CTX,
    );
    expect(reply).toBe("I can help with plumbing!");
  });

  it("calls the correct Workers AI model", async () => {
    let capturedModel = "";
    const mockAi = {
      run: async (model: string, _input: Record<string, unknown>) => {
        capturedModel = model;
        return { response: "OK" };
      },
    };
    await getChatReply(mockAi, [{ role: "user", content: "Hi" }], BASE_CTX);
    expect(capturedModel).toBe("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  });

  it("passes max_tokens and a system message", async () => {
    let capturedInput: Record<string, unknown> = {};
    const mockAi = {
      run: async (_model: string, input: Record<string, unknown>) => {
        capturedInput = input;
        return { response: "OK" };
      },
    };
    await getChatReply(mockAi, [{ role: "user", content: "Hi" }], BASE_CTX);
    expect(capturedInput.max_tokens).toBe(512);
    const messages = capturedInput.messages as { role: string; content: string }[];
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("Mike's Handyman Service");
  });

  it("throws when Workers AI returns an empty response", async () => {
    const mockAi = {
      run: async () => ({ response: "" }),
    };
    await expect(
      getChatReply(mockAi, [{ role: "user", content: "Hi" }], BASE_CTX),
    ).rejects.toThrow(/empty/i);
  });
});

// ---------------------------------------------------------------------------
// Integration: POST /api/chat — AI binding absent (no CLOUDFLARE_API_TOKEN in CI)
// ---------------------------------------------------------------------------

describe("POST /api/chat — AI binding unavailable", () => {
  it("returns 503 when the AI binding is not configured", async () => {
    const res = await SELF.fetch(
      req("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      }),
    );
    // Without an AI binding the route short-circuits to 503.
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/unavailable/i);
  });

  it("returns 400 for an empty messages array", async () => {
    const res = await SELF.fetch(
      req("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
