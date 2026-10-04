import type { ReactNode } from "react";
import { ResultRail } from "./ResultRail";
import styles from "./WorkspaceFrame.module.css";

export interface WorkspaceFrameProps {
  children: ReactNode;
  description: ReactNode;
  kicker: string;
  result: ReactNode;
  resultLabel: string;
  title: string;
}

export function WorkspaceFrame({
  children,
  description,
  kicker,
  result,
  resultLabel,
  title,
}: WorkspaceFrameProps) {
  return (
    <div className={styles.workspace}>
      <header className={styles.workspaceHeader}>
        <div>
          <p>{kicker}</p>
          <h1>{title}</h1>
        </div>
        <div className={styles.description}>{description}</div>
      </header>
      <div className={styles.taskArea}>{children}</div>
      <div className={styles.resultSlot}>
        <ResultRail label={resultLabel}>{result}</ResultRail>
      </div>
    </div>
  );
}
