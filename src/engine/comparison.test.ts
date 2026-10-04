import { describe, expect, it } from "vitest";
import type { CalculationConfig } from "../domain/types";
import { compareBuilds } from "./comparison";

const config = (attack: number): CalculationConfig => ({
  panel: {
    level: 90,
    baseAtk: attack,
    weaponAtk: 0,
    atkPercent: 0,
    flatAtk: 0,
    baseHp: 10000,
    hpPercent: 0,
    flatHp: 0,
    baseDef: 1000,
    defPercent: 0,
    flatDef: 0,
    critRate: 0,
    critDamage: 2,
  },
  action: {
    id: "comparison-hit",
    name: "对比段",
    scalingStat: "atk",
    multiplier: 1,
    multiplierFlat: 0,
    multiplierAmplify: 0,
    hits: 1,
  },
  target: {
    level: 90,
    defenseReduction: 1,
    defenseIgnore: 0,
    resistance: 0,
  },
  zones: { damageBonus: 0, deepen: 0, damageTaken: 1, finalDamage: 0 },
});

describe("compareBuilds", () => {
  it("shows signed deltas for non-crit, crit, and expected damage", () => {
    const result = compareBuilds(config(10000), config(11000));

    expect(result.nonCrit).toMatchObject({ a: 10000, b: 11000, absolute: 1000, relative: 0.1 });
    expect(result.crit).toMatchObject({ a: 20000, b: 22000, absolute: 2000, relative: 0.1 });
    expect(result.expected).toMatchObject({ a: 10000, b: 11000, absolute: 1000, relative: 0.1 });
  });

  it("keeps a negative delta when build B loses damage", () => {
    const result = compareBuilds(config(10000), config(9000));

    expect(result.expected.absolute).toBe(-1000);
    expect(result.expected.relative).toBeCloseTo(-0.1);
    expect(result.winner).toBe("a");
  });
});
