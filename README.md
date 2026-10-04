# 鸣潮伤害与词条稀释可视化

一个面向《鸣潮》3.7 数据版本的静态伤害分析工具。当前页面提供可解释的单段伤害计算器：可从 64 名共鸣者、93 把四星与五星武器和 3400 个伤害动作中选择数据，再修改攻击、暴击、倍率与目标抗性。页面会同步显示未暴击、暴击、期望伤害，以及完整乘区追踪和 Buff 生效原因。

在线演示：<https://yunnre060214-sudo.github.io/Visualizing-Stat-Dilution-in-Damage-Calculation/>

## UI v2

- 桌面端采用侧栏、任务工作区、实时结果栏三段式布局，参数编辑与最终结论不再堆叠在同一块面板中。
- 词条稀释页按攻击区、暴击区和增伤区组织输入，曲线与边际收益排名分区展示；配装对比页以独立标签页编辑 A/B 方案，并默认收起低频配置工具。
- 1080 像素以下会将结果栏移到操作区上方，760 像素以下切换为顶部状态栏、底部导航和可展开结果面板。
- 深色与浅色主题会记住用户选择。点击主题按钮时，新主题从按钮位置以圆形幕布向外扩散；系统启用减少动态效果时会立即切换。

## 本地运行

```bash
npm ci
npm run dev
```

质量检查：

```bash
npm run typecheck
npm test -- --run
npm run build
npx playwright install chromium
npm run test:e2e
```

## 计算口径

演示按攻击缩放、技能倍率、伤害加成、伤害加深、承伤、防御、抗性、最终伤害与期望暴击的顺序计算。界面展示值向下取整，内部计算保留精度。每条 Buff 会保留来源 ID，并分为已生效、未生效和待手动确认。

公式、角色倍率与 Buff 条件会随游戏版本变化。本项目用于配装比较和机制演示，不代表官方数据；实战还会受到命中、取消时机、循环长度与敌人状态影响。

## 数据快照

生产页面只读取仓库内的 3.7 规范化快照，运行时不依赖第三方接口。当前快照包含 64 名共鸣者、93 把四星与五星武器、319 个声骸和 310 个敌人目标。33 个敌人源记录没有战斗属性，目录会保留这些记录并明确标记为需手动确认，不会按零抗性处理。

默认数据源为 [encore.moe API v2](https://api-v2.encore.moe/api/zh-Hans)。`manifest.json` 记录抓取时间、来源、规范化器版本、精确数量和每个生成文件的 SHA-256 校验值。游戏文本与美术资源归其权利人所有，本项目为非官方、非商业的计算演示。

更新快照：

```bash
npm run data:fetch -- --resource character --lang zh-Hans
npm run data:fetch -- --resource weapon --lang zh-Hans
npm run data:fetch -- --resource echo --lang zh-Hans
npm run data:fetch -- --resource monster --lang zh-Hans
npm run data:normalize -- --input api/raw --output src/data/generated \
  --game-version 3.7 --fetched-at 2026-10-03T13:19:44Z
npm test -- --run src/data scripts/data
```

`api/raw/` 只用于本地复核且不会提交；`src/data/generated/` 是可复现、可审计并随页面发布的精简快照。

## 部署

推送到 `main` 后，GitHub Actions 会依次执行类型检查、单元测试、生产构建和 Pages 子路径冒烟测试。全部通过后，`dist` 才会发布到 GitHub Pages。
