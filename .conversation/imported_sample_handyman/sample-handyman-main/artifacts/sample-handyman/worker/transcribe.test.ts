/**
 * Unit tests for the speech-to-text provider module:
 *  - content-type allowlist
 *  - Workers AI primary path
 *  - throws when Workers AI fails (no fallback — OpenAI removed)
 *  - throws when AI binding is absent
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

  it("propagates the Workers AI error when the binding fails (no fallback)", async () => {
    const run = vi.fn().mockRejectedValue(new Error("ai down"));
    await expect(
      transcribeAudio({ AI: { run } }, AUDIO, "audio/webm"),
    ).rejects.toThrow("ai down");
  });

  it("throws when the AI binding is absent", async () => {
    await expect(transcribeAudio({}, AUDIO, "audio/webm")).rejects.toThrow(
      /not available/i,
    );
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
