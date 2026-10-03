# Wuthering Waves Damage Visualizer Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个可部署到 GitHub Pages 的静态鸣潮伤害工作台，包含可测试的面板、伤害、Buff 追踪引擎和一组演示数据。

**Architecture:** React 只负责输入与呈现，所有数值逻辑位于无副作用的 TypeScript 函数中。首阶段使用小型演示夹具打通完整链路，并把数据接口固定下来，第二阶段再接入 3.7 全量快照。

**Tech Stack:** React、TypeScript、Vite、Vitest、Testing Library、Playwright、CSS Modules

**Spec:** `docs/superpowers/specs/2026-10-03-wuwa-stat-dilution-design.md`

## Global Constraints

- 使用 Node.js 22 和 npm，提交 `package-lock.json`。
- 生产页面必须使用仓库子路径 `/Visualizing-Stat-Dilution-in-Damage-Calculation/`。
- 引擎内部百分比统一使用小数，例如 50% 表示为 `0.5`。
- React 组件不得自行实现伤害公式，只能消费 `src/engine` 的返回值。
- 生产运行不请求第三方 API；首阶段只读取仓库内演示夹具。
- 非有限数、负等级和不合法暴击伤害必须生成可见校验问题，不能静默替换为零。

## Review Focus

- `NaN`、空字符串和无穷大输入应保留在输入框并显示错误，见 Task 4 的 `invalid input stays visible`。
- 暴击率超过 100% 时只在期望伤害中封顶，原始面板仍显示实际输入，见 Task 2 的 `crit expectation clamps rate`。
- 抗性恰好为 0、0.8 以及负值时使用正确分段，见 Task 2 的 `resistance boundaries`。
- 损坏或旧版本的本地存档应回退到默认配置并显示一次性警告，见 Task 4 的 `corrupt storage recovers`。
- GitHub Pages 子路径下刷新和静态资源加载不得 404，见 Task 5 的 `pages base path smoke`。

---

### Task 1: Project Shell and Test Harness

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`
- Create: `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles/global.css`
- Create: `src/App.test.tsx`, `tests/setup.ts`

**Interfaces:**
- Produces: `App(): JSX.Element` and npm scripts `dev`, `test`, `typecheck`, `build`, `preview`, `test:e2e`.

- [ ] **Step 1: Create the toolchain files and write the failing shell test**

```tsx
it("renders the four product views and data version", () => {
  render(<App />);
  expect(screen.getByRole("navigation")).toBeInTheDocument();
  expect(screen.getByText("伤害工作台")).toBeInTheDocument();
  expect(screen.getByText("词条稀释")).toBeInTheDocument();
  expect(screen.getByText("配装对比")).toBeInTheDocument();
  expect(screen.getByText("循环时间轴")).toBeInTheDocument();
  expect(screen.getByText(/数据版本 3.7/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- --run src/App.test.tsx`  
Expected: FAIL because `App` and the navigation shell are incomplete.

- [ ] **Step 3: Implement the smallest accessible application shell**

Implement `App()` with semantic header, navigation, main region, four inactive view buttons, version badge and responsive global tokens. Keep the first view active; later tasks fill its content.

- [ ] **Step 4: Run unit checks and the production build**

Run: `npm test -- --run && npm run typecheck && npm run build`  
Expected: all commands exit 0 and `dist/index.html` exists.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts playwright.config.ts index.html src tests
git commit -m "chore: scaffold damage visualizer"
```

### Task 2: Panel and Damage Engine

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/engine/panel.ts`, `src/engine/damage.ts`, `src/engine/specialDamage.ts`
- Create: `src/engine/panel.test.ts`, `src/engine/damage.test.ts`, `src/engine/specialDamage.test.ts`

**Interfaces:**
- Produces: `validatePanelInput(input: PanelInput): ValidationIssue[]`, `buildPanel(input: PanelInput): PanelSnapshot`.
- Produces: `defenseMultiplier(attackerLevel: number, target: Target): number`, `resistanceMultiplier(resistance: number): number`, `expectedCritMultiplier(rate: number, totalCritDamage: number): number`, `resolveHit(action: DamageAction, panel: PanelSnapshot, target: Target, zones: DamageZones): HitResult`.
- Produces: `resolveSpecialDamage(action: SpecialDamageAction, panel: PanelSnapshot, target: Target, zones: SpecialDamageZones): SpecialDamageResult` for fixed Effect, attack-scaling Effect, Tune Break, Hack and Tune Rupture adapters.
- `HitResult` contains `nonCrit`, `crit`, `expected`, `breakdown`, and `issues`; each damage result contains `exact` and `display = Math.floor(exact)`.

- [ ] **Step 1: Write failing panel and formula tests**

```ts
expect(buildPanel({ baseAtk: 400, weaponAtk: 500, atkPercent: 1, flatAtk: 400 }).atk).toBe(2200);
expect(defenseMultiplier(90, { level: 90, defenseReduction: 0, defenseIgnore: 0, resistance: 0.1 })).toBeCloseTo(0.5);
expect(resistanceMultiplier(-0.2)).toBeCloseTo(1.1);
expect(resistanceMultiplier(0.1)).toBeCloseTo(0.9);
expect(resistanceMultiplier(0.8)).toBeCloseTo(0.2);
expect(expectedCritMultiplier(1.4, 2.5)).toBeCloseTo(2.5);
expect(resolveSpecialDamage(effectFixture, panelFixture, targetFixture, specialZones).critEligible).toBe(false);
```

Add `resolves an attack-scaling hit` asserting `5346` non-crit, `13365` crit and `9355.5` expected for scaling stat 2000, multiplier 3, bonus 0.5, deepen 0.2, defense 0.5, resistance 0.9, final bonus 0.1, crit rate 0.5 and crit damage 2.5.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- --run src/engine/panel.test.ts src/engine/damage.test.ts`  
Expected: FAIL because the domain types and engine functions do not exist.

- [ ] **Step 3: Implement domain types and pure formula functions**

Use the exact formulas in Spec section 5. Clamp defense reduction and ignore independently to `[0, 1]`, clamp only the rate used by expected crit, and keep intermediate precision until each displayed result is floored. Keep special damage outside the normal critical-hit chain; each adapter declares its scaling value, multiplier, eligible zones and whether resistance applies.

- [ ] **Step 4: Run tests, typecheck and build**

Run: `npm test -- --run src/engine && npm run typecheck && npm run build`  
Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/domain src/engine
git commit -m "feat: add panel and damage engine"
```

### Task 3: Buff Resolution and Explainable Trace

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/engine/buffs.ts`, `src/engine/trace.ts`
- Create: `src/engine/buffs.test.ts`, `src/engine/trace.test.ts`

**Interfaces:**
- Consumes: `DamageZones`, `DamageAction`, `PanelSnapshot`, `HitResult` from Task 2.
- Produces: `resolveBuffs(effects: BuffEffect[], context: CombatContext): BuffResolution`.
- Produces: `buildDamageTrace(hit: HitResult, buffs: BuffResolution): DamageTrace`.
- `BuffResolution` separates `applied`, `inactive`, and `manual`; every entry includes provider, reason and affected zone.

- [ ] **Step 1: Write failing condition and trace tests**

```ts
expect(resolveBuffs(effects, matchingContext).applied.map(x => x.id)).toEqual(["outro-skill-bonus"]);
expect(resolveBuffs(effects, wrongDamageType).inactive[0].reason).toMatch(/伤害类型/);
expect(resolveBuffs(unsupportedEffects, matchingContext).manual[0].reason).toMatch(/手动确认/);
expect(buildDamageTrace(hit, buffs).steps.map(x => x.zone)).toEqual([
  "scaling", "motionValue", "damageBonus", "deepen", "damageTaken", "defense", "resistance", "finalDamage", "crit"
]);
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- --run src/engine/buffs.test.ts src/engine/trace.test.ts`  
Expected: FAIL because Buff resolution and trace functions do not exist.

- [ ] **Step 3: Implement declarative conditions and trace generation**

Support actor, action id, damage type, element, minimum chain, state flag, stack range and manual-only conditions. Merge additive effects only within the same zone and preserve every source in the trace.

- [ ] **Step 4: Run engine regression checks**

Run: `npm test -- --run src/engine && npm run typecheck`  
Expected: all engine tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/engine/buffs.ts src/engine/trace.ts src/engine/buffs.test.ts src/engine/trace.test.ts
git commit -m "feat: resolve buffs with calculation traces"
```

### Task 4: Functional Damage Workbench and Persistence

**Files:**
- Create: `src/data/demo.ts`
- Create: `src/features/workbench/Workbench.tsx`, `src/features/workbench/Workbench.module.css`, `src/features/workbench/Workbench.test.tsx`
- Create: `src/features/workbench/PanelEditor.tsx`, `src/features/workbench/DamageSummary.tsx`, `src/features/workbench/TracePanel.tsx`
- Create: `src/store/persistedState.ts`, `src/store/persistedState.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 2 and 3 engine APIs.
- Produces: `Workbench(): JSX.Element`.
- Produces: `STORAGE_KEY`, `loadState(storage: Storage): LoadStateResult`, `saveState(storage: Storage, state: CalculatorState): void`, `encodeShareState(state: ShareableState): string`, `decodeShareState(value: string): DecodeResult`.

- [ ] **Step 1: Write failing interaction and storage tests**

```tsx
it("updates all three damage results when attack changes", async () => {
  render(<Workbench />);
  await user.clear(screen.getByLabelText("面板攻击"));
  await user.type(screen.getByLabelText("面板攻击"), "2400");
  expect(screen.getByTestId("expected-damage")).toHaveTextContent("11226");
});

it("invalid input stays visible and blocks calculation", async () => {
  render(<Workbench />);
  await user.clear(screen.getByLabelText("面板攻击"));
  await user.type(screen.getByLabelText("面板攻击"), "-");
  expect(screen.getByLabelText("面板攻击")).toHaveValue("-");
  expect(screen.getByRole("alert")).toHaveTextContent("请输入有限数值");
  expect(screen.getByTestId("expected-damage")).toHaveAttribute("aria-invalid", "true");
});

it("corrupt storage recovers", () => {
  localStorage.setItem(STORAGE_KEY, "{");
  expect(loadState(localStorage)).toMatchObject({ recovered: true, state: { schemaVersion: 1 } });
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- --run src/features/workbench src/store`  
Expected: FAIL because the workbench and storage adapter do not exist.

- [ ] **Step 3: Implement the three-column workbench with demo data**

Use controlled string inputs so invalid text remains visible. Parse only on calculation boundaries, call engine validation, persist only valid versioned state, and expose formula steps plus applied, inactive and manual Buff sections.

- [ ] **Step 4: Run unit, accessibility smoke, type and build checks**

Run: `npm test -- --run && npm run typecheck && npm run build`  
Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/data src/features/workbench src/store
git commit -m "feat: add explainable damage workbench"
```

### Task 5: GitHub Pages Pipeline and Base-Path Smoke Test

**Files:**
- Create: `.github/workflows/pages.yml`
- Create: `tests/e2e/pages.spec.ts`
- Modify: `vite.config.ts`, `playwright.config.ts`, `README.md`

**Interfaces:**
- Consumes: built `dist/` application from Tasks 1 through 4.
- Produces: CI jobs `verify` and `deploy`, plus a public Pages build artifact.

- [ ] **Step 1: Write the failing Pages smoke test**

```ts
test("pages base path smoke", async ({ page }) => {
  await page.goto("/Visualizing-Stat-Dilution-in-Damage-Calculation/");
  await expect(page.getByText("伤害工作台")).toBeVisible();
  expect((await page.locator("link[rel=stylesheet]").getAttribute("href")) ?? "").toContain("/Visualizing-Stat-Dilution-in-Damage-Calculation/");
});
```

- [ ] **Step 2: Run the browser test and verify failure**

Run: `npm run build && npm run test:e2e -- tests/e2e/pages.spec.ts`  
Expected: FAIL until preview routing and Vite base path are configured.

- [ ] **Step 3: Configure Vite, Playwright and the Pages workflow**

The workflow runs install, typecheck, unit tests, build and Playwright smoke before uploading `dist`. README documents local commands, formula disclaimer and the eventual Pages URL.

- [ ] **Step 4: Run the complete phase gate**

Run: `npm ci && npm run typecheck && npm test -- --run && npm run build && npm run test:e2e`  
Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add .github README.md vite.config.ts playwright.config.ts tests/e2e
git commit -m "ci: deploy verified app to github pages"
```
