#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const resources = {
  character: { listKeys: ["roleList"] },
  weapon: { listKeys: ["weapons"] },
  echo: { listKeys: ["Echo", "phantomsList"] },
  monster: { listKeys: ["monsterList"] },
};

function parseArguments(argv) {
  const values = {
    baseUrl: "https://api-v2.encore.moe/api",
    lang: "zh-Hans",
    output: "api/raw",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (!argument.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`Invalid argument near ${argument}`);
    }
    if (argument === "--resource") values.resource = value;
    else if (argument === "--lang") values.lang = value;
    else if (argument === "--base-url") values.baseUrl = value;
    else if (argument === "--output") values.output = value;
    else throw new Error(`Unknown argument: ${argument}`);
    index += 1;
  }

  if (!values.resource || !(values.resource in resources)) {
    throw new Error("--resource must be one of: character, weapon, echo, monster");
  }
  return values;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchJson(url, retries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json", "user-agent": "wuwa-stat-dilution-data-sync/1" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await delay(250 * 2 ** attempt);
    }
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Failed to fetch ${url} after ${retries + 1} attempts: ${detail}`);
}

async function mapWithConcurrency(values, concurrency, operation) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      await operation(values[index], index);
    }
  });
  await Promise.all(workers);
}

function resourceUrl(baseUrl, lang, resource) {
  const base = baseUrl.replace(/\/+$/, "");
  const localizedBase = base.endsWith(`/${lang}`) ? base : `${base}/${lang}`;
  return `${localizedBase}/${resource}`;
}

function numericSort(left, right) {
  const difference = Number(left) - Number(right);
  return Number.isFinite(difference) && difference !== 0
    ? difference
    : String(left).localeCompare(String(right), "en");
}

export function extractResourceIds(resource, list) {
  const definition = resources[resource];
  if (!definition) throw new Error(`Unknown resource: ${resource}`);
  const listKey = definition.listKeys.find((key) => Array.isArray(list?.[key]));
  if (listKey === undefined) {
    throw new Error(`${resource} list schema drift: missing ${definition.listKeys.join(" or ")}`);
  }
  const records = list[listKey];
  const ids = records.map((record) => record?.Id ?? record?.ItemId);
  if (ids.some((id) => typeof id !== "number" && typeof id !== "string")) {
    throw new Error(`${resource} list schema drift: one or more records have no Id`);
  }
  return ids.map(String).sort(numericSort);
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function fetchResource(options) {
  const url = resourceUrl(options.baseUrl, options.lang, options.resource);
  const list = await fetchJson(url);
  const ids = extractResourceIds(options.resource, list);

  const outputDirectory = path.resolve(options.output, options.resource);
  await mkdir(outputDirectory, { recursive: true });
  await writeJson(path.join(outputDirectory, "_list.json"), list);

  await mapWithConcurrency(ids, 6, async (id) => {
    const detail = await fetchJson(`${url}/${encodeURIComponent(String(id))}`);
    await writeJson(path.join(outputDirectory, `${id}.json`), detail);
  });
  return ids.length;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const count = await fetchResource(options);
    process.stdout.write(`Fetched ${count} ${options.resource} record(s) into ${options.output}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
