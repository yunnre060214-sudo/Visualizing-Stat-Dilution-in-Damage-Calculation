import type { AppView } from "../store/persistedState";
import { ThemeToggle } from "../theme/ThemeToggle";
import type { ViewItem } from "./AppShell";
import styles from "./AppShell.module.css";

interface MobileNavigationProps {
  activeView: AppView;
  onViewChange(view: AppView): void;
  views: readonly ViewItem[];
}

export function MobileNavigation({ activeView, onViewChange, views }: MobileNavigationProps) {
  return (
    <>
      <header className={styles.mobileHeader}>
        <div>
          <span className={styles.brandMark} aria-hidden="true">∿</span>
          <strong>伤害实验室</strong>
        </div>
        <span className={styles.mobileVersion}>数据版本 3.7</span>
        <ThemeToggle className={styles.mobileThemeToggle} />
      </header>
      <nav aria-label="功能视图" className={styles.mobileNav} data-variant="mobile">
        {views.map((view, index) => (
          <button
            aria-current={activeView === view.id ? "page" : undefined}
            key={view.id}
            onClick={() => onViewChange(view.id)}
            type="button"
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <b>{view.shortLabel}</b>
          </button>
        ))}
      </nav>
    </>
  );
}
