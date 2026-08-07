const mockCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
});

import { generateCopySuggestions } from "../lib/aiCopy";

describe("generateCopySuggestions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("parses valid structured JSON output from the model", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            suggestions: [
              { headline: "Fuel your workouts today", bodyCopy: "25g protein per serving. Free shipping over 30 EUR.", rationale: "value" },
              { headline: "Trusted whey, clean label", bodyCopy: "Third-party tested. No fillers, no shortcuts.", rationale: "trust" },
              { headline: "Restock before it's gone", bodyCopy: "Your go-to protein, back in stock this week only.", rationale: "urgency" },
            ],
          }),
        },
      ],
    });

    const result = await generateCopySuggestions({
      productName: "Whey Protein 1kg",
      advertiserName: "Acme Supplements",
      categories: ["sports-nutrition"],
      placements: ["search"],
    });

    expect(result.suggestions).toHaveLength(3);
    expect(result.suggestions[0].headline).toContain("Fuel your workouts");
  });

  it("filters out any suggestion that violates the shared schema's length constraints", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            suggestions: [
              { headline: "Hi", bodyCopy: "Too short a headline above (below 5 chars) so this one must be dropped.", rationale: "bad" },
              { headline: "A perfectly reasonable headline", bodyCopy: "Also a perfectly reasonable and compliant body copy string here.", rationale: "good" },
            ],
          }),
        },
      ],
    });

    const result = await generateCopySuggestions({
      productName: "Whey Protein 1kg",
      advertiserName: "Acme Supplements",
      categories: ["sports-nutrition"],
      placements: ["search"],
    });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].headline).toBe("A perfectly reasonable headline");
  });

  it("throws if the model output isn't valid JSON", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "sure, here are some ideas: ..." }],
    });

    await expect(
      generateCopySuggestions({
        productName: "Whey Protein 1kg",
        advertiserName: "Acme Supplements",
        categories: ["sports-nutrition"],
        placements: ["search"],
      })
    ).rejects.toThrow("malformed JSON");
  });
});
