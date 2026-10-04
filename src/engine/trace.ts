import type {
  BuffResolution,
  BuffZone,
  DamageTrace,
  DamageTraceStep,
  DamageTraceZone,
  HitResult,
} from "../domain/types";

const labels: Record<DamageTraceZone, string> = {
  scaling: "缩放属性",
  motionValue: "技能倍率",
  damageBonus: "伤害加成",
  deepen: "伤害加深",
  damageTaken: "承伤倍率",
  defense: "防御区",
  resistance: "抗性区",
  finalDamage: "最终伤害",
  crit: "期望暴击",
};

function sourceIds(buffs: BuffResolution, zones: BuffZone[]): string[] {
  return buffs.applied
    .filter((effect) => zones.includes(effect.zone))
    .map((effect) => effect.id);
}

function step(
  zone: DamageTraceZone,
  value: number,
  factor: number,
  buffs: BuffResolution,
  buffZones: BuffZone[] = [],
): DamageTraceStep {
  return {
    zone,
    label: labels[zone],
    value,
    factor,
    sourceIds: sourceIds(buffs, buffZones),
  };
}

export function buildDamageTrace(hit: HitResult, buffs: BuffResolution): DamageTrace {
  const breakdown = hit.breakdown;
  const motionValue = step(
    "motionValue",
    breakdown.effectiveMultiplier,
    breakdown.effectiveMultiplier * breakdown.hits,
    buffs,
    ["multiplierFlat", "multiplierAmplify"],
  );
  if (breakdown.hits > 1) {
    motionValue.label = `技能倍率 × ${breakdown.hits} 段`;
  }
  const steps: DamageTraceStep[] = [
    step("scaling", breakdown.scalingValue, breakdown.scalingValue, buffs, ["atkPercent"]),
    motionValue,
    step("damageBonus", breakdown.damageBonusFactor - 1, breakdown.damageBonusFactor, buffs, [
      "damageBonus",
    ]),
    step("deepen", breakdown.deepenFactor - 1, breakdown.deepenFactor, buffs, ["deepen"]),
    step("damageTaken", breakdown.damageTakenFactor, breakdown.damageTakenFactor, buffs, [
      "damageTaken",
    ]),
    step("defense", breakdown.defenseFactor, breakdown.defenseFactor, buffs, [
      "defenseReduction",
      "defenseIgnore",
    ]),
    step("resistance", breakdown.resistanceFactor, breakdown.resistanceFactor, buffs, [
      "resistanceReduction",
    ]),
    step("finalDamage", breakdown.finalDamageFactor - 1, breakdown.finalDamageFactor, buffs, [
      "finalDamage",
    ]),
    step("crit", breakdown.expectedCritFactor, breakdown.expectedCritFactor, buffs, [
      "critRate",
      "critDamage",
    ]),
  ];

  return {
    actionId: hit.actionId,
    expectedDamage: hit.expected.exact,
    steps,
    applied: buffs.applied,
    inactive: buffs.inactive,
    manual: buffs.manual,
  };
}
