import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const initial = {
  _id: "status-test-campaign", status: "active", advertiserName: "Northstar Test",
  productName: "Test headphones", productSku: "TEST-001", headline: "Headphones for every day",
  bodyCopy: "Comfortable headphones for your daily listening.", destinationUrl: "https://example.com",
  budget: { dailyCapCents: 1000, totalCapCents: 10000 },
  targeting: { categories: ["Headphones"], placements: ["search"] },
  schedule: { startDate: "2026-11-01", endDate: "2026-12-31" },
  frequencyCap: { impressionsPerUserPerDay: 3 },
};

test("campaign status: saves all states and persists after reload", async ({ page }) => {
  let campaign = { ...initial };
  const submitted: string[] = [];
  await page.route("**/campaigns", (route) => route.fulfill({ json: [campaign] }));
  await page.route("**/campaigns/status-test-campaign/status", async (route) => {
    expect(route.request().method()).toBe("POST");
    const { status } = route.request().postDataJSON();
    submitted.push(status);
    campaign = { ...campaign, status };
    await route.fulfill({ json: campaign });
  });
  await page.goto("/");
  const badge = page.getByRole("button", { name: /^Change status for Test headphones/ });
  await expect(badge).toContainText("Active");
  for (const status of ["paused", "ended", "draft", "active"]) {
    await badge.click();
    await page.getByRole("menuitemradio", { name: status, exact: false }).click();
    await expect(page.getByText(`Test headphones: campaign status changed to ${status}.`, { exact: true })).toBeVisible();
    await page.reload();
    await expect(badge).toContainText(status[0].toUpperCase() + status.slice(1));
    await expect(page.getByRole("tab", { name: new RegExp(`^${status[0].toUpperCase() + status.slice(1)} \\(1\\)`) })).toBeVisible();
    await expect(page.getByRole("link", { name: "Test placement" })).toHaveCount(status === "active" ? 1 : 0);
  }
  expect(submitted).toEqual(["paused", "ended", "draft", "active"]);
  await page.reload();
  await expect(badge).toContainText("Active");
  await badge.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(page.getByRole("menuitemradio", { name: "Active", exact: true })).toHaveAttribute("aria-checked", "true");
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  expect(axe.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(badge).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("campaign status: failed save keeps the original state and supports retry", async ({ page }) => {
  let attempts = 0;
  await page.route("**/campaigns", (route) => route.fulfill({ json: [initial] }));
  await page.route("**/campaigns/status-test-campaign/status", async (route) => {
    attempts++;
    if (attempts === 1) await route.fulfill({ status: 503, json: { error: "unavailable" } });
    else await route.fulfill({ json: { ...initial, status: "paused" } });
  });
  await page.goto("/");
  const badge = page.getByRole("button", { name: /^Change status for Test headphones/ });
  await badge.click();
  await page.getByRole("menuitemradio", { name: "Paused", exact: true }).click();
  await expect(page.getByRole("tabpanel").getByRole("alert")).toHaveText("Status couldn’t be updated. Open the status menu to try again.");
  await expect(page.getByRole("tab", { name: /^Active \(1\)/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Test placement" })).toBeVisible();
  await expect(badge).toContainText("Active");
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  expect(axe.violations).toEqual([]);
  await badge.click();
  await page.getByRole("menuitemradio", { name: "Paused", exact: true }).click();
  await expect(page.getByText("Test headphones: campaign status changed to paused.", { exact: true })).toBeVisible();
  await expect(page.getByRole("tabpanel").getByRole("alert")).toHaveCount(0);
  expect(attempts).toBe(2);
});

test("campaign status: filtered card disappears and focus returns to its status tab", async ({ page }) => {
  await page.route("**/campaigns", (route) => route.fulfill({ json: [initial] }));
  await page.route("**/campaigns/status-test-campaign/status", (route) => route.fulfill({ json: { ...initial, status: "ended" } }));
  await page.goto("/");
  await page.getByRole("tab", { name: /^Active \(1\)/ }).click();
  await page.getByRole("button", { name: /^Change status for Test headphones/ }).click();
  await page.getByRole("menuitemradio", { name: "Ended", exact: true }).click();
  await expect(page.getByRole("tab", { name: /^Active \(0\)/ })).toBeFocused();
  await expect(page.getByRole("button", { name: /^Change status for Test headphones/ })).toHaveCount(0);
  await expect(page.getByText("Test headphones: campaign status changed to ended.", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /^Ended \(1\)/ }).click();
  await expect(page.getByRole("button", { name: /^Change status for Test headphones/ })).toContainText("Ended");
});
