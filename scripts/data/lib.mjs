import { z } from "zod";

const sourceNumberSchema = z.union([z.number(), z.string()]);
const localizedTextSchema = z.union([
  z.string(),
  z
    .object({
      Content: z.string(),
    })
    .passthrough(),
]);

const lowerGrowthValueSchema = z
  .object({
    level: sourceNumberSchema,
    value: sourceNumberSchema,
  })
  .passthrough();

const upperGrowthValueSchema = z
  .object({
    Level: sourceNumberSchema,
    Value: sourceNumberSchema,
  })
  .passthrough();

const propertySchema = z
  .object({
    Name: z.string(),
    GrowthValues: z.array(z.union([lowerGrowthValueSchema, upperGrowthValueSchema])),
  })
  .passthrough();

const damageEntrySchema = z
  .object({
    Id: sourceNumberSchema,
    EntryNumber: sourceNumberSchema.optional(),
    Type: z.string().optional(),
    DmgType: z.string().optional(),
    PropertyName: z.string().optional(),
    RateLv: z.array(sourceNumberSchema),
  })
  .passthrough();

const characterSkillSchema = z
  .object({
    SkillId: sourceNumberSchema,
    SkillName: localizedTextSchema,
    SkillType: z.string().optional(),
    DamageList: z.array(damageEntrySchema).optional().default([]),
  })
  .passthrough();

const rawCharacterSchema = z
  .object({
    Id: sourceNumberSchema,
    QualityId: sourceNumberSchema,
    Name: localizedTextSchema,
    ElementId: sourceNumberSchema,
    ElementName: z.string(),
    WeaponType: sourceNumberSchema,
    WeaponTypeName: z.string(),
    RoleHeadIcon: z.string().optional(),
    Properties: z.array(propertySchema),
    Skills: z.array(characterSkillSchema),
  })
  .passthrough();

const weaponParameterSchema = z
  .object({
    ArrayString: z.array(sourceNumberSchema),
  })
  .passthrough();

const rawWeaponSchema = z
  .object({
    ItemId: sourceNumberSchema,
    WeaponName: localizedTextSchema,
    QualityId: sourceNumberSchema,
    WeaponType: sourceNumberSchema,
    WeaponTypeName: z.string(),
    Icon: z.string().optional(),
    ResonName: localizedTextSchema.optional(),
    Desc: z.string().optional(),
    DescParams: z.array(weaponParameterSchema).optional().default([]),
    ResonLevelLimit: sourceNumberSchema.optional(),
    Properties: z.array(propertySchema),
  })
  .passthrough();

const echoSetSchema = z
  .object({
    Group: z
      .object({
        Id: sourceNumberSchema,
        FetterGroupName: z.string(),
      })
      .passthrough(),
    Fetter: z
      .object({
        Id: sourceNumberSchema,
        EffectDescription: z.string().optional(),
        EffectDescriptionParam: z.array(sourceNumberSchema).optional().default([]),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

const rawEchoSchema = z
  .object({
    ItemId: sourceNumberSchema,
    MonsterId: sourceNumberSchema,
    MonsterName: z.string(),
    QualityId: sourceNumberSchema,
    PhantomType: sourceNumberSchema,
    Icon: z.string().optional(),
    Element: z
      .object({
        Id: sourceNumberSchema,
        Name: z.string(),
      })
      .passthrough(),
    Handbook: z.object({ Intensity: z.string().optional() }).passthrough().optional(),
    Skill: z
      .object({
        PhantomSkillId: sourceNumberSchema,
        SkillCD: sourceNumberSchema,
        DescriptionEx: z.string().optional(),
        LevelDescStrArray: z.array(weaponParameterSchema).optional().default([]),
      })
      .passthrough(),
    FetterGroupDetails: z.array(echoSetSchema),
  })
  .passthrough();

const monsterPropertySchema = z
  .object({
    Value: sourceNumberSchema,
    Name: z.string(),
  })
  .passthrough();

const monsterGrowthSchema = z
  .object({
    LifeMaxRatio: sourceNumberSchema.optional(),
    AtkRatio: sourceNumberSchema.optional(),
    DefRatio: sourceNumberSchema.optional(),
  })
  .passthrough();

const rawMonsterSchema = z
  .object({
    Id: sourceNumberSchema,
    Name: z.string(),
    Rarity: z.string(),
    RarityId: sourceNumberSchema,
    Icon: z.string().optional(),
    Properties: z.record(z.string(), monsterPropertySchema),
    GrowthRates: z.record(z.string(), monsterGrowthSchema),
  })
  .passthrough();

const elementKeys = new Map([
  ["冷凝", "glacio"],
  ["热熔", "fusion"],
  ["导电", "electro"],
  ["气动", "aero"],
  ["衍射", "spectro"],
  ["湮灭", "havoc"],
]);

function identify(raw, key) {
  if (typeof raw !== "object" || raw === null) return "unknown";
  const value = raw[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "unknown";
}

function schemaError(kind, id, error) {
  const details = error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "record"}: ${issue.message}`)
    .join("; ");
  return new Error(`${kind} ${id} schema drift: ${details}`);
}

function readLocalizedText(value) {
  return typeof value === "string" ? value : value.Content;
}

function finiteNumber(value, context) {
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`${context}: expected a finite number, received ${JSON.stringify(value)}`);
  }
  return parsed;
}

function displayNumber(value, context) {
  const source = String(value).trim();
  const normalized = source.replace(/％/g, "%");
  if (normalized.endsWith("%")) {
    return finiteNumber(normalized.slice(0, -1), context) / 100;
  }
  return finiteNumber(normalized, context);
}

function growthLevel(entry) {
  return "level" in entry ? entry.level : entry.Level;
}

function growthValue(entry) {
  return "value" in entry ? entry.value : entry.Value;
}

function propertyAtLevel(properties, name, level, recordLabel) {
  const property = properties.find((candidate) => candidate.Name === name);
  if (!property) {
    throw new Error(`${recordLabel} Properties missing ${name}`);
  }

  const value = property.GrowthValues.find(
    (candidate) => finiteNumber(growthLevel(candidate), `${recordLabel} ${name} level`) === level,
  );
  if (!value) {
    throw new Error(`${recordLabel} Properties.${name} missing level ${level}`);
  }
  return growthValue(value);
}

function numericIdCompare(left, right) {
  const leftNumber = Number(left.id);
  const rightNumber = Number(right.id);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }
  return left.id.localeCompare(right.id, "en");
}

function categoryFor(type) {
  if (/重击/.test(type)) return "heavy";
  if (/普攻|常态攻击/.test(type)) return "basic";
  if (/共鸣技能/.test(type)) return "skill";
  if (/共鸣解放/.test(type)) return "liberation";
  if (/变奏/.test(type)) return "intro";
  if (/延奏/.test(type)) return "outro";
  if (/声骸/.test(type)) return "echo";
  return "other";
}

function scalingStatFor(propertyName) {
  if (/生命|HP/i.test(propertyName)) return "hp";
  if (/防御|DEF/i.test(propertyName)) return "def";
  return "atk";
}

export function preferRemoteIcon(detailIcon, listIcon) {
  const isRemote = (value) => typeof value === "string" && /^https?:\/\//i.test(value);
  if (isRemote(detailIcon)) return detailIcon;
  if (isRemote(listIcon)) return listIcon;
  return detailIcon ?? listIcon ?? null;
}

/**
 * Expand one skill multiplier into per-hit decimal multipliers.
 * Supported forms intentionally stay narrow so unknown game syntax is surfaced.
 *
 * @param {string} value
 * @returns {number[]}
 */
export function expandSkillAttribute(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("skill attribute is empty");
  }

  const terms = value
    .trim()
    .replace(/％/g, "%")
    .split(/[+＋]/)
    .map((term) => term.trim());
  const hits = [];

  for (const term of terms) {
    const match = term.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))%\s*(?:[×xX*]\s*(\d+))?$/);
    if (!match) {
      throw new Error(`unsupported skill attribute: ${value}`);
    }

    const multiplier = finiteNumber(match[1], `skill attribute ${value}`) / 100;
    const hitCount = match[2] === undefined ? 1 : finiteNumber(match[2], `hit count ${value}`);
    if (!Number.isInteger(hitCount) || hitCount < 1) {
      throw new Error(`invalid hit count in skill attribute: ${value}`);
    }
    for (let index = 0; index < hitCount; index += 1) hits.push(multiplier);
  }

  if (hits.length === 0) throw new Error(`unsupported skill attribute: ${value}`);
  return hits;
}

function normalizeAction(skill, damage, damageIndex, element) {
  const skillName = readLocalizedText(skill.SkillName);
  const entryNumber = damage.EntryNumber === undefined
    ? damageIndex + 1
    : finiteNumber(damage.EntryNumber, `action ${damage.Id} EntryNumber`);
  const levels = [];
  const parseNotes = [];

  for (const [levelIndex, rawValue] of damage.RateLv.slice(0, 10).entries()) {
    const source = String(rawValue).trim();
    let hits = [];
    try {
      hits = expandSkillAttribute(source);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      parseNotes.push(`等级 ${levelIndex + 1}: ${source}，${reason}`);
    }
    levels.push({ level: levelIndex + 1, source, hits });
  }

  if (levels.length === 0) parseNotes.push("未提供技能倍率等级数据");
  const type = damage.Type ?? skill.SkillType ?? "";
  const suppliedName = typeof damage.Name === "string" ? damage.Name.trim() : "";

  return {
    id: String(damage.Id),
    skillId: String(skill.SkillId),
    name: suppliedName || `${skillName} · 第 ${entryNumber} 段`,
    category: categoryFor(type),
    damageType: damage.DmgType ?? type,
    scalingStat: scalingStatFor(damage.PropertyName ?? "攻击"),
    element,
    entryNumber,
    levels,
    parseStatus: parseNotes.length === 0 ? "parsed" : "manual",
    parseNotes,
  };
}

/** @param {unknown} raw */
export function normalizeCharacter(raw) {
  const id = identify(raw, "Id");
  const result = rawCharacterSchema.safeParse(raw);
  if (!result.success) throw schemaError("Character", id, result.error);

  const character = result.data;
  const recordLabel = `Character ${id}`;
  const element = elementKeys.get(character.ElementName) ?? String(character.ElementId);
  const actions = character.Skills.flatMap((skill) =>
    skill.DamageList.map((damage, damageIndex) =>
      normalizeAction(skill, damage, damageIndex, element),
    ),
  ).sort(numericIdCompare);

  return {
    id,
    name: readLocalizedText(character.Name),
    quality: finiteNumber(character.QualityId, `${recordLabel} QualityId`),
    element: { id: String(character.ElementId), name: character.ElementName },
    weaponType: { id: String(character.WeaponType), name: character.WeaponTypeName },
    iconUrl: character.RoleHeadIcon ?? null,
    level90: {
      hp: displayNumber(propertyAtLevel(character.Properties, "生命", 90, recordLabel), `${recordLabel} HP`),
      atk: displayNumber(propertyAtLevel(character.Properties, "攻击", 90, recordLabel), `${recordLabel} ATK`),
      def: displayNumber(propertyAtLevel(character.Properties, "防御", 90, recordLabel), `${recordLabel} DEF`),
      critRate: displayNumber(
        propertyAtLevel(character.Properties, "暴击", 90, recordLabel),
        `${recordLabel} crit rate`,
      ),
      critDamage: displayNumber(
        propertyAtLevel(character.Properties, "暴击伤害", 90, recordLabel),
        `${recordLabel} crit damage`,
      ),
    },
    actions,
    source: { provider: "encore.moe", recordId: id },
  };
}

/** @param {unknown} raw */
export function normalizeWeapon(raw) {
  const id = identify(raw, "ItemId");
  const result = rawWeaponSchema.safeParse(raw);
  if (!result.success) throw schemaError("Weapon", id, result.error);

  const weapon = result.data;
  const recordLabel = `Weapon ${id}`;
  const secondaryProperty = weapon.Properties.find((property) => property.Name !== "攻击");
  let secondaryStat = null;
  if (secondaryProperty) {
    const sourceValue = propertyAtLevel(
      weapon.Properties,
      secondaryProperty.Name,
      90,
      recordLabel,
    );
    secondaryStat = {
      name: secondaryProperty.Name,
      value: displayNumber(sourceValue, `${recordLabel} ${secondaryProperty.Name}`),
      source: String(sourceValue),
    };
  }

  const parseNotes = [];
  const parameters = weapon.DescParams.map((parameter, index) => {
    const sources = parameter.ArrayString.map(String);
    const values = [];
    for (const source of sources) {
      try {
        values.push(displayNumber(source, `${recordLabel} effect parameter ${index + 1}`));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        parseNotes.push(`参数 ${index + 1}: ${source}，${reason}`);
      }
    }
    return { index, sources, values: parseNotes.length === 0 ? values : [] };
  });

  return {
    id,
    name: readLocalizedText(weapon.WeaponName),
    quality: finiteNumber(weapon.QualityId, `${recordLabel} QualityId`),
    weaponType: { id: String(weapon.WeaponType), name: weapon.WeaponTypeName },
    iconUrl: weapon.Icon ?? null,
    level90BaseAtk: displayNumber(
      propertyAtLevel(weapon.Properties, "攻击", 90, recordLabel),
      `${recordLabel} ATK`,
    ),
    secondaryStat,
    effect: {
      name: weapon.ResonName === undefined ? "" : readLocalizedText(weapon.ResonName),
      sourceText: weapon.Desc ?? "",
      resonanceRankLimit: weapon.ResonLevelLimit === undefined
        ? 0
        : finiteNumber(weapon.ResonLevelLimit, `${recordLabel} ResonLevelLimit`),
      parameters,
      parseStatus: parseNotes.length === 0 ? "parsed" : "manual",
      parseNotes,
    },
    source: { provider: "encore.moe", recordId: id },
  };
}

/** @param {unknown} raw */
export function normalizeEcho(raw) {
  const id = identify(raw, "MonsterId");
  const result = rawEchoSchema.safeParse(raw);
  if (!result.success) throw schemaError("Echo", id, result.error);

  const echo = result.data;
  return {
    id,
    itemId: String(echo.ItemId),
    name: echo.MonsterName,
    quality: finiteNumber(echo.QualityId, `Echo ${id} QualityId`),
    phantomType: finiteNumber(echo.PhantomType, `Echo ${id} PhantomType`),
    intensity: echo.Handbook?.Intensity ?? "",
    element: { id: String(echo.Element.Id), name: echo.Element.Name },
    iconUrl: echo.Icon ?? null,
    skill: {
      id: String(echo.Skill.PhantomSkillId),
      cooldown: finiteNumber(echo.Skill.SkillCD, `Echo ${id} SkillCD`),
      sourceText: echo.Skill.DescriptionEx ?? "",
      levelParameters: echo.Skill.LevelDescStrArray.map((level) => level.ArrayString.map(String)),
      parseStatus: "manual",
      parseNotes: ["声骸技能可能同时包含倍率、固定值、治疗或状态效果，需按机制手动确认"],
    },
    sets: echo.FetterGroupDetails.map((entry) => ({
      id: String(entry.Group.Id),
      name: entry.Group.FetterGroupName,
      effectId: entry.Fetter ? String(entry.Fetter.Id) : null,
      sourceText: entry.Fetter?.EffectDescription ?? null,
      parameters: entry.Fetter?.EffectDescriptionParam.map(String) ?? [],
    })),
    source: { provider: "encore.moe", recordId: id },
  };
}

function monsterProperty(monster, key, recordLabel, parseNotes) {
  const property = monster.Properties[key];
  if (!property) {
    parseNotes.push(`Properties 缺少 ${key}`);
    return null;
  }
  return finiteNumber(property.Value, `${recordLabel} Properties.${key}.Value`);
}

function scaledMonsterStat(base, ratio, context) {
  return base === null || ratio === undefined
    ? null
    : base * finiteNumber(ratio, context) / 10_000;
}

/** @param {unknown} raw */
export function normalizeMonster(raw) {
  const id = identify(raw, "Id");
  const result = rawMonsterSchema.safeParse(raw);
  if (!result.success) throw schemaError("Monster", id, result.error);

  const monster = result.data;
  const recordLabel = `Monster ${id}`;
  const growth = monster.GrowthRates["90"];
  const parseNotes = [];
  const hp = monsterProperty(monster, "LifeMax", recordLabel, parseNotes);
  const atk = monsterProperty(monster, "Atk", recordLabel, parseNotes);
  const def = monsterProperty(monster, "Def", recordLabel, parseNotes);
  if (!growth) parseNotes.push("GrowthRates 缺少 90 级数据");
  const resistance = (key) => {
    const value = monsterProperty(monster, key, recordLabel, parseNotes);
    return value === null ? null : value / 10_000;
  };

  return {
    id,
    name: monster.Name,
    rarity: monster.Rarity,
    rarityId: finiteNumber(monster.RarityId, `${recordLabel} RarityId`),
    iconUrl: monster.Icon ?? null,
    defaultLevel: 90,
    level90: {
      hp: scaledMonsterStat(hp, growth?.LifeMaxRatio, `${recordLabel} level 90 HP ratio`),
      atk: scaledMonsterStat(atk, growth?.AtkRatio, `${recordLabel} level 90 ATK ratio`),
      def: scaledMonsterStat(def, growth?.DefRatio, `${recordLabel} level 90 DEF ratio`),
    },
    resistances: {
      glacio: resistance("DamageResistanceElement1"),
      fusion: resistance("DamageResistanceElement2"),
      electro: resistance("DamageResistanceElement3"),
      aero: resistance("DamageResistanceElement4"),
      spectro: resistance("DamageResistanceElement5"),
      havoc: resistance("DamageResistanceElement6"),
    },
    physicalResistance: resistance("DamageResistancePhys"),
    parseStatus: parseNotes.length === 0 ? "parsed" : "manual",
    parseNotes,
    source: { provider: "encore.moe", recordId: id },
  };
}

export function sortByNumericId(records) {
  return [...records].sort(numericIdCompare);
}
