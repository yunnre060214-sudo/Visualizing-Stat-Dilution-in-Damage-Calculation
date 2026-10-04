import type { PanelInput, PanelSnapshot, ValidationIssue } from "../domain/types";

const numericFields: Array<keyof PanelInput> = [
  "baseAtk",
  "weaponAtk",
  "atkPercent",
  "flatAtk",
  "baseHp",
  "hpPercent",
  "flatHp",
  "baseDef",
  "defPercent",
  "flatDef",
  "critRate",
];

export function validatePanelInput(input: PanelInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!Number.isFinite(input.level) || input.level <= 0) {
    issues.push({ field: "level", code: "OUT_OF_RANGE", message: "等级必须是大于零的有限数值" });
  }

  for (const field of numericFields) {
    if (!Number.isFinite(input[field])) {
      issues.push({ field, code: "INVALID_NUMBER", message: "请输入有限数值" });
    }
  }

  if (!Number.isFinite(input.critDamage) || input.critDamage < 1) {
    issues.push({
      field: "critDamage",
      code: Number.isFinite(input.critDamage) ? "OUT_OF_RANGE" : "INVALID_NUMBER",
      message: "暴击伤害总倍率必须至少为 100%",
    });
  }

  return issues;
}

export function buildPanel(input: PanelInput): PanelSnapshot {
  return {
    level: input.level,
    atk: (input.baseAtk + input.weaponAtk) * (1 + input.atkPercent) + input.flatAtk,
    hp: input.baseHp * (1 + input.hpPercent) + input.flatHp,
    def: input.baseDef * (1 + input.defPercent) + input.flatDef,
    critRate: input.critRate,
    critDamage: input.critDamage,
  };
}
