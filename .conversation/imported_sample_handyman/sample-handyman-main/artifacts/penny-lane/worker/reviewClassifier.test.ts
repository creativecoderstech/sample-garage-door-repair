/**
 * Unit tests for the review "excellence" classifier:
 *  - low ratings short-circuit to false without calling the LLM
 *  - LLM "excellent" / "ordinary" verdicts are respected
 *  - any LLM failure (HTTP error, empty body, network error) falls back to
 *    the heuristic and never throws
 *  - missing credentials use the heuristic directly
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  classifyReviewExcellence,
  heuristicExcellent,
} from "./reviewClassifier";

const KEY = "test-key";
const URL = "https://api.example.com/v1";
const LONG_TEXT =
  "Brandon fixed our leaking washer valve fast and cleaned up perfectly!";

function mockLLM(content: string | null, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: content === null ? [] : [{ message: { content } }],
      }),
      { status },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("heuristicExcellent", () => {
  it("requires 5 stars and substantive text", () => {
    expect(heuristicExcellent(5, LONG_TEXT)).toBe(true);
    expect(heuristicExcellent(4, LONG_TEXT)).toBe(false);
    expect(heuristicExcellent(5, "Great!")).toBe(false);
  });
});

describe("classifyReviewExcellence", () => {
  it("returns false for ratings of 3 or lower without calling the LLM", async () => {
    const fetchMock = mockLLM("excellent");
    expect(await classifyReviewExcellence(KEY, URL, 3, LONG_TEXT)).toBe(false);
    expect(await classifyReviewExcellence(KEY, URL, 1, LONG_TEXT)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns true when the LLM says excellent", async () => {
    mockLLM("excellent");
    expect(await classifyReviewExcellence(KEY, URL, 5, LONG_TEXT)).toBe(true);
  });

  it("returns false when the LLM says ordinary", async () => {
    mockLLM("ordinary");
    expect(await classifyReviewExcellence(KEY, URL, 5, LONG_TEXT)).toBe(false);
  });

  it("tolerates casing/whitespace in the verdict", async () => {
    mockLLM("  Excellent\n");
    expect(await classifyReviewExcellence(KEY, URL, 4, LONG_TEXT)).toBe(true);
  });

  it("falls back to the heuristic on HTTP errors", async () => {
    mockLLM("ignored", 500);
    expect(await classifyReviewExcellence(KEY, URL, 5, LONG_TEXT)).toBe(true);
    expect(await classifyReviewExcellence(KEY, URL, 4, LONG_TEXT)).toBe(false);
  });

  it("falls back to the heuristic on empty responses", async () => {
    mockLLM(null);
    expect(await classifyReviewExcellence(KEY, URL, 5, LONG_TEXT)).toBe(true);
  });

  it("falls back to the heuristic on network errors and never throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    await expect(
      classifyReviewExcellence(KEY, URL, 5, LONG_TEXT),
    ).resolves.toBe(true);
    await expect(
      classifyReviewExcellence(KEY, URL, 4, LONG_TEXT),
    ).resolves.toBe(false);
  });

  it("uses the heuristic directly when credentials are missing", async () => {
    const fetchMock = mockLLM("ordinary");
    expect(await classifyReviewExcellence(undefined, undefined, 5, LONG_TEXT)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
