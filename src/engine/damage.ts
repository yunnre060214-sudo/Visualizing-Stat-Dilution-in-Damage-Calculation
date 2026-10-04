import type {
  DamageAction,
  DamageValue,
  DamageZones,
  HitResult,
  PanelSnapshot,
  Target,
  ValidationIssue,
} from "../domain/types";

export const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function stableNumber(value: number): number {
  return Number.isFinite(value) ? Number(value.toPrecision(15)) : value;
}

export function damageValue(exact: number): DamageValue {
  const stable = stableNumber(exact);
  return { exact: stable, display: Math.floor(stable) };
}

export function defenseMultiplier(attackerLevel: number, target: Target): number {
  const attackerDefenseTerm = 800 + 8 * attackerLevel;
  const reduction = clamp(target.defenseReduction, 0, 1);
  const ignore = clamp(target.defenseIgnore, 0, 1);
  const targetDefenseTerm = (800 + 8 * target.level) * (1 - reduction) * (1 - ignore);
  return attackerDefenseTerm / (attackerDefenseTerm + targetDefenseTerm);
}

export function resistanceMultiplier(resistance: number): number {
  if (resistance < 0) {
    return 1 - resistance / 2;
  }
  if (resistance < 0.8) {
    return 1 - resistance;
  }
  return 1 / (1 + 5 * resistance);
}

export function expectedCritMultiplier(rate: number, totalCritDamage: number): number {
  return 1 + clamp(rate, 0, 1) * (totalCritDamage - 1);
}

function collectIssues(
  action: DamageAction,
  panel: PanelSnapshot,
  target: Target,
  zones: DamageZones,
): ValidationIssue[] {
  const values: Array<[string, number]> = [
    ["panel.level", panel.level],
    ["panel.atk", panel.atk],
    ["panel.hp", panel.hp],
    ["panel.def", panel.def],
    ["panel.critRate", panel.critRate],
    ["panel.critDamage", panel.critDamage],
    ["action.multiplier", action.multiplier],
    ["action.multiplierFlat", action.multiplierFlat],
    ["action.multiplierAmplify", action.multiplierAmplify],
    ["action.hits", action.hits],
    ["target.level", target.level],
    ["target.defenseReduction", target.defenseReduction],
    ["target.defenseIgnore", target.defenseIgnore],
    ["target.resistance", target.resistance],
    ["zones.damageBonus", zones.damageBonus],
    ["zones.deepen", zones.deepen],
    ["zones.damageTaken", zones.damageTaken],
    ["zones.finalDamage", zones.finalDamage],
  ];

  const issues: ValidationIssue[] = values
    .filter(([, value]) => !Number.isFinite(value))
    .map(([field]) => ({ field, code: "INVALID_NUMBER", message: "请输入有限数值" }));

  const outOfRange: Array<[string, boolean, string]> = [
    ["panel.level", Number.isFinite(panel.level) && panel.level <= 0, "攻击者等级必须大于零"],
    ["panel.atk", Number.isFinite(panel.atk) && panel.atk < 0, "攻击不能小于零"],
    ["panel.hp", Number.isFinite(panel.hp) && panel.hp < 0, "生命不能小于零"],
    ["panel.def", Number.isFinite(panel.def) && panel.def < 0, "防御不能小于零"],
    [
      "panel.critDamage",
      Number.isFinite(panel.critDamage) && panel.critDamage < 1,
      "暴击伤害总倍率必须至少为 100%",
    ],
    [
      "action.multiplier",
      Number.isFinite(action.multiplier) && action.multiplier < 0,
      "技能倍率不能小于零",
    ],
    [
      "action.multiplierAmplify",
      Number.isFinite(action.multiplierAmplify) && action.multiplierAmplify < -1,
      "倍率增幅不能低于 -100%",
    ],
    [
      "action.hits",
      Number.isFinite(action.hits) && (!Number.isInteger(action.hits) || action.hits <= 0),
      "命中段数必须是正整数",
    ],
    ["target.level", Number.isFinite(target.level) && target.level <= 0, "目标等级必须大于零"],
    [
      "zones.damageBonus",
      Number.isFinite(zones.damageBonus) && zones.damageBonus < -1,
      "伤害加成不能低于 -100%",
    ],
    [
      "zones.deepen",
      Number.isFinite(zones.deepen) && zones.deepen < -1,
      "伤害加深不能低于 -100%",
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

  return issues;
}

export function resolveHit(
  action: DamageAction,
  panel: PanelSnapshot,
  target: Target,
  zones: DamageZones,
): HitResult {
  const issues = collectIssues(action, panel, target, zones);
  const scalingValue = panel[action.scalingStat];
  const effectiveMultiplier =
    (action.multiplier + action.multiplierFlat) * (1 + action.multiplierAmplify);
  const baseDamage = scalingValue * effectiveMultiplier * action.hits;
  const damageBonusFactor = 1 + zones.damageBonus;
  const deepenFactor = 1 + zones.deepen;
  const defenseFactor = defenseMultiplier(panel.level, target);
  const resistanceFactor = resistanceMultiplier(target.resistance);
  const finalDamageFactor = 1 + zones.finalDamage;
  const nonCritExact =
    baseDamage *
    damageBonusFactor *
    deepenFactor *
    zones.damageTaken *
    defenseFactor *
    resistanceFactor *
    finalDamageFactor;
  const critExact = nonCritExact * panel.critDamage;
  const expectedExact = nonCritExact * expectedCritMultiplier(panel.critRate, panel.critDamage);

  if (![nonCritExact, critExact, expectedExact].every(Number.isFinite)) {
    issues.push({
      field: "result",
      code: "INVALID_NUMBER",
      message: "计算结果超出有限数值范围",
    });
  }

  return {
    actionId: action.id,
    nonCrit: damageValue(nonCritExact),
    crit: damageValue(critExact),
    expected: damageValue(expectedExact),
    breakdown: {
      scalingStat: action.scalingStat,
      scalingValue,
      rawMultiplier: action.multiplier,
      multiplierFlat: action.multiplierFlat,
      multiplierAmplify: action.multiplierAmplify,
      effectiveMultiplier,
      hits: action.hits,
      baseDamage,
      damageBonusFactor,
      deepenFactor,
      damageTakenFactor: zones.damageTaken,
      defenseFactor,
      resistanceFactor,
      finalDamageFactor,
      critRate: panel.critRate,
      critDamage: panel.critDamage,
      expectedCritFactor: expectedCritMultiplier(panel.critRate, panel.critDamage),
    },
    issues,
  };
}
