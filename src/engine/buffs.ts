import type {
  BuffCondition,
  BuffEffect,
  BuffResolution,
  CombatContext,
  ResolvedBuffEffect,
} from "../domain/types";

function failedCondition(condition: BuffCondition, context: CombatContext): string | undefined {
  if (condition.actorId !== undefined && condition.actorId !== context.actorId) {
    return "当前角色不符合";
  }
  if (condition.actionId !== undefined && condition.actionId !== context.actionId) {
    return "当前招式不符合";
  }
  if (
    condition.damageTypes !== undefined &&
    !condition.damageTypes.includes(context.damageType)
  ) {
    return "当前伤害类型不符合";
  }
  if (condition.element !== undefined && condition.element !== context.element) {
    return "当前属性不符合";
  }
  if (condition.minChain !== undefined && context.chain < condition.minChain) {
    return `共鸣链需达到 ${condition.minChain}`;
  }
  if (
    condition.requiredState !== undefined &&
    !context.states.includes(condition.requiredState)
  ) {
    return `缺少状态：${condition.requiredState}`;
  }
  if (condition.stacks !== undefined) {
    const stacks = context.stacks[condition.stacks.key] ?? 0;
    if (condition.stacks.min !== undefined && stacks < condition.stacks.min) {
      return `${condition.stacks.key} 层数低于 ${condition.stacks.min}`;
    }
    if (condition.stacks.max !== undefined && stacks > condition.stacks.max) {
      return `${condition.stacks.key} 层数高于 ${condition.stacks.max}`;
    }
  }

  return undefined;
}

function resolvedEffect(
  effect: BuffEffect,
  context: CombatContext,
  reason: string,
): ResolvedBuffEffect {
  const stacks = effect.valuePerStack === undefined ? 1 : context.stacks[effect.valuePerStack] ?? 0;
  return {
    ...effect,
    appliedValue: effect.value * stacks,
    reason,
  };
}

export function resolveBuffs(
  effects: BuffEffect[],
  context: CombatContext,
): BuffResolution {
  const resolution: BuffResolution = {
    applied: [],
    inactive: [],
    manual: [],
    zones: {},
  };

  for (const effect of effects) {
    if (effect.conditions?.manualOnly) {
      resolution.manual.push(resolvedEffect(effect, context, "需手动确认触发条件"));
      continue;
    }

    const failure = effect.conditions
      ? failedCondition(effect.conditions, context)
      : undefined;
    if (failure !== undefined) {
      resolution.inactive.push(resolvedEffect(effect, context, failure));
      continue;
    }

    const resolved = resolvedEffect(effect, context, "条件已满足");
    resolution.applied.push(resolved);
    resolution.zones[effect.zone] =
      (resolution.zones[effect.zone] ?? 0) + resolved.appliedValue;
  }

  return resolution;
}
