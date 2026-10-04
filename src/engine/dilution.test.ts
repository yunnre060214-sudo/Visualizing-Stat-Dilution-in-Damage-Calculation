import { describe, expect, it } from "vitest";
import type { BudgetDefinition, CalculationConfig, ThresholdBuffRule } from "../domain/types";
import { TEN_PERCENT_BUDGET, compareMarginalValue } from "./dilution";

const baseConfig = (
  overrides: Partial<{
    atkPercent: number;
    critRate: number;
    critDamage: number;
    damageBonus: number;
    deepen: number;
    thresholdRules: ThresholdBuffRule[];
  }> = {},
): CalculationConfig => ({
  panel: {
    level: 90,
    baseAtk: 1000,
    weaponAtk: 0,
    atkPercent: overrides.atkPercent ?? 0,
    flatAtk: 0,
    baseHp: 10000,
    hpPercent: 0,
    flatHp: 0,
    baseDef: 1000,
    defPercent: 0,
    flatDef: 0,
    critRate: overrides.critRate ?? 0.5,
    critDamage: overrides.critDamage ?? 2,
  },
  action: {
    id: "single-hit",
    name: "单段测试",
    scalingStat: "atk",
    multiplier: 1,
    multiplierFlat: 0,
    multiplierAmplify: 0,
    hits: 1,
  },
  target: {
    level: 90,
    defenseReduction: 0,
    defenseIgnore: 0,
    resistance: 0,
  },
  zones: {
    damageBonus: overrides.damageBonus ?? 0,
    deepen: overrides.deepen ?? 0,
    damageTaken: 1,
    finalDamage: 0,
  },
  thresholdRules: overrides.thresholdRules ?? [],
});

describe("compareMarginalValue", () => {
  it("shows lower gain in an already saturated additive zone", () => {
    const low = compareMarginalValue(baseConfig({ damageBonus: 0 }), TEN_PERCENT_BUDGET, "singleHit");
    const high = compareMarginalValue(baseConfig({ damageBonus: 1 }), TEN_PERCENT_BUDGET, "singleHit");

    expect(low.candidates.find((candidate) => candidate.stat === "damageBonus")?.relativeGain)
      .toBeCloseTo(0.1);
    expect(high.candidates.find((candidate) => candidate.stat === "damageBonus")?.relativeGain)
      .toBeCloseTo(0.05);
  });

  it("gives critical rate zero value at cap and reports overflow", () => {
    const capped = compareMarginalValue(baseConfig({ critRate: 1 }), TEN_PERCENT_BUDGET, "singleHit");
    const overflowed = compareMarginalValue(
      baseConfig({ critRate: 1.2 }),
      TEN_PERCENT_BUDGET,
      "singleHit",
    );

    expect(capped.candidates.find((candidate) => candidate.stat === "critRate")?.relativeGain).toBe(0);
    expect(
      overflowed.candidates.find((candidate) => candidate.stat === "critRate")?.overflowLoss,
    ).toBeGreaterThan(0);
  });

  it("preserves budget order for ties and reports the first curve crossing", () => {
    const crossingRule: ThresholdBuffRule = {
      id: "bonus-breakpoint",
      name: "增伤阈值",
      when: { stat: "damageBonus", atLeast: 0.2 },
      effect: { zone: "damageBonus", value: 0.3 },
    };
    const orderedBudget: BudgetDefinition = {
      id: "ordered-crossing",
      label: "交叉测试预算",
      sourceLabel: "测试夹具",
      candidates: [
        { stat: "atkPercent", label: "攻击力", zoneLabel: "攻击区", increment: 0.1 },
        { stat: "damageBonus", label: "属性增伤", zoneLabel: "增伤区", increment: 0.05 },
      ],
    };
    const result = compareMarginalValue(
      baseConfig({ thresholdRules: [crossingRule] }),
      orderedBudget,
      "singleHit",
    );

    expect(result.candidates.map((candidate) => candidate.stat)).toEqual(
      orderedBudget.candidates.map((candidate) => candidate.stat),
    );
    expect(result.crossings[0]).toMatchObject({
      left: "atkPercent",
      right: "damageBonus",
      budgetUnits: 4,
    });
  });

  it("recomputes threshold-dependent buffs at every curve point", () => {
    const thresholdBuff: ThresholdBuffRule = {
      id: "crit-80-bonus",
      name: "80% 暴击阈值增伤",
      when: { stat: "critRate", atLeast: 0.8 },
      effect: { zone: "damageBonus", value: 0.2 },
    };
    const result = compareMarginalValue(
      baseConfig({ critRate: 0.7, thresholdRules: [thresholdBuff] }),
      TEN_PERCENT_BUDGET,
      "singleHit",
    );

    expect(
      result.candidates
        .find((candidate) => candidate.stat === "critRate")
        ?.curve.find((point) => point.budgetUnits === 1)?.activeBuffIds,
    ).toContain("crit-80-bonus");
  });

  it("emits deterministic points from zero through twenty units", () => {
    const result = compareMarginalValue(baseConfig(), TEN_PERCENT_BUDGET, "singleHit");

    expect(result.candidates.every((candidate) => candidate.curve.length === 21)).toBe(true);
    expect(result.curvePoints).toHaveLength(result.candidates.length * 21);
    expect(result.candidates[0].curve.map((point) => point.budgetUnits)).toEqual(
      Array.from({ length: 21 }, (_, index) => index),
    );
  });
});
