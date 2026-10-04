export type ParseStatus = "parsed" | "manual";

export type ScalingStat = "atk" | "hp" | "def";

export type DamageCategory =
  | "basic"
  | "heavy"
  | "skill"
  | "liberation"
  | "intro"
  | "outro"
  | "echo"
  | "other";

export interface CatalogLabel {
  id: string;
  name: string;
}

export interface NormalizedActionLevel {
  level: number;
  source: string;
  hits: number[];
}

export interface NormalizedAction {
  id: string;
  skillId: string;
  name: string;
  category: DamageCategory;
  damageType: string;
  scalingStat: ScalingStat;
  element: string;
  entryNumber: number;
  levels: NormalizedActionLevel[];
  parseStatus: ParseStatus;
  parseNotes: string[];
}

export interface NormalizedCharacter {
  id: string;
  name: string;
  quality: number;
  element: CatalogLabel;
  weaponType: CatalogLabel;
  iconUrl: string | null;
  level90: {
    hp: number;
    atk: number;
    def: number;
    critRate: number;
    critDamage: number;
  };
  actions: NormalizedAction[];
  source: {
    provider: "encore.moe";
    recordId: string;
  };
}

export interface NormalizedWeaponEffectParameter {
  index: number;
  sources: string[];
  values: number[];
}

export interface NormalizedWeapon {
  id: string;
  name: string;
  quality: number;
  weaponType: CatalogLabel;
  iconUrl: string | null;
  level90BaseAtk: number;
  secondaryStat: {
    name: string;
    value: number;
    source: string;
  } | null;
  effect: {
    name: string;
    sourceText: string;
    resonanceRankLimit: number;
    parameters: NormalizedWeaponEffectParameter[];
    parseStatus: ParseStatus;
    parseNotes: string[];
  };
  source: {
    provider: "encore.moe";
    recordId: string;
  };
}

export interface NormalizedEchoSet {
  id: string;
  name: string;
  effectId: string | null;
  sourceText: string | null;
  parameters: string[];
}

export interface NormalizedEcho {
  id: string;
  itemId: string;
  name: string;
  quality: number;
  phantomType: number;
  intensity: string;
  element: CatalogLabel;
  iconUrl: string | null;
  skill: {
    id: string;
    cooldown: number;
    sourceText: string;
    levelParameters: string[][];
    parseStatus: ParseStatus;
    parseNotes: string[];
  };
  sets: NormalizedEchoSet[];
  source: {
    provider: "encore.moe";
    recordId: string;
  };
}

export type ElementKey = "glacio" | "fusion" | "electro" | "aero" | "spectro" | "havoc";

export interface NormalizedTarget {
  id: string;
  name: string;
  rarity: string;
  rarityId: number;
  iconUrl: string | null;
  defaultLevel: number;
  level90: {
    hp: number | null;
    atk: number | null;
    def: number | null;
  };
  resistances: Record<ElementKey, number | null>;
  physicalResistance: number | null;
  parseStatus: ParseStatus;
  parseNotes: string[];
  source: {
    provider: "encore.moe";
    recordId: string;
  };
}

export type CatalogCollection = "characters" | "weapons" | "echoes" | "targets";

export interface DataManifest {
  schemaVersion: 1;
  gameVersion: string;
  fetchedAt: string;
  provider: {
    name: "encore.moe";
    baseUrl: string;
    language: string;
  };
  normalizerVersion: string;
  files: Record<CatalogCollection, string>;
  counts: Record<CatalogCollection, number>;
  checksums: Record<CatalogCollection, string>;
}
