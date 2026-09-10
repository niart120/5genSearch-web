import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { UPSTREAM, LANGUAGES, INPUT_COUNTS, EXCEPTIONS } from './config.js';
import { cardMetadata, parsePgf } from './pgf.js';

const exec = promisify(execFile);
export const comparePaths = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const allLanguages = Object.values(LANGUAGES);

export function parseArgs(args) {
  const options = { check: false, languages: allLanguages };
  const seen = new Set();
  for (const arg of args) {
    const [name, ...parts] = arg.split('=');
    const value = parts.join('=');
    if (seen.has(name)) throw new Error(`Duplicate option: ${name}`);
    seen.add(name);
    if (arg === '--check') options.check = true;
    else if (name === '--language' && allLanguages.includes(value)) options.languages = [value];
    else if (name === '--input-dir' && value) options.inputDir = path.resolve(value);
    else throw new Error(`Unknown or invalid option: ${arg}`);
  }
  return options;
}

export function gitBlobHash(bytes) {
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

export function validateTree(
  tree,
  { upstream = UPSTREAM, counts = INPUT_COUNTS, exceptions = EXCEPTIONS } = {}
) {
  if (tree.truncated !== false || !Array.isArray(tree.tree))
    throw new Error('Incomplete upstream file tree');
  const prefix = `${upstream.directory}/`;
  const files = tree.tree.filter(
    (file) => file.path?.startsWith(prefix) && file.path.endsWith('.pgf')
  );
  const paths = new Set();
  const observed = Object.fromEntries(allLanguages.map((language) => [language, 0]));
  for (const file of files) {
    const relativePath = file.path.slice(prefix.length);
    if (
      file.type !== 'blob' ||
      file.mode !== '100644' ||
      !/^[a-f0-9]{40}$/.test(file.sha) ||
      paths.has(relativePath)
    ) {
      throw new Error(`Invalid upstream file: ${file.path}`);
    }
    cardMetadata(relativePath, exceptions);
    paths.add(relativePath);
    observed[LANGUAGES[relativePath.split('/')[0]]]++;
  }
  for (const language of allLanguages) {
    if (observed[language] !== counts[language])
      throw new Error(
        `Incomplete ${language} input: expected ${counts[language]}, got ${observed[language]}`
      );
  }
  for (const relativePath of Object.keys(exceptions)) {
    if (!paths.has(relativePath)) throw new Error(`Stale exception: ${relativePath}`);
  }
  return files.toSorted((a, b) => comparePaths(a.path, b.path));
}

async function fetchResponse(url, fetcher) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response;
}

async function git(inputDir, args) {
  const { stdout } = await exec('git', ['-C', inputDir, ...args], { maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

async function assertCheckout(inputDir, upstream) {
  const head = (await git(inputDir, ['rev-parse', 'HEAD'])).trim();
  if (head !== upstream.revision)
    throw new Error(`Input HEAD must be ${upstream.revision}, got ${head}`);
  const status = await git(inputDir, [
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=no',
    '--',
    upstream.directory,
  ]);
  if (status) throw new Error('Tracked input files have changes');
}

/** 全件の列挙を検証した後、選択言語の内容を取得し Git blob のハッシュで照合する。 */
export async function loadInputs({
  inputDir,
  languages = allLanguages,
  fetcher = fetch,
  upstream = UPSTREAM,
  counts = INPUT_COUNTS,
  exceptions = EXCEPTIONS,
} = {}) {
  let tree;
  if (inputDir) {
    await assertCheckout(inputDir, upstream);
    const listing = await git(inputDir, [
      'ls-tree',
      '-rz',
      '--full-tree',
      'HEAD',
      '--',
      upstream.directory,
    ]);
    tree = {
      truncated: false,
      tree: listing
        .split('\0')
        .filter(Boolean)
        .map((line) => {
          const match = /^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/.exec(line);
          if (!match) throw new Error('Invalid git tree output');
          return { mode: match[1], type: match[2], sha: match[3], path: match[4] };
        }),
    };
  } else {
    const response = await fetchResponse(
      `https://api.github.com/repos/${upstream.repository}/git/trees/${upstream.revision}?recursive=1`,
      fetcher
    );
    tree = await response.json();
  }
  const files = validateTree(tree, { upstream, counts, exceptions }).filter((file) =>
    languages.includes(
      cardMetadata(file.path.slice(upstream.directory.length + 1), exceptions).language
    )
  );
  const inputs = Array.from({ length: files.length });
  let next = 0;
  const results = await Promise.allSettled(
    Array.from({ length: Math.min(8, files.length) }, async () => {
      while (next < files.length) {
        const index = next++;
        const file = files[index];
        let bytes;
        if (inputDir) {
          const filePath = path.join(inputDir, file.path);
          if (!(await fs.lstat(filePath)).isFile())
            throw new Error(`Input is not a regular file: ${file.path}`);
          bytes = await fs.readFile(filePath);
        } else {
          const encodedPath = file.path.split('/').map(encodeURIComponent).join('/');
          const response = await fetchResponse(
            `https://raw.githubusercontent.com/${upstream.repository}/${upstream.revision}/${encodedPath}`,
            fetcher
          );
          bytes = Buffer.from(await response.arrayBuffer());
        }
        if (gitBlobHash(bytes) !== file.sha)
          throw new Error(`Input blob hash mismatch: ${file.path}`);
        inputs[index] = { relativePath: file.path.slice(upstream.directory.length + 1), bytes };
      }
    })
  );
  const failed = results.find((result) => result.status === 'rejected');
  if (failed) throw failed.reason;
  if (inputDir) await assertCheckout(inputDir, upstream);
  return inputs;
}

export function buildCatalogs(inputs, languages = allLanguages, exceptions = EXCEPTIONS) {
  const files = new Map();
  const ids = new Set();
  const summary = Object.fromEntries(
    languages.map((language) => [language, { input: 0, included: 0, excluded: 0, reasons: {} }])
  );
  for (const { relativePath, bytes } of inputs.toSorted((a, b) =>
    comparePaths(a.relativePath, b.relativePath)
  )) {
    const result = parsePgf(bytes, relativePath, exceptions);
    const stats = summary[result.language];
    if (!stats) throw new Error(`Unexpected language: ${relativePath}`);
    stats.input++;
    if (result.reason) {
      stats.excluded++;
      stats.reasons[result.reason] = (stats.reasons[result.reason] ?? 0) + 1;
    } else {
      if (ids.has(result.entry.id)) throw new Error(`Duplicate card ID: ${result.entry.id}`);
      ids.add(result.entry.id);
      stats.included++;
      files.set(
        `${result.language}/${result.entry.id}.json`,
        `${JSON.stringify({ entries: [result.entry] }, undefined, 2)}\n`
      );
    }
  }
  return { files: new Map([...files].sort(([a], [b]) => comparePaths(a, b))), summary };
}

async function optionalStat(filePath) {
  try {
    return await fs.lstat(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function assertDirectory(directory) {
  const stat = await optionalStat(directory);
  if (stat && !stat.isDirectory())
    throw new Error(`Output is not a regular directory: ${directory}`);
  const parent = path.dirname(directory);
  if (parent !== directory) await assertDirectory(parent);
}

export async function catalogDiff(outputDir, files, languages) {
  await assertDirectory(outputDir);
  const oldFiles = new Map();
  for (const language of languages) {
    if (!allLanguages.includes(language)) throw new Error(`Invalid output language: ${language}`);
    const directory = path.join(outputDir, language);
    await assertDirectory(directory);
    if (!(await optionalStat(directory))) continue;
    for (const name of await fs.readdir(directory)) {
      if (!name.endsWith('.json')) continue;
      const filePath = path.join(directory, name);
      if (!(await fs.lstat(filePath)).isFile())
        throw new Error(`Output is not a regular file: ${filePath}`);
      oldFiles.set(`${language}/${name}`, await fs.readFile(filePath, 'utf8'));
    }
  }
  for (const relativePath of files.keys()) {
    const [language, name, extra] = relativePath.split('/');
    if (
      !languages.includes(language) ||
      extra !== undefined ||
      !/^[\p{L}\p{N}-]+\.json$/u.test(name)
    ) {
      throw new Error(`Invalid output path: ${relativePath}`);
    }
  }
  return [...new Set([...oldFiles.keys(), ...files.keys()])]
    .sort(comparePaths)
    .flatMap((relativePath) => {
      const before = oldFiles.get(relativePath);
      const after = files.get(relativePath);
      return before === after
        ? []
        : [
            {
              path: relativePath,
              type: before === undefined ? 'add' : after === undefined ? 'delete' : 'change',
            },
          ];
    });
}

/** 一時出力を完成させてから反映する。反映失敗時は退避した JSON を戻す。 */
export async function updateCatalogs(outputDir, files, languages, { check = false, io = fs } = {}) {
  const initialDiff = await catalogDiff(outputDir, files, languages);
  if (check || !initialDiff.length) return initialDiff;
  const parent = path.dirname(outputDir);
  await fs.mkdir(parent, { recursive: true });
  const lock = path.join(parent, '.wondercards-update');
  // この処理専用に作成できたディレクトリだけを後で削除する。
  await fs.mkdir(lock);
  let preserveBackup = false;
  try {
    const diff = await catalogDiff(outputDir, files, languages);
    for (const [relativePath, content] of files) {
      const staged = path.join(lock, 'new', relativePath);
      await fs.mkdir(path.dirname(staged), { recursive: true });
      await io.writeFile(staged, content, 'utf8');
    }
    const backedUp = [];
    const installed = [];
    try {
      for (const change of diff) {
        const target = path.join(outputDir, change.path);
        if (change.type !== 'add') {
          const backup = path.join(lock, 'old', change.path);
          await fs.mkdir(path.dirname(backup), { recursive: true });
          await io.rename(target, backup);
          backedUp.push(change.path);
        }
        if (change.type !== 'delete') {
          await fs.mkdir(path.dirname(target), { recursive: true });
          await io.rename(path.join(lock, 'new', change.path), target);
          installed.push(change.path);
        }
      }
    } catch (error) {
      const failures = [];
      for (const relativePath of installed.toReversed()) {
        try {
          await io.unlink(path.join(outputDir, relativePath));
        } catch (failure) {
          failures.push(failure);
        }
      }
      for (const relativePath of backedUp.toReversed()) {
        try {
          await io.rename(path.join(lock, 'old', relativePath), path.join(outputDir, relativePath));
        } catch (failure) {
          failures.push(failure);
        }
      }
      if (failures.length) {
        preserveBackup = true;
        throw new AggregateError(
          [error, ...failures],
          `Restore failed; backups retained at ${lock}`
        );
      }
      throw error;
    }
    return diff;
  } finally {
    if (!preserveBackup) await fs.rm(lock, { recursive: true });
  }
}
