import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export interface CopySuggestionRequest {
  productName: string;
  advertiserName: string;
  categories: string[];
  placements: string[];
  tone?: "direct" | "playful" | "premium";
}

export interface CopySuggestion {
  headline: string;
  bodyCopy: string;
  rationale: string;
}

export interface CopySuggestionResult {
  suggestions: CopySuggestion[];
}

const SYSTEM_PROMPT = `You are an ad copywriter for a retail media platform. Given a product and
targeting context, propose sponsored-listing ad copy.

Hard constraints you must follow exactly, because a JSON Schema validator
downstream will reject anything that violates them:
- headline: 5 to 60 characters
- bodyCopy: 10 to 160 characters
- No superlatives that can't be substantiated ("best", "#1", "guaranteed") unless the product name itself contains them
- No ALL CAPS words, no more than one exclamation mark total across both fields

Respond with ONLY a JSON object matching this shape, no prose, no markdown fences:
{"suggestions": [{"headline": string, "bodyCopy": string, "rationale": string}, ...]}
Return exactly 3 suggestions, each with a distinct angle (e.g. price/value, quality/trust, urgency/relevance).`;

/**
 * Generates ad-copy suggestions for the Campaign Builder's "Creative" step.
 * The response is parsed and then re-validated against the same length
 * constraints the JSON Schema enforces, so a model slip (e.g. a 61-char
 * headline) is caught server-side before it ever reaches the form.
 */
export async function generateCopySuggestions(req: CopySuggestionRequest): Promise<CopySuggestionResult> {
  const message = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          productName: req.productName,
          advertiserName: req.advertiserName,
          categories: req.categories,
          placements: req.placements,
          tone: req.tone ?? "direct",
        }),
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI copy generation returned no text content");
  }

  let parsed: CopySuggestionResult;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch (err) {
    logger.error({ err, raw: textBlock.text }, "failed to parse AI copy suggestion JSON");
    throw new Error("AI copy generation returned malformed JSON");
  }

  const filtered = parsed.suggestions.filter(
    (s) => s.headline.length >= 5 && s.headline.length <= 60 && s.bodyCopy.length >= 10 && s.bodyCopy.length <= 160
  );

  if (filtered.length === 0) {
    throw new Error("AI copy generation returned no suggestions within schema constraints");
  }

  return { suggestions: filtered };
}
