import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  buildCatalogs,
  catalogDiff,
  gitBlobHash,
  loadInputs,
  parseArgs,
  updateCatalogs,
  validateTree,
} from './collection.js';
import { UPSTREAM } from './config.js';

const exec = promisify(execFile);
const bytes = await fs.readFile(new URL('./fixtures/meloetta.pgf', import.meta.url));
const relativePath = 'ENG/0129 BWB2W2 - SPR2013 Meloetta (ENG).pgf';
const counts = { ja: 0, en: 1, fr: 0, de: 0, it: 0, es: 0, ko: 0 };
const tree = () => ({
  truncated: false,
  tree: [
    {
      path: `${UPSTREAM.directory}/${relativePath}`,
      mode: '100644',
      type: 'blob',
      sha: gitBlobHash(bytes),
    },
  ],
});
const inputs = () => [{ relativePath, bytes }];

async function temporary(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'wondercards-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

describe('collection arguments and validation', () => {
  it('オプションを開始前に検証する', () => {
    assert.deepEqual(parseArgs(['--language=ja', '--check']), { check: true, languages: ['ja'] });
    assert.equal(parseArgs(['--input-dir=relative']).inputDir, path.resolve('relative'));
    for (const args of [
      ['--language=jp'],
      ['--check=true'],
      ['--output-dir=x'],
      ['--input-dir='],
      ['--check', '--check'],
    ]) {
      assert.throws(() => parseArgs(args), /option/);
    }
  });
  it('不完全な一覧・不明な言語・重複・シンボリックリンクを拒否する', () => {
    assert.equal(validateTree(tree(), { counts }).length, 1);
    for (const value of [
      { ...tree(), truncated: true },
      { ...tree(), tree: [] },
      { ...tree(), tree: [...tree().tree, ...tree().tree] },
      { ...tree(), tree: [{ ...tree().tree[0], mode: '120000' }] },
      { ...tree(), tree: [{ ...tree().tree[0], path: `${UPSTREAM.directory}/XXX/card.pgf` }] },
    ])
      assert.throws(() => validateTree(value, { counts }));
    assert.throws(
      () => validateTree(tree(), { counts, exceptions: { absent: {} } }),
      /Stale exception/
    );
  });
  it('取得順によらないバイト列を生成し同名別配布を保持する', () => {
    const other = Buffer.from(bytes);
    other.writeUInt16LE(12345);
    const cards = [...inputs(), { relativePath: 'ENG/0129 BWB2W2 - Other.pgf', bytes: other }];
    const first = buildCatalogs(cards, ['en']);
    assert.deepEqual(first, buildCatalogs(cards.toReversed(), ['en']));
    assert.equal(first.files.size, 2);
    for (const content of first.files.values()) {
      assert.ok(content.endsWith('\n') && !content.includes('\r'));
      const catalog = JSON.parse(content);
      assert.equal(catalog.entries.length, 1);
      for (const key of ['source', 'displayName', 'otName', 'language']) {
        assert.equal(Object.hasOwn(catalog, key) || Object.hasOwn(catalog.entries[0], key), false);
      }
      assert.equal(content.includes('null'), false);
    }
  });
  it('ID正規化の衝突を検出し明示IDで解消する', () => {
    const cards = ['ENG/1 BW - A!.pgf', 'ENG/1 BW - A?.pgf'].map((p) => ({
      relativePath: p,
      bytes,
    }));
    assert.throws(() => buildCatalogs(cards, ['en']), /Duplicate card ID/);
    const result = buildCatalogs(cards, ['en'], {
      [cards[1].relativePath]: {
        id: 'en-preserved',
        reason: 'Collision',
        reference: 'https://example.com/evidence',
      },
    });
    assert.equal(result.files.size, 2);
  });
  it('対象外の件数と理由を集計し解析失敗は隠さない', () => {
    const item = Buffer.from(bytes);
    item[0xb3] = 2;
    const result = buildCatalogs([{ relativePath, bytes: item }], ['en']);
    assert.equal(result.summary.en.excluded, 1);
    assert.deepEqual(Object.values(result.summary.en.reasons), [1]);
    assert.throws(() => buildCatalogs([{ relativePath, bytes: Buffer.alloc(1) }], ['en']), /size/);
  });
});

describe('pinned inputs', () => {
  it('一覧と内容を同じSHAから取得しハッシュまで確認する', async () => {
    const urls = [];
    const fetcher = async (url) => {
      urls.push(url);
      return url.includes('api.github') ? Response.json(tree()) : new Response(bytes);
    };
    assert.deepEqual(await loadInputs({ fetcher, counts, languages: ['en'] }), inputs());
    assert.equal(urls.length, 2);
    assert.ok(urls.every((url) => url.includes(UPSTREAM.revision)));
  });
  it('HTTP失敗・欠落一覧・内容差し替え・取得中断を失敗とする', async () => {
    for (const fetcher of [
      async () => new Response('', { status: 404 }),
      async () => Response.json({ ...tree(), truncated: true }),
      async (url) =>
        url.includes('api.github') ? Response.json(tree()) : new Response(Buffer.alloc(204)),
      async (url) => {
        if (url.includes('api.github')) return Response.json(tree());
        throw new Error('Disconnected');
      },
    ])
      await assert.rejects(loadInputs({ fetcher, counts, languages: ['en'] }));
  });
  it('ローカル入力は固定HEADと追跡変更を検査し未追跡カードを含めない', async (t) => {
    const inputDir = await temporary(t);
    const git = (args) => exec('git', ['-C', inputDir, ...args]);
    await git(['init', '-q']);
    const filePath = path.join(inputDir, UPSTREAM.directory, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, bytes);
    await git(['add', '.']);
    await git([
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-qm',
      'Fixture',
    ]);
    const { stdout } = await git(['rev-parse', 'HEAD']);
    const upstream = { ...UPSTREAM, revision: stdout.trim() };
    const fetcher = () => {
      throw new Error('Network must not be used');
    };
    const options = { inputDir, upstream, counts, fetcher, languages: ['en'] };
    await fs.writeFile(path.join(path.dirname(filePath), 'untracked.pgf'), bytes);
    assert.deepEqual(await loadInputs(options), inputs());
    await assert.rejects(loadInputs({ ...options, upstream: UPSTREAM }), /Input HEAD/);
    await fs.writeFile(filePath, Buffer.alloc(204));
    await assert.rejects(loadInputs(options), /Tracked input files/);
    // assume-unchanged で status に出なくても blob の比較で検出する。
    await git(['update-index', '--assume-unchanged', path.relative(inputDir, filePath)]);
    await assert.rejects(loadInputs(options), /blob hash mismatch/);
  });
});

describe('catalog transaction', () => {
  const before = new Map([
    ['en/old.json', 'old\n'],
    ['en/change.json', 'before\n'],
    ['ja/keep.json', 'Japanese\n'],
  ]);
  const after = new Map([
    ['en/new.json', 'new\n'],
    ['en/change.json', 'after\n'],
  ]);
  async function setup(t) {
    const directory = await temporary(t);
    const outputDir = path.join(directory, 'generated', 'v1');
    for (const [name, content] of before) {
      await fs.mkdir(path.dirname(path.join(outputDir, name)), { recursive: true });
      await fs.writeFile(path.join(outputDir, name), content);
    }
    await fs.writeFile(path.join(outputDir, 'en', 'README.md'), 'handwritten');
    return outputDir;
  }
  async function assertUnchanged(outputDir) {
    for (const [name, content] of before)
      assert.equal(await fs.readFile(path.join(outputDir, name), 'utf8'), content);
    await assert.rejects(fs.stat(path.join(outputDir, 'en/new.json')), { code: 'ENOENT' });
  }
  it('--check は追加・変更・削除を報告し書き換えない', async (t) => {
    const outputDir = await setup(t);
    assert.deepEqual(await updateCatalogs(outputDir, after, ['en'], { check: true }), [
      { path: 'en/change.json', type: 'change' },
      { path: 'en/new.json', type: 'add' },
      { path: 'en/old.json', type: 'delete' },
    ]);
    await assertUnchanged(outputDir);
  });
  it('選択言語のJSONのみを更新・削除し再実行は一致する', async (t) => {
    const outputDir = await setup(t);
    await updateCatalogs(outputDir, after, ['en']);
    assert.deepEqual(await catalogDiff(outputDir, after, ['en']), []);
    assert.deepEqual(await updateCatalogs(outputDir, after, ['en']), []);
    assert.equal(await fs.readFile(path.join(outputDir, 'ja/keep.json'), 'utf8'), 'Japanese\n');
    assert.equal(await fs.readFile(path.join(outputDir, 'en/README.md'), 'utf8'), 'handwritten');
    await assert.rejects(fs.stat(path.join(outputDir, 'en/old.json')), { code: 'ENOENT' });
  });
  it('一時出力の作成失敗時にカタログを変更しない', async (t) => {
    const outputDir = await setup(t);
    const io = {
      ...fs,
      writeFile: async () => {
        throw new Error('Disk full');
      },
    };
    await assert.rejects(updateCatalogs(outputDir, after, ['en'], { io }), /Disk full/);
    await assertUnchanged(outputDir);
  });
  for (const failureAt of [1, 2, 3, 4])
    it(`反映${failureAt}回目の失敗で旧JSON全件を復元する`, async (t) => {
      const outputDir = await setup(t);
      let calls = 0;
      const io = {
        ...fs,
        rename: async (...args) => {
          if (++calls === failureAt) throw new Error('Rename failed');
          return fs.rename(...args);
        },
      };
      await assert.rejects(updateCatalogs(outputDir, after, ['en'], { io }), /Rename failed/);
      await assertUnchanged(outputDir);
    });
  it('復元自体が失敗した場合は退避ファイルと復旧先を残す', async (t) => {
    const outputDir = await setup(t);
    let calls = 0;
    const io = {
      ...fs,
      rename: async (...args) => {
        if (++calls > 1) throw new Error('Persistent failure');
        return fs.rename(...args);
      },
    };
    await assert.rejects(updateCatalogs(outputDir, after, ['en'], { io }), /backups retained/);
    assert.equal(
      await fs.readFile(path.join(outputDir, '../.wondercards-update/old/en/change.json'), 'utf8'),
      'before\n'
    );
  });
  it('取得・解析失敗では更新処理に入らない', async (t) => {
    const outputDir = await setup(t);
    for (const fetcher of [
      async () => new Response('', { status: 503 }),
      async (url) =>
        url.includes('api.github') ? Response.json(tree()) : new Response(Buffer.alloc(203)),
    ]) {
      await assert.rejects(
        (async () => {
          const loaded = await loadInputs({ counts, fetcher, languages: ['en'] });
          const result = buildCatalogs(loaded, ['en']);
          await updateCatalogs(outputDir, result.files, ['en']);
        })()
      );
      await assertUnchanged(outputDir);
    }
    assert.throws(() => buildCatalogs([{ relativePath, bytes: Buffer.alloc(204) }], ['en']));
    await assertUnchanged(outputDir);
  });
  it('管理対象外パスと他言語への出力を拒否する', async (t) => {
    const outputDir = await setup(t);
    for (const name of [
      '../escape.json',
      'en/../../escape.json',
      'ja/wrong.json',
      'en/a\\b.json',
    ]) {
      await assert.rejects(
        updateCatalogs(outputDir, new Map([[name, 'bad']]), ['en']),
        /Invalid output path/
      );
    }
    await assertUnchanged(outputDir);
  });
});
