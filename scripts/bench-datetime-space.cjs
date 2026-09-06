// node scripts/bench-datetime-space.cjs <nodejs WASM module> <conditions.json>
// 本番と同じ release 設定の WASM を指定する。初回を除いて各条件を5回計測する。
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const wasm = require(path.resolve(process.argv[2]));
const cases = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
function measure(Type, params, limits) {
  const start = performance.now();
  const searcher = new Type(params);
  let processed = 0n;
  try {
    while (!searcher.is_done) processed = searcher.next_batch(limits).processed_count;
  } finally {
    searcher.free();
  }
  return [performance.now() - start, String(processed)];
}
for (const item of cases) {
  measure(wasm.MtseedDatetimeSearcher, item.mt, 65536);
  measure(wasm.PokemonDatetimeSearcher, item.pokemon, { max_candidates: 65536, max_results: 256 });
  for (let run = 0; run < 5; run++) {
    const mt = measure(wasm.MtseedDatetimeSearcher, item.mt, 65536);
    const pk = measure(wasm.PokemonDatetimeSearcher, item.pokemon, {
      max_candidates: 65536,
      max_results: 256,
    });
    console.log([item.name, run, ...mt, ...pk].join(','));
  }
}
