import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const status of ["draft", "active", "paused", "ended"]) {
  test(`builder initial status: creates ${status} without a second status request`, async ({ page }) => {
    const product = {
      objectID: "algolia-bestbuy-12345", sku: "BB-12345", source: "algolia-bestbuy", sourceProductId: "12345",
      name: "Status test headphones", brand: "Northstar", description: "Headphones for your daily listening.",
      categories: ["Audio", "Headphones"], price: 49.99, currency: "USD", destinationUrl: "https://example.com/product",
    };
    let campaign: Record<string, unknown> | null = null;
    let createRequests = 0, statusRequests = 0;
    await page.route("**/products?**", (route) => route.fulfill({ json: { products: [product], total: 1, page: 1, pageSize: 20 } }));
    await page.route("**/campaigns", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: campaign ? [campaign] : [] });
      createRequests++;
      const input = route.request().postDataJSON();
      expect(input.status).toBe(status);
      campaign = { ...input, _id: "000000000000000000000123" };
      await route.fulfill({ status: 201, json: campaign });
    });
    await page.route("**/campaigns/*/status", (route) => {
      statusRequests++;
      return route.fulfill({ json: campaign });
    });
    await page.goto("/campaigns/new");
    await page.getByRole("combobox", { name: "Find a catalog product" }).fill("headphones");
    await page.getByRole("option", { name: /Status test headphones/ }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("checkbox", { name: "Search results", exact: true }).check();
    await page.getByLabel(/^Start date/).fill("2026-12-01");
    await page.getByLabel(/^End date/).fill("2026-12-31");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    const initialStatus = page.getByRole("combobox", { name: /^Initial campaign status/ });
    await expect(initialStatus).toHaveValue("active");
    await initialStatus.selectOption(status);
    // Moving between steps must preserve the selected initial status.
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(initialStatus).toHaveValue(status);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    expect(result.violations).toEqual([]);
    const label = status === "active" ? "Launch campaign" : status === "draft" ? "Save draft" : `Create ${status} campaign`;
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: `Change status for Status test headphones, currently ${status}`, exact: true })).toBeVisible();
    expect(createRequests).toBe(1);
    expect(statusRequests).toBe(0);
  });
}
