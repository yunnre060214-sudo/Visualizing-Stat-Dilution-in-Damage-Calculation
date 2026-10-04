export const LEGACY_STORAGE_KEY = "wuwa-damage-lab:v1";
export const STORAGE_KEY = "wuwa-damage-lab:v2";

export type AppView = "workbench" | "dilution" | "comparison" | "rotation";

export interface PanelFormState {
  attack: string;
  hp: string;
  def: string;
  atkPercent: string;
  critRate: string;
  critDamage: string;
  multiplier: string;
  resistance: string;
  damageBonus: string;
  deepen: string;
}

export interface PersistedStateV1 {
  schemaVersion: 1;
  attack: string;
  critRate: string;
  critDamage: string;
  multiplier: string;
  resistance: string;
  selectedActionId: string;
}

export type CalculatorState = PersistedStateV1;

export interface PersistedBuildState {
  characterId: string;
  weaponId: string;
  actionId: string;
  targetId: string;
  panel: PanelFormState;
}

export interface PersistedStateV2 {
  schemaVersion: 2;
  view: AppView;
  linked: { action: boolean; target: boolean };
  buildA: PersistedBuildState;
  buildB: PersistedBuildState;
}

export interface ShareableBuildState {
  characterId: string;
  weaponId: string;
  actionId: string;
  targetId: string;
  attack: number;
  hp: number;
  def: number;
  atkPercent: number;
  critRate: number;
  critDamage: number;
  multiplier: number;
  resistance: number;
  damageBonus: number;
  deepen: number;
}

export interface ShareableState {
  schemaVersion: 2;
  view: AppView;
  buildA: ShareableBuildState;
  buildB: ShareableBuildState;
}

export interface LoadStateResult {
  recovered: boolean;
  persistenceAvailable: boolean;
  state: PersistedStateV2;
}

export type DecodeResult =
  | { ok: true; state: ShareableState }
  | { ok: false; reason: string };

export type ImportStateResult =
  | { ok: true; state: PersistedStateV2 }
  | { ok: false; reason: string };

export const DEFAULT_CALCULATOR_STATE: PersistedStateV1 = {
  schemaVersion: 1,
  attack: "2000",
  critRate: "50",
  critDamage: "250",
  multiplier: "300",
  resistance: "10",
  selectedActionId: "demo-skill",
};

const defaultPanel: PanelFormState = {
  attack: "1000",
  hp: "10825",
  def: "1258.8866",
  atkPercent: "0",
  critRate: "5",
  critDamage: "150",
  multiplier: "66.47",
  resistance: "10",
  damageBonus: "0",
  deepen: "0",
};

const defaultBuild: PersistedBuildState = {
  characterId: "1304",
  weaponId: "21010015",
  actionId: "1304001001",
  targetId: "310000010",
  panel: defaultPanel,
};

export const DEFAULT_PERSISTED_STATE: PersistedStateV2 = {
  schemaVersion: 2,
  view: "workbench",
  linked: { action: true, target: true },
  buildA: defaultBuild,
  buildB: { ...defaultBuild, panel: { ...defaultPanel } },
};

const panelKeys = [
  "attack",
  "hp",
  "def",
  "atkPercent",
  "critRate",
  "critDamage",
  "multiplier",
  "resistance",
  "damageBonus",
  "deepen",
] as const;
const legacyPanelKeys = ["attack", "critRate", "critDamage", "multiplier", "resistance"] as const;
const views: AppView[] = ["workbench", "dilution", "comparison", "rotation"];

function cloneDefaultState(): PersistedStateV2 {
  return {
    ...DEFAULT_PERSISTED_STATE,
    linked: { ...DEFAULT_PERSISTED_STATE.linked },
    buildA: {
      ...DEFAULT_PERSISTED_STATE.buildA,
      panel: { ...DEFAULT_PERSISTED_STATE.buildA.panel },
    },
    buildB: {
      ...DEFAULT_PERSISTED_STATE.buildB,
      panel: { ...DEFAULT_PERSISTED_STATE.buildB.panel },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPanelFormState(value: unknown): value is PanelFormState {
  return isRecord(value) && panelKeys.every((key) => typeof value[key] === "string");
}

function isBuildState(value: unknown): value is PersistedBuildState {
  if (!isRecord(value)) return false;
  return (
    typeof value.characterId === "string" &&
    typeof value.weaponId === "string" &&
    typeof value.actionId === "string" &&
    typeof value.targetId === "string" &&
    isPanelFormState(value.panel)
  );
}

function isPersistedStateV1(value: unknown): value is PersistedStateV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    legacyPanelKeys.every((key) => typeof value[key] === "string") &&
    typeof value.selectedActionId === "string"
  );
}

function isPersistedStateV2(value: unknown): value is PersistedStateV2 {
  if (!isRecord(value) || value.schemaVersion !== 2 || !views.includes(value.view as AppView)) {
    return false;
  }
  if (!isRecord(value.linked)) return false;
  return (
    typeof value.linked.action === "boolean" &&
    typeof value.linked.target === "boolean" &&
    isBuildState(value.buildA) &&
    isBuildState(value.buildB)
  );
}

function isShareableBuildState(value: unknown): value is ShareableBuildState {
  if (!isRecord(value)) return false;
  return (
    ["characterId", "weaponId", "actionId", "targetId"].every(
      (key) => typeof value[key] === "string",
    ) &&
    panelKeys.every((key) => typeof value[key] === "number" && Number.isFinite(value[key]))
  );
}

function isShareableState(value: unknown): value is ShareableState {
  if (!isRecord(value) || value.schemaVersion !== 2 || !views.includes(value.view as AppView)) {
    return false;
  }
  return (
    isShareableBuildState(value.buildA) &&
    isShareableBuildState(value.buildB)
  );
}

export function migrateV1ToV2(value: PersistedStateV1): PersistedStateV2 {
  const state = cloneDefaultState();
  const panel: PanelFormState = {
    ...defaultPanel,
    attack: value.attack,
    critRate: value.critRate,
    critDamage: value.critDamage,
    multiplier: value.multiplier,
    resistance: value.resistance,
  };
  state.buildA = { ...state.buildA, actionId: value.selectedActionId, panel };
  state.buildB = { ...state.buildB, actionId: value.selectedActionId, panel: { ...panel } };
  return state;
}

export function getBrowserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadState(storage: Storage | null): LoadStateResult {
  if (storage === null) {
    return { recovered: false, persistenceAvailable: false, state: cloneDefaultState() };
  }

  let current: string | null;
  try {
    current = storage.getItem(STORAGE_KEY);
  } catch {
    return { recovered: false, persistenceAvailable: false, state: cloneDefaultState() };
  }

  if (current !== null) {
    try {
      const parsed: unknown = JSON.parse(current);
      if (!isPersistedStateV2(parsed)) throw new Error("Unsupported state");
      return { recovered: false, persistenceAvailable: true, state: parsed };
    } catch {
      return { recovered: true, persistenceAvailable: true, state: cloneDefaultState() };
    }
  }

  try {
    const legacy = storage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === null) {
      return { recovered: false, persistenceAvailable: true, state: cloneDefaultState() };
    }
    const parsed: unknown = JSON.parse(legacy);
    if (!isPersistedStateV1(parsed)) throw new Error("Unsupported legacy state");
    return { recovered: false, persistenceAvailable: true, state: migrateV1ToV2(parsed) };
  } catch {
    return { recovered: true, persistenceAvailable: true, state: cloneDefaultState() };
  }
}

export function saveState(storage: Storage | null, state: PersistedStateV2): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function numericPanel(panel: PanelFormState): Pick<ShareableBuildState, (typeof panelKeys)[number]> {
  return Object.fromEntries(
    panelKeys.map((key) => {
      const number = Number(panel[key]);
      return [key, Number.isFinite(number) ? number : Number(defaultPanel[key])];
    }),
  ) as Pick<ShareableBuildState, (typeof panelKeys)[number]>;
}

function toShareableBuild(build: PersistedBuildState): ShareableBuildState {
  return {
    characterId: build.characterId,
    weaponId: build.weaponId,
    actionId: build.actionId,
    targetId: build.targetId,
    ...numericPanel(build.panel),
  };
}

export function toShareableState(state: PersistedStateV2): ShareableState {
  const buildB = toShareableBuild(state.buildB);
  if (state.linked.action) {
    buildB.actionId = state.buildA.actionId;
    buildB.multiplier = Number(state.buildA.panel.multiplier);
  }
  if (state.linked.target) {
    buildB.targetId = state.buildA.targetId;
    buildB.resistance = Number(state.buildA.panel.resistance);
  }
  return {
    schemaVersion: 2,
    view: state.view,
    buildA: toShareableBuild(state.buildA),
    buildB,
  };
}

function fromShareableBuild(build: ShareableBuildState): PersistedBuildState {
  return {
    characterId: build.characterId,
    weaponId: build.weaponId,
    actionId: build.actionId,
    targetId: build.targetId,
    panel: Object.fromEntries(panelKeys.map((key) => [key, String(build[key])])) as unknown as PanelFormState,
  };
}

export function applyShareableState(
  shareable: ShareableState,
  _base: PersistedStateV2 = DEFAULT_PERSISTED_STATE,
): PersistedStateV2 {
  return {
    schemaVersion: 2,
    view: shareable.view,
    linked: {
      action: shareable.buildA.actionId === shareable.buildB.actionId,
      target: shareable.buildA.targetId === shareable.buildB.targetId,
    },
    buildA: fromShareableBuild(shareable.buildA),
    buildB: fromShareableBuild(shareable.buildB),
  };
}

export function exportState(state: PersistedStateV2): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): ImportStateResult {
  try {
    const parsed: unknown = JSON.parse(json);
    if (isPersistedStateV2(parsed)) return { ok: true, state: parsed };
    if (isPersistedStateV1(parsed)) return { ok: true, state: migrateV1ToV2(parsed) };
    throw new Error("Unsupported state");
  } catch {
    return { ok: false, reason: "配置 JSON 无效或版本不受支持" };
  }
}

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function fromBase64(value: string): string {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

export function encodeShareState(state: ShareableState): string {
  return toBase64(JSON.stringify(state));
}

export function decodeShareState(value: string): DecodeResult {
  try {
    const parsed: unknown = JSON.parse(fromBase64(value));
    if (!isShareableState(parsed)) throw new Error("Invalid share state");
    return { ok: true, state: parsed };
  } catch {
    return { ok: false, reason: "分享参数无效" };
  }
}
