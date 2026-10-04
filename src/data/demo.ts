import type {
  BuffEffect,
  CombatContext,
  DamageAction,
  PanelSnapshot,
  Target,
} from "../domain/types";

export const DEMO_PANEL: PanelSnapshot = {
  level: 90,
  atk: 2000,
  hp: 10000,
  def: 1000,
  critRate: 0.5,
  critDamage: 2.5,
};

export const DEMO_ACTION: DamageAction = {
  id: "demo-skill",
  name: "共鸣技能 · 演示段",
  scalingStat: "atk",
  multiplier: 3,
  multiplierFlat: 0,
  multiplierAmplify: 0,
  hits: 1,
};

export const DEMO_TARGET: Target = {
  level: 90,
  defenseReduction: 0,
  defenseIgnore: 0,
  resistance: 0.1,
};

export const DEMO_CONTEXT: CombatContext = {
  actorId: "demo-resonator",
  actionId: DEMO_ACTION.id,
  damageType: "skill",
  element: "spectro",
  chain: 0,
  states: ["intro-complete"],
  stacks: {},
};

export const DEMO_BUFFS: BuffEffect[] = [
  {
    id: "spectro-loadout",
    name: "衍射伤害加成",
    providerId: "demo-resonator",
    zone: "damageBonus",
    value: 0.5,
  },
  {
    id: "outro-deepen",
    name: "延奏技能伤害加深",
    providerId: "demo-support",
    zone: "deepen",
    value: 0.2,
    conditions: { damageTypes: ["skill"] },
  },
  {
    id: "final-amplifier",
    name: "最终伤害提升",
    providerId: "demo-echo",
    zone: "finalDamage",
    value: 0.1,
  },
  {
    id: "basic-only-bonus",
    name: "普攻专属加成",
    providerId: "demo-weapon",
    zone: "damageBonus",
    value: 0.12,
    conditions: { damageTypes: ["basic"] },
  },
  {
    id: "manual-cancel-window",
    name: "特殊取消窗口",
    providerId: "demo-support",
    zone: "deepen",
    value: 0.15,
    conditions: { manualOnly: true },
  },
];
