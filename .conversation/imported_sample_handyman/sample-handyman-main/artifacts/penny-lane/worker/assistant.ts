/**
 * AI assistant provider — OpenAI chat completions, model gpt-5.4-mini.
 */
export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantContext = {
  services: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
  phone: string;
};

const STATIC_PROMPT_HEADER = `You are the friendly virtual assistant for Penny Lane Home Solutions, a veteran-owned handyman business run by Brandon, serving the Northern Atlanta Metro area (Canton, GA and surrounding communities, zip 30115).

Your job:
- Answer questions about services, pricing, service area, credentials, and availability.
- Encourage visitors to submit a booking request through the booking form on this website (name, phone, service, job description, preferred date/time). Brandon will follow up quickly with a quote.
- If a job is outside Brandon's scope (major electrical panel work, gas lines, roofing, HVAC, structural work, or anything requiring a specialty license), say so honestly and suggest contacting a licensed specialist.
- Keep answers short, warm, and practical (2-4 sentences typically). Never invent facts not listed above. Do not use emojis.`;

const STATIC_PROMPT_FOOTER = `Business credentials & facts:
- Thumbtack Top Pro 2024 & 2025 with 4.9 stars (110 reviews), TaskRabbit 5.0 stars (384 reviews, 660+ completed tasks).
- Background checked, general liability insurance through Next Insurance, veteran owned and operated, 4 years in business.
- Pricing: every job is quoted individually — Brandon provides a clear estimate after reviewing the job details. Do not quote specific hourly rates; instead invite the visitor to submit a booking request for a quick, no-surprise estimate. Focused on smaller jobs done right.
- Payments accepted: Apple Pay, cash, check, credit card, PayPal, Square, Venmo, Zelle.
- Typical response time: about 41 minutes.
- After a customer submits a service request, they will get a call from Penny Lane Home Solutions to confirm the appointment schedule.`;

export function buildSystemPrompt(ctx: AssistantContext): string {
  const serviceLines =
    ctx.services.length > 0
      ? ctx.services
          .map((s) => `  - ${s.title}: ${s.description}`)
          .join("\n")
      : "  - General handyman services (see booking form for details)";

  const faqLines =
    ctx.faqs.length > 0
      ? ctx.faqs.map((f) => `  Q: ${f.question}\n  A: ${f.answer}`).join("\n\n")
      : "";

  const faqSection =
    faqLines
      ? `\nFrequently asked questions (use these answers verbatim when relevant):\n${faqLines}`
      : "";

  return [
    STATIC_PROMPT_HEADER,
    `\nContact phone: ${ctx.phone}`,
    `\nCurrent services offered:\n${serviceLines}`,
    faqSection,
    `\n${STATIC_PROMPT_FOOTER}`,
  ].join("\n");
}

const MODEL = "gpt-5.4-mini";

type OpenAIChatResponse = {
  choices: { message: { content: string } }[];
};

export async function getChatReply(
  openaiApiKey: string,
  openaiBaseUrl: string,
  history: AssistantMessage[],
  ctx: AssistantContext,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(ctx);

  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ],
    max_completion_tokens: 512,
  });

  const base = openaiBaseUrl.replace(/\/$/, "");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(`OpenAI API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as OpenAIChatResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }
  return content;
}
