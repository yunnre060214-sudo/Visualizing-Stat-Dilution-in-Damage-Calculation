export type ScalingStat = "atk" | "hp" | "def";

export interface ValidationIssue {
  field: string;
  code: "INVALID_NUMBER" | "OUT_OF_RANGE" | "UNSUPPORTED";
  message: string;
}

export interface PanelInput {
  level: number;
  baseAtk: number;
  weaponAtk: number;
  atkPercent: number;
  flatAtk: number;
  baseHp: number;
  hpPercent: number;
  flatHp: number;
  baseDef: number;
  defPercent: number;
  flatDef: number;
  critRate: number;
  critDamage: number;
}

export interface PanelSnapshot {
  level: number;
  atk: number;
  hp: number;
  def: number;
  critRate: number;
  critDamage: number;
}

export interface Target {
  level: number;
  defenseReduction: number;
  defenseIgnore: number;
  resistance: number;
}

export interface DamageAction {
  id: string;
  name: string;
  scalingStat: ScalingStat;
  multiplier: number;
  multiplierFlat: number;
  multiplierAmplify: number;
  hits: number;
}

export interface DamageZones {
  damageBonus: number;
  deepen: number;
  damageTaken: number;
  finalDamage: number;
}

export interface DamageValue {
  exact: number;
  display: number;
}

export interface DamageBreakdown {
  scalingStat: ScalingStat;
  scalingValue: number;
  rawMultiplier: number;
  multiplierFlat: number;
  multiplierAmplify: number;
  effectiveMultiplier: number;
  hits: number;
  baseDamage: number;
  damageBonusFactor: number;
  deepenFactor: number;
  damageTakenFactor: number;
  defenseFactor: number;
  resistanceFactor: number;
  finalDamageFactor: number;
  critRate: number;
  critDamage: number;
  expectedCritFactor: number;
}

export interface HitResult {
  actionId: string;
  nonCrit: DamageValue;
  crit: DamageValue;
  expected: DamageValue;
  breakdown: DamageBreakdown;
  issues: ValidationIssue[];
}

export type BuffZone =
  | "atkPercent"
  | "critRate"
  | "critDamage"
  | "damageBonus"
  | "deepen"
  | "damageTaken"
  | "finalDamage"
  | "multiplierFlat"
  | "multiplierAmplify"
  | "defenseReduction"
  | "defenseIgnore"
  | "resistanceReduction";

export interface BuffCondition {
  actorId?: string;
  actionId?: string;
  damageTypes?: string[];
  element?: string;
  minChain?: number;
  requiredState?: string;
  stacks?: {
    key: string;
    min?: number;
    max?: number;
  };
  manualOnly?: boolean;
}

export interface BuffEffect {
  id: string;
  name: string;
  providerId: string;
  zone: BuffZone;
  value: number;
  conditions?: BuffCondition;
  valuePerStack?: string;
}

export interface CombatContext {
  actorId: string;
  actionId: string;
  damageType: string;
  element: string;
  chain: number;
  states: string[];
  stacks: Record<string, number>;
}

export interface ResolvedBuffEffect extends BuffEffect {
  appliedValue: number;
  reason: string;
}

export interface BuffResolution {
  applied: ResolvedBuffEffect[];
  inactive: ResolvedBuffEffect[];
  manual: ResolvedBuffEffect[];
  zones: Partial<Record<BuffZone, number>>;
}

export type DamageTraceZone =
  | "scaling"
  | "motionValue"
  | "damageBonus"
  | "deepen"
  | "damageTaken"
  | "defense"
  | "resistance"
  | "finalDamage"
  | "crit";

export interface DamageTraceStep {
  zone: DamageTraceZone;
  label: string;
  value: number;
  factor: number;
  sourceIds: string[];
}

export interface DamageTrace {
  actionId: string;
  expectedDamage: number;
  steps: DamageTraceStep[];
  applied: ResolvedBuffEffect[];
  inactive: ResolvedBuffEffect[];
  manual: ResolvedBuffEffect[];
}

export type SpecialDamageKind =
  | "effect-fixed"
  | "effect-attack"
  | "tune-break"
  | "hack"
  | "tune-rupture";

export interface SpecialDamageAction {
  id: string;
  name: string;
  kind: SpecialDamageKind;
  multiplier: number;
  scalingStat?: ScalingStat;
  fixedValue?: number;
  resistanceApplies: boolean;
}

export interface SpecialDamageZones {
  effectDeepen: number;
  tuneBreakBonus: number;
  damageTaken: number;
  finalDamage: number;
}

export interface SpecialDamageBreakdown {
  baseValue: number;
  multiplier: number;
  deepenFactor: number;
  tuneBreakFactor: number;
  damageTakenFactor: number;
  defenseFactor: number;
  resistanceFactor: number;
  finalDamageFactor: number;
  modeFactor: number;
}

export interface SpecialDamageResult {
  actionId: string;
  kind: SpecialDamageKind;
  value: DamageValue;
  critEligible: false;
  breakdown: SpecialDamageBreakdown;
  issues: ValidationIssue[];
}

export type MarginalStat =
  | "atkPercent"
  | "critRate"
  | "critDamage"
  | "damageBonus"
  | "damageTypeBonus"
  | "deepen";

export type AnalysisAxis = "singleHit" | "rotation";

export interface BudgetCandidate {
  stat: MarginalStat;
  label: string;
  zoneLabel: string;
  increment: number;
}

export interface BudgetDefinition {
  id: string;
  label: string;
  sourceLabel: string;
  candidates: BudgetCandidate[];
}

export interface ThresholdBuffRule {
  id: string;
  name: string;
  when: {
    stat: MarginalStat;
    atLeast: number;
  };
  effect: {
    zone: BuffZone;
    value: number;
  };
}

export interface CalculationConfig {
  panel: PanelInput;
  action: DamageAction;
  target: Target;
  zones: DamageZones;
  buffs?: BuffEffect[];
  context?: CombatContext;
  thresholdRules?: ThresholdBuffRule[];
}

export interface BuildMetricDelta {
  a: number;
  b: number;
  absolute: number;
  relative: number | null;
}

export interface BuildComparisonResult {
  nonCrit: BuildMetricDelta;
  crit: BuildMetricDelta;
  expected: BuildMetricDelta;
  winner: "a" | "b" | "tie";
}

export interface MarginalCurvePoint {
  stat: MarginalStat;
  budgetUnits: number;
  damage: number;
  absoluteGain: number;
  relativeGain: number;
  marginalGain: number;
  overflowLoss: number;
  activeBuffIds: string[];
}

export interface MarginalCandidateResult extends BudgetCandidate {
  absoluteGain: number;
  relativeGain: number;
  perBudgetPoint: number;
  overflowLoss: number;
  curve: MarginalCurvePoint[];
}

export interface MarginalCrossing {
  left: MarginalStat;
  right: MarginalStat;
  budgetUnits: number;
  damage: number;
}

export interface MarginalValueResult {
  axis: AnalysisAxis;
  baselineDamage: number;
  sourceBudgetLabel: string;
  candidates: MarginalCandidateResult[];
  curvePoints: MarginalCurvePoint[];
  crossings: MarginalCrossing[];
  overflowLoss: number;
  bestCandidate: MarginalStat | null;
}
