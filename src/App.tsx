import { AppShell, appViews } from "./app/AppShell";
import { WorkspaceFrame } from "./app/WorkspaceFrame";
import { BuildComparison } from "./features/comparison/BuildComparison";
import { DilutionLab } from "./features/dilution/DilutionLab";
import { Workbench } from "./features/workbench/Workbench";
import { PersistedStateProvider, usePersistedState } from "./store/PersistedStateProvider";
import type { AppView } from "./store/persistedState";
import { ThemeProvider } from "./theme/ThemeProvider";

function AppContent() {
  const { notice, setState, state } = usePersistedState();
  const setActiveView = (view: AppView) => setState((current) => ({ ...current, view }));

  return (
    <AppShell activeView={state.view} onViewChange={setActiveView}>
        {notice && <p className="app-notice" role="status">{notice}</p>}
        {state.view === "workbench" && <Workbench />}
        {state.view === "dilution" && <DilutionLab />}
        {state.view === "comparison" && <BuildComparison />}
        {state.view === "rotation" && (
          <WorkspaceFrame
            description={<p>该视图将在后续阶段接入同一套可解释伤害引擎与版本化数据。</p>}
            kicker="ROTATION / PHASE 3"
            result={(
              <section className="empty-result">
                <p className="section-kicker">PLANNED OUTPUT</p>
                <h2>尚未接入</h2>
                <ul><li>循环总伤与 DPS</li><li>Buff 覆盖率</li><li>成员伤害贡献</li></ul>
              </section>
            )}
            resultLabel="循环输出"
            title={appViews.find((view) => view.id === state.view)?.label ?? "循环时间轴"}
          >
            <section className="empty-workbench">
              <p className="section-kicker">VIEW / IN PROGRESS</p>
              <h2>时间轴编辑器将在下一阶段开放</h2>
              <p>当前版本先完成单次伤害、词条稀释与配装对比的统一工作台体验。</p>
            </section>
          </WorkspaceFrame>
        )}
    </AppShell>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <PersistedStateProvider>
        <AppContent />
      </PersistedStateProvider>
    </ThemeProvider>
  );
}
