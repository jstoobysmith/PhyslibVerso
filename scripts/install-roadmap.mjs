#!/usr/bin/env node
/*
 * Install the roadmap page into a built wiki.
 *
 *   node scripts/install-roadmap.mjs [--site <dir>]
 *
 * The roadmap is a standalone page, not a Verso module page, so Verso's
 * literate build does not emit it. This copies its assets into
 * <site>/roadmap/ and (re)generates the data from the site's xref.json by
 * invoking scripts/roadmap-data.mjs. Run it after `lake query :wiki`.
 *
 * Requires Node 18+. No dependencies.
 */

import { mkdir, copyFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const SITE = path.resolve(opt('--site', path.join(REPO, '.lake', 'build', 'literate-html')));
const DEST = path.join(SITE, 'roadmap');

async function exists(p) {
  return access(p).then(() => true, () => false);
}

if (!(await exists(path.join(SITE, 'xref.json')))) {
  console.error(`No xref.json under ${SITE} — run \`lake query :wiki\` first, or pass --site.`);
  process.exit(1);
}

// Regenerate the data straight into the site.
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [
    path.join(REPO, 'scripts', 'roadmap-data.mjs'),
    '--site', SITE,
    '--out', path.join(DEST, 'roadmap-data.json'),
  ], { stdio: 'inherit' });
  child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`roadmap-data.mjs exited ${code}`))));
});

// roadmap-data.mjs created DEST already (via --out); ensure it exists anyway.
await mkdir(DEST, { recursive: true });

const assets = [
  ['static/roadmap.html', 'index.html'],
  ['static/roadmap.js', 'roadmap.js'],
  ['static/d3.v7.min.js', 'd3.v7.min.js'],
];
for (const [src, name] of assets) {
  const from = path.join(REPO, src);
  if (!(await exists(from))) {
    console.error(`Missing ${src} — cannot install the roadmap.`);
    process.exit(1);
  }
  await copyFile(from, path.join(DEST, name));
}

console.error(`Installed roadmap → ${path.relative(REPO, DEST)}/ (index.html, roadmap.js, d3.v7.min.js, roadmap-data.json)`);
