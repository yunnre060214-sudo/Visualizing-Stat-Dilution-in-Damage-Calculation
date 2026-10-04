import { useMemo, useState } from "react";
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
      <div className={styles.lab}>
        <header className={styles.hero}>
          <div><p className={styles.kicker}>STAT DILUTION / CURRENT BUILD</p><h2>词条稀释实验室</h2></div>
        </header>
        <p className={styles.invalidNotice} role="alert">{resolved.issues.join("；")}</p>
      </div>
    );
  }

  return (
    <div className={styles.lab}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>STAT DILUTION / LIVE COUNTERFACTUAL</p>
          <h2>词条稀释实验室</h2>
        </div>
        <p>曲线直接复制伤害工作台的当前角色、武器、动作、目标与面板，再加入同一预算重跑完整公式。</p>
      </header>

      <section className={styles.controls} aria-labelledby="dilution-controls-title">
        <div className={styles.controlsHeading}>
          <div>
            <p className={styles.kicker}>CURRENT BUILD / DENOMINATOR</p>
            <h3 id="dilution-controls-title">当前配置与比较口径</h3>
          </div>
          <strong>{Math.floor(result.baselineDamage).toLocaleString("zh-CN")}<small> 当前期望伤害</small></strong>
        </div>
        <div className={styles.controlGrid}>
          {fieldDefinitions.map((field) => (
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
          ))}
          <label>
            <span>预算口径</span>
            <select aria-label="预算口径" value={budget.id} onChange={(event) => setBudgetId(event.target.value)}>
              {budgets.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
            </select>
          </label>
          <label>
            <span>纵轴</span>
            <select aria-label="图表纵轴" value={metric} onChange={(event) => setMetric(event.target.value as ChartMetric)}>
              <option value="relative">相对当前提升</option>
              <option value="marginal">本单位边际提升</option>
              <option value="damage">期望伤害</option>
            </select>
          </label>
        </div>
        <p className={styles.budgetSource}>{result.sourceBudgetLabel}</p>
      </section>

      <div className={styles.analysisGrid}>
        <DilutionChart metric={metric} result={result} />
        <MarginalRanking budget={budget} result={result} />
      </div>
    </div>
  );
}
