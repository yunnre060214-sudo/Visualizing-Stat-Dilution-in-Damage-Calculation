# Wuthering Waves Data and Stat Dilution Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用可复现的 3.7 全量角色数据替换演示夹具，并交付词条稀释与 A/B 配装对比两个完整视图。

**Architecture:** 构建脚本负责抓取、保存原始响应、规范化和校验，生产前端只读取提交到仓库的精简快照。稀释与配装比较都复用第一阶段的引擎，通过反事实重算生成结果，图表层只做映射与交互。

**Tech Stack:** Phase 1 stack、Node.js data scripts、Zod、ECharts

**Spec:** `docs/superpowers/specs/2026-10-03-wuwa-stat-dilution-design.md`

## Global Constraints

- 必须先完成 `2026-10-03-wuwa-phase-1-engine-workbench.md`。
- 数据目标固定为鸣潮 3.7，快照提交后线上运行不得依赖 encore.moe 可用性。
- 默认数据源为 `https://api-v2.encore.moe/api/zh-Hans`；同步脚本允许 `--base-url` 和 `--lang` 覆盖。
- `api/raw/` 不提交，规范化后的 `src/data/generated/` 与来源清单必须提交。
- 自动解析失败的技能仍进入目录，但带 `parseStatus: "manual"`，界面不得把它当作零倍率。
- 图表使用文本标签、线型和颜色共同编码，移动端支持横向查看而不截断数据。

## Review Focus

- 数据源字段缺失或类型改变时同步命令必须失败并列出角色或武器 ID，见 Task 1 的 `schema drift is fatal`。
- 多段技能的 `+` 与 `×N` 必须展开为正确 hit 数，见 Task 1 的 `expands multi-hit attributes`。
- 暴击率达到 100% 后继续投入的边际收益必须为零，见 Task 3 的 `crit overflow has zero value`。
- A/B 配置引用的旧角色或武器不存在时必须保留可恢复状态并提示，见 Task 4 的 `missing catalog reference`。
- 图表输入含相同收益或曲线交叉时排序与标记必须稳定，见 Task 3 的 `stable ties and crossings`。

---

### Task 1: Versioned Data Provider and Normalizers

**Files:**
- Create: `scripts/data/fetch-encore.mjs`, `scripts/data/normalize.mjs`, `scripts/data/lib.mjs`
- Create: `scripts/data/fixtures/character.json`, `scripts/data/fixtures/weapon.json`
- Create: `scripts/data/normalize.test.ts`
- Create: `src/data/types.ts`, `src/data/schema.ts`
- Modify: `package.json`, `.gitignore`

**Interfaces:**
- Produces CLI: `npm run data:fetch -- --resource character|weapon|echo|monster --lang zh-Hans`.
- Produces CLI: `npm run data:normalize -- --input api/raw --output src/data/generated`.
- Produces: `normalizeCharacter(raw: unknown): NormalizedCharacter`, `normalizeWeapon(raw: unknown): NormalizedWeapon`, `expandSkillAttribute(value: string): number[]`.

- [ ] **Step 1: Write failing fixture-based normalizer tests**

```ts
it("expands multi-hit attributes", () => {
  expect(expandSkillAttribute("32.40%×2")).toEqual([0.324, 0.324]);
  expect(expandSkillAttribute("6.99%+10.48%")).toEqual([0.0699, 0.1048]);
});
it("schema drift is fatal", () => {
  expect(() => normalizeCharacter({ Id: 1001 })).toThrow(/1001.*Properties|Skills/);
});
```

- [ ] **Step 2: Run the normalizer tests and verify failure**

Run: `npm test -- --run scripts/data/normalize.test.ts`  
Expected: FAIL because schemas and normalizers do not exist.

- [ ] **Step 3: Implement fetch, schema validation and deterministic normalization**

Fetch list then detail records with concurrency 6 and three retries. Sort normalized output by numeric ID, convert percentages to decimals, preserve source text, limit skill levels to 1 through 10, and attach `parseStatus` plus parse notes.

- [ ] **Step 4: Run fixture tests and deterministic-output check**

Run: `npm test -- --run scripts/data/normalize.test.ts && npm run data:normalize -- --input scripts/data/fixtures --output /tmp/wuwa-normalized-a && npm run data:normalize -- --input scripts/data/fixtures --output /tmp/wuwa-normalized-b && diff -ru /tmp/wuwa-normalized-a /tmp/wuwa-normalized-b`  
Expected: tests pass and `diff` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore scripts/data src/data/types.ts src/data/schema.ts
git commit -m "feat: add versioned game data pipeline"
```

### Task 2: Checked-In 3.7 Catalog and Integrity Audit

**Files:**
- Create: `src/data/generated/manifest.json`, `src/data/generated/characters.json`, `src/data/generated/weapons.json`, `src/data/generated/echoes.json`, `src/data/generated/targets.json`
- Create: `src/data/rules/commonBuffs.ts`, `src/data/catalog.ts`, `src/components/CharacterIcon.tsx`
- Create: `src/data/catalog.test.ts`, `scripts/data/audit.test.ts`
- Modify: `src/features/workbench/Workbench.tsx`, `README.md`

**Interfaces:**
- Consumes: normalized schemas from Task 1 and Phase 1 workbench contracts.
- Produces: `loadGameData(): GameDataCatalog`, `findCharacter(id: string): NormalizedCharacter | undefined`, `findWeapon(id: string): NormalizedWeapon | undefined`.
- Produces: `auditCatalog(catalog: GameDataCatalog, manifest: DataManifest): CatalogAuditResult` and `CharacterIcon(props: CharacterIconProps): JSX.Element` with an element-color fallback.
- `manifest.json` records `gameVersion`, `fetchedAt`, `provider`, `normalizerVersion`, SHA-256 checksums and exact counts for each generated file.

- [ ] **Step 1: Write failing catalog and audit tests**

```ts
it("matches every generated file to the manifest", () => {
  const audit = auditCatalog(catalog, manifest);
  expect(audit.countMismatches).toEqual([]);
  expect(audit.checksumMismatches).toEqual([]);
});
it("has no dangling skill, weapon, buff or icon references", () => {
  expect(auditCatalog(catalog, manifest).danglingReferences).toEqual([]);
});
it("loads every 3.7 resonator with at least one parsed damage action", () => {
  expect(catalog.characters).toHaveLength(catalog.manifest.counts.characters);
  expect(catalog.characters.filter(c => c.actions.some(a => a.parseStatus === "parsed"))).toHaveLength(catalog.characters.length);
});
it("falls back when a remote character icon fails", async () => {
  render(<CharacterIcon name="今汐" element="spectro" src="https://invalid.example/icon.png" />);
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByText("今")).toHaveAttribute("data-element", "spectro");
});
```

- [ ] **Step 2: Run the catalog tests and verify failure**

Run: `npm test -- --run src/data/catalog.test.ts scripts/data/audit.test.ts`  
Expected: FAIL because the 3.7 generated files and catalog loader do not exist.

- [ ] **Step 3: Generate, review and commit the 3.7 snapshot**

Run the fetcher for character, weapon, echo and monster; normalize into the four generated JSON files; add manual common Buff rules only when their condition and zone can be traced to source text. Replace demo selectors with catalog selectors and show `manual` records as “需手动确认”.

- [ ] **Step 4: Run full data and workbench regression checks**

Run: `npm test -- --run src/data scripts/data src/features/workbench && npm run typecheck && npm run build`  
Expected: all commands exit 0 and the manifest audit reports zero dangling references.

- [ ] **Step 5: Commit**

```bash
git add src/data/generated src/data/rules src/data/catalog.ts src/data/catalog.test.ts scripts/data/audit.test.ts src/components/CharacterIcon.tsx src/features/workbench README.md
git commit -m "feat: add complete version 3.7 game catalog"
```

### Task 3: Counterfactual Stat Dilution Engine and View

**Files:**
- Create: `src/engine/dilution.ts`, `src/engine/dilution.test.ts`
- Create: `src/features/dilution/DilutionLab.tsx`, `src/features/dilution/DilutionLab.module.css`, `src/features/dilution/DilutionLab.test.tsx`
- Create: `src/features/dilution/DilutionChart.tsx`, `src/features/dilution/MarginalRanking.tsx`
- Modify: `src/App.tsx`, `src/domain/types.ts`

**Interfaces:**
- Consumes: `resolveHit` and catalog roll values.
- Produces: `compareMarginalValue(config: CalculationConfig, budget: BudgetDefinition, axis: AnalysisAxis): MarginalValueResult`.
- `MarginalValueResult` includes candidates, curve points, crossings, overflow loss, best candidate and source budget label.

- [ ] **Step 1: Write failing marginal-value tests**

```ts
it("shows lower gain in an already saturated additive zone", () => {
  const low = compareMarginalValue(baseConfig({ damageBonus: 0 }), tenPercent, "singleHit");
  const high = compareMarginalValue(baseConfig({ damageBonus: 1 }), tenPercent, "singleHit");
  expect(low.candidates.find(x => x.stat === "damageBonus")?.relativeGain).toBeCloseTo(0.1);
  expect(high.candidates.find(x => x.stat === "damageBonus")?.relativeGain).toBeCloseTo(0.05);
});
it("crit overflow has zero value", () => {
  const capped = compareMarginalValue(baseConfig({ critRate: 1 }), tenPercent, "singleHit");
  const overflowed = compareMarginalValue(baseConfig({ critRate: 1.2 }), tenPercent, "singleHit");
  expect(capped.candidates.find(x => x.stat === "critRate")?.relativeGain).toBe(0);
  expect(overflowed.candidates.find(x => x.stat === "critRate")?.overflowLoss).toBeGreaterThan(0);
});
it("stable ties and crossings", () => {
  const result = compareMarginalValue(tiedCandidateFixture, orderedBudget, "singleHit");
  expect(result.candidates.map(x => x.stat)).toEqual(orderedBudget.candidates.map(x => x.stat));
  expect(result.crossings[0]).toMatchObject({ left: "atkPercent", right: "damageBonus", budgetUnits: 4 });
});
it("recomputes threshold-dependent buffs", () => {
  const result = compareMarginalValue(thresholdBuffFixture, tenPercent, "singleHit");
  expect(result.candidates.find(x => x.stat === "critRate")?.curve.find(x => x.budgetUnits === 1)?.activeBuffIds).toContain("crit-80-bonus");
});
```

- [ ] **Step 2: Run the dilution tests and verify failure**

Run: `npm test -- --run src/engine/dilution.test.ts`  
Expected: FAIL because the counterfactual analyzer does not exist.

- [ ] **Step 3: Implement counterfactual recomputation and the chart view**

Support the “一条中位有效副词条” and “统一增加 10 个百分点” budgets. Generate 0 through 20 budget-unit points, mark current value, first crossing and caps, and make the ranking explain its denominator and affected zone.

- [ ] **Step 4: Run engine, component and accessibility checks**

Run: `npm test -- --run src/engine/dilution.test.ts src/features/dilution && npm run typecheck && npm run build`  
Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/engine/dilution.ts src/engine/dilution.test.ts src/features/dilution src/App.tsx src/domain/types.ts
git commit -m "feat: visualize stat dilution and marginal value"
```

### Task 4: A/B Build Comparison and Share-State Migration

**Files:**
- Create: `src/features/comparison/BuildComparison.tsx`, `src/features/comparison/BuildComparison.module.css`, `src/features/comparison/BuildComparison.test.tsx`
- Create: `src/features/comparison/DeltaBars.tsx`, `src/features/comparison/SlopeChart.tsx`
- Modify: `src/store/persistedState.ts`, `src/store/persistedState.test.ts`, `src/App.tsx`

**Interfaces:**
- Consumes: `CalculationConfig`, Phase 1 engine and Task 2 catalog.
- Produces: `compareBuilds(a: CalculationConfig, b: CalculationConfig): BuildComparisonResult` inside `src/engine/comparison.ts`.
- Extends persistence to schema version 2 with `migrateV1ToV2(value: PersistedStateV1): PersistedStateV2`.
- Produces: `exportState(state: PersistedStateV2): string` and `importState(json: string): ImportStateResult` for full local backup and restore.

- [ ] **Step 1: Write failing comparison and migration tests**

```tsx
it("shows signed deltas for non-crit, crit and expected damage", () => {
  const result = compareBuilds(comparisonFixture.a, comparisonFixture.b);
  expect(result.expected).toMatchObject({ a: 10000, b: 11000, absolute: 1000, relative: 0.1 });
});
it("missing catalog reference", () => {
  render(<BuildComparison initialState={{ ...validState, buildA: { characterId: "removed-character" } }} />);
  expect(screen.getByText("角色数据已不存在")).toBeVisible();
  expect(screen.getByDisplayValue("removed-character")).toBeInTheDocument();
});
it("migrates a phase-one saved panel into build A", () => {
  expect(migrateV1ToV2(v1Fixture)).toMatchObject({ schemaVersion: 2, buildA: { panel: v1Fixture.panel } });
});
it("round-trips a complete configuration through JSON", () => {
  expect(importState(exportState(v2Fixture))).toEqual({ ok: true, state: v2Fixture });
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- --run src/features/comparison src/store`  
Expected: FAIL because comparison UI and v2 migration do not exist.

- [ ] **Step 3: Implement comparison, migration and compact URL sharing**

Use the same target and action by default, permit independent overrides, show signed absolute and relative deltas, and include only view, IDs and numeric overrides in the URL payload. Keep long or unsupported state in local storage and JSON export.

- [ ] **Step 4: Run the complete phase gate**

Run: `npm ci && npm run typecheck && npm test -- --run && npm run build && npm run test:e2e`  
Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/features/comparison src/engine/comparison.ts src/store src/App.tsx
git commit -m "feat: compare builds and share configurations"
```
