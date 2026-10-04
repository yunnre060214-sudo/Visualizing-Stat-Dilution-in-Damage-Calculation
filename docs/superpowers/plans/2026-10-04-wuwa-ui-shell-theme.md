# 鸣潮伤害可视化 UI v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有页面重构为侧栏工作台，并加入从主题按钮圆心扩散的深浅主题切换。

**Architecture:** 全局 `ThemeProvider` 独立管理主题和过渡状态，`AppShell` 管理响应式导航，业务视图通过 `WorkspaceFrame` 把主任务与结果栏分开。现有伤害引擎、数据和持久化结构保持不变，功能组件只调整呈现层与局部交互。

**Tech Stack:** React 19、TypeScript 5.9、CSS Modules、CSS View Transitions、ECharts 6、Vitest、Testing Library、Playwright、Vite 7

**Spec:** `docs/superpowers/specs/2026-10-04-wuwa-ui-shell-theme-design.md`

## Global Constraints

- 不增加运行时依赖，不修改伤害公式和 3.7 数据快照。
- 主题只允许 `light | dark`，保存键固定为 `wuwa-theme`，首次访问跟随 `prefers-color-scheme`。
- 桌面断点为大于 1080 像素，中等宽度为 760 至 1080 像素，移动端为小于 760 像素。
- 主题扩散动画约 650 毫秒；开启 `prefers-reduced-motion: reduce` 时立即切换。
- 卡片维持直角与细边线，移动端使用底部导航，不使用遮挡主内容的侧向抽屉。
- 现有分享 URL、本地伤害配置和 GitHub Pages 子路径保持兼容。

## Review Focus

- `wuwa-theme` 含无效值或浏览器存储抛错时，应回退系统主题并保持本次会话可切换；Task 1 组件测试覆盖。
- 浏览器没有 View Transitions API 或启用减少动态效果时，主题必须完成切换且不留下遮罩；Task 1 组件测试覆盖。
- 用户快速连续点击主题按钮时，只允许一个过渡运行，最终主题与保存值一致；Task 1 组件测试覆盖。
- 760 与 1080 像素断点附近不得出现双导航、结果栏遮挡或页面级横向滚动；Task 2 与 Task 5 的组件和端到端测试覆盖。
- 浅色主题下 ECharts、错误状态和焦点环不能继续使用只适合深色背景的固定颜色；Task 5 的主题测试与截图检查覆盖。

---

### Task 1: 主题状态与圆形幕布

**Files:**
- Create: `src/theme/theme.ts`
- Create: `src/theme/ThemeProvider.tsx`
- Create: `src/theme/ThemeToggle.tsx`
- Create: `src/theme/ThemeCurtain.tsx`
- Create: `src/theme/ThemeProvider.test.tsx`
- Create: `src/styles/tokens.css`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Modify: `src/vite-env.d.ts`

**Interfaces:**
- Produces: `Theme = "light" | "dark"`, `ThemeProvider`, `useTheme(): { theme, targetTheme, transitioning, toggleTheme(origin) }`, `ThemeToggle`。
- Produces: `getRevealRadius(origin: { x: number; y: number }, viewport: { width: number; height: number }): number`。
- Consumes: 浏览器 `matchMedia`、`localStorage` 和可选的 `document.startViewTransition`。

- [x] **Step 1: 写出失败的主题测试**

在 `ThemeProvider.test.tsx` 覆盖系统主题初始化、有效保存值优先、无效保存值回退、存储读写抛错、按钮中心坐标、减少动态效果、API 缺失降级和连续点击锁定；断言 `document.documentElement.dataset.theme`、`localStorage` 与遮罩清理结果。

- [x] **Step 2: 运行主题测试并确认失败**

Run: `npx vitest run src/theme/ThemeProvider.test.tsx`
Expected: FAIL，原因是主题模块尚不存在。

- [x] **Step 3: 实现纯主题函数与提供器**

在 `theme.ts` 实现 `resolveInitialTheme(storage, mediaQuery)`、`applyTheme(theme)` 和 `getRevealRadius(origin, viewport)`；在 `ThemeProvider.tsx` 实现 650 毫秒 View Transition 路径、降级遮罩路径、减少动态效果路径和竞态清理。

- [x] **Step 4: 实现按钮、遮罩与主题变量**

`ThemeToggle` 从点击目标的 `getBoundingClientRect()` 计算圆心，按钮可访问名称为“切换到浅色主题”或“切换到深色主题”；`ThemeCurtain` 只在降级路径渲染。`tokens.css` 提供设计文档列出的全部语义变量和两套主题值。

- [x] **Step 5: 接入应用根节点并运行测试**

在 `main.tsx` 导入 `tokens.css`，并在导出的 `App` 内用 `ThemeProvider` 包裹现有 `PersistedStateProvider`，确保生产入口和直接渲染 `App` 的测试使用同一主题边界；补充 View Transition 类型。运行 `npx vitest run src/theme/ThemeProvider.test.tsx src/App.test.tsx`，Expected: PASS。

- [x] **Step 6: 提交主题基础**

```bash
git add src/theme src/styles/tokens.css src/App.tsx src/main.tsx src/vite-env.d.ts
git commit -m "feat: add animated light and dark themes"
```

### Task 2: 响应式侧栏工作台外壳

**Files:**
- Create: `src/app/AppShell.tsx`
- Create: `src/app/Sidebar.tsx`
- Create: `src/app/MobileNavigation.tsx`
- Create: `src/app/WorkspaceFrame.tsx`
- Create: `src/app/ResultRail.tsx`
- Create: `src/app/AppShell.module.css`
- Create: `src/app/WorkspaceFrame.module.css`
- Create: `src/app/AppShell.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `AppView`、`ThemeToggle` 与现有 `setState` 导航。
- Produces: `AppShellProps { activeView: AppView; onViewChange(view: AppView): void; children: ReactNode }`。
- Produces: `WorkspaceFrameProps { kicker; title; description; children; result; resultLabel }`，`ResultRail` 处理桌面粘性栏与移动展开状态。

- [x] **Step 1: 写出失败的外壳测试**

测试桌面渲染单一“功能视图”导航、四个入口、数据版本和主题按钮；模拟移动媒体查询后只渲染移动导航，并断言结果面板按钮拥有正确的 `aria-expanded`。保留现有跨视图状态测试。

- [x] **Step 2: 运行外壳测试并确认失败**

Run: `npx vitest run src/app/AppShell.test.tsx src/App.test.tsx`
Expected: FAIL，原因是新外壳组件尚不存在。

- [x] **Step 3: 实现外壳组件**

`AppShell` 根据 `(max-width: 759px)` 媒体查询选择 `Sidebar` 或 `MobileNavigation`，中等宽度侧栏由 CSS 收窄；导航定义只保留一份并通过 props 传入。`ResultRail` 在移动端默认折叠详细内容，但始终显示结果摘要标题。

- [x] **Step 4: 重写 App 组合层**

将现有顶栏与横向页签替换为 `AppShell`；四个功能组件仍由 `AppContent` 根据 `state.view` 选择。循环时间轴占位页改用 `WorkspaceFrame`，明确标注“尚未接入”。

- [x] **Step 5: 完成响应式外壳样式并运行测试**

实现 216 像素桌面侧栏、紧凑中等侧栏、移动顶栏和安全区底部导航。运行 `npx vitest run src/app/AppShell.test.tsx src/App.test.tsx`，Expected: PASS。

- [x] **Step 6: 提交工作台外壳**

```bash
git add src/app src/App.tsx src/App.test.tsx src/styles/global.css
git commit -m "feat: replace top tabs with responsive workspace shell"
```

### Task 3: 重组伤害工作台

**Files:**
- Modify: `src/features/workbench/Workbench.tsx`
- Modify: `src/features/workbench/Workbench.module.css`
- Modify: `src/features/workbench/PanelEditor.tsx`
- Modify: `src/features/workbench/DamageSummary.tsx`
- Modify: `src/features/workbench/Workbench.test.tsx`

**Interfaces:**
- Consumes: `WorkspaceFrame` 与现有 `DamageSummary`、`TracePanel`、`BuffList` 计算结果。
- Produces: 工作台主区“基础配置”“面板参数”“详细分析”，以及传给结果栏的伤害摘要。

- [x] **Step 1: 写出失败的工作台布局测试**

断言工作台存在三个语义分区；“Buff 来源”和“乘区追踪”作为标签互斥显示；期望、未暴击和暴击结果位于结果栏；切换标签不会改变面板值或计算结果。无效输入时结果栏仍显示结构和错误说明。

- [x] **Step 2: 运行工作台测试并确认失败**

Run: `npx vitest run src/features/workbench/Workbench.test.tsx`
Expected: FAIL，原因是详细分析标签和结果栏结构尚不存在。

- [x] **Step 3: 将现有计算结果拆入 WorkspaceFrame**

保持 `Workbench` 中的目录选择和计算逻辑不变，将目录区改名为“基础配置”，把 `PanelEditor` 改为分组字段网格，将 `DamageSummary` 作为 `WorkspaceFrame.result`。

- [x] **Step 4: 实现详细分析标签**

用本地状态 `analysisTab: "buffs" | "trace"` 控制 `BuffList` 与 `TracePanel`，按钮使用 `role="tab"`、`aria-selected` 和对应 `tabpanel`；首次进入默认显示乘区追踪。

- [x] **Step 5: 运行工作台和应用回归测试**

Run: `npx vitest run src/features/workbench/Workbench.test.tsx src/App.test.tsx`
Expected: PASS，现有输入联动与持久化断言保持通过。

- [x] **Step 6: 提交工作台重组**

```bash
git add src/features/workbench
git commit -m "feat: reorganize damage workbench around core tasks"
```

### Task 4: 重组词条稀释与配装对比

**Files:**
- Modify: `src/features/dilution/DilutionLab.tsx`
- Modify: `src/features/dilution/DilutionLab.module.css`
- Modify: `src/features/dilution/DilutionLab.test.tsx`
- Modify: `src/features/comparison/BuildComparison.tsx`
- Modify: `src/features/comparison/BuildComparison.module.css`
- Modify: `src/features/comparison/BuildComparison.test.tsx`

**Interfaces:**
- Consumes: `WorkspaceFrame`、`MarginalRanking`、`DeltaBars` 与 `SlopeChart`。
- Produces: 稀释页主图加右侧排名，对比页 A/B 编辑加右侧结果，以及默认折叠的“配置工具”。

- [x] **Step 1: 写出失败的稀释与对比布局测试**

稀释测试断言推荐排名位于结果栏且参数变化继续更新基准；对比测试断言 JSON 文本区默认隐藏，点击“配置工具”后展开并可完成导入导出，A/B 结果仍实时更新。

- [x] **Step 2: 运行目标测试并确认失败**

Run: `npx vitest run src/features/dilution/DilutionLab.test.tsx src/features/comparison/BuildComparison.test.tsx`
Expected: FAIL，原因是结果栏与配置工具折叠尚未实现。

- [x] **Step 3: 重组词条稀释**

用 `WorkspaceFrame` 包裹页面，将 `MarginalRanking` 传入 `result`；把五个当前加成分为攻击、暴击和增伤组，将预算与纵轴选择移动到曲线工具区，保留原标签名称以兼容输入和测试。

- [x] **Step 4: 重组配装对比**

保留 A/B 编辑逻辑，为每张卡加入 `catalog | panel` 本地标签；将 `DeltaBars` 与 `SlopeChart` 移入结果栏；使用 `aria-expanded` 控制“配置工具”，其中包含分享、导入导出和 JSON 文本区。

- [x] **Step 5: 运行功能回归测试**

Run: `npx vitest run src/features/dilution/DilutionLab.test.tsx src/features/comparison/BuildComparison.test.tsx src/App.test.tsx`
Expected: PASS。

- [x] **Step 6: 提交分析页重组**

```bash
git add src/features/dilution src/features/comparison
git commit -m "feat: separate analysis controls from persistent results"
```

### Task 5: 完成语义色迁移、图表主题与断点验证

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/features/workbench/Workbench.module.css`
- Modify: `src/features/dilution/DilutionLab.module.css`
- Modify: `src/features/dilution/DilutionChart.tsx`
- Modify: `src/features/comparison/BuildComparison.module.css`
- Modify: `src/features/comparison/SlopeChart.tsx`
- Modify: `tests/e2e/pages.spec.ts`

**Interfaces:**
- Consumes: `useTheme().theme` 与 `tokens.css` 语义变量。
- Produces: 全部视图的深浅配色、图表随主题更新、三个响应式断点无页面级溢出。

- [x] **Step 1: 扩展失败的端到端断点和主题测试**

增加 1440×1000、1080×900、760×900、390×844 四组视口断言；检查导航数量、页面宽度、结果栏可见方式和底部安全区。增加主题切换、刷新持久化和深浅主题属性断言。

- [x] **Step 2: 运行端到端测试并确认失败**

Run: `npm run build && npm run test:e2e -- tests/e2e/pages.spec.ts`
Expected: FAIL，原因是颜色迁移、图表主题或断点样式尚未完成。

- [x] **Step 3: 清除功能样式中的固定主题色**

将三个 CSS Module 与 `global.css` 的文字、背景、边线、阴影、焦点、错误、警告和成功色替换为 `tokens.css` 变量；仅允许图表数据系列使用明确的品牌色常量。

- [x] **Step 4: 让图表响应主题**

`DilutionChart` 和 `SlopeChart` 消费当前主题或 CSS 变量，为轴线、网格、标签、提示框和背景应用主题颜色；切换主题时重新设置 ECharts option 或重新渲染 SVG。

- [x] **Step 5: 修正断点与运行完整前端测试**

逐个处理 1080、760 和 390 像素宽度下的最小宽度、粘性定位、图表滚动与底部导航间距。运行 `npm test && npm run typecheck && npm run build && npm run test:e2e`，Expected: 全部通过。

- [x] **Step 6: 提交主题和响应式收口**

```bash
git add src tests/e2e/pages.spec.ts
git commit -m "feat: finish light theme and responsive UI v2"
```

### Task 6: 文档、发布与线上验收

**Files:**
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: 已完成的 UI v2 构建与现有 GitHub Pages 工作流。
- Produces: 版本号 `0.2.0`、README 的新界面与主题说明、可公开访问的 Pages 版本。

- [x] **Step 1: 更新版本和 README**

将 `package.json` 版本改为 `0.2.0`，README 增加侧栏工作台、响应式结果栏、深浅主题和圆形扩散动画说明；保留当前演示链接和非官方声明。

- [ ] **Step 2: 运行发布前验证**

Run: `npm test && npm run typecheck && npm run build && npm run test:e2e`
Expected: 数据发现测试、全部 Vitest、TypeScript、Vite 构建与全部 Playwright 测试通过。

- [ ] **Step 3: 检查仓库差异并提交**

Run: `git diff --check && git status --short`
Expected: 只包含本计划的 README、版本和计划勾选更新；不纳入 `.codex/` 与 `upload/`。

```bash
git add README.md package.json package-lock.json docs/superpowers/plans/2026-10-04-wuwa-ui-shell-theme.md
git commit -m "docs: release UI v2"
```

- [ ] **Step 4: 推送并等待 GitHub Pages 工作流**

将提交推送到现有仓库 `main`，确认 GitHub Actions 的验证与部署作业均成功。

- [ ] **Step 5: 线上验收**

打开 `https://yunnre060214-sudo.github.io/Visualizing-Stat-Dilution-in-Damage-Calculation/`，验证桌面侧栏、移动底部导航、主题圆形扩散、刷新持久化、工作台参数联动、词条排名和配装对比；记录最终 URL 和工作流链接。
