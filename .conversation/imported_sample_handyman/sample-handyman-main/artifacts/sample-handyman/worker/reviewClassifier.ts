/**
 * Decides whether a just-submitted customer review is "excellent" — i.e.
 * worth prompting the customer to also post it on Google.
 *
 * The verdict is advisory UI metadata only: it must NEVER block or fail the
 * review submission. Any LLM error or timeout falls back to a simple
 * heuristic.
 */

type AiBinding = { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };

const MODEL = "@cf/meta/llama-3.1-8b-instruct";
// Tight budget: the verdict is awaited during form submission, so worst-case
// latency must stay acceptable for a public form. On timeout we fall back to
// the heuristic.
const LLM_TIMEOUT_MS = 2_500;

const SYSTEM_PROMPT = `You are a marketing assistant for a handyman business.
Given a customer review (star rating 1-5 and text), decide if it is an EXCELLENT review — glowing, positive, specific enough that the business would love it on their public Google profile.

Guidelines:
- Excellent requires clear satisfaction (typically 5 stars, occasionally an enthusiastic 4) AND genuinely positive text.
- NOT excellent: any complaint, mixed feelings, sarcasm, spam, gibberish, off-topic text, or profanity.
- Respond with ONLY one word: "excellent" or "ordinary". No punctuation, no explanation.`;

/** Fallback when the LLM is unavailable: 5 stars + substantive text. */
export function heuristicExcellent(rating: number, text: string): boolean {
  return rating === 5 && text.trim().length >= 40;
}

type WorkersAiChatOutput = {
  response?: string;
};

/**
 * Classify a review. Resolves within ~LLM_TIMEOUT_MS and never rejects.
 */
export async function classifyReviewExcellence(
  ai: AiBinding | undefined,
  rating: number,
  text: string,
): Promise<boolean> {
  // Cheap pre-filter: low ratings are never excellent; skip the LLM call.
  if (rating <= 3) return false;

  if (!ai) {
    return heuristicExcellent(rating, text);
  }

  try {
    const aiPromise = ai.run(MODEL, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Rating: ${rating}/5\nReview: ${text.slice(0, 2000)}`,
        },
      ],
      max_tokens: 16,
    }) as Promise<WorkersAiChatOutput>;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Workers AI classification timed out")), LLM_TIMEOUT_MS),
    );

    const result = await Promise.race([aiPromise, timeoutPromise]);
    const verdict = result?.response?.trim().toLowerCase();
    if (!verdict) throw new Error("empty classification response");
    return verdict.startsWith("excellent");
  } catch (err) {
    console.error("Review classification failed; using heuristic", err);
    return heuristicExcellent(rating, text);
  }
}
