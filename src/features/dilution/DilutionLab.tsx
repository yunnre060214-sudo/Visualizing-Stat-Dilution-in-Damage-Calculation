import { useMemo, useState } from "react";
import { WorkspaceFrame } from "../../app/WorkspaceFrame";
import type { BudgetDefinition } from "../../domain/types";
import {
  MEDIAN_SUBSTAT_BUDGET,
  TEN_PERCENT_BUDGET,
  compareMarginalValue,
} from "../../engine/dilution";
import { usePersistedState } from "../../store/PersistedStateProvider";
import type { PanelFormState } from "../../store/persistedState";
import { resolveCatalogBuild } from "../builds/catalogBuild";
import { DilutionChart, type ChartMetric } from "./DilutionChart";
import { MarginalRanking } from "./MarginalRanking";
import styles from "./DilutionLab.module.css";

const budgets = [MEDIAN_SUBSTAT_BUDGET, TEN_PERCENT_BUDGET];
type EditableKey = "atkPercent" | "critRate" | "critDamage" | "damageBonus" | "deepen";

const fieldDefinitions: Array<{ key: EditableKey; label: string; minimum: number }> = [
  { key: "atkPercent", label: "当前攻击加成", minimum: -99 },
  { key: "critRate", label: "当前暴击率", minimum: 0 },
  { key: "critDamage", label: "当前暴击伤害", minimum: 100 },
  { key: "damageBonus", label: "当前伤害加成", minimum: -99 },
  { key: "deepen", label: "当前伤害加深", minimum: -99 },
];

const fieldGroups: Array<{ label: string; keys: EditableKey[] }> = [
  { label: "攻击区", keys: ["atkPercent"] },
  { label: "暴击区", keys: ["critRate", "critDamage"] },
  { label: "增伤区", keys: ["damageBonus", "deepen"] },
];

export function DilutionLab() {
  const { setState, state } = usePersistedState();
  const [budgetId, setBudgetId] = useState(MEDIAN_SUBSTAT_BUDGET.id);
  const [metric, setMetric] = useState<ChartMetric>("relative");
  const budget: BudgetDefinition = budgets.find((candidate) => candidate.id === budgetId)
    ?? MEDIAN_SUBSTAT_BUDGET;
  const resolved = useMemo(() => resolveCatalogBuild(state.buildA), [state.buildA]);
  const result = useMemo(
    () => resolved.config ? compareMarginalValue(resolved.config, budget, "singleHit") : null,
    [budget, resolved.config],
  );

  const updateStat = (key: EditableKey, minimum: number, rawValue: string) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    const normalized = String(Math.max(minimum, value));
    setState((current) => ({
      ...current,
      buildA: {
        ...current.buildA,
        panel: { ...current.buildA.panel, [key]: normalized } as PanelFormState,
      },
    }));
  };

  if (result === null) {
    return (
      <WorkspaceFrame
        description={<p>先修正伤害工作台中的失效引用，实验室随后会自动恢复。</p>}
        kicker="STAT DILUTION / CURRENT BUILD"
        result={<p className={styles.invalidNotice}>暂无可计算结论</p>}
        resultLabel="词条结论"
        title="词条稀释实验室"
      >
        <p className={styles.invalidNotice} role="alert">{resolved.issues.join("；")}</p>
      </WorkspaceFrame>
    );
  }

  const resultRail = (
    <div className={styles.resultColumn}>
      <div className={styles.baselineCard}>
        <span>当前期望伤害</span>
        <strong>{Math.floor(result.baselineDamage).toLocaleString("zh-CN")}</strong>
        <small>作为所有边际收益的固定分母</small>
      </div>
      <MarginalRanking budget={budget} result={result} />
    </div>
  );

  return (
    <WorkspaceFrame
      description={<p>复制当前工作台配置，在相同预算下重跑完整伤害公式，观察继续投入后的真实边际收益。</p>}
      kicker="STAT DILUTION / LIVE COUNTERFACTUAL"
      result={resultRail}
      resultLabel="词条结论"
      title="词条稀释实验室"
    >
      <div className={styles.lab}>
      <section className={styles.controls} aria-labelledby="dilution-controls-title">
        <div className={styles.controlsHeading}>
          <div>
            <p className={styles.kicker}>CURRENT BUILD / DENOMINATOR</p>
            <h2 id="dilution-controls-title">当前配置与比较口径</h2>
          </div>
        </div>
        <div className={styles.statGroups}>
          {fieldGroups.map((group) => (
            <fieldset className={styles.statGroup} key={group.label}>
              <legend>{group.label}</legend>
              <div className={styles.controlGrid}>
                {group.keys.map((key) => {
                  const field = fieldDefinitions.find((entry) => entry.key === key)!;
                  return (
                    <label key={field.key}>
                      <span>{field.label}</span>
                      <span className={styles.numberInput}>
                        <input
                          aria-label={field.label}
                          inputMode="decimal"
                          min={field.minimum}
                          onChange={(event) => updateStat(field.key, field.minimum, event.target.value)}
                          type="number"
                          value={Number(state.buildA.panel[field.key])}
                        />
                        <b>%</b>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
        <div className={styles.chartSettings}>
          <label><span>预算口径</span><select aria-label="预算口径" value={budget.id} onChange={(event) => setBudgetId(event.target.value)}>{budgets.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></label>
          <label><span>纵轴</span><select aria-label="图表纵轴" value={metric} onChange={(event) => setMetric(event.target.value as ChartMetric)}><option value="relative">相对当前提升</option><option value="marginal">本单位边际提升</option><option value="damage">期望伤害</option></select></label>
        </div>
        <p className={styles.budgetSource}>{result.sourceBudgetLabel}</p>
      </section>
      <DilutionChart metric={metric} result={result} />
      </div>
    </WorkspaceFrame>
  );
}
