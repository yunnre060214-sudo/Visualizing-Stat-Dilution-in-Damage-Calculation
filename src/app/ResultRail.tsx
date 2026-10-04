import { useId, useState, type ReactNode } from "react";
import { useMobileLayout } from "./AppShell";
import styles from "./WorkspaceFrame.module.css";

interface ResultRailProps {
  children: ReactNode;
  label: string;
}

export function ResultRail({ children, label }: ResultRailProps) {
  const mobile = useMobileLayout();
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  if (!mobile) {
    return (
      <aside aria-label={label} className={styles.resultRail}>
        {children}
      </aside>
    );
  }

  return (
    <section className={styles.mobileResult}>
      <button
        aria-label={expanded ? `收起${label}` : `展开${label}`}
        aria-controls={contentId}
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <span><small>RESULT / LIVE</small><strong>{label}</strong></span>
        <b aria-hidden="true">{expanded ? "收起" : "展开"}</b>
      </button>
      {expanded && <div id={contentId}>{children}</div>}
    </section>
  );
}
