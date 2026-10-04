import type {
  PanelSnapshot,
  SpecialDamageAction,
  SpecialDamageResult,
  SpecialDamageZones,
  Target,
  ValidationIssue,
} from "../domain/types";
import { damageValue, defenseMultiplier, resistanceMultiplier } from "./damage";

function specialBaseValue(action: SpecialDamageAction, panel: PanelSnapshot): number {
  if (action.kind === "effect-attack") {
    return panel[action.scalingStat ?? "atk"];
  }
  return action.fixedValue ?? 0;
}

function validateSpecialAction(
  action: SpecialDamageAction,
  panel: PanelSnapshot,
  target: Target,
  zones: SpecialDamageZones,
  baseValue: number,
  exact: number,
): ValidationIssue[] {
  const values: Array<[string, number]> = [
    ["panel.level", panel.level],
    ["panel.atk", panel.atk],
    ["panel.hp", panel.hp],
    ["panel.def", panel.def],
    ["action.multiplier", action.multiplier],
    ["target.level", target.level],
    ["target.defenseReduction", target.defenseReduction],
    ["target.defenseIgnore", target.defenseIgnore],
    ["target.resistance", target.resistance],
    ["zones.effectDeepen", zones.effectDeepen],
    ["zones.tuneBreakBonus", zones.tuneBreakBonus],
    ["zones.damageTaken", zones.damageTaken],
    ["zones.finalDamage", zones.finalDamage],
    ["baseValue", baseValue],
  ];
  const issues: ValidationIssue[] = values
    .filter(([, value]) => !Number.isFinite(value))
    .map(([field]) => ({ field, code: "INVALID_NUMBER", message: "请输入有限数值" }));

  if (action.kind === "effect-attack" && !action.scalingStat) {
    issues.push({ field: "scalingStat", code: "UNSUPPORTED", message: "攻击型效应缺少缩放属性" });
  }
  if (action.kind !== "effect-attack" && !Number.isFinite(action.fixedValue)) {
    issues.push({ field: "fixedValue", code: "INVALID_NUMBER", message: "特殊伤害缺少有限基础值" });
  }

  const outOfRange: Array<[string, boolean, string]> = [
    ["panel.level", Number.isFinite(panel.level) && panel.level <= 0, "攻击者等级必须大于零"],
    ["panel.atk", Number.isFinite(panel.atk) && panel.atk < 0, "攻击不能小于零"],
    ["panel.hp", Number.isFinite(panel.hp) && panel.hp < 0, "生命不能小于零"],
    ["panel.def", Number.isFinite(panel.def) && panel.def < 0, "防御不能小于零"],
    [
      "action.multiplier",
      Number.isFinite(action.multiplier) && action.multiplier < 0,
      "特殊伤害倍率不能小于零",
    ],
    ["target.level", Number.isFinite(target.level) && target.level <= 0, "目标等级必须大于零"],
    [
      "zones.effectDeepen",
      Number.isFinite(zones.effectDeepen) && zones.effectDeepen < -1,
      "效应伤害加深不能低于 -100%",
    ],
    [
      "zones.tuneBreakBonus",
      Number.isFinite(zones.tuneBreakBonus) && zones.tuneBreakBonus < -1,
      "失谐伤害加成不能低于 -100%",
    ],
    [
      "zones.damageTaken",
      Number.isFinite(zones.damageTaken) && zones.damageTaken < 0,
      "承伤倍率不能小于零",
    ],
    [
      "zones.finalDamage",
      Number.isFinite(zones.finalDamage) && zones.finalDamage < -1,
      "最终伤害加成不能低于 -100%",
    ],
  ];

  for (const [field, invalid, message] of outOfRange) {
    if (invalid) {
      issues.push({ field, code: "OUT_OF_RANGE", message });
    }
  }

  if (!Number.isFinite(exact)) {
    issues.push({
      field: "result",
      code: "INVALID_NUMBER",
      message: "计算结果超出有限数值范围",
    });
  }

  return issues;
}

export function resolveSpecialDamage(
  action: SpecialDamageAction,
  panel: PanelSnapshot,
  target: Target,
  zones: SpecialDamageZones,
): SpecialDamageResult {
  const baseValue = specialBaseValue(action, panel);
  const isEffect = action.kind === "effect-fixed" || action.kind === "effect-attack";
  const isTuneBreak = action.kind === "tune-break";
  const deepenFactor = isEffect ? 1 + zones.effectDeepen : 1;
  const tuneBreakFactor = isEffect ? 1 : 1 + zones.tuneBreakBonus;
  const defenseFactor = defenseMultiplier(panel.level, target);
  const resistanceFactor = action.resistanceApplies
    ? resistanceMultiplier(target.resistance)
    : 1;
  const finalDamageFactor = isEffect ? 1 : 1 + zones.finalDamage;
  const damageTakenFactor = isEffect ? 1 : zones.damageTaken;
  const modeFactor = isTuneBreak ? 0.8 : 1;
  const exact =
    baseValue *
    action.multiplier *
    deepenFactor *
    tuneBreakFactor *
    damageTakenFactor *
    defenseFactor *
    resistanceFactor *
    finalDamageFactor *
    modeFactor;

  return {
    actionId: action.id,
    kind: action.kind,
    value: damageValue(exact),
    critEligible: false,
    breakdown: {
      baseValue,
      multiplier: action.multiplier,
      deepenFactor,
      tuneBreakFactor,
      damageTakenFactor,
      defenseFactor,
      resistanceFactor,
      finalDamageFactor,
      modeFactor,
    },
    issues: validateSpecialAction(action, panel, target, zones, baseValue, exact),
  };
}
