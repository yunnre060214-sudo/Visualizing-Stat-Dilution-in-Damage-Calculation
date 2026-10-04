import type { AppView } from "../store/persistedState";
import { ThemeToggle } from "../theme/ThemeToggle";
import type { ViewItem } from "./AppShell";
import styles from "./AppShell.module.css";

interface SidebarProps {
  activeView: AppView;
  onViewChange(view: AppView): void;
  views: readonly ViewItem[];
}

export function Sidebar({ activeView, onViewChange, views }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandLockup}>
        <span className={styles.brandMark} aria-hidden="true">∿</span>
        <div className={styles.brandCopy}>
          <p>WUTHERING WAVES</p>
          <strong>伤害实验室</strong>
        </div>
      </div>

      <nav aria-label="功能视图" className={styles.sidebarNav} data-variant="sidebar">
        {views.map((view, index) => (
          <button
            aria-current={activeView === view.id ? "page" : undefined}
            className={activeView === view.id ? styles.navItemActive : styles.navItem}
            key={view.id}
            onClick={() => onViewChange(view.id)}
            type="button"
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <b>{view.label}</b>
            <small>{view.shortLabel}</small>
          </button>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <p><span aria-hidden="true" />数据版本 3.7</p>
        <ThemeToggle className={styles.themeToggle} />
      </div>
    </aside>
  );
}
