import { describe, expect, it } from "vitest";
import { buildPanel, validatePanelInput } from "./panel";

describe("buildPanel", () => {
  it("combines base, percentage and flat stats in game order", () => {
    const panel = buildPanel({
      level: 90,
      baseAtk: 400,
      weaponAtk: 500,
      atkPercent: 1,
      flatAtk: 400,
      baseHp: 10000,
      hpPercent: 0.2,
      flatHp: 1000,
      baseDef: 1000,
      defPercent: 0.3,
      flatDef: 100,
      critRate: 0.5,
      critDamage: 2.5,
    });

    expect(panel.atk).toBe(2200);
    expect(panel.hp).toBe(13000);
    expect(panel.def).toBe(1400);
    expect(panel.critRate).toBe(0.5);
    expect(panel.critDamage).toBe(2.5);
  });
});

describe("validatePanelInput", () => {
  it("reports non-finite values, invalid levels and total crit damage below one", () => {
    const issues = validatePanelInput({
      level: -1,
      baseAtk: Number.NaN,
      weaponAtk: 0,
      atkPercent: 0,
      flatAtk: 0,
      baseHp: 1,
      hpPercent: 0,
      flatHp: 0,
      baseDef: 1,
      defPercent: 0,
      flatDef: 0,
      critRate: 0.05,
      critDamage: 0.5,
    });

    expect(issues.map((issue) => issue.field)).toEqual(["level", "baseAtk", "critDamage"]);
  });
});
