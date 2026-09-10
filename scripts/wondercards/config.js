// 取得元は実行時に追従させず、更新時に全言語の件数・例外を再確認する。
export const UPSTREAM = {
  repository: 'projectpokemon/EventsGallery',
  revision: '154d81be88453f6f78ec1d6d86e85fe0f2f5c240',
  directory: 'Released/Gen 5/Wondercards',
};

export const LANGUAGES = {
  JPN: 'ja',
  ENG: 'en',
  FRE: 'fr',
  GER: 'de',
  ITA: 'it',
  SPA: 'es',
  KOR: 'ko',
};
// 固定リビジョンの全 .pgf 件数。欠落した一覧を正常な削除として反映しない。
export const INPUT_COUNTS = { ja: 472, en: 37, fr: 24, de: 23, it: 24, es: 24, ko: 105 };
export const VERSION_ORDER = ['Black', 'White', 'Black2', 'White2'];
export const VERSION_TOKENS = {
  B: ['Black'],
  W: ['White'],
  B2: ['Black2'],
  W2: ['White2'],
  BW: ['Black', 'White'],
  B2W2: ['Black2', 'White2'],
  BWB2W2: VERSION_ORDER,
};

// キーは UPSTREAM.directory からの相対パス。
// 補正時は { versions?, language?, id?, reason, reference }、除外時は
// { exclude: true, reason, reference } を記録する。全709件の初回調査では例外なし。
export const EXCEPTIONS = {};
export const EXCLUSION_REASONS = {
  item: 'カード種別 2: アイテム配布は個体生成の対象外',
  power: 'カード種別 3: パワー配布は個体生成の対象外',
};

export const FORMAT_REFERENCE =
  'https://projectpokemon.org/home/docs/gen-5/5th-generation-wondercard-map-r2/';
// 非ゼロ PID、レベル0、非ゼロフォーム、特性4は現行の型で表現できない。
// 新規検出時は失敗させ、相対パスと根拠を EXCEPTIONS に登録してから除外する。
