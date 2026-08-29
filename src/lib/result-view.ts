import type {
  EggDatetimeSearchResult,
  GeneratedEggData,
  GeneratedPokemonData,
  UiEggData,
  UiPokemonData,
} from '@/wasm/wasm_pkg.js';

export interface ResultView<TRaw, TUi> {
  readonly raw: TRaw;
  readonly ui: TUi;
}

export type PokemonListResultView = ResultView<GeneratedPokemonData, UiPokemonData>;

export type EggListResultView = ResultView<GeneratedEggData, UiEggData>;

export type EggSearchResultView = ResultView<EggDatetimeSearchResult, UiEggData>;
