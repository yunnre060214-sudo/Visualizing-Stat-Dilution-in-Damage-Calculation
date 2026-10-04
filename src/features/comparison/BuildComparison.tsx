import { useMemo, useState } from "react";
import type { NormalizedAction } from "../../data/types";
import { compareBuilds } from "../../engine/comparison";
import { usePersistedState } from "../../store/PersistedStateProvider";
import {
  encodeShareState,
  exportState,
  importState,
  toShareableState,
  type PanelFormState,
  type PersistedBuildState,
  type PersistedStateV2,
} from "../../store/persistedState";
import {
  actionById,
  actionMultiplier,
  catalogPanel,
  characterById,
  compatibleWeapons,
  damageActions,
  gameData,
  resolveCatalogBuild,
  targetById,
  weaponById,
} from "../builds/catalogBuild";
import { DeltaBars } from "./DeltaBars";
import { SlopeChart } from "./SlopeChart";
import styles from "./BuildComparison.module.css";

type BuildSide = "buildA" | "buildB";
type PanelKey = keyof PanelFormState;

const panelFields: Array<{ key: PanelKey; label: string; suffix: string }> = [
  { key: "attack", label: "面板攻击", suffix: "" },
  { key: "hp", label: "面板生命", suffix: "" },
  { key: "def", label: "面板防御", suffix: "" },
  { key: "atkPercent", label: "当前攻击加成", suffix: "%" },
  { key: "critRate", label: "暴击率", suffix: "%" },
  { key: "critDamage", label: "暴击伤害", suffix: "%" },
  { key: "multiplier", label: "技能倍率", suffix: "%" },
  { key: "resistance", label: "目标抗性", suffix: "%" },
  { key: "damageBonus", label: "伤害加成", suffix: "%" },
  { key: "deepen", label: "伤害加深", suffix: "%" },
];

interface BuildEditorProps {
  build: PersistedBuildState;
  disabledFields: PanelKey[];
  effectiveActionId: string;
  effectivePanel: PanelFormState;
  effectiveTargetId: string;
  label: "A" | "B";
  linkAction: boolean;
  linkTarget: boolean;
  onCharacter: (id: string) => void;
  onWeapon: (id: string) => void;
  onAction: (id: string) => void;
  onTarget: (id: string) => void;
  onPanel: (key: PanelKey, value: string) => void;
}

function BuildEditor({
  build,
  disabledFields,
  effectiveActionId,
  effectivePanel,
  effectiveTargetId,
  label,
  linkAction,
  linkTarget,
  onCharacter,
  onWeapon,
  onAction,
  onTarget,
  onPanel,
}: BuildEditorProps) {
  const character = characterById(build.characterId);
  const weapon = weaponById(build.weaponId);
  const weapons = compatibleWeapons(character);
  const actions = damageActions(character);
  const action = actionById(effectiveActionId, character);
  const target = targetById(effectiveTargetId);
  const missing = [
    !character ? { message: "角色数据已不存在", id: build.characterId } : null,
    !weapon ? { message: "武器数据已不存在", id: build.weaponId } : null,
    !action ? { message: "伤害动作数据已不存在", id: effectiveActionId } : null,
    !target ? { message: "目标数据已不存在", id: effectiveTargetId } : null,
  ].filter((entry): entry is { message: string; id: string } => entry !== null);

  return (
    <section className={styles.buildCard} aria-labelledby={`build-${label}-title`}>
      <header className={styles.cardHeader}>
        <div>
          <p className={styles.kicker}>BUILD / {label}</p>
          <h3 id={`build-${label}-title`}>方案 {label}</h3>
        </div>
        <span>{label === "A" ? "基准" : "候选"}</span>
      </header>

      {missing.map((entry) => (
        <p className={styles.referenceAlert} key={`${entry.message}-${entry.id}`} role="alert">
          <strong>{entry.message}</strong><code>{entry.id}</code>
        </p>
      ))}
      {target?.parseStatus === "manual" && !linkTarget && (
        <p className={styles.referenceAlert} role="alert">
          <strong>目标战斗数据缺失</strong><code>请手动填写抗性</code>
        </p>
      )}

      <div className={styles.catalogGrid}>
        <label>
          <span>{label} 角色</span>
          <select aria-label={`${label} 角色`} value={build.characterId} onChange={(event) => onCharacter(event.target.value)}>
            {!character && <option value={build.characterId}>{build.characterId}</option>}
            {gameData.characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select>
        </label>
        <label>
          <span>{label} 武器</span>
          <select aria-label={`${label} 武器`} value={build.weaponId} onChange={(event) => onWeapon(event.target.value)}>
            {!weapon && <option value={build.weaponId}>{build.weaponId}</option>}
            {weapons.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.quality}★</option>)}
          </select>
        </label>
        <label>
          <span>{label} 伤害动作</span>
          <select
            aria-label={`${label} 伤害动作`}
            disabled={linkAction}
            value={effectiveActionId}
            onChange={(event) => onAction(event.target.value)}
          >
            {!actions.some((entry) => entry.id === effectiveActionId) && (
              <option value={effectiveActionId}>{action?.name ?? effectiveActionId}</option>
            )}
            {actions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select>
        </label>
        <label>
          <span>{label} 目标</span>
          <select
            aria-label={`${label} 目标`}
            disabled={linkTarget}
            value={effectiveTargetId}
            onChange={(event) => onTarget(event.target.value)}
          >
            {!target && <option value={effectiveTargetId}>{effectiveTargetId}</option>}
            {gameData.targets.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}{entry.parseStatus === "manual" ? "（需手动抗性）" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.panelGrid}>
        {panelFields.map((field) => {
          const disabled = disabledFields.includes(field.key);
          return (
            <label key={field.key}>
              <span>{label} {field.label}</span>
              <span className={styles.inputShell}>
                <input
                  aria-label={`${label} ${field.label}`}
                  disabled={disabled}
                  inputMode="decimal"
                  value={effectivePanel[field.key]}
                  onChange={(event) => onPanel(field.key, event.target.value)}
                />
                {field.suffix && <b>{field.suffix}</b>}
              </span>
            </label>
          );
        })}
      </div>
      {weapon && <p className={styles.weaponNote}>武器基础攻击与副属性已计入；{weapon.effect.name} 需在 Buff 区手动建模。</p>}
    </section>
  );
}

export function BuildComparison({ initialState }: { initialState?: PersistedStateV2 }) {
  const { notice, setNotice, setState, state } = usePersistedState(initialState);
  const [jsonText, setJsonText] = useState("");

  const updateBuild = (
    side: BuildSide,
    update: (build: PersistedBuildState) => PersistedBuildState,
  ) => {
    setState((current) => ({ ...current, view: "comparison", [side]: update(current[side]) }));
  };

  const chooseCharacter = (side: BuildSide, id: string) => {
    const character = characterById(id);
    if (!character) return;
    const weapon = compatibleWeapons(character)[0];
    const action = damageActions(character).find((entry) => entry.parseStatus === "parsed")
      ?? damageActions(character)[0];
    const target = targetById(state[side].targetId);
    updateBuild(side, (build) => ({
      ...build,
      characterId: id,
      weaponId: weapon?.id ?? "",
      actionId: action?.id ?? "",
      panel: catalogPanel(character, weapon, action, target),
    }));
  };

  const chooseWeapon = (side: BuildSide, id: string) => {
    const character = characterById(state[side].characterId);
    const weapon = weaponById(id);
    const action = actionById(state[side].actionId, character);
    const target = targetById(state[side].targetId);
    if (!character || !weapon) return;
    updateBuild(side, (build) => ({ ...build, weaponId: id, panel: catalogPanel(character, weapon, action, target) }));
  };

  const chooseAction = (side: BuildSide, id: string) => {
    const character = characterById(state[side].characterId);
    const action = actionById(id, character);
    const target = targetById(state[side].targetId);
    const weapon = weaponById(state[side].weaponId);
    const defaults = character ? catalogPanel(character, weapon, action, target) : null;
    updateBuild(side, (build) => ({
      ...build,
      actionId: id,
      panel: {
        ...build.panel,
        multiplier: actionMultiplier(action) ?? build.panel.multiplier,
        resistance: defaults?.resistance ?? build.panel.resistance,
      },
    }));
  };

  const chooseTarget = (side: BuildSide, id: string) => {
    const character = characterById(state[side].characterId);
    const weapon = weaponById(state[side].weaponId);
    const action = actionById(state[side].actionId, character);
    const target = targetById(id);
    if (!character || !target) return;
    const defaults = catalogPanel(character, weapon, action, target);
    updateBuild(side, (build) => ({
      ...build,
      targetId: id,
      panel: { ...build.panel, resistance: defaults.resistance },
    }));
  };

  const actionB = state.linked.action ? state.buildA.actionId : state.buildB.actionId;
  const targetB = state.linked.target ? state.buildA.targetId : state.buildB.targetId;
  const effectivePanelB: PanelFormState = {
    ...state.buildB.panel,
    multiplier: state.linked.action ? state.buildA.panel.multiplier : state.buildB.panel.multiplier,
    resistance: state.linked.target ? state.buildA.panel.resistance : state.buildB.panel.resistance,
  };

  const comparison = useMemo(() => {
    const a = resolveCatalogBuild(state.buildA);
    const b = resolveCatalogBuild(state.buildB, {
      actionId: actionB,
      targetId: targetB,
      panel: effectivePanelB,
    });
    const issues = [...a.issues, ...b.issues];
    if (!a.config || !b.config) return { result: null, issue: issues.join("；") };
    try {
      return { result: compareBuilds(a.config, b.config), issue: null };
    } catch (error) {
      return { result: null, issue: error instanceof Error ? error.message : "无法完成伤害比较" };
    }
  }, [actionB, effectivePanelB, state.buildA, state.buildB, targetB]);

  const share = () => {
    if (typeof window === "undefined") return;
    const shareable = toShareableState({ ...state, view: "comparison" });
    const url = new URL(window.location.href);
    url.searchParams.set("config", encodeShareState(shareable));
    window.history.replaceState(null, "", url);
    if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(url.toString());
    setNotice("分享链接已生成，当前地址包含可复现的精简配置");
  };

  const restoreJson = () => {
    const imported = importState(jsonText);
    if (!imported.ok) {
      setNotice(imported.reason);
      return;
    }
    setState({ ...imported.state, view: "comparison" });
    setNotice("完整配置已导入");
  };

  return (
    <div className={styles.comparison}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>BUILD COMPARISON / SIGNED DELTA</p>
          <h2>双方案伤害对比</h2>
        </div>
        <p>以方案 A 为基准，方案 B 的未暴击、暴击和期望伤害均显示有符号绝对差与相对差。</p>
      </header>

      <section className={styles.toolbar} aria-label="对比与分享设置">
        <div className={styles.linkControls}>
          <label>
            <input
              aria-label="B 使用独立动作"
              checked={!state.linked.action}
              onChange={(event) => setState((current) => ({
                ...current,
                linked: { ...current.linked, action: !event.target.checked },
              }))}
              type="checkbox"
            />
            B 使用独立动作
          </label>
          <label>
            <input
              aria-label="B 使用独立目标"
              checked={!state.linked.target}
              onChange={(event) => setState((current) => ({
                ...current,
                linked: { ...current.linked, target: !event.target.checked },
              }))}
              type="checkbox"
            />
            B 使用独立目标
          </label>
        </div>
        <div className={styles.shareControls}>
          <button type="button" onClick={share}>生成分享链接</button>
          <button type="button" onClick={() => setJsonText(exportState(state))}>导出 JSON</button>
          <button type="button" onClick={restoreJson}>导入 JSON</button>
        </div>
      </section>

      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <textarea
        aria-label="配置 JSON"
        className={styles.jsonArea}
        onChange={(event) => setJsonText(event.target.value)}
        placeholder="导出完整配置，或粘贴备份后导入"
        value={jsonText}
      />

      <div className={styles.buildGrid}>
        <BuildEditor
          build={state.buildA}
          disabledFields={[]}
          effectiveActionId={state.buildA.actionId}
          effectivePanel={state.buildA.panel}
          effectiveTargetId={state.buildA.targetId}
          label="A"
          linkAction={false}
          linkTarget={false}
          onCharacter={(id) => chooseCharacter("buildA", id)}
          onWeapon={(id) => chooseWeapon("buildA", id)}
          onAction={(id) => chooseAction("buildA", id)}
          onTarget={(id) => chooseTarget("buildA", id)}
          onPanel={(key, value) => updateBuild("buildA", (build) => ({ ...build, panel: { ...build.panel, [key]: value } }))}
        />
        <BuildEditor
          build={state.buildB}
          disabledFields={[
            ...(state.linked.action ? ["multiplier" as const] : []),
            ...(state.linked.target ? ["resistance" as const] : []),
          ]}
          effectiveActionId={actionB}
          effectivePanel={effectivePanelB}
          effectiveTargetId={targetB}
          label="B"
          linkAction={state.linked.action}
          linkTarget={state.linked.target}
          onCharacter={(id) => chooseCharacter("buildB", id)}
          onWeapon={(id) => chooseWeapon("buildB", id)}
          onAction={(id) => chooseAction("buildB", id)}
          onTarget={(id) => chooseTarget("buildB", id)}
          onPanel={(key, value) => updateBuild("buildB", (build) => ({ ...build, panel: { ...build.panel, [key]: value } }))}
        />
      </div>

      <section className={styles.resultPanel} aria-labelledby="comparison-result-title">
        <div className={styles.resultHeading}>
          <div><p className={styles.kicker}>RESULT / B MINUS A</p><h3 id="comparison-result-title">差值与斜率</h3></div>
          <strong data-winner={comparison.result?.winner ?? "none"}>
            {comparison.result?.winner === "b" ? "方案 B 领先" : comparison.result?.winner === "a" ? "方案 A 领先" : "两方案持平"}
          </strong>
        </div>
        <div className={styles.resultGrid}>
          <DeltaBars result={comparison.result} />
          <SlopeChart result={comparison.result} />
        </div>
      </section>
    </div>
  );
}
