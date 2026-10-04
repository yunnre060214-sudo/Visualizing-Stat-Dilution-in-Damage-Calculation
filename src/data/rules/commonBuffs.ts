import type { BuffEffect } from "../../domain/types";

export interface SourcedBuffEffect extends BuffEffect {
  source: {
    kind: "character-skill";
    recordId: string;
    skillId: string;
    skillName: string;
    sourceText: string;
  };
}

export const COMMON_BUFFS: SourcedBuffEffect[] = [
  {
    id: "verina-outro-deepen",
    name: "维里奈延奏 · 全伤害加深",
    providerId: "1503",
    zone: "deepen",
    value: 0.15,
    conditions: { requiredState: "verina-outro" },
    source: {
      kind: "character-skill",
      recordId: "1503",
      skillId: "1000309",
      skillName: "盛放",
      sourceText: "附近队伍中所有角色全伤害加深15%，持续30秒。",
    },
  },
  {
    id: "sanhua-outro-basic-deepen",
    name: "散华延奏 · 普攻伤害加深",
    providerId: "1102",
    zone: "deepen",
    value: 0.38,
    conditions: { damageTypes: ["basic"], requiredState: "sanhua-outro" },
    source: {
      kind: "character-skill",
      recordId: "1102",
      skillId: "1000509",
      skillName: "凛絜",
      sourceText: "下一位登场角色普攻伤害加深38%，效果持续14秒。",
    },
  },
];
