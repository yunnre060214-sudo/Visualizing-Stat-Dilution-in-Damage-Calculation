import { z } from "zod";

export const catalogLabelSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
});

export const normalizedActionLevelSchema = z.object({
  level: z.number().int().min(1).max(10),
  source: z.string(),
  hits: z.array(z.number().finite().nonnegative()),
});

export const normalizedActionSchema = z.object({
  id: z.string().min(1),
  skillId: z.string().min(1),
  name: z.string().min(1),
  category: z.enum([
    "basic",
    "heavy",
    "skill",
    "liberation",
    "intro",
    "outro",
    "echo",
    "other",
  ]),
  damageType: z.string(),
  scalingStat: z.enum(["atk", "hp", "def"]),
  element: z.string(),
  entryNumber: z.number().int().nonnegative(),
  levels: z.array(normalizedActionLevelSchema).max(10),
  parseStatus: z.enum(["parsed", "manual"]),
  parseNotes: z.array(z.string()),
});

export const normalizedCharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quality: z.number().int().nonnegative(),
  element: catalogLabelSchema,
  weaponType: catalogLabelSchema,
  iconUrl: z.string().nullable(),
  level90: z.object({
    hp: z.number().finite().positive(),
    atk: z.number().finite().nonnegative(),
    def: z.number().finite().nonnegative(),
    critRate: z.number().finite().nonnegative(),
    critDamage: z.number().finite().nonnegative(),
  }),
  actions: z.array(normalizedActionSchema),
  source: z.object({
    provider: z.literal("encore.moe"),
    recordId: z.string().min(1),
  }),
});

export const normalizedWeaponEffectParameterSchema = z.object({
  index: z.number().int().nonnegative(),
  sources: z.array(z.string()),
  values: z.array(z.number().finite()),
});

export const normalizedWeaponSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quality: z.number().int().nonnegative(),
  weaponType: catalogLabelSchema,
  iconUrl: z.string().nullable(),
  level90BaseAtk: z.number().finite().nonnegative(),
  secondaryStat: z
    .object({
      name: z.string().min(1),
      value: z.number().finite(),
      source: z.string(),
    })
    .nullable(),
  effect: z.object({
    name: z.string(),
    sourceText: z.string(),
    resonanceRankLimit: z.number().int().nonnegative(),
    parameters: z.array(normalizedWeaponEffectParameterSchema),
    parseStatus: z.enum(["parsed", "manual"]),
    parseNotes: z.array(z.string()),
  }),
  source: z.object({
    provider: z.literal("encore.moe"),
    recordId: z.string().min(1),
  }),
});

export const normalizedCharactersSchema = z.array(normalizedCharacterSchema);
export const normalizedWeaponsSchema = z.array(normalizedWeaponSchema);

export const normalizedEchoSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  name: z.string().min(1),
  quality: z.number().int().nonnegative(),
  phantomType: z.number().int().nonnegative(),
  intensity: z.string(),
  element: catalogLabelSchema,
  iconUrl: z.string().nullable(),
  skill: z.object({
    id: z.string().min(1),
    cooldown: z.number().finite().nonnegative(),
    sourceText: z.string(),
    levelParameters: z.array(z.array(z.string())),
    parseStatus: z.enum(["parsed", "manual"]),
    parseNotes: z.array(z.string()),
  }),
  sets: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      effectId: z.string().nullable(),
      sourceText: z.string().nullable(),
      parameters: z.array(z.string()),
    }),
  ),
  source: z.object({
    provider: z.literal("encore.moe"),
    recordId: z.string().min(1),
  }),
});

export const normalizedTargetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rarity: z.string(),
  rarityId: z.number().int().nonnegative(),
  iconUrl: z.string().nullable(),
  defaultLevel: z.number().int().positive(),
  level90: z.object({
    hp: z.number().finite().nonnegative().nullable(),
    atk: z.number().finite().nonnegative().nullable(),
    def: z.number().finite().nonnegative().nullable(),
  }),
  resistances: z.object({
    glacio: z.number().finite().nullable(),
    fusion: z.number().finite().nullable(),
    electro: z.number().finite().nullable(),
    aero: z.number().finite().nullable(),
    spectro: z.number().finite().nullable(),
    havoc: z.number().finite().nullable(),
  }),
  physicalResistance: z.number().finite().nullable(),
  parseStatus: z.enum(["parsed", "manual"]),
  parseNotes: z.array(z.string()),
  source: z.object({
    provider: z.literal("encore.moe"),
    recordId: z.string().min(1),
  }),
});

export const normalizedEchoesSchema = z.array(normalizedEchoSchema);
export const normalizedTargetsSchema = z.array(normalizedTargetSchema);

const catalogCollections = ["characters", "weapons", "echoes", "targets"] as const;
const collectionNumberRecord = z.object(
  Object.fromEntries(catalogCollections.map((key) => [key, z.number().int().nonnegative()])) as Record<
    (typeof catalogCollections)[number],
    z.ZodNumber
  >,
);
const collectionStringRecord = z.object(
  Object.fromEntries(catalogCollections.map((key) => [key, z.string().min(1)])) as Record<
    (typeof catalogCollections)[number],
    z.ZodString
  >,
);

export const dataManifestSchema = z.object({
  schemaVersion: z.literal(1),
  gameVersion: z.string().min(1),
  fetchedAt: z.iso.datetime(),
  provider: z.object({
    name: z.literal("encore.moe"),
    baseUrl: z.string().min(1),
    language: z.string().min(1),
  }),
  normalizerVersion: z.string().min(1),
  files: collectionStringRecord,
  counts: collectionNumberRecord,
  checksums: collectionStringRecord,
});
