import type { BuildComparisonResult } from "../../domain/types";
import styles from "./BuildComparison.module.css";

const rows = [
  { key: "nonCrit", label: "未暴击", color: "var(--chart-series-neutral)" },
  { key: "crit", label: "暴击", color: "var(--accent-secondary)" },
  { key: "expected", label: "期望", color: "var(--accent-primary)" },
] as const;

export function SlopeChart({ result }: { result: BuildComparisonResult | null }) {
  if (result === null) return null;
  const values = rows.flatMap(({ key }) => [result[key].a, result[key].b]);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 1);
  const y = (value: number) => 154 - ((value - minimum) / range) * 112;

  return (
    <figure className={styles.slopeFigure}>
      <svg
        aria-label="方案 A 与方案 B 的伤害斜率图"
        className={styles.slopeChart}
        role="img"
        viewBox="0 0 520 196"
      >
        <line className={styles.axisLine} x1="112" x2="112" y1="24" y2="164" />
        <line className={styles.axisLine} x1="408" x2="408" y1="24" y2="164" />
        <text className={styles.axisLabel} x="112" y="187" textAnchor="middle">方案 A</text>
        <text className={styles.axisLabel} x="408" y="187" textAnchor="middle">方案 B</text>
        {rows.map(({ key, label, color }) => {
          const metric = result[key];
          return (
            <g key={key}>
              <line data-series={key} stroke={color} strokeWidth={key === "expected" ? 3 : 1.5} x1="112" x2="408" y1={y(metric.a)} y2={y(metric.b)} />
              <circle cx="112" cy={y(metric.a)} fill={color} r={key === "expected" ? 5 : 3.5} />
              <circle cx="408" cy={y(metric.b)} fill={color} r={key === "expected" ? 5 : 3.5} />
              <text className={styles.chartLabel} x="100" y={y(metric.a) + 4} textAnchor="end">{label} {Math.floor(metric.a).toLocaleString("zh-CN")}</text>
              <text className={styles.chartLabel} x="420" y={y(metric.b) + 4}>{Math.floor(metric.b).toLocaleString("zh-CN")}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
