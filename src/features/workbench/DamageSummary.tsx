import { useEffect, useState } from "react";
import type { HitResult } from "../../domain/types";
import styles from "./Workbench.module.css";

interface DamageSummaryProps {
  result: HitResult | null;
  invalid: boolean;
}

function display(value: number | undefined): string {
  return value === undefined ? "—" : String(value);
}

export function DamageSummary({ result, invalid }: DamageSummaryProps) {
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (result === null || invalid) {
      setAnnouncement("");
      return;
    }
    const timer = window.setTimeout(() => {
      setAnnouncement(`期望伤害 ${result.expected.display}`);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [invalid, result]);

  return (
    <section className={styles.summary} aria-labelledby="damage-summary-title">
      <div className={styles.summaryTopline}>
        <div>
          <p className={styles.kicker}>OUTPUT / EXPECTATION</p>
          <h2 id="damage-summary-title">单次伤害演算</h2>
        </div>
        <span className={styles.liveBadge}>实时</span>
      </div>

      <div
        className={styles.heroResult}
        data-testid="expected-damage"
        aria-invalid={invalid}
      >
        <span>期望伤害</span>
        <strong>{display(result?.expected.display)}</strong>
        <small>按当前暴击率加权</small>
      </div>

      <div className={styles.damagePair}>
        <div>
          <span>未暴击</span>
          <strong data-testid="non-crit-damage">{display(result?.nonCrit.display)}</strong>
        </div>
        <div>
          <span>暴击</span>
          <strong data-testid="crit-damage">{display(result?.crit.display)}</strong>
        </div>
      </div>
      <p className={styles.visuallyHidden} role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </section>
  );
}
