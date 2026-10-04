import { describe, expect, it } from "vitest";
import type { BuffEffect, CombatContext, DamageAction, DamageZones, PanelSnapshot, Target } from "../domain/types";
import { resolveBuffs } from "./buffs";
import { resolveHit } from "./damage";
import { buildDamageTrace } from "./trace";

describe("buildDamageTrace", () => {
  it("preserves multiplier order and the Buff sources for each zone", () => {
    const panel: PanelSnapshot = {
      level: 90,
      atk: 2000,
      hp: 10000,
      def: 1000,
      critRate: 0.5,
      critDamage: 2.5,
    };
    const action: DamageAction = {
      id: "trace-hit",
      name: "追踪测试",
      scalingStat: "atk",
      multiplier: 3,
      multiplierFlat: 0,
      multiplierAmplify: 0,
      hits: 1,
    };
    const target: Target = {
      level: 90,
      defenseReduction: 0,
      defenseIgnore: 0,
      resistance: 0.1,
    };
    const zones: DamageZones = {
      damageBonus: 0.5,
      deepen: 0.2,
      damageTaken: 1,
      finalDamage: 0.1,
    };
    const context: CombatContext = {
      actorId: "dps",
      actionId: action.id,
      damageType: "skill",
      element: "spectro",
      chain: 0,
      states: [],
      stacks: {},
    };
    const effects: BuffEffect[] = [
      { id: "bonus-source", name: "属性增伤", providerId: "support", zone: "damageBonus", value: 0.5 },
      { id: "deep-source", name: "伤害加深", providerId: "support", zone: "deepen", value: 0.2 },
    ];

    const hit = resolveHit(action, panel, target, zones);
    const buffs = resolveBuffs(effects, context);
    const trace = buildDamageTrace(hit, buffs);

    expect(trace.steps.map((step) => step.zone)).toEqual([
      "scaling",
      "motionValue",
      "damageBonus",
      "deepen",
      "damageTaken",
      "defense",
      "resistance",
      "finalDamage",
      "crit",
    ]);
    expect(trace.steps.find((step) => step.zone === "damageBonus")?.sourceIds).toEqual([
      "bonus-source",
    ]);
    expect(trace.steps.find((step) => step.zone === "deepen")?.sourceIds).toEqual([
      "deep-source",
    ]);
    expect(trace.expectedDamage).toBeCloseTo(9355.5);
  });

  it("reconstructs expected damage for a multi-hit action", () => {
    const panel: PanelSnapshot = {
      level: 90,
      atk: 2000,
      hp: 10000,
      def: 1000,
      critRate: 0.5,
      critDamage: 2.5,
    };
    const action: DamageAction = {
      id: "multi-hit",
      name: "二段攻击",
      scalingStat: "atk",
      multiplier: 3,
      multiplierFlat: 0,
      multiplierAmplify: 0,
      hits: 2,
    };
    const target: Target = {
      level: 90,
      defenseReduction: 0,
      defenseIgnore: 0,
      resistance: 0.1,
    };
    const zones: DamageZones = {
      damageBonus: 0.5,
      deepen: 0.2,
      damageTaken: 1,
      finalDamage: 0.1,
    };
    const context: CombatContext = {
      actorId: "dps",
      actionId: action.id,
      damageType: "skill",
      element: "spectro",
      chain: 0,
      states: [],
      stacks: {},
    };

    const hit = resolveHit(action, panel, target, zones);
    const trace = buildDamageTrace(hit, resolveBuffs([], context));
    const reconstructed = trace.steps.reduce((damage, item) => damage * item.factor, 1);

    expect(reconstructed).toBeCloseTo(trace.expectedDamage);
    expect(trace.steps.find((item) => item.zone === "motionValue")?.label).toContain("2 段");
  });
});
