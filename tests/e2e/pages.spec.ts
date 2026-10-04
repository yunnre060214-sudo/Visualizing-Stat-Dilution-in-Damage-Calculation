import { expect, test } from "@playwright/test";
import { inspectPageHealth } from "./pagesHealth";

const path = "/Visualizing-Stat-Dilution-in-Damage-Calculation/";

test("pages base path smoke", async ({ page }) => {
  expect(await inspectPageHealth(page, path)).toEqual([]);

  await expect(page.getByText("伤害工作台")).toBeVisible();
  expect((await page.locator("link[rel=stylesheet]").getAttribute("href")) ?? "").toContain(
    "/Visualizing-Stat-Dilution-in-Damage-Calculation/",
  );

  await page.getByLabel("面板攻击").fill("2400");
  await expect(page.getByTestId("expected-damage")).toContainText("735");
  await page.reload();
  await expect(page.getByLabel("面板攻击")).toHaveValue("2400");
  await expect(page.getByTestId("expected-damage")).toContainText("735");
});

test("pages health check detects a missing stylesheet", async ({ page }) => {
  await page.route("**/*.css", async (route) => {
    await route.fulfill({ status: 404, contentType: "text/css", body: "" });
  });

  expect(await inspectPageHealth(page, path)).toEqual(
    expect.arrayContaining([expect.stringMatching(/\.css.*404/u)]),
  );
});

test("keeps dilution chart overflow inside its mobile scroller", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  await page.getByRole("button", { name: /词条稀释/ }).click();
  await expect(page.getByRole("img", { name: "词条投入边际收益曲线" })).toBeVisible();

  const documentWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  const chartScroller = page.getByRole("img", { name: "词条投入边际收益曲线" }).locator("..");

  expect(documentWidth.scroll).toBe(documentWidth.client);
  expect(await chartScroller.evaluate((element) => element.scrollWidth)).toBeGreaterThan(
    await chartScroller.evaluate((element) => element.clientWidth),
  );
});

for (const viewport of [
  { width: 1440, height: 1000, mode: "sidebar", sidebarWidth: 216 },
  { width: 1080, height: 900, mode: "sidebar", sidebarWidth: 84 },
  { width: 760, height: 900, mode: "sidebar", sidebarWidth: 84 },
  { width: 390, height: 844, mode: "mobile", sidebarWidth: 0 },
] as const) {
  test(`keeps the ${viewport.width}px workspace within the viewport`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(path);

    const navigation = page.locator(`nav[data-variant="${viewport.mode}"]`);
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("button")).toHaveCount(4);

    if (viewport.mode === "sidebar") {
      const sidebar = page.locator("aside").filter({ has: navigation });
      expect(Math.round((await sidebar.boundingBox())?.width ?? 0)).toBe(viewport.sidebarWidth);
      await expect(page.getByRole("complementary", { name: "伤害结果" })).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: "展开伤害结果" })).toBeVisible();
      const shellPadding = await page.locator('[data-layout="mobile"]').evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).paddingBottom),
      );
      expect(shellPadding).toBeGreaterThanOrEqual(74);
    }

    for (let viewIndex = 0; viewIndex < 4; viewIndex += 1) {
      await navigation.getByRole("button").nth(viewIndex).click();
      const width = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(width.scroll).toBe(width.client);
    }
  });
}

test("reveals and persists the next theme from the toggle origin", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("wuwa-theme", "dark");
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: undefined });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  const toggle = page.getByRole("button", { name: "切换到浅色主题" });
  const toggleBox = await toggle.boundingBox();
  await toggle.click();
  const curtain = page.getByTestId("theme-curtain");
  await expect(curtain).toHaveAttribute("data-theme", "light");
  const originX = await curtain.evaluate((element) => Number.parseFloat((element as HTMLElement).style.left));
  expect(Math.round(originX)).toBe(Math.round((toggleBox?.x ?? 0) + (toggleBox?.width ?? 0) / 2));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: "切换到深色主题" })).toBeVisible();
});
