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
