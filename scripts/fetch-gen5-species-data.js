#!/usr/bin/env node

import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  SPECIES_COUNT,
  buildGen5SpeciesData,
  createPokeApiClient,
  formatSpeciesDataJson,
} from './pokeapi-gen5-species-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const DEFAULT_OUTPUT_PATH = join(ROOT_DIR, 'spec/agent/complete/local_029/gen5-species.json');

function parseArgs(argv) {
  const outputIndex = argv.indexOf('--output');
  return {
    outputPath: outputIndex >= 0 ? argv[outputIndex + 1] : DEFAULT_OUTPUT_PATH,
  };
}

async function main() {
  const { outputPath } = parseArgs(process.argv.slice(2));
  const client = createPokeApiClient();
  let completed = 0;

  console.log(`PokeAPI cache: ${client.cacheDir}`);
  const data = await buildGen5SpeciesData({
    client,
    onProgress: (speciesId) => {
      completed += 1;
      if (completed % 25 === 0 || completed === SPECIES_COUNT) {
        console.log(`Fetched ${completed}/${SPECIES_COUNT} species (#${speciesId})`);
      }
    },
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, formatSpeciesDataJson(data), 'utf8');
  console.log(`Generated: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
