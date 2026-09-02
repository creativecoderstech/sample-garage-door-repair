/**
 * Unit tests for the speech-to-text provider module:
 *  - content-type allowlist
 *  - Workers AI primary path
 *  - fallback to the OpenAI-compatible API when Workers AI fails/missing
 *  - hard failure when no provider is available
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { transcribeAudio, isAllowedAudioType, MAX_AUDIO_BYTES } from "./transcribe";
import { isPublicApiRoute } from "./api-guards";

const AUDIO = new TextEncoder().encode("fake-audio").buffer as ArrayBuffer;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isAllowedAudioType", () => {
  it("accepts common recorder formats incl. codec suffixes", () => {
    expect(isAllowedAudioType("audio/webm")).toBe(true);
    expect(isAllowedAudioType("audio/webm;codecs=opus")).toBe(true);
    expect(isAllowedAudioType("audio/mp4")).toBe(true);
    expect(isAllowedAudioType("video/mp4")).toBe(true);
  });
  it("rejects non-audio types", () => {
    expect(isAllowedAudioType("application/json")).toBe(false);
    expect(isAllowedAudioType("text/plain")).toBe(false);
    expect(isAllowedAudioType("")).toBe(false);
  });
});

describe("transcribeAudio", () => {
  it("uses Workers AI when the binding is present", async () => {
    const run = vi.fn().mockResolvedValue({ text: " hello world " });
    const text = await transcribeAudio({ AI: { run } }, AUDIO, "audio/webm");
    expect(text).toBe("hello world");
    expect(run).toHaveBeenCalledWith(
      "@cf/openai/whisper-large-v3-turbo",
      expect.objectContaining({ audio: expect.any(String) }),
    );
  });

  it("falls back to OpenAI when Workers AI fails", async () => {
    const run = vi.fn().mockRejectedValue(new Error("boom"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ text: "fallback text" }), { status: 200 }),
      ),
    );
    const text = await transcribeAudio(
      { AI: { run }, OPENAI_API_KEY: "k", OPENAI_BASE_URL: "https://api.example.com/v1" },
      AUDIO,
      "audio/mp4",
    );
    expect(text).toBe("fallback text");
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("https://api.example.com/v1/audio/transcriptions");
  });

  it("throws when no provider is configured", async () => {
    await expect(transcribeAudio({}, AUDIO, "audio/webm")).rejects.toThrow();
  });

  it("surfaces the Workers AI error when there is no fallback", async () => {
    const run = vi.fn().mockRejectedValue(new Error("ai down"));
    await expect(transcribeAudio({ AI: { run } }, AUDIO, "audio/webm")).rejects.toThrow("ai down");
  });

  it("exports a 5 MB cap", () => {
    expect(MAX_AUDIO_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe("auth gate", () => {
  it("POST /api/transcribe is public (anonymous visitors can use it)", () => {
    expect(isPublicApiRoute("POST", "/api/transcribe")).toBe(true);
    expect(isPublicApiRoute("GET", "/api/transcribe")).toBe(false);
  });
});
