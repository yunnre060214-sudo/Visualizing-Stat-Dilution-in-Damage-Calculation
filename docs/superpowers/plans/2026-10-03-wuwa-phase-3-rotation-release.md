# Wuthering Waves Rotation and Release Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可解释的队伍循环模拟、8 套有来源的主流循环预设、交互时间轴和经过线上验证的 GitHub Pages 正式版本。

**Architecture:** 循环引擎消费前两阶段的角色、动作、Buff 和伤害接口，将声明式动作序列归并成有序事件并为每次命中生成快照。预设数据与引擎分离，时间轴只渲染 `RotationResult`，最终通过完整端到端、移动端和 Pages 线上检查发布。

**Tech Stack:** Phase 1 and 2 stack、ECharts custom series、Playwright、GitHub Actions Pages

**Spec:** `docs/superpowers/specs/2026-10-03-wuwa-stat-dilution-design.md`

## Global Constraints

- 必须先完成 Phase 1 与 Phase 2 计划并保持其完整测试通过。
- 首版固定提供 8 套 3.7 主流队伍预设；每套必须有来源 URL、采样日期、动作假设和未覆盖技巧。
- 新角色或缺少可靠动作时长的队伍不得伪造精确 DPS，只能保留在自由组队和单段计算中。
- 时间以秒存储，排序相同时依次按 `priority` 与原始声明顺序稳定执行。
- 生产部署只来自通过全部检查的 `main` 分支提交。

## Review Focus

- 同一时间点 Buff 结束与伤害命中时必须遵循明确定义的半开区间 `[start, end)`，见 Task 1 的 `buff expiry boundary`。
- 两个同时间事件必须稳定排序且多次运行结果一致，见 Task 1 的 `stable simultaneous events`。
- 预设引用已删除或未解析动作时数据审计必须阻断发布，见 Task 2 的 `preset references are complete`。
- 长时间轴在窄屏上必须可滚动且选中事件不会被抽屉遮挡，见 Task 3 的 `mobile timeline remains operable`。
- Pages 部署成功但资源或数据 JSON 返回 404 时线上验收必须失败，见 Task 4 的 `production asset audit`。

---

### Task 1: Deterministic Rotation Engine

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/engine/rotation.ts`, `src/engine/rotation.test.ts`
- Create: `src/data/rotations/schema.ts`

**Interfaces:**
- Consumes: `buildPanel`, `resolveBuffs`, `resolveHit`, `GameDataCatalog`.
- Produces: `simulateRotation(preset: RotationPreset, team: TeamConfiguration, target: Target): RotationResult`.
- `RotationResult` contains ordered events, hit snapshots, total exact and displayed damage, duration, DPS, member contribution, Buff uptime, resource ledger and issues.

- [ ] **Step 1: Write failing event-order and snapshot tests**

```ts
it("buff expiry boundary", () => {
  const result = simulateRotation(expiryBoundaryFixture, teamFixture, targetFixture);
  expect(result.hits.at(0)?.appliedBuffIds).toContain("five-second-buff");
  expect(result.hits.at(1)?.appliedBuffIds).not.toContain("five-second-buff");
});
it("stable simultaneous events", () => {
  const first = simulateRotation(simultaneousFixture, teamFixture, targetFixture);
  const second = simulateRotation(simultaneousFixture, teamFixture, targetFixture);
  expect(second.events).toEqual(first.events);
  expect(first.events.slice(0, 2).map(x => x.type)).toEqual(["buffStart", "damage"]);
});
it("attributes each hit to an immutable snapshot", () => {
  const result = simulateRotation(statChangeFixture, teamFixture, targetFixture);
  expect(result.hits.map(x => x.snapshot.panel.atk)).toEqual([1000, 1500]);
});
it("reports negative resources without dropping actions", () => {
  const result = simulateRotation(negativeResourceFixture, teamFixture, targetFixture);
  expect(result.issues.map(x => x.code)).toContain("NEGATIVE_RESOURCE");
  expect(result.events).toHaveLength(negativeResourceFixture.expectedEventCount);
});
```

- [ ] **Step 2: Run the rotation tests and verify failure**

Run: `npm test -- --run src/engine/rotation.test.ts`  
Expected: FAIL because the rotation event model and simulator do not exist.

- [ ] **Step 3: Implement event compilation and deterministic simulation**

Compile actions into switch, Buff start/end, resource, damage and marker events. Treat Buff windows as `[start, end)`, preserve declaration index for stable ties, clone the active panel and Buff resolution for every hit, and aggregate only after all events resolve.

- [ ] **Step 4: Run engine regression checks**

Run: `npm test -- --run src/engine && npm run typecheck`  
Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/engine/rotation.ts src/engine/rotation.test.ts src/data/rotations/schema.ts
git commit -m "feat: add deterministic rotation simulator"
```

### Task 2: Eight Sourced 3.7 Rotation Presets

**Files:**
- Create: `src/data/rotations/manifest.json`
- Create: `src/data/rotations/presets/01.json` through `src/data/rotations/presets/08.json`
- Create: `src/data/rotations/index.ts`, `src/data/rotations/presets.test.ts`
- Create: `docs/rotation-sources.md`

**Interfaces:**
- Consumes: Phase 2 catalog IDs and Task 1 `RotationPreset` schema.
- Produces: `loadRotationPresets(): RotationPreset[]` returning exactly eight audited presets.
- Produces: `auditRotationPresets(presets: RotationPreset[], catalog: GameDataCatalog): RotationPresetAudit`.
- Each manifest row contains `id`, three character IDs, `gameVersion`, `sourceUrls`, `sampledAt`, `assumptions`, `unsupportedTechniques`, `duration` and file checksum.

- [ ] **Step 1: Write failing preset coverage and integrity tests**

```ts
it("ships exactly eight sourced presets", () => {
  expect(presets).toHaveLength(8);
  expect(presets.every(p => p.sourceUrls.length > 0 && p.sampledAt && p.assumptions.length > 0)).toBe(true);
});
it("preset references are complete", () => {
  expect(auditRotationPresets(presets, catalog).errors).toEqual([]);
});
it("every preset produces finite totals and a non-empty trace", () => {
  for (const preset of presets) {
    const result = simulateRotation(preset, preset.defaultTeam, targetFixture);
    expect(Number.isFinite(result.totalDamage.exact)).toBe(true);
    expect(result.hits.length).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 2: Run preset tests and verify failure**

Run: `npm test -- --run src/data/rotations/presets.test.ts`  
Expected: FAIL because the manifest and preset files do not exist.

- [ ] **Step 3: Research, encode and document the eight presets**

Choose candidates from the 3.7 public Tower ranking, require a detailed guide or measured record for the action sequence, and reject candidates without defensible timing. Encode only supported cancellation and Buff behavior; document every approximation next to its source.

- [ ] **Step 4: Run all preset simulations and review generated audit output**

Run: `npm test -- --run src/data/rotations src/engine/rotation.test.ts && npm run build`  
Expected: exactly eight presets pass reference checks and produce finite results without fatal issues.

- [ ] **Step 5: Commit**

```bash
git add src/data/rotations docs/rotation-sources.md
git commit -m "feat: add sourced version 3.7 rotation presets"
```

### Task 3: Interactive Timeline and Rotation Analytics

**Files:**
- Create: `src/features/rotation/RotationTimeline.tsx`, `src/features/rotation/RotationTimeline.module.css`, `src/features/rotation/RotationTimeline.test.tsx`
- Create: `src/features/rotation/TimelineChart.tsx`, `src/features/rotation/EventInspector.tsx`, `src/features/rotation/RotationSummary.tsx`
- Modify: `src/App.tsx`, `src/store/persistedState.ts`
- Create: `tests/e2e/rotation.spec.ts`

**Interfaces:**
- Consumes: `loadRotationPresets()` and `simulateRotation()`.
- Produces: `RotationTimeline(): JSX.Element` with preset selection, total damage, DPS, contribution, Buff uptime, resource ledger and selected-hit trace.

- [ ] **Step 1: Write failing timeline interaction tests**

```tsx
it("selects a damage pulse and exposes its frozen snapshot", async () => {
  render(<RotationTimeline />);
  await user.click(screen.getByRole("button", { name: /12\.40 秒.*伤害/ }));
  expect(screen.getByRole("dialog", { name: "伤害快照" })).toHaveTextContent("12.40 秒");
  expect(screen.getByTestId("snapshot-formula")).toHaveTextContent("防御系数");
});
it("switches presets without retaining the prior selected event", async () => {
  render(<RotationTimeline />);
  await user.click(screen.getByRole("button", { name: /伤害事件/ }));
  await user.selectOptions(screen.getByLabelText("循环预设"), "preset-02");
  expect(screen.queryByRole("dialog", { name: "伤害快照" })).not.toBeInTheDocument();
  expect(screen.getByTestId("rotation-total")).toHaveTextContent(preset02ExpectedTotal);
});
test("mobile timeline remains operable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/Visualizing-Stat-Dilution-in-Damage-Calculation/?view=rotation");
  await page.getByRole("button", { name: /伤害事件/ }).first().click();
  await expect(page.getByRole("dialog", { name: "伤害快照" })).toBeVisible();
  await page.getByRole("button", { name: "关闭伤害快照" }).click();
  await expect(page.getByRole("dialog", { name: "伤害快照" })).toBeHidden();
});
```

- [ ] **Step 2: Run component and mobile browser tests and verify failure**

Run: `npm test -- --run src/features/rotation && npm run test:e2e -- tests/e2e/rotation.spec.ts`  
Expected: FAIL because the timeline view does not exist.

- [ ] **Step 3: Implement the timeline, charts and event inspector**

Render actor lanes, Buff windows and damage pulses in a zoomable custom series; pair it with cumulative damage and member contribution. Use a side inspector on desktop and a closable bottom sheet on mobile. All chart selections must have a keyboard-accessible list equivalent.

- [ ] **Step 4: Run visual-flow and regression checks**

Run: `npm test -- --run && npm run typecheck && npm run build && npm run test:e2e -- tests/e2e/rotation.spec.ts`  
Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/features/rotation src/App.tsx src/store tests/e2e/rotation.spec.ts
git commit -m "feat: visualize team rotation timelines"
```

### Task 4: Release Hardening, Deployment and Online Verification

**Files:**
- Create: `tests/e2e/mobile.spec.ts`, `tests/e2e/persistence.spec.ts`, `scripts/audit-production.mjs`
- Modify: `.github/workflows/pages.yml`, `README.md`, `src/styles/global.css`
- Create: `CHANGELOG.md`

**Interfaces:**
- Consumes: complete application and Pages workflow.
- Produces: `auditProduction(baseUrl: string): Promise<ProductionAuditReport>`, npm command `npm run audit:production -- <pages-url>` and release `v1.0.0` documentation.

- [ ] **Step 1: Write failing release acceptance tests**

```ts
test("all four views remain usable at 390x844", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ["伤害工作台", "词条稀释", "配装对比", "循环时间轴"]) {
    await page.getByRole("button", { name }).click();
    await expect(page.getByRole("main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
test("refresh restores a valid configuration and warns on a corrupt one", async ({ page }) => {
  await page.getByLabel("面板攻击").fill("2400");
  await page.reload();
  await expect(page.getByLabel("面板攻击")).toHaveValue("2400");
  await page.evaluate(key => localStorage.setItem(key, "{"), STORAGE_KEY);
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("本地配置已恢复为默认值");
});
it("production asset audit", async () => {
  const report = await auditProduction(PAGES_URL);
  expect(report.failedUrls).toEqual([]);
  expect(report.gameVersion).toBe("3.7");
});
```

- [ ] **Step 2: Run the full acceptance suite and record failures**

Run: `npm ci && npm run typecheck && npm test -- --run && npm run build && npm run test:e2e`  
Expected: FAIL only for the newly added release-hardening assertions.

- [ ] **Step 3: Fix responsive, accessibility and workflow gaps, then document v1.0.0**

Ensure visible focus, reduced-motion behavior, non-color chart labels, closable mobile drawers, data and rule version badges, source/disclaimer links, and workflow concurrency cancellation. Add `audit:production` to the post-deploy job using the actual Pages URL.

- [ ] **Step 4: Run local and online release gates**

Run locally: `npm ci && npm run typecheck && npm test -- --run && npm run build && npm run test:e2e`  
Expected: all commands exit 0. After pushing `main`, wait for the Pages workflow to succeed, then run `npm run audit:production -- https://yunnre060214-sudo.github.io/Visualizing-Stat-Dilution-in-Damage-Calculation/`; expected: every requested resource returns 200 and reports game version 3.7.

- [ ] **Step 5: Commit and tag the verified release**

```bash
git add .github README.md CHANGELOG.md src/styles tests/e2e scripts/audit-production.mjs package.json package-lock.json
git commit -m "release: harden and publish version 1.0.0"
git tag v1.0.0
```
