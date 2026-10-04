import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppView } from "../store/persistedState";
import { MobileNavigation } from "./MobileNavigation";
import { Sidebar } from "./Sidebar";
import styles from "./AppShell.module.css";

export interface ViewItem {
  id: AppView;
  label: string;
  shortLabel: string;
}

export const appViews: readonly ViewItem[] = [
  { id: "workbench", label: "伤害工作台", shortLabel: "伤害" },
  { id: "dilution", label: "词条稀释", shortLabel: "稀释" },
  { id: "comparison", label: "配装对比", shortLabel: "对比" },
  { id: "rotation", label: "循环时间轴", shortLabel: "循环" },
];

const MobileLayoutContext = createContext(false);

function initialMobileLayout() {
  return window.matchMedia?.("(max-width: 759px)").matches ?? false;
}

export interface AppShellProps {
  activeView: AppView;
  children: ReactNode;
  onViewChange(view: AppView): void;
}

export function AppShell({ activeView, children, onViewChange }: AppShellProps) {
  const [mobile, setMobile] = useState(initialMobileLayout);

  useEffect(() => {
    const query = window.matchMedia?.("(max-width: 759px)");
    if (!query) return undefined;
    const update = (event: MediaQueryListEvent) => setMobile(event.matches);
    setMobile(query.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  const contextValue = useMemo(() => mobile, [mobile]);

  return (
    <MobileLayoutContext.Provider value={contextValue}>
      <div className={styles.shell} data-layout={mobile ? "mobile" : "desktop"}>
        {mobile ? (
          <MobileNavigation activeView={activeView} onViewChange={onViewChange} views={appViews} />
        ) : (
          <Sidebar activeView={activeView} onViewChange={onViewChange} views={appViews} />
        )}
        <main className={styles.main}>{children}</main>
      </div>
    </MobileLayoutContext.Provider>
  );
}

export function useMobileLayout() {
  return useContext(MobileLayoutContext);
}
