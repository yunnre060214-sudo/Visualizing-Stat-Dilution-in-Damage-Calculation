import { describe, expect, it } from "vitest";
import type { DamageAction, DamageZones, PanelSnapshot, Target } from "../domain/types";
import {
  defenseMultiplier,
  expectedCritMultiplier,
  resistanceMultiplier,
  resolveHit,
} from "./damage";

const target: Target = {
  level: 90,
  defenseReduction: 0,
  defenseIgnore: 0,
  resistance: 0.1,
};

describe("damage multipliers", () => {
  it("calculates equal-level defense at one half", () => {
    expect(defenseMultiplier(90, target)).toBeCloseTo(0.5);
  });

  it("clamps defense reduction and ignore independently", () => {
    expect(defenseMultiplier(90, { ...target, defenseReduction: 4, defenseIgnore: -2 })).toBe(1);
  });

  it("uses the three resistance branches at their boundaries", () => {
    expect(resistanceMultiplier(-0.2)).toBeCloseTo(1.1);
    expect(resistanceMultiplier(0)).toBeCloseTo(1);
    expect(resistanceMultiplier(0.1)).toBeCloseTo(0.9);
    expect(resistanceMultiplier(0.8)).toBeCloseTo(0.2);
  });

  it("clamps only the rate used by expected critical damage", () => {
    expect(expectedCritMultiplier(0.5, 2.5)).toBeCloseTo(1.75);
    expect(expectedCritMultiplier(1.4, 2.5)).toBeCloseTo(2.5);
  });
});

describe("resolveHit", () => {
  it("resolves an attack-scaling hit and floors display values only", () => {
    const panel: PanelSnapshot = {
      level: 90,
      atk: 2000,
      hp: 10000,
      def: 1000,
      critRate: 0.5,
      critDamage: 2.5,
    };
    const action: DamageAction = {
      id: "test-hit",
      name: "测试攻击",
      scalingStat: "atk",
      multiplier: 3,
      multiplierFlat: 0,
      multiplierAmplify: 0,
      hits: 1,
    };
    const zones: DamageZones = {
      damageBonus: 0.5,
      deepen: 0.2,
      damageTaken: 1,
      finalDamage: 0.1,
    };

    const result = resolveHit(action, panel, target, zones);

    expect(result.nonCrit).toEqual({ exact: 5346, display: 5346 });
    expect(result.crit).toEqual({ exact: 13365, display: 13365 });
    expect(result.expected.exact).toBeCloseTo(9355.5);
    expect(result.expected.display).toBe(9355);
    expect(result.breakdown.effectiveMultiplier).toBe(3);
  });

  it("reports invalid levels, hit counts and defense operands", () => {
    const result = resolveHit(
      {
        id: "invalid-hit",
        name: "无效攻击",
        scalingStat: "atk",
        multiplier: 3,
        multiplierFlat: 0,
        multiplierAmplify: 0,
        hits: 0,
      },
      {
        level: -1,
        atk: 2000,
        hp: 10000,
        def: 1000,
        critRate: 0.5,
        critDamage: 2.5,
      },
      { ...target, defenseReduction: Number.NaN },
      { damageBonus: 0.5, deepen: 0.2, damageTaken: 1, finalDamage: 0.1 },
    );

    expect(result.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(["panel.level", "action.hits", "target.defenseReduction"]),
    );
  });

  it("reports non-finite computed results", () => {
    const result = resolveHit(
      {
        id: "overflow-hit",
        name: "溢出攻击",
        scalingStat: "atk",
        multiplier: 3,
        multiplierFlat: 0,
        multiplierAmplify: 0,
        hits: 1,
      },
      {
        level: 90,
        atk: 1e308,
        hp: 10000,
        def: 1000,
        critRate: 0.5,
        critDamage: 2.5,
      },
      target,
      { damageBonus: 0.5, deepen: 0.2, damageTaken: 1, finalDamage: 0.1 },
    );

    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "result", code: "INVALID_NUMBER" }),
    );
  });
});
