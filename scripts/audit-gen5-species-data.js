#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  SPECIES_COUNT,
  buildGen5SpeciesData,
  collectGen5SpeciesDataDiffs,
  createPokeApiClient,
  formatDiffsAsMarkdown,
} from './pokeapi-gen5-species-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const SPECIES_JSON_PATH = join(ROOT_DIR, 'spec/agent/complete/local_029/gen5-species.json');

async function main() {
  const jsonOutput = process.argv.includes('--json');
  const actualData = JSON.parse(await readFile(SPECIES_JSON_PATH, 'utf8'));
  const client = createPokeApiClient();
  let completed = 0;

  if (!jsonOutput) {
    console.log(`PokeAPI cache: ${client.cacheDir}`);
  }

  const expectedData = await buildGen5SpeciesData({
    client,
    onProgress: (speciesId) => {
      completed += 1;
      if (!jsonOutput && (completed % 25 === 0 || completed === SPECIES_COUNT)) {
        console.log(`Fetched ${completed}/${SPECIES_COUNT} species (#${speciesId})`);
      }
    },
  });

  const diffs = collectGen5SpeciesDataDiffs(actualData, expectedData);
  const diffCount = diffs.abilityDiffs.length + diffs.statDiffs.length + diffs.heldItemDiffs.length;

  if (jsonOutput) {
    console.log(JSON.stringify(diffs, undefined, 2));
  } else if (diffCount === 0) {
    console.log('第5世代種族マスタの特性・種族値・所持アイテム差分はありません。');
  } else {
    console.log(formatDiffsAsMarkdown(diffs));
  }

  process.exitCode = diffCount === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
