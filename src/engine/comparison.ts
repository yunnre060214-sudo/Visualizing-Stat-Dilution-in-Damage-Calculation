import type {
  BuildComparisonResult,
  BuildMetricDelta,
  CalculationConfig,
  HitResult,
} from "../domain/types";
import { resolveHit, stableNumber } from "./damage";
import { buildPanel } from "./panel";

function calculate(config: CalculationConfig): HitResult {
  const result = resolveHit(
    config.action,
    buildPanel(config.panel),
    config.target,
    config.zones,
  );
  if (result.issues.length > 0) {
    throw new Error(result.issues.map((issue) => issue.message).join("；"));
  }
  return result;
}

function delta(a: number, b: number): BuildMetricDelta {
  const absolute = stableNumber(b - a);
  return {
    a,
    b,
    absolute,
    relative: a === 0 ? null : stableNumber(absolute / Math.abs(a)),
  };
}

export function compareBuilds(
  a: CalculationConfig,
  b: CalculationConfig,
): BuildComparisonResult {
  const hitA = calculate(a);
  const hitB = calculate(b);
  const expected = delta(hitA.expected.exact, hitB.expected.exact);
  return {
    nonCrit: delta(hitA.nonCrit.exact, hitB.nonCrit.exact),
    crit: delta(hitA.crit.exact, hitB.crit.exact),
    expected,
    winner: expected.absolute > 0 ? "b" : expected.absolute < 0 ? "a" : "tie",
  };
}
