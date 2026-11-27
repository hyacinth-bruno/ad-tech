/** Translate schema terminology into useful instructions for form users. */
export function campaignFieldLabel(path: string): string {
  const labels: Record<string, string> = {
    status: "Initial campaign status",
    advertiserName: "Advertiser name", productSku: "Product SKU", productName: "Product name",
    destinationUrl: "Destination URL", imageUrl: "Image URL", headline: "Headline", bodyCopy: "Body copy",
    "targeting.categories": "Categories", "targeting.placements": "Placements", "targeting.keywords": "Keywords",
    "budget.dailyCapCents": "Daily budget cap (cents)", "budget.totalCapCents": "Total budget cap (cents)",
    "frequencyCap.impressionsPerUserPerDay": "Daily frequency cap", "schedule.startDate": "Start date", "schedule.endDate": "End date",
  };
  return labels[path] ?? path.split(".").pop() ?? path;
}
export function campaignFieldError(path: string, message: string): string {
  if (path === "productSku") return "Use 3–32 letters, numbers, hyphens or underscores.";
  if (message.includes('format "uri"')) return "Enter a valid URL, including https://.";
  if (message.includes('format "date"')) return "Choose a valid date.";
  if (path === "targeting.placements") return "Choose at least one placement.";
  if (path === "targeting.categories") return "Add at least one category, then press Enter.";
  const min = message.match(/fewer than (\d+) characters/);
  if (min) return `Enter at least ${min[1]} characters.`;
  const max = message.match(/more than (\d+) characters/);
  if (max) return `Use no more than ${max[1]} characters.`;
  if (message.includes("must be integer")) return "Enter a whole number.";
  const minimum = message.match(/>= (\d+)/);
  if (minimum) return `Enter a value of at least ${minimum[1]}.`;
  const maximum = message.match(/<= (\d+)/);
  if (maximum) return `Enter a value no higher than ${maximum[1]}.`;
  return message;
}
