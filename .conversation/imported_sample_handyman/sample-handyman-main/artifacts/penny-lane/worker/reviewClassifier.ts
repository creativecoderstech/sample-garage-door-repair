/**
 * Decides whether a just-submitted customer review is "excellent" — i.e.
 * worth prompting the customer to also post it on Google.
 *
 * The verdict is advisory UI metadata only: it must NEVER block or fail the
 * review submission. Any LLM error or timeout falls back to a simple
 * heuristic.
 */

const MODEL = "gpt-5.4-mini";
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

type OpenAIChatResponse = {
  choices: { message: { content: string } }[];
};

/**
 * Classify a review. Resolves within ~LLM_TIMEOUT_MS and never rejects.
 */
export async function classifyReviewExcellence(
  openaiApiKey: string | undefined,
  openaiBaseUrl: string | undefined,
  rating: number,
  text: string,
): Promise<boolean> {
  // Cheap pre-filter: low ratings are never excellent; skip the LLM call.
  if (rating <= 3) return false;

  if (!openaiApiKey || !openaiBaseUrl) {
    return heuristicExcellent(rating, text);
  }

  try {
    const base = openaiBaseUrl.replace(/\/$/, "");
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Rating: ${rating}/5\nReview: ${text.slice(0, 2000)}`,
          },
        ],
        max_completion_tokens: 16,
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error ${response.status}`);
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const verdict = data.choices?.[0]?.message?.content?.trim().toLowerCase();
    if (!verdict) throw new Error("empty classification response");
    return verdict.startsWith("excellent");
  } catch (err) {
    console.error("Review classification failed; using heuristic", err);
    return heuristicExcellent(rating, text);
  }
}
