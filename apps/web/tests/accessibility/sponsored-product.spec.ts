import { test, expect } from "@playwright/test";

for (const clickFails of [false, true]) {
  test(`sponsored product: opens its product page and completes demo checkout (click tracking fails: ${clickFails})`, async ({ page }) => {
    const product = {
      objectID: "algolia-bestbuy-1234", sku: "BB-1234", source: "algolia-bestbuy", sourceProductId: "1234",
      name: "Sponsored test headphones", brand: "Northstar", description: "Headphones for your everyday listening.",
      categories: ["Headphones"], price: 49.99, currency: "USD", destinationUrl: "https://example.com/original-product",
    };
    let clicks = 0;
    await page.route("**/store/search?**", (route) => route.fulfill({ json: {
      products: [product], total: 1, page: 1, pages: 1, pageSize: 24, processingTimeMS: 1,
      facets: { categories: { Headphones: 1 }, brand: { Northstar: 1 } }, appliedRules: [], analyticsRecorded: false, engine: "algolia",
    } }));
    await page.route("**/store/products/BB-1234", (route) => route.fulfill({ json: product }));
    await page.route("**/store/events", (route) => route.fulfill({ status: 202, json: {} }));
    await page.route("**/serve?**", (route) => route.fulfill({ json: {
      campaignId: "sponsored-campaign-test", productSku: product.sku, headline: "Discover your next headphones",
      bodyCopy: "Find your sound with our sponsored selection.", destinationUrl: product.destinationUrl,
    } }));
    await page.route("**/serve/click", async (route) => {
      clicks++;
      expect(route.request().postDataJSON()).toMatchObject({ campaignId: "sponsored-campaign-test", placement: "category" });
      await route.fulfill({ status: clickFails ? 503 : 202, json: {} });
    });
    await page.route("**/store/checkout", async (route) => {
      const input = route.request().postDataJSON();
      expect(input.items).toEqual([{ objectID: product.objectID, quantity: 1 }]);
      await route.fulfill({ status: 201, json: { orderId: input.orderId, totalCents: 4999, currency: "USD", items: input.items } });
    });
    await page.goto("/shop");
    const discover = page.getByRole("link", { name: /^Discover more/ });
    await expect(discover).toHaveAttribute("href", "/shop/products/BB-1234");
    await expect(discover).not.toHaveAttribute("target", "_blank");
    await discover.click();
    await expect(page).toHaveURL(/\/shop\/products\/BB-1234$/);
    await expect(page.getByRole("heading", { level: 1, name: product.name })).toBeVisible();
    await expect.poll(() => clicks).toBe(1);
    await page.getByRole("button", { name: /^Add to bag/ }).click();
    const bag = page.getByRole("dialog", { name: /^Your bag/ });
    await expect(bag.getByText(product.name, { exact: true })).toBeVisible();
    await bag.getByRole("button", { name: "Complete demo checkout", exact: true }).click();
    await expect(bag.getByRole("status")).toContainText("Demo order complete");
    await expect(bag.getByRole("status")).toContainText("$49.99");
    expect(page.context().pages()).toHaveLength(1);
  });
}
