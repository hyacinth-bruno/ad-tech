import { test, expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
async function audit(page: Page, info: TestInfo, state: string) {
  const result = await new AxeBuilder({ page }).withTags(tags).analyze();
  await info.attach(`${state}-axe.json`, { body: JSON.stringify(result, null, 2), contentType: "application/json" });
  await info.attach(`${state}.png`, { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
  expect(result.violations, `${state}: ${JSON.stringify(result.violations.map((v) => ({ rule: v.id, targets: v.nodes.map((n) => n.target) })))}`).toEqual([]);
}
async function skipNavigation(page: Page) {
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content", exact: true });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
}

test("campaigns: axe, skip link, status tabs, result announcement and search", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /All campaigns \(/ }).waitFor();
  await skipNavigation(page);
  await audit(page, info, "campaigns");
  const all = page.getByRole("tab", { name: /All campaigns \(/ });
  await all.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
  const active = page.getByRole("tab", { name: /^Active/ });
  await expect(active).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", await active.getAttribute("id") as string);
  await page.getByLabel("Search campaigns", { exact: true }).fill("no-match-accessibility-check");
  await expect(page.getByText("A little too specific?", { exact: true })).toBeVisible();
  await audit(page, info, "campaigns-empty-filter");
});

test("builder: every step, error summary, error focus, catalog and review", async ({ page }, info) => {
  await page.goto("/campaigns/new"); await page.getByRole("button", { name: "Next", exact: true }).waitFor();
  await skipNavigation(page); await audit(page, info, "builder-basics");
  await page.getByLabel(/^Advertiser name/).focus();
  await expect.poll(() => page.getByLabel(/^Advertiser name/).evaluate((el) => getComputedStyle(el, "::placeholder").opacity)).toBe("1");
  const contrastChecks = await page.evaluate(() => {
    const luminance = (color: string) => {
      const values = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map((v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    const contrast = (a: string, b: string) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const steps = Array.from(document.querySelectorAll(".MuiStepIcon-text")).map((text) => contrast(getComputedStyle(text).fill, getComputedStyle(text.closest("svg")!).color));
    const input = document.getElementById("field-advertiserName")!;
    const placeholder = getComputedStyle(input, "::placeholder");
    return { steps, placeholder: contrast(placeholder.color, getComputedStyle(input.closest(".MuiInputBase-root")!).backgroundColor), placeholderOpacity: placeholder.opacity };
  });
  contrastChecks.steps.forEach((ratio) => expect(ratio).toBeGreaterThanOrEqual(4.5));
  expect(contrastChecks.placeholder).toBeGreaterThanOrEqual(4.5);
  expect(contrastChecks.placeholderOpacity).toBe("1");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByLabel(/^Advertiser name/)).toBeFocused();
  await expect(page.getByRole("alert").filter({ hasText: "Check the highlighted fields" })).toContainText("Check the highlighted fields");
  await expect(page.getByLabel(/^Advertiser name/)).toHaveAttribute("aria-invalid", "true");
  const fieldBounds = await page.getByLabel(/^Advertiser name/).boundingBox();
  const headerBounds = await page.locator("header").boundingBox();
  expect(fieldBounds!.y).toBeGreaterThanOrEqual(headerBounds!.y + headerBounds!.height);
  await audit(page, info, "builder-errors");
  const picker = page.getByRole("combobox", { name: "Find a catalog product" });
  await picker.fill("headphones"); await page.getByRole("option").first().waitFor();
  await audit(page, info, "builder-catalog-popup");
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Targeting & budget", exact: true })).toBeFocused();
  await audit(page, info, "builder-targeting");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Search results", exact: true })).toBeFocused();
  await expect(page.getByRole("group", { name: "Placements (choose at least one)" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Search results", exact: true }).check();
  await page.getByLabel(/^Start date/).fill("2026-12-01");
  await page.getByLabel(/^End date/).fill("2026-12-31");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Creative", exact: true })).toBeFocused();
  await audit(page, info, "builder-creative");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("button", { name: "Launch campaign", exact: true })).toBeVisible();
  await audit(page, info, "builder-review");
  // Stop at review: an accessibility test must not publish campaigns.
});

test("ad preview: controls, loading and served state", async ({ page }, info) => {
  await page.goto("/preview?category=Headphones&placement=search");
  await expect(page.getByRole("button", { name: "Request ad", exact: true })).toBeEnabled();
  await audit(page, info, "preview-controls");
  await page.route("**/serve?**", (route) => route.fulfill({ json: { campaignId: "a11y-preview-only", productSku: "BB-1234", headline: "Accessible preview", bodyCopy: "A deterministic ad fixture for testing the preview UI.", destinationUrl: "https://example.com/" } }));
  await page.getByRole("button", { name: "Request ad", exact: true }).click();
  await expect(page.getByRole("button", { name: "Simulate click", exact: true })).toBeVisible();
  await audit(page, info, "preview-served-fixture");
});

test("studio: tabs, chart data table and all panels", async ({ page }, info) => {
  await page.goto("/studio"); await page.getByRole("columnheader", { name: "Demo revenue", exact: true }).waitFor();
  await expect(page.getByRole("heading", { level: 1, name: "Search studio" })).toBeVisible();
  await audit(page, info, "studio-overview");
  await page.getByText("View search activity data", { exact: true }).click();
  await expect(page.getByRole("table", { name: "Daily search activity", exact: true })).toBeVisible();
  await audit(page, info, "studio-chart-table");
  for (const label of ["Merchandising", "Relevance", "AI & event pipeline"]) {
    const tab = page.getByRole("tab", { name: label, exact: true });
    await tab.focus(); await page.keyboard.press("Enter");
    const panel = page.getByRole("tabpanel");
    await expect(panel).toHaveAttribute("aria-labelledby", await tab.getAttribute("id") as string);
    if (label === "Merchandising") await page.getByRole("checkbox").first().waitFor();
    await audit(page, info, `studio-${label.replace(/\W+/g, "-")}`);
  }
});

test("storefront: search semantics, keyboard suggestions, detail, modal focus and guide", async ({ page }, info) => {
  await page.goto("/shop"); await page.locator("article").first().waitFor();
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
  await skipNavigation(page); await audit(page, info, "shop");
  const input = page.getByRole("combobox", { name: "Search products and guides", exact: true });
  await input.fill("laptop"); await page.getByText("FIELD GUIDES", { exact: true }).waitFor();
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("dialog", { name: "Search suggestions", exact: true })).toBeVisible();
  await audit(page, info, "shop-autocomplete");
  await input.press("ArrowDown");
  const first = await page.evaluate(() => document.activeElement?.textContent);
  await page.keyboard.press("ArrowDown");
  expect(await page.evaluate(() => document.activeElement?.textContent)).not.toBe(first);
  await page.keyboard.press("Escape"); await expect(input).toBeFocused(); await expect(input).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "Submit search", exact: true })).toBeFocused();
  await page.locator("article a").first().click();
  const add = page.getByRole("button", { name: /^Add to bag/ }); await add.waitFor();
  await audit(page, info, "product-detail"); await add.click();
  const dialog = page.getByRole("dialog", { name: /^Your bag/ }); await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await audit(page, info, "cart");
  const focusables = dialog.locator('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]');
  await focusables.last().focus(); await page.keyboard.press("Tab");
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(add).toBeFocused();
  await page.goto("/shop/guides/choosing-a-laptop");
  await page.getByRole("heading", { level: 1, name: "Find the laptop for your everyday", exact: true }).waitFor();
  await audit(page, info, "guide");
});

test("reflow at 320px and custom text spacing", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const route of ["/", "/campaigns/new", "/preview", "/studio", "/shop"]) {
    await page.goto(route); await page.locator("main h1").first().waitFor();
    if (route === "/") await page.getByRole("tab", { name: /All campaigns \(/ }).waitFor();
    if (route === "/studio") await page.getByRole("columnheader", { name: "Demo revenue", exact: true }).waitFor();
    if (route === "/shop") await page.locator("article").first().waitFor();
    await page.addStyleTag({ content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Page overflow at ${route}`).toBe(true);
  }
});
