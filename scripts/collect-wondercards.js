#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { parseArgs, loadInputs, buildCatalogs, updateCatalogs } from './wondercards/collection.js';

try {
  const options = parseArgs(process.argv.slice(2));
  const inputs = await loadInputs(options);
  const { files, summary } = buildCatalogs(inputs, options.languages);
  for (const [language, stats] of Object.entries(summary)) {
    console.log(
      `${language}: input=${stats.input}, included=${stats.included}, excluded=${stats.excluded}`
    );
    for (const [reason, count] of Object.entries(stats.reasons))
      console.log(`  ${reason}: ${count}`);
  }
  const outputDir = fileURLToPath(
    new URL('../src/data/wondercards/generated/v1/', import.meta.url)
  );
  const diff = await updateCatalogs(outputDir, files, options.languages, options);
  for (const change of diff) console.log(`${change.type}: ${change.path}`);
  console.log(
    diff.length
      ? `${diff.length} file differences${options.check ? ' (check only)' : ' applied'}`
      : 'Catalog matches'
  );
  if (options.check && diff.length) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
