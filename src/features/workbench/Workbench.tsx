import { useEffect, useMemo, useState } from "react";
import { WorkspaceFrame } from "../../app/WorkspaceFrame";
import type { BuffResolution, DamageTrace, HitResult, ValidationIssue } from "../../domain/types";
import { CharacterIcon } from "../../components/CharacterIcon";
import type { NormalizedAction } from "../../data/types";
import { resolveBuffs } from "../../engine/buffs";
import { resolveHit } from "../../engine/damage";
import { buildPanel } from "../../engine/panel";
import { buildDamageTrace } from "../../engine/trace";
import { usePersistedState } from "../../store/PersistedStateProvider";
import type { PanelFormState, PersistedBuildState } from "../../store/persistedState";
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
import { DamageSummary } from "./DamageSummary";
import { PanelEditor } from "./PanelEditor";
import { TracePanel } from "./TracePanel";
import styles from "./Workbench.module.css";

type NumericField = keyof PanelFormState;
type FieldErrors = Partial<Record<NumericField, string>>;

export function actionOptionLabel(
  action: Pick<NormalizedAction, "name" | "parseStatus">,
): string {
  return action.parseStatus === "manual" ? `${action.name}（需手动确认）` : action.name;
}

interface Calculation {
  hit: HitResult;
  trace: DamageTrace;
  buffs: BuffResolution;
}

interface Evaluation {
  calculation: Calculation | null;
  messages: string[];
  fieldErrors: FieldErrors;
}

const fieldByIssue: Partial<Record<string, NumericField>> = {
  "panel.atk": "attack",
  "panel.hp": "hp",
  "panel.def": "def",
  "panel.critRate": "critRate",
  "panel.critDamage": "critDamage",
  "action.multiplier": "multiplier",
  "target.resistance": "resistance",
  "zones.damageBonus": "damageBonus",
  "zones.deepen": "deepen",
};

function collectFieldErrors(issues: ValidationIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = fieldByIssue[issue.field];
    if (field !== undefined && errors[field] === undefined) errors[field] = issue.message;
  }
  return errors;
}

function evaluate(build: PersistedBuildState): Evaluation {
  const resolved = resolveCatalogBuild(build);
  if (!resolved.config) {
    const fieldErrors: FieldErrors = {};
    for (const key of Object.keys(build.panel) as NumericField[]) {
      if (build.panel[key].trim() === "" || !Number.isFinite(Number(build.panel[key]))) {
        fieldErrors[key] = "请输入有限数值";
      }
    }
    const fieldMessages = [...new Set(Object.values(fieldErrors))];
    return {
      calculation: null,
      fieldErrors,
      messages: fieldMessages.length > 0
        ? [...resolved.issues.filter((message) => message !== "存在未填写或无效的数值"), ...fieldMessages]
        : resolved.issues,
    };
  }
  const config = resolved.config;
  const hit = resolveHit(config.action, buildPanel(config.panel), config.target, config.zones);
  if (hit.issues.length > 0) {
    return {
      calculation: null,
      fieldErrors: collectFieldErrors(hit.issues),
      messages: hit.issues.map((issue) => issue.message),
    };
  }
  const context = {
    actorId: build.characterId,
    actionId: config.action.id,
    damageType: resolved.action?.category ?? "other",
    element: resolved.action?.element ?? "unknown",
    chain: 0,
    states: [],
    stacks: {},
  };
  const buffs = resolveBuffs([], context);
  return {
    calculation: { hit, trace: buildDamageTrace(hit, buffs), buffs },
    fieldErrors: {},
    messages: [],
  };
}

function BuffList({ buffs }: { buffs: BuffResolution }) {
  const groups = [
    { label: "已生效", className: styles.buffApplied, entries: buffs.applied },
    { label: "未生效", className: styles.buffInactive, entries: buffs.inactive },
    { label: "待确认", className: styles.buffManual, entries: buffs.manual },
  ];

  return (
    <section className={styles.analysisContent} aria-labelledby="buff-title">
      <div className={styles.panelHeading}>
        <div>
          <p className={styles.kicker}>SOURCE / CONDITIONS</p>
          <h2 id="buff-title">Buff 来源</h2>
        </div>
        <span className={styles.stepBadge}>03</span>
      </div>
      <div className={styles.buffGroups}>
        {groups.map((group) => (
          <section key={group.label}>
            <h3>{group.label}<span>{group.entries.length}</span></h3>
            <ul>
              {group.entries.map((effect) => (
                <li key={effect.id} className={group.className}>
                  <span className={styles.buffSignal} aria-hidden="true" />
                  <span><strong>{effect.name}</strong><small>{effect.reason}</small></span>
                  <b>{effect.appliedValue >= 0 ? "+" : ""}{Math.round(effect.appliedValue * 100)}%</b>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className={styles.auditNote}>当前未启用队伍 Buff；所有页面使用同一份裸面板配置进行计算。</p>
    </section>
  );
}

export function Workbench() {
  const { notice, setState: setPersistedState, state: persistedState } = usePersistedState();
  const storedBuild = persistedState.buildA;
  const [panel, setPanel] = useState<PanelFormState>(storedBuild.panel);
  const build = useMemo(() => ({ ...storedBuild, panel }), [panel, storedBuild]);
  const evaluation = useMemo(() => evaluate(build), [build]);
  const calculation = evaluation.calculation;
  const character = characterById(build.characterId);
  const weapon = weaponById(build.weaponId);
  const action = actionById(build.actionId, character);
  const target = targetById(build.targetId);
  const weapons = compatibleWeapons(character);
  const actions = damageActions(character);
  const messages = [...new Set(evaluation.messages)];
  const [analysisTab, setAnalysisTab] = useState<"buffs" | "trace">("trace");

  useEffect(() => {
    if (evaluation.calculation === null) return;
    setPersistedState((current) => current.buildA.panel === panel
      ? current
      : { ...current, buildA: { ...current.buildA, panel } });
  }, [evaluation.calculation, panel, setPersistedState]);

  const replaceBuild = (next: PersistedBuildState) => {
    setPanel(next.panel);
    setPersistedState((current) => ({ ...current, buildA: next }));
  };

  const chooseCharacter = (id: string) => {
    const nextCharacter = characterById(id);
    if (!nextCharacter) return;
    const nextWeapon = compatibleWeapons(nextCharacter)[0];
    const nextAction = damageActions(nextCharacter).find((entry) => entry.parseStatus === "parsed")
      ?? damageActions(nextCharacter)[0];
    replaceBuild({
      ...build,
      characterId: id,
      weaponId: nextWeapon?.id ?? "",
      actionId: nextAction?.id ?? "",
      panel: catalogPanel(nextCharacter, nextWeapon, nextAction, target),
    });
  };

  const chooseWeapon = (id: string) => {
    const nextWeapon = weaponById(id);
    if (!character || !nextWeapon) return;
    replaceBuild({
      ...build,
      weaponId: id,
      panel: catalogPanel(character, nextWeapon, action, target),
    });
  };

  const chooseAction = (nextAction: NormalizedAction) => {
    const defaults = character ? catalogPanel(character, weapon, nextAction, target) : null;
    replaceBuild({
      ...build,
      actionId: nextAction.id,
      panel: {
        ...panel,
        multiplier: actionMultiplier(nextAction) ?? panel.multiplier,
        resistance: defaults?.resistance ?? panel.resistance,
      },
    });
  };

  const chooseTarget = (id: string) => {
    const nextTarget = targetById(id);
    if (!nextTarget || !character) return;
    const defaults = catalogPanel(character, weapon, action, nextTarget);
    replaceBuild({ ...build, targetId: id, panel: { ...panel, resistance: defaults.resistance } });
  };

  const buffs = calculation?.buffs ?? resolveBuffs([], {
    actorId: build.characterId,
    actionId: build.actionId,
    damageType: action?.category ?? "other",
    element: action?.element ?? "unknown",
    chain: 0,
    states: [],
    stacks: {},
  });

  return (
    <WorkspaceFrame
      description={<p>角色、武器、动作、目标与面板共同组成一份配置，并被词条稀释和配装对比复用。</p>}
      kicker="CALCULATION WORKSPACE / LIVE"
      result={(
        <div className={styles.resultColumn}>
          <DamageSummary result={calculation?.hit ?? null} invalid={calculation === null} />
          <div className={styles.resultContext}>
            <span>当前配置</span>
            <strong>{character?.name ?? "引用失效"}</strong>
            <small>{actionOptionLabel(action ?? { name: "未选择动作", parseStatus: "manual" })}</small>
            <small>{target?.name ?? "目标引用失效"}</small>
          </div>
        </div>
      )}
      resultLabel="伤害结果"
      title="把每一层增益放回它所属的乘区"
    >
      <div className={styles.workbench}>
        {(notice !== null || messages.length > 0) && (
          <div className={styles.alert} role="alert">
            {notice !== null && <span>{notice}</span>}
            {messages.map((message) => <span key={message}>{message}</span>)}
          </div>
        )}

        <section className={styles.catalogBar} aria-labelledby="catalog-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>CATALOG / VERSIONED</p>
              <h2 id="catalog-title">基础配置</h2>
            </div>
            <span>数据 {gameData.manifest.gameVersion} · {gameData.characters.length} 名共鸣者</span>
          </div>
          <div className={styles.catalogContent}>
            <div className={styles.catalogIdentity}>
              {character ? (
                <CharacterIcon element={action?.element ?? "unknown"} name={character.name} src={character.iconUrl} />
              ) : <span className={styles.missingIcon} aria-hidden="true">?</span>}
              <div><strong>{character?.name ?? "角色引用失效"}</strong><small>{weapon?.name ?? "武器引用失效"}</small></div>
            </div>
            <div className={styles.catalogFields}>
              <label><span>角色</span><select aria-label="角色" value={build.characterId} onChange={(event) => chooseCharacter(event.target.value)}>
                {!character && <option value={build.characterId}>{build.characterId}</option>}
                {gameData.characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.element.name}</option>)}
              </select></label>
              <label><span>武器</span><select aria-label="武器" value={build.weaponId} onChange={(event) => chooseWeapon(event.target.value)}>
                {!weapon && <option value={build.weaponId}>{build.weaponId}</option>}
                {weapons.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.quality}★</option>)}
              </select></label>
              <label><span>伤害动作</span><select aria-label="伤害动作" value={build.actionId} onChange={(event) => {
                const next = actionById(event.target.value, character);
                if (next) chooseAction(next);
              }}>
                {!actions.some((entry) => entry.id === build.actionId) && <option value={build.actionId}>{build.actionId}</option>}
                {actions.map((entry) => <option key={entry.id} value={entry.id}>{actionOptionLabel(entry)} · Lv.{entry.levels.at(-1)?.level ?? "?"}</option>)}
              </select></label>
              <label><span>目标</span><select aria-label="目标" value={build.targetId} onChange={(event) => chooseTarget(event.target.value)}>
                {!target && <option value={build.targetId}>{build.targetId}</option>}
                {gameData.targets.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.parseStatus === "manual" ? "（需手动抗性）" : ""}</option>)}
              </select></label>
            </div>
          </div>
          <div className={styles.catalogStatusGroup}>
            <p className={styles.catalogStatus} data-manual={action?.parseStatus === "manual" || undefined}>
              {action?.parseStatus === "manual" ? "该动作需手动确认倍率，当前输入值保持不变" : `已载入 ${action?.levels.at(-1)?.source ?? "自定义"}，仍可手动覆盖`}
            </p>
            {weapon && <p className={styles.catalogStatus} data-manual>武器技能尚未自动应用：{weapon.effect.name}；基础攻击与副属性已载入</p>}
          </div>
        </section>

        <PanelEditor state={panel} fieldErrors={evaluation.fieldErrors} onChange={(field, value) => setPanel((current) => ({ ...current, [field]: value }))} />

        <section className={styles.analysisPanel} aria-labelledby="analysis-title">
          <div className={styles.sectionHeading}>
            <div><p className={styles.kicker}>DETAIL / EXPLAIN</p><h2 id="analysis-title">详细分析</h2></div>
          </div>
          <div className={styles.analysisTabs} role="tablist" aria-label="详细分析视图">
            <button aria-controls="analysis-trace" aria-selected={analysisTab === "trace"} onClick={() => setAnalysisTab("trace")} role="tab" type="button">乘区追踪</button>
            <button aria-controls="analysis-buffs" aria-selected={analysisTab === "buffs"} onClick={() => setAnalysisTab("buffs")} role="tab" type="button">Buff 来源</button>
          </div>
          <div id={analysisTab === "trace" ? "analysis-trace" : "analysis-buffs"} role="tabpanel">
            {analysisTab === "trace" ? <TracePanel trace={calculation?.trace ?? null} /> : <BuffList buffs={buffs} />}
          </div>
        </section>
      </div>
    </WorkspaceFrame>
  );
}
