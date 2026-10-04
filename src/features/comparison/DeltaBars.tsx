import type { BuildComparisonResult, BuildMetricDelta } from "../../domain/types";
import styles from "./BuildComparison.module.css";

const metrics: Array<{ key: keyof Pick<BuildComparisonResult, "nonCrit" | "crit" | "expected">; label: string }> = [
  { key: "nonCrit", label: "未暴击" },
  { key: "crit", label: "暴击" },
  { key: "expected", label: "期望伤害" },
];

function signed(value: number, digits = 0): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toLocaleString("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}`;
}

function relative(metric: BuildMetricDelta): string {
  return metric.relative === null ? "基准为 0" : `${signed(metric.relative * 100, 2)}%`;
}

export function DeltaBars({ result }: { result: BuildComparisonResult | null }) {
  if (result === null) {
    return <div className={styles.noResult}>修正无效输入或失效的数据引用后即可比较。</div>;
  }

  const scale = Math.max(...metrics.map(({ key }) => Math.abs(result[key].relative ?? 0)), 0.01);

  return (
    <div className={styles.deltaList} aria-label="方案 B 相对方案 A 的伤害变化">
      {metrics.map(({ key, label }) => {
        const metric = result[key];
        const width = Math.min(50, (Math.abs(metric.relative ?? 0) / scale) * 50);
        return (
          <article
            className={styles.deltaRow}
            data-direction={metric.absolute > 0 ? "positive" : metric.absolute < 0 ? "negative" : "neutral"}
            data-testid={`delta-${key === "nonCrit" ? "non-crit" : key}`}
            key={key}
          >
            <div className={styles.deltaLabel}>
              <span>{label}</span>
              <small>A {Math.floor(metric.a).toLocaleString("zh-CN")} · B {Math.floor(metric.b).toLocaleString("zh-CN")}</small>
            </div>
            <div className={styles.deltaTrack} aria-hidden="true">
              <span className={styles.deltaCenter} />
              <span className={styles.deltaFill} style={{ width: `${width}%` }} />
            </div>
            <div className={styles.deltaValue}>
              <strong>{relative(metric)}</strong>
              <small>{signed(metric.absolute)} 伤害</small>
            </div>
          </article>
        );
      })}
    </div>
  );
}
