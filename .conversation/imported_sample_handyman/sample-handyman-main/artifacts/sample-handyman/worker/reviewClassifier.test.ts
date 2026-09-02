/**
 * Unit tests for the review "excellence" classifier:
 *  - low ratings short-circuit to false without calling the LLM
 *  - LLM "excellent" / "ordinary" verdicts are respected
 *  - any LLM failure (rejection, empty body, timeout) falls back to
 *    the heuristic and never throws
 *  - missing AI binding uses the heuristic directly
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  classifyReviewExcellence,
  heuristicExcellent,
} from "./reviewClassifier";

const LONG_TEXT =
  "Mike fixed our leaking washer valve fast and cleaned up perfectly!";

type AiBinding = { run: ReturnType<typeof vi.fn> };

function makeAi(response: string | null, shouldThrow = false): AiBinding {
  return {
    run: vi.fn().mockImplementation(async () => {
      if (shouldThrow) throw new Error("Workers AI error");
      return { response };
    }),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
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
    const ai = makeAi("excellent");
    expect(await classifyReviewExcellence(ai, 3, LONG_TEXT)).toBe(false);
    expect(await classifyReviewExcellence(ai, 1, LONG_TEXT)).toBe(false);
    expect(ai.run).not.toHaveBeenCalled();
  });

  it("returns true when the LLM says excellent", async () => {
    expect(await classifyReviewExcellence(makeAi("excellent"), 5, LONG_TEXT)).toBe(true);
  });

  it("returns false when the LLM says ordinary", async () => {
    expect(await classifyReviewExcellence(makeAi("ordinary"), 5, LONG_TEXT)).toBe(false);
  });

  it("tolerates casing/whitespace in the verdict", async () => {
    expect(await classifyReviewExcellence(makeAi("  Excellent\n"), 4, LONG_TEXT)).toBe(true);
  });

  it("falls back to the heuristic on empty responses", async () => {
    expect(await classifyReviewExcellence(makeAi(null), 5, LONG_TEXT)).toBe(true);
    expect(await classifyReviewExcellence(makeAi(null), 4, LONG_TEXT)).toBe(false);
  });

  it("falls back to the heuristic on AI errors and never throws", async () => {
    const ai = makeAi(null, true);
    await expect(classifyReviewExcellence(ai, 5, LONG_TEXT)).resolves.toBe(true);
    await expect(classifyReviewExcellence(ai, 4, LONG_TEXT)).resolves.toBe(false);
  });

  it("uses the heuristic directly when AI binding is missing", async () => {
    expect(await classifyReviewExcellence(undefined, 5, LONG_TEXT)).toBe(true);
    expect(await classifyReviewExcellence(undefined, 4, LONG_TEXT)).toBe(false);
  });
});
