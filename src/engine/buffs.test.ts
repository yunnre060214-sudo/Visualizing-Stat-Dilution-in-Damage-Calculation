import { describe, expect, it } from "vitest";
import type { BuffEffect, CombatContext } from "../domain/types";
import { resolveBuffs } from "./buffs";

const matchingContext: CombatContext = {
  actorId: "jinhsi",
  actionId: "resonance-skill-2",
  damageType: "skill",
  element: "spectro",
  chain: 2,
  states: ["incarnation"],
  stacks: { forte: 3 },
};

const effects: BuffEffect[] = [
  {
    id: "outro-skill-bonus",
    name: "延奏技能增伤",
    providerId: "zhezhi",
    zone: "damageBonus",
    value: 0.2,
    conditions: {
      actorId: "jinhsi",
      actionId: "resonance-skill-2",
      damageTypes: ["skill"],
      element: "spectro",
      minChain: 1,
      requiredState: "incarnation",
      stacks: { key: "forte", min: 2, max: 4 },
    },
  },
];

describe("resolveBuffs", () => {
  it("applies an effect when every declarative condition matches", () => {
    expect(resolveBuffs(effects, matchingContext).applied.map((effect) => effect.id)).toEqual([
      "outro-skill-bonus",
    ]);
  });

  it("keeps a failed effect with a readable reason", () => {
    const wrongDamageType = { ...matchingContext, damageType: "basic" };

    const result = resolveBuffs(effects, wrongDamageType);

    expect(result.inactive).toHaveLength(1);
    expect(result.inactive[0].reason).toMatch(/伤害类型/);
    expect(result.zones.damageBonus).toBeUndefined();
  });

  it("separates manual-only effects instead of applying them", () => {
    const unsupportedEffects: BuffEffect[] = [
      {
        id: "manual-timing",
        name: "特殊取消窗口",
        providerId: "support",
        zone: "deepen",
        value: 0.25,
        conditions: { manualOnly: true },
      },
    ];

    const result = resolveBuffs(unsupportedEffects, matchingContext);

    expect(result.manual[0].reason).toMatch(/手动确认/);
    expect(result.applied).toHaveLength(0);
  });

  it("adds effects only inside the same zone and supports per-stack values", () => {
    const additiveEffects: BuffEffect[] = [
      { id: "a", name: "A", providerId: "one", zone: "damageBonus", value: 0.1 },
      { id: "b", name: "B", providerId: "two", zone: "damageBonus", value: 0.2 },
      {
        id: "c",
        name: "C",
        providerId: "three",
        zone: "deepen",
        value: 0.05,
        valuePerStack: "forte",
      },
    ];

    const result = resolveBuffs(additiveEffects, matchingContext);

    expect(result.zones.damageBonus).toBeCloseTo(0.3);
    expect(result.zones.deepen).toBeCloseTo(0.15);
    expect(result.applied.find((effect) => effect.id === "c")?.appliedValue).toBeCloseTo(0.15);
  });
});
