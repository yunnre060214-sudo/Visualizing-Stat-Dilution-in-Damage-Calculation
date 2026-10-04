import type { CalculationConfig } from "../../domain/types";
import { loadGameData } from "../../data/catalog";
import type {
  ElementKey,
  NormalizedAction,
  NormalizedCharacter,
  NormalizedTarget,
  NormalizedWeapon,
} from "../../data/types";
import type { PanelFormState, PersistedBuildState } from "../../store/persistedState";

export const gameData = loadGameData();

export function characterById(id: string): NormalizedCharacter | undefined {
  return gameData.characters.find((character) => character.id === id);
}

export function weaponById(id: string): NormalizedWeapon | undefined {
  return gameData.weapons.find((weapon) => weapon.id === id);
}

export function targetById(id: string): NormalizedTarget | undefined {
  return gameData.targets.find((target) => target.id === id);
}

export function damageActions(character?: NormalizedCharacter): NormalizedAction[] {
  return character?.actions.filter((action) => action.damageType.toLowerCase() !== "heal") ?? [];
}

export function actionById(id: string, character?: NormalizedCharacter): NormalizedAction | undefined {
  return damageActions(character).find((action) => action.id === id)
    ?? gameData.characters.flatMap((entry) => damageActions(entry)).find((action) => action.id === id);
}

export function compatibleWeapons(character?: NormalizedCharacter): NormalizedWeapon[] {
  if (!character) return gameData.weapons;
  return gameData.weapons.filter((weapon) => weapon.weaponType.id === character.weaponType.id);
}

export function actionMultiplier(action?: NormalizedAction): string | null {
  if (!action || action.parseStatus !== "parsed") return null;
  const level = action.levels.at(-1);
  if (!level || level.hits.length === 0) return null;
  return formatPercent(level.hits.reduce((sum, hit) => sum + hit, 0));
}

function formatNumber(value: number): string {
  return String(Number(value.toFixed(4)));
}

function formatPercent(value: number): string {
  return formatNumber(value * 100);
}

function secondaryValue(weapon: NormalizedWeapon | undefined, name: string): number {
  return weapon?.secondaryStat?.name === name ? weapon.secondaryStat.value : 0;
}

function targetResistance(target: NormalizedTarget | undefined, action?: NormalizedAction): string {
  if (!target || !action) return "";
  const resistance = target.resistances[action.element as ElementKey];
  return typeof resistance === "number" ? formatPercent(resistance) : "";
}

export function catalogPanel(
  character: NormalizedCharacter,
  weapon: NormalizedWeapon | undefined,
  action: NormalizedAction | undefined,
  target: NormalizedTarget | undefined,
): PanelFormState {
  const hpPercent = secondaryValue(weapon, "生命");
  const defPercent = secondaryValue(weapon, "防御");
  const critRate = character.level90.critRate + secondaryValue(weapon, "暴击");
  const critDamage = character.level90.critDamage + secondaryValue(weapon, "暴击伤害");
  return {
    attack: formatNumber(character.level90.atk + (weapon?.level90BaseAtk ?? 0)),
    hp: formatNumber(character.level90.hp * (1 + hpPercent)),
    def: formatNumber(character.level90.def * (1 + defPercent)),
    atkPercent: "0",
    critRate: formatPercent(critRate),
    critDamage: formatPercent(critDamage),
    multiplier: actionMultiplier(action) ?? "",
    resistance: targetResistance(target, action),
    damageBonus: "0",
    deepen: "0",
  };
}

const numericKeys = [
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

function numericPanel(panel: PanelFormState): Record<(typeof numericKeys)[number], number> | null {
  const entries = numericKeys.map((key) => [key, Number(panel[key])] as const);
  if (entries.some(([, value]) => !Number.isFinite(value))) return null;
  return Object.fromEntries(entries) as Record<(typeof numericKeys)[number], number>;
}

export interface ResolvedCatalogBuild {
  action?: NormalizedAction;
  character?: NormalizedCharacter;
  config: CalculationConfig | null;
  issues: string[];
  target?: NormalizedTarget;
  weapon?: NormalizedWeapon;
}

export function resolveCatalogBuild(
  build: PersistedBuildState,
  effective: {
    actionId?: string;
    targetId?: string;
    panel?: PanelFormState;
  } = {},
): ResolvedCatalogBuild {
  const panelState = effective.panel ?? build.panel;
  const character = characterById(build.characterId);
  const weapon = weaponById(build.weaponId);
  const action = actionById(effective.actionId ?? build.actionId, character);
  const target = targetById(effective.targetId ?? build.targetId);
  const panel = numericPanel(panelState);
  const issues: string[] = [];
  if (!character) issues.push("角色数据已不存在");
  if (!weapon) issues.push("武器数据已不存在");
  if (!action) issues.push("伤害动作数据已不存在或不是伤害类型");
  if (!target) issues.push("目标数据已不存在");
  if (!panel) issues.push("存在未填写或无效的数值");
  if (target?.parseStatus === "manual" && panelState.resistance.trim() === "") {
    issues.push("目标战斗数据缺失，请手动填写目标抗性");
  }
  if (issues.length > 0 || !character || !weapon || !action || !target || !panel) {
    return { action, character, config: null, issues, target, weapon };
  }

  const baseAttack = character.level90.atk + weapon.level90BaseAtk;
  const hpPercent = secondaryValue(weapon, "生命");
  const defPercent = secondaryValue(weapon, "防御");
  return {
    action,
    character,
    issues,
    target,
    weapon,
    config: {
      panel: {
        level: 90,
        baseAtk: character.level90.atk,
        weaponAtk: weapon.level90BaseAtk,
        atkPercent: panel.atkPercent / 100,
        flatAtk: panel.attack - baseAttack * (1 + panel.atkPercent / 100),
        baseHp: character.level90.hp,
        hpPercent,
        flatHp: panel.hp - character.level90.hp * (1 + hpPercent),
        baseDef: character.level90.def,
        defPercent,
        flatDef: panel.def - character.level90.def * (1 + defPercent),
        critRate: panel.critRate / 100,
        critDamage: panel.critDamage / 100,
      },
      action: {
        id: action.id,
        name: action.name,
        scalingStat: action.scalingStat,
        multiplier: panel.multiplier / 100,
        multiplierFlat: 0,
        multiplierAmplify: 0,
        hits: 1,
      },
      target: {
        level: target.defaultLevel,
        defenseReduction: 0,
        defenseIgnore: 0,
        resistance: panel.resistance / 100,
      },
      zones: {
        damageBonus: panel.damageBonus / 100,
        deepen: panel.deepen / 100,
        damageTaken: 1,
        finalDamage: 0,
      },
    },
  };
}
