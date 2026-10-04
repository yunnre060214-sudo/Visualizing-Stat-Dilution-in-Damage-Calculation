import type { BudgetDefinition, MarginalValueResult } from "../../domain/types";
import styles from "./DilutionLab.module.css";

interface MarginalRankingProps {
  budget: BudgetDefinition;
  result: MarginalValueResult;
}

const percentage = (value: number, digits = 2) => `${(value * 100).toFixed(digits)}%`;

export function MarginalRanking({ budget, result }: MarginalRankingProps) {
  const order = new Map(result.candidates.map((candidate, index) => [candidate.stat, index]));
  const ranked = [...result.candidates].sort(
    (left, right) => right.relativeGain - left.relativeGain
      || (order.get(left.stat) ?? 0) - (order.get(right.stat) ?? 0),
  );
  const best = result.candidates.find((candidate) => candidate.stat === result.bestCandidate);
  const denominator = budget.id === "ten-percent"
    ? "每 10 个百分点的相对期望伤害提升"
    : "每一条中位有效副词条的相对期望伤害提升";

  return (
    <section className={styles.ranking} aria-labelledby="marginal-ranking-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.kicker}>NEXT BUDGET / RANKING</p>
          <h2 id="marginal-ranking-title">下一份预算优先 {best?.label ?? "暂无结论"}</h2>
        </div>
        <span>基准 {Math.floor(result.baselineDamage).toLocaleString("zh-CN")}</span>
      </div>
      <p className={styles.denominator}>{denominator}，分母固定为当前配置的期望伤害。</p>
      <ol className={styles.rankList}>
        {ranked.map((candidate, index) => (
          <li
            data-best={candidate.stat === result.bestCandidate || undefined}
            data-testid={`gain-${candidate.stat}`}
            data-value={candidate.relativeGain}
            key={candidate.stat}
          >
            <span className={styles.rankIndex}>{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.rankName}>
              <strong>{candidate.label}</strong>
              <small>{candidate.zoneLabel} · +{percentage(candidate.increment, 1)}</small>
            </span>
            <span className={styles.rankValue}>
              <strong>+{percentage(candidate.relativeGain)}</strong>
              <small>+{Math.floor(candidate.absoluteGain).toLocaleString("zh-CN")} 伤害</small>
            </span>
            {candidate.overflowLoss > 0 && (
              <span className={styles.overflow}>溢出 {percentage(candidate.overflowLoss, 1)}</span>
            )}
          </li>
        ))}
      </ol>
      <p className={styles.sourceLine}>预算来源：{result.sourceBudgetLabel}</p>
    </section>
  );
}
