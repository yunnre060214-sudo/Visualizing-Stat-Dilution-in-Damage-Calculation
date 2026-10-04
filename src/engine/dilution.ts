import type {
  AnalysisAxis,
  BudgetCandidate,
  BudgetDefinition,
  BuffZone,
  CalculationConfig,
  DamageAction,
  DamageZones,
  MarginalCandidateResult,
  MarginalCrossing,
  MarginalCurvePoint,
  MarginalStat,
  MarginalValueResult,
  PanelInput,
  Target,
} from "../domain/types";
import { resolveBuffs } from "./buffs";
import { resolveHit, stableNumber } from "./damage";
import { buildPanel } from "./panel";

export const MEDIAN_SUBSTAT_BUDGET: BudgetDefinition = {
  id: "median-substat",
  label: "一条中位有效副词条",
  sourceLabel: "3.7 声骸副词条中位档",
  candidates: [
    { stat: "atkPercent", label: "攻击力%", zoneLabel: "攻击区", increment: 0.086 },
    { stat: "critRate", label: "暴击率", zoneLabel: "暴击区", increment: 0.081 },
    { stat: "critDamage", label: "暴击伤害", zoneLabel: "暴击区", increment: 0.162 },
    { stat: "damageBonus", label: "属性伤害加成", zoneLabel: "伤害加成区", increment: 0.086 },
    { stat: "damageTypeBonus", label: "类型伤害加成", zoneLabel: "伤害加成区", increment: 0.086 },
  ],
};

export const TEN_PERCENT_BUDGET: BudgetDefinition = {
  id: "ten-percent",
  label: "统一增加 10 个百分点",
  sourceLabel: "统一百分点对照预算",
  candidates: [
    { stat: "atkPercent", label: "攻击力%", zoneLabel: "攻击区", increment: 0.1 },
    { stat: "critRate", label: "暴击率", zoneLabel: "暴击区", increment: 0.1 },
    { stat: "critDamage", label: "暴击伤害", zoneLabel: "暴击区", increment: 0.1 },
    { stat: "damageBonus", label: "属性伤害加成", zoneLabel: "伤害加成区", increment: 0.1 },
    { stat: "damageTypeBonus", label: "类型伤害加成", zoneLabel: "伤害加成区", increment: 0.1 },
    { stat: "deepen", label: "伤害加深", zoneLabel: "伤害加深区", increment: 0.1 },
  ],
};

interface MutableCalculation {
  panel: PanelInput;
  action: DamageAction;
  target: Target;
  zones: DamageZones;
}

interface ResolvedPoint {
  damage: number;
  activeBuffIds: string[];
  rawCritRate: number;
}

function cloneCalculation(config: CalculationConfig): MutableCalculation {
  return {
    panel: { ...config.panel },
    action: { ...config.action },
    target: { ...config.target },
    zones: { ...config.zones },
  };
}

function applyZone(calculation: MutableCalculation, zone: BuffZone, value: number): void {
  switch (zone) {
    case "atkPercent":
      calculation.panel.atkPercent += value;
      break;
    case "critRate":
      calculation.panel.critRate += value;
      break;
    case "critDamage":
      calculation.panel.critDamage += value;
      break;
    case "damageBonus":
      calculation.zones.damageBonus += value;
      break;
    case "deepen":
      calculation.zones.deepen += value;
      break;
    case "damageTaken":
      calculation.zones.damageTaken += value;
      break;
    case "finalDamage":
      calculation.zones.finalDamage += value;
      break;
    case "multiplierFlat":
      calculation.action.multiplierFlat += value;
      break;
    case "multiplierAmplify":
      calculation.action.multiplierAmplify += value;
      break;
    case "defenseReduction":
      calculation.target.defenseReduction += value;
      break;
    case "defenseIgnore":
      calculation.target.defenseIgnore += value;
      break;
    case "resistanceReduction":
      calculation.target.resistance -= value;
      break;
  }
}

function applyCandidate(
  calculation: MutableCalculation,
  stat: MarginalStat,
  value: number,
): void {
  switch (stat) {
    case "atkPercent":
      calculation.panel.atkPercent += value;
      break;
    case "critRate":
      calculation.panel.critRate += value;
      break;
    case "critDamage":
      calculation.panel.critDamage += value;
      break;
    case "damageBonus":
    case "damageTypeBonus":
      calculation.zones.damageBonus += value;
      break;
    case "deepen":
      calculation.zones.deepen += value;
      break;
  }
}

function currentStat(calculation: MutableCalculation, stat: MarginalStat): number {
  switch (stat) {
    case "atkPercent":
      return calculation.panel.atkPercent;
    case "critRate":
      return calculation.panel.critRate;
    case "critDamage":
      return calculation.panel.critDamage;
    case "damageBonus":
    case "damageTypeBonus":
      return calculation.zones.damageBonus;
    case "deepen":
      return calculation.zones.deepen;
  }
}

function resolvePoint(
  config: CalculationConfig,
  candidate?: BudgetCandidate,
  budgetUnits = 0,
): ResolvedPoint {
  const calculation = cloneCalculation(config);
  if (candidate) applyCandidate(calculation, candidate.stat, candidate.increment * budgetUnits);
  const activeBuffIds: string[] = [];

  if (config.buffs && config.context) {
    const resolution = resolveBuffs(config.buffs, config.context);
    for (const effect of resolution.applied) {
      applyZone(calculation, effect.zone, effect.appliedValue);
      activeBuffIds.push(effect.id);
    }
  }

  const appliedThresholds = new Set<string>();
  const thresholdRules = config.thresholdRules ?? [];
  for (let pass = 0; pass < thresholdRules.length; pass += 1) {
    let changed = false;
    for (const rule of thresholdRules) {
      if (appliedThresholds.has(rule.id)) continue;
      if (currentStat(calculation, rule.when.stat) + 1e-12 < rule.when.atLeast) continue;
      applyZone(calculation, rule.effect.zone, rule.effect.value);
      appliedThresholds.add(rule.id);
      activeBuffIds.push(rule.id);
      changed = true;
    }
    if (!changed) break;
  }

  const hit = resolveHit(
    calculation.action,
    buildPanel(calculation.panel),
    calculation.target,
    calculation.zones,
  );
  if (hit.issues.length > 0) {
    throw new Error(`Cannot compare invalid calculation: ${hit.issues.map((issue) => issue.field).join(", ")}`);
  }
  return {
    damage: hit.expected.exact,
    activeBuffIds,
    rawCritRate: calculation.panel.critRate,
  };
}

function investmentOverflow(
  candidate: BudgetCandidate,
  amount: number,
  baselineCritRate: number,
  currentCritRate: number,
): number {
  if (candidate.stat !== "critRate" || amount <= 0) return 0;
  const baselineOverflow = Math.max(0, baselineCritRate - 1);
  const addedOverflow = Math.max(0, currentCritRate - 1) - baselineOverflow;
  return stableNumber(Math.max(0, Math.min(amount, addedOverflow)));
}

function curveForCandidate(
  config: CalculationConfig,
  candidate: BudgetCandidate,
  baseline: ResolvedPoint,
): MarginalCurvePoint[] {
  const curve: MarginalCurvePoint[] = [];
  let previousDamage = baseline.damage;
  for (let budgetUnits = 0; budgetUnits <= 20; budgetUnits += 1) {
    const resolved = budgetUnits === 0 ? baseline : resolvePoint(config, candidate, budgetUnits);
    const absoluteGain = resolved.damage - baseline.damage;
    const relativeGain = baseline.damage === 0 ? 0 : absoluteGain / baseline.damage;
    const marginalGain = budgetUnits === 0 || previousDamage === 0
      ? 0
      : (resolved.damage - previousDamage) / previousDamage;
    curve.push({
      stat: candidate.stat,
      budgetUnits,
      damage: stableNumber(resolved.damage),
      absoluteGain: stableNumber(absoluteGain),
      relativeGain: stableNumber(relativeGain),
      marginalGain: stableNumber(marginalGain),
      overflowLoss: investmentOverflow(
        candidate,
        candidate.increment * budgetUnits,
        baseline.rawCritRate,
        resolved.rawCritRate,
      ),
      activeBuffIds: [...resolved.activeBuffIds],
    });
    previousDamage = resolved.damage;
  }
  return curve;
}

function firstCrossings(candidates: MarginalCandidateResult[]): MarginalCrossing[] {
  const crossings: MarginalCrossing[] = [];
  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
      const left = candidates[leftIndex];
      const right = candidates[rightIndex];
      let previousSign = 0;
      for (let unit = 1; unit <= 20; unit += 1) {
        const difference = left.curve[unit].damage - right.curve[unit].damage;
        const sign = Math.abs(difference) < 1e-9 ? 0 : Math.sign(difference);
        if (previousSign !== 0 && (sign === 0 || sign !== previousSign)) {
          crossings.push({
            left: left.stat,
            right: right.stat,
            budgetUnits: unit,
            damage: stableNumber(Math.max(left.curve[unit].damage, right.curve[unit].damage)),
          });
          break;
        }
        if (sign !== 0) previousSign = sign;
      }
    }
  }
  return crossings.sort((left, right) =>
    left.budgetUnits - right.budgetUnits
    || candidates.findIndex((candidate) => candidate.stat === left.left)
      - candidates.findIndex((candidate) => candidate.stat === right.left),
  );
}

export function compareMarginalValue(
  config: CalculationConfig,
  budget: BudgetDefinition,
  axis: AnalysisAxis = "singleHit",
): MarginalValueResult {
  if (axis !== "singleHit") {
    throw new Error("Rotation dilution requires a rotation simulation result");
  }
  const baseline = resolvePoint(config);
  const candidates: MarginalCandidateResult[] = budget.candidates.map((candidate) => {
    const curve = curveForCandidate(config, candidate, baseline);
    const next = curve[1];
    return {
      ...candidate,
      absoluteGain: next.absoluteGain,
      relativeGain: next.relativeGain,
      perBudgetPoint: next.relativeGain,
      overflowLoss: next.overflowLoss,
      curve,
    };
  });
  let bestCandidate: MarginalStat | null = null;
  let bestGain = Number.NEGATIVE_INFINITY;
  for (const candidate of candidates) {
    if (candidate.relativeGain > bestGain) {
      bestGain = candidate.relativeGain;
      bestCandidate = candidate.stat;
    }
  }

  return {
    axis,
    baselineDamage: stableNumber(baseline.damage),
    sourceBudgetLabel: budget.sourceLabel,
    candidates,
    curvePoints: candidates.flatMap((candidate) => candidate.curve),
    crossings: firstCrossings(candidates),
    overflowLoss: candidates.reduce(
      (largest, candidate) => Math.max(largest, candidate.overflowLoss),
      0,
    ),
    bestCandidate,
  };
}
