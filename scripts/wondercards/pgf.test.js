import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cardMetadata, decodeTitle, parsePgf } from './pgf.js';

const source = 'ENG/0129 BWB2W2 - SPR2013 Meloetta (ENG).pgf';
const fixture = (name) => readFile(new URL(`./fixtures/${name}.pgf`, import.meta.url));
const meloetta = await fixture('meloetta');

describe('PGF independent expected values', () => {
  it('通常配布の全項目・省略値・出力メタデータを照合する', () => {
    assert.deepEqual(parsePgf(meloetta, source), {
      language: 'en',
      entry: {
        id: 'en-0129-bwb2w2-spr2013-meloetta-eng',
        cardTitle: 'The Mythical Pokémon Meloetta!',
        versions: ['Black', 'White', 'Black2', 'White2'],
        kind: 'pokemon',
        trainer: { tid: 3013, sid: 0 },
        speciesId: 648,
        level: 50,
        fixedIvs: {},
        fixedAbilitySlot: 'First',
        shinyPolicy: 'Never',
      },
    });
  });
  it('タマゴは固定条件を保持し親のIDを出力しない', async () => {
    assert.deepEqual(
      parsePgf(await fixture('pidove'), 'ENG/0029 BW - (Trainer) Pidove Egg (ENG).pgf').entry,
      {
        id: 'en-0029-bw-trainer-pidove-egg-eng',
        cardTitle: 'A Secret Egg!',
        versions: ['Black', 'White'],
        kind: 'egg',
        speciesId: 519,
        level: 1,
        fixedIvs: { atk: 31 },
        fixedNature: 'Hardy',
        fixedGender: 'Female',
        fixedAbilitySlot: 'Second',
        shinyPolicy: 'Never',
      }
    );
  });
  it('隠れ特性・固定性格・性別を読み取る', async () => {
    const { entry } = parsePgf(await fixture('pikachu'), 'ENG/0100 BW - WORLD12 Pikachu (ENG).pgf');
    assert.deepEqual(entry, {
      id: 'en-0100-bw-world12-pikachu-eng',
      cardTitle: 'Soar to victory!',
      versions: ['Black', 'White'],
      kind: 'pokemon',
      trainer: { tid: 8122, sid: 0 },
      speciesId: 25,
      level: 50,
      fixedIvs: {},
      fixedNature: 'Timid',
      fixedGender: 'Female',
      fixedAbilitySlot: 'Hidden',
      shinyPolicy: 'Never',
    });
  });
  it('色違い固定を読み取る', async () => {
    const { entry } = parsePgf(await fixture('larvitar'), 'ENG/0061 BW - VGC12 Larvitar (ENG).pgf');
    assert.deepEqual(entry, {
      id: 'en-0061-bw-vgc12-larvitar-eng',
      cardTitle: 'Great battles await you!',
      versions: ['Black', 'White'],
      kind: 'pokemon',
      trainer: { tid: 3032, sid: 0 },
      speciesId: 246,
      level: 5,
      fixedIvs: {},
      fixedNature: 'Adamant',
      fixedGender: 'Male',
      fixedAbilitySlot: 'First',
      shinyPolicy: 'Always',
    });
  });
  it('日本語タイトルと実カードの攻撃・素早さ固定を保持する', async () => {
    const { entry } = parsePgf(
      await fixture('genesect'),
      'JPN/0136 BWB2W2 - えいがかん Shiny Genesect (JPN).pgf'
    );
    assert.deepEqual(entry, {
      id: 'ja-0136-bwb2w2-えいがかん-shiny-genesect-jpn',
      cardTitle: 'あかいゲノセクト　プレゼント',
      versions: ['Black', 'White', 'Black2', 'White2'],
      kind: 'pokemon',
      trainer: { tid: 7133, sid: 0 },
      speciesId: 649,
      level: 100,
      fixedIvs: { atk: 31, spe: 31 },
      fixedNature: 'Hasty',
      fixedAbilitySlot: 'First',
      shinyPolicy: 'Always',
    });
  });
});

describe('PGF boundaries', () => {
  it('H/A/B/C/D/S の並びと固定値0・TID/SID 0を保持する', () => {
    const bytes = Buffer.from(meloetta);
    bytes.fill(0, 0, 4);
    bytes.set([0, 1, 2, 5, 3, 4], 0x43);
    const { entry } = parsePgf(bytes, source);
    assert.deepEqual(entry.fixedIvs, { hp: 0, atk: 1, def: 2, spa: 3, spd: 4, spe: 5 });
    assert.deepEqual(entry.trainer, { tid: 0, sid: 0 });
  });
  it('特性ランダム・色違いランダムを明示的に変換する', () => {
    const bytes = Buffer.from(meloetta);
    bytes[0x36] = 3;
    bytes[0x37] = 1;
    const { entry } = parsePgf(bytes, source);
    assert.equal(Object.hasOwn(entry, 'fixedAbilitySlot'), false);
    assert.equal(entry.shinyPolicy, 'Random');
  });
  for (const [offset, value, message] of [
    [0xb3, 0, 'card type'],
    [0x1a, 0xff, 'species'],
    [0x5b, 101, 'level'],
    [0x34, 25, 'nature'],
    [0x35, 3, 'gender'],
    [0x36, 5, 'ability'],
    [0x37, 3, 'shiny'],
    [0x5c, 2, 'egg flag'],
    [0x43, 32, 'IV'],
    [8, 1, 'fixed PID'],
    [0x5b, 0, 'random level'],
    [0x1c, 1, 'form'],
    [0x36, 4, 'random hidden ability'],
  ])
    it(`不正・非対応 ${message} を対象外として隠さない`, () => {
      const bytes = Buffer.from(meloetta);
      bytes[offset] = value;
      assert.throws(() => parsePgf(bytes, source), new RegExp(message));
    });
  it('サイズを切り詰めず拒否する', () => {
    for (const size of [0, 203, 205])
      assert.throws(() => parsePgf(Buffer.alloc(size), source), /size/);
  });
  it('アイテムとパワーには対象外理由を返す', () => {
    for (const type of [2, 3]) {
      const bytes = Buffer.from(meloetta);
      bytes[0xb3] = type;
      assert.match(parsePgf(bytes, source).reason, /対象外/);
    }
  });
  it('異なるTIDの定義を同一にしない', () => {
    const bytes = Buffer.from(meloetta);
    bytes.writeUInt16LE(1);
    assert.notDeepEqual(
      parsePgf(bytes, source).entry.trainer,
      parsePgf(meloetta, source).entry.trainer
    );
  });
});

describe('language, version and IDs', () => {
  for (const [folder, language] of Object.entries({
    JPN: 'ja',
    ENG: 'en',
    FRE: 'fr',
    GER: 'de',
    ITA: 'it',
    SPA: 'es',
    KOR: 'ko',
  })) {
    it(`${folder} を個体言語に依存せず ${language} とする`, () => {
      const bytes = Buffer.from(meloetta);
      bytes[0x1d] = 1;
      assert.equal(parsePgf(bytes, `${folder}/0001 BW - Test.pgf`).language, language);
    });
  }
  for (const [token, versions] of Object.entries({
    B: ['Black'],
    W: ['White'],
    B2: ['Black2'],
    W2: ['White2'],
    BW: ['Black', 'White'],
    B2W2: ['Black2', 'White2'],
    BWB2W2: ['Black', 'White', 'Black2', 'White2'],
  })) {
    it(`${token} を独立トークンとして解釈する`, () =>
      assert.deepEqual(cardMetadata(`ENG/0001 ${token} - BW Name.pgf`).versions, versions));
  }
  it('不明な表記・パスは失敗し、根拠付き例外だけを適用する', () => {
    for (const p of [
      'ENG/0001 BWX - Test.pgf',
      'ENG/0001 - BW.pgf',
      'XX/0001 BW.pgf',
      '../ENG/0001 BW.pgf',
    ]) {
      assert.throws(() => cardMetadata(p));
    }
    const p = 'ENG/0001 Unknown - Test.pgf';
    const override = {
      versions: ['White2', 'Black'],
      language: 'ja',
      id: 'ja-preserved',
      reason: 'Fixture override',
      reference: 'https://example.com/evidence',
    };
    assert.deepEqual(cardMetadata(p, { [p]: override }), {
      language: 'ja',
      id: 'ja-preserved',
      versions: ['Black', 'White2'],
    });
    assert.throws(() => cardMetadata(p, { [p]: { ...override, reason: '' } }), /reason/);
    assert.deepEqual(parsePgf(meloetta, p, { [p]: { ...override, exclude: true } }), {
      language: 'ja',
      reason: 'Fixture override',
    });
  });
  it('Unicode を NFC と小文字へ正規化し、区切りだけをまとめる', () => {
    assert.equal(cardMetadata('JPN/0001 BW - Ｐ２ラボ Café！.pgf').id, 'ja-0001-bw-ｐ２ラボ-café');
  });
});

describe('title decoding', () => {
  it('原文・記号・全角空白を保持し、終端後だけを除去する', () => {
    for (const terminator of ['\uffff', '\0']) {
      assert.equal(
        decodeTitle(Buffer.from(`日本語　Pokémon! 한국어${terminator}trash`, 'utf16le')),
        '日本語　Pokémon! 한국어'
      );
    }
  });
  it('専用の性別文字を対応する記号に復号する', () => {
    assert.equal(decodeTitle(Buffer.from('\u246d\u246e♂♀\uffff', 'utf16le')), '♂♀♂♀');
  });
  it('空・奇数長・未知の専用文字・不正なコードを拒否する', () => {
    for (const s of ['', '　\uffff', '\ue000', '\ud800', '\udc00', '\ufffd', '\u0001']) {
      assert.throws(() => decodeTitle(Buffer.from(s, 'utf16le')));
    }
    assert.throws(() => decodeTitle(Buffer.alloc(1)), /byte length/);
  });
});
