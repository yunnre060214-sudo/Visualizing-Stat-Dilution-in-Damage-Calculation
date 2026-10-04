import type { DamageTrace } from "../../domain/types";
import styles from "./Workbench.module.css";

interface TracePanelProps {
  trace: DamageTrace | null;
}

const number = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 3 });

export function TracePanel({ trace }: TracePanelProps) {
  return (
    <section className={styles.trace} aria-labelledby="trace-title">
      <div className={styles.traceHeading}>
        <div>
          <p className={styles.kicker}>TRACE / MULTIPLIERS</p>
          <h3 id="trace-title">乘区追踪</h3>
        </div>
        <span>{trace?.steps.length ?? 0} 步</span>
      </div>

      {trace ? (
        <ol className={styles.traceList}>
          {trace.steps.map((item, index) => (
            <li key={item.zone}>
              <span className={styles.traceIndex}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.traceName}>
                {item.label}
                {item.sourceIds.length > 0 && <small>{item.sourceIds.join(" · ")}</small>}
              </span>
              <strong>× {number.format(item.factor)}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.traceEmpty}>修正无效输入后显示完整计算链。</p>
      )}
    </section>
  );
}
