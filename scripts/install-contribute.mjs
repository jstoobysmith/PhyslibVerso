#!/usr/bin/env node
/*
 * Install the contributor guide into a built wiki.
 *
 *   node scripts/install-contribute.mjs [--site <dir>]
 *
 * `/contribute/` is a standalone page (like the roadmap), not a Verso module
 * page, so the literate build does not emit it. This copies it into
 * <site>/contribute/index.html. Run it after `lake query :wiki`.
 *
 * It needs no generated data — the "pages that are asking for it" list on the
 * page is fetched at runtime from `edit-candidates.json`, and the section
 * removes itself if that file is not there (a build without the roadmap step).
 *
 * Requires Node 18+. No dependencies.
 */

import { mkdir, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const SITE = path.resolve(opt('--site', path.join(REPO, '.lake', 'build', 'literate-html')));
const DEST = path.join(SITE, 'contribute');
const SRC = path.join(REPO, 'static', 'contribute.html');

const exists = (p) => access(p).then(() => true, () => false);

if (!(await exists(SITE))) {
  console.error(`No site at ${SITE} — run \`lake query :wiki\` first, or pass --site.`);
  process.exit(1);
}
if (!(await exists(SRC))) {
  console.error('Missing static/contribute.html — cannot install the contributor guide.');
  process.exit(1);
}

await mkdir(DEST, { recursive: true });
await copyFile(SRC, path.join(DEST, 'index.html'));
/* Report a repo-relative path when the site is inside the repo (the usual
   `.lake/build/…` case), and the absolute one otherwise. */
const rel = path.relative(REPO, DEST);
console.error(`Installed contributor guide → ${rel.startsWith('..') ? DEST : rel}/index.html`);
