import { BuildComparison } from "./features/comparison/BuildComparison";
import { DilutionLab } from "./features/dilution/DilutionLab";
import { Workbench } from "./features/workbench/Workbench";
import { PersistedStateProvider, usePersistedState } from "./store/PersistedStateProvider";
import type { AppView } from "./store/persistedState";

const views = ["伤害工作台", "词条稀释", "配装对比", "循环时间轴"] as const;
const viewIndexes: Record<AppView, number> = {
  workbench: 0,
  dilution: 1,
  comparison: 2,
  rotation: 3,
};

function AppContent() {
  const { notice, setState, state } = usePersistedState();
  const activeView = viewIndexes[state.view];

  const setActiveView = (index: number) => {
    const view = (Object.keys(viewIndexes) as AppView[]).find(
      (candidate) => viewIndexes[candidate] === index,
    ) ?? "workbench";
    setState((current) => ({ ...current, view }));
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">∿</span>
          <div>
            <p className="eyebrow">WUTHERING WAVES · DAMAGE LAB</p>
            <h1>伤害与词条稀释</h1>
          </div>
        </div>
        <div className="version-badge" aria-label="当前数据版本">
          <span className="status-dot" aria-hidden="true" />
          数据版本 3.7
        </div>
      </header>

      <nav className="view-nav" aria-label="功能视图">
        {views.map((view, index) => (
          <button
            className={index === activeView ? "view-tab view-tab--active" : "view-tab"}
            type="button"
            aria-current={index === activeView ? "page" : undefined}
            key={view}
            onClick={() => setActiveView(index)}
          >
            <span className="tab-index">0{index + 1}</span>
            {view}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {notice && <p className="app-notice" role="status">{notice}</p>}
        {activeView === 0 && <Workbench />}
        {activeView === 1 && <DilutionLab />}
        {activeView === 2 && <BuildComparison />}
        {activeView === 3 && (
          <section className="empty-workbench">
            <p className="section-kicker">VIEW / IN PROGRESS</p>
            <h2>{views[activeView]}</h2>
            <p>该视图将在后续阶段接入同一套可解释伤害引擎与版本化数据。</p>
          </section>
        )}
      </main>
    </div>
  );
}

export function App() {
  return (
    <PersistedStateProvider>
      <AppContent />
    </PersistedStateProvider>
  );
}
