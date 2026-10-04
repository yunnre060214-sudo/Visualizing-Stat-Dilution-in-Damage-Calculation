import { describe, expect, it } from "vitest";
import type { PanelSnapshot, SpecialDamageAction, SpecialDamageZones, Target } from "../domain/types";
import { resolveSpecialDamage } from "./specialDamage";

const panel: PanelSnapshot = {
  level: 90,
  atk: 2000,
  hp: 10000,
  def: 1000,
  critRate: 1,
  critDamage: 3,
};

const target: Target = {
  level: 90,
  defenseReduction: 0,
  defenseIgnore: 0,
  resistance: 0.1,
};

describe("resolveSpecialDamage", () => {
  it("keeps attack-scaling Effect damage outside the critical-hit chain", () => {
    const action: SpecialDamageAction = {
      id: "effect-test",
      name: "效应伤害",
      kind: "effect-attack",
      multiplier: 0.5,
      scalingStat: "atk",
      resistanceApplies: true,
    };
    const zones: SpecialDamageZones = {
      effectDeepen: 0.2,
      tuneBreakBonus: 0,
      damageTaken: 1,
      finalDamage: 0,
    };

    const result = resolveSpecialDamage(action, panel, target, zones);

    expect(result.critEligible).toBe(false);
    expect(result.value.exact).toBeCloseTo(540);
    expect(result.value.display).toBe(540);
  });

  it("lets Tune Break opt out of resistance while Hack uses it", () => {
    const common = {
      id: "special",
      name: "特殊伤害",
      multiplier: 1,
      fixedValue: 1000,
      resistanceApplies: false,
    } satisfies Omit<SpecialDamageAction, "kind">;
    const zones: SpecialDamageZones = {
      effectDeepen: 0,
      tuneBreakBonus: 0,
      damageTaken: 1,
      finalDamage: 0,
    };

    const tuneBreak = resolveSpecialDamage({ ...common, kind: "tune-break" }, panel, target, zones);
    const hack = resolveSpecialDamage(
      { ...common, kind: "hack", resistanceApplies: true },
      panel,
      target,
      zones,
    );

    expect(tuneBreak.value.exact).toBeCloseTo(400);
    expect(hack.value.exact).toBeCloseTo(450);
  });

  it("reports every invalid operand consumed by a special hit", () => {
    const result = resolveSpecialDamage(
      {
        id: "invalid-effect",
        name: "无效效应",
        kind: "effect-attack",
        multiplier: Number.NaN,
        scalingStat: "atk",
        resistanceApplies: true,
      },
      panel,
      { ...target, defenseIgnore: Number.NaN },
      {
        effectDeepen: Number.NaN,
        tuneBreakBonus: 0,
        damageTaken: 1,
        finalDamage: 0,
      },
    );

    expect(result.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining([
        "action.multiplier",
        "target.defenseIgnore",
        "zones.effectDeepen",
        "result",
      ]),
    );
  });

  it("reports overflow in a special-damage result", () => {
    const result = resolveSpecialDamage(
      {
        id: "overflow-special",
        name: "溢出特殊伤害",
        kind: "hack",
        multiplier: 1e308,
        fixedValue: 1e308,
        resistanceApplies: true,
      },
      panel,
      target,
      { effectDeepen: 0, tuneBreakBonus: 0, damageTaken: 1, finalDamage: 0 },
    );

    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "result", code: "INVALID_NUMBER" }),
    );
  });
});
