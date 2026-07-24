#!/usr/bin/env node
/*
 * Build the roadmap data: the merged Physlib + PhyslibAlpha + UnformalizedClaims
 * declaration tree.
 *
 *   node scripts/roadmap-data.mjs [--site <dir>] [--physlib <dir>]
 *                                 [--claims <dir>] [--out <file>]
 *
 * The roadmap is a phylogenetic tree whose structure is the *union of the three
 * sources' directory trees*, merged by relative path (the module name minus its
 * source prefix) and ordered alphabetically. Every result is a leaf dot:
 *
 *   - Physlib / PhyslibAlpha — public declarations from the built site's
 *     xref.json (authoritative for what the wiki shows), linking to their page.
 *   - UnformalizedClaims — atomic physics claims from ./UnformalizedClaims
 *     (fake wiphy.org-style data), each carrying its traditional (arXiv) sources.
 *
 * Interior "file" nodes (a module in ≥1 source) carry that file's docstring:
 * the first `/-! … -/` block of the Lean source, or the claim file's `doc`.
 *
 * Output (generated, git-ignored): roadmap-data.json.
 *
 * Requires Node 18+. No dependencies.
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const SITE = path.resolve(opt('--site', path.join(REPO, '.lake', 'build', 'literate-html')));
const PKG = path.resolve(opt('--physlib', path.join(REPO, '.lake', 'packages', 'Physlib')));
const CLAIMS = path.resolve(opt('--claims', path.join(REPO, 'UnformalizedClaims')));
const OUT = path.resolve(opt('--out', path.join(REPO, 'roadmap-data.json')));

const LEAN_LIBS = ['Physlib', 'PhyslibAlpha'];
const CLAIMS_SOURCE = 'UnformalizedClaims';

/* ── Load the built-site cross-reference ──────────────────────────── */
const xref = JSON.parse(await readFile(path.join(SITE, 'xref.json'), 'utf8').catch((err) => {
  console.error(`Cannot read ${SITE}/xref.json: ${err.message}\nRun \`lake query :wiki\` first, or pass --site.`);
  process.exit(1);
}));
const xrefConstants = xref['VersoHtml.constant']?.contents ?? {};
const xrefModules = xref['VersoHtml.module']?.contents ?? {};

/* Module → its page address ("/Physlib/…/"), for the "open file" link. */
const moduleAddress = {};
for (const [mod, entries] of Object.entries(xrefModules)) {
  const addr = entries.find((e) => e.address)?.address;
  if (addr) moduleAddress[mod] = addr;
}

/* ── Collect every result (leaf dot) ──────────────────────────────── */
// relPath → { decls: [...], sources: Set, docs: {source: text}, hrefs: {source} }
const files = new Map();
function fileEntry(relPath) {
  if (!files.has(relPath)) files.set(relPath, { decls: [], sources: new Set(), docs: {}, hrefs: {} });
  return files.get(relPath);
}

// Formalized declarations from xref.
for (const [userName, entries] of Object.entries(xrefConstants)) {
  const entry = entries.find((e) => e.data && !e.data.private);
  if (!entry) continue;
  const mod = entry.data.module ?? '';
  const source = mod.split('.', 1)[0];
  if (!LEAN_LIBS.includes(source)) continue;
  const relPath = mod.slice(source.length + 1);
  if (!relPath) continue;
  const f = fileEntry(relPath);
  f.sources.add(source);
  // xref addresses are site-root-relative; the roadmap sits at /roadmap/.
  f.decls.push({
    name: userName,
    source,
    href: '../' + (entry.address ?? '/').replace(/^\//, '') + '#' + entry.id,
  });
}

/* ── Module docstrings (first `/-! … -/`) for Lean files that have decls ── */
function dedent(s) {
  const lines = s.replace(/\t/g, '  ').split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join('\n').trim();
}
function firstModuleDoc(text) {
  const m = text.match(/\/-!([\s\S]*?)-\//);
  return m ? dedent(m[1]) : '';
}
/* Declaration kinds ('def' vs 'thm'), parsed from the Lean source: keyword +
   declared name, keyed by full name and final component. Names that no parse
   reaches fall back to the Lean naming convention (snake_case names state
   results; everything else defines objects). */
const DECL_KIND_RE = /(?:^|\n)[ \t]*(?:@\[[^\]]*\][ \t\n]*)*(?:public[ \t]+|private[ \t]+|protected[ \t]+|noncomputable[ \t]+|unsafe[ \t]+|partial[ \t]+|scoped[ \t]+)*(theorem|lemma|axiom|def|abbrev|structure|class|instance|inductive|opaque)[ \t]+([A-Za-z_][A-Za-z0-9_'.]*)/g;
const THM_KEYWORDS = new Set(['theorem', 'lemma', 'axiom']);
function kindHeuristic(name) {
  const last = name.split('.').pop();
  return /_/.test(last) ? 'thm' : 'def';
}

for (const [relPath, f] of files) {
  for (const source of f.sources) {
    const src = path.join(PKG, source, relPath.split('.').join(path.sep) + '.lean');
    const text = await readFile(src, 'utf8').catch(() => null);
    const kinds = new Map();
    if (text != null) {
      const doc = firstModuleDoc(text);
      if (doc) f.docs[source] = doc;
      for (const m of text.matchAll(DECL_KIND_RE)) {
        const kind = THM_KEYWORDS.has(m[1]) ? 'thm' : 'def';
        if (!kinds.has(m[2])) kinds.set(m[2], kind);
        const last = m[2].split('.').pop();
        if (!kinds.has(last)) kinds.set(last, kind);
      }
    }
    for (const decl of f.decls) {
      if (decl.source !== source) continue;
      decl.kind = kinds.get(decl.name) ?? kinds.get(decl.name.split('.').pop()) ?? kindHeuristic(decl.name);
    }
    const mod = source + '.' + relPath;
    if (moduleAddress[mod]) f.hrefs[source] = '../' + moduleAddress[mod].replace(/^\//, '');
  }
}

/* ── UnformalizedClaims corpus ────────────────────────────────────── */
async function walkJson(dir, base = dir, out = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walkJson(p, base, out);
    else if (e.name.endsWith('.json')) out.push({ file: p, rel: path.relative(base, p).slice(0, -5) });
  }
  return out;
}
for (const { file, rel } of await walkJson(CLAIMS)) {
  const relPath = rel.split(path.sep).join('.');
  let payload;
  try { payload = JSON.parse(await readFile(file, 'utf8')); }
  catch (err) { console.error(`Skipping ${file}: ${err.message}`); continue; }
  const f = fileEntry(relPath);
  f.sources.add(CLAIMS_SOURCE);
  if (payload.doc) f.docs[CLAIMS_SOURCE] = payload.doc;
  for (const c of payload.claims ?? []) {
    f.decls.push({
      name: c.name,
      source: CLAIMS_SOURCE,
      kind: 'claim',
      statement: c.statement ?? '',
      sources: c.sources ?? [],
    });
  }
}

/* ── Build the merged tree ────────────────────────────────────────── */
function makeNode(name, nodePath) {
  return { name, path: nodePath, children: new Map(), file: null };
}
const root = makeNode('root', '');
for (const [relPath, f] of files) {
  const segments = relPath.split('.');
  let node = root;
  let acc = '';
  for (const seg of segments) {
    acc = acc ? acc + '.' + seg : seg;
    if (!node.children.has(seg)) node.children.set(seg, makeNode(seg, acc));
    node = node.children.get(seg);
  }
  node.file = f; // this node is a module in ≥1 source
}

const DOC_PRIORITY = ['Physlib', 'PhyslibAlpha', CLAIMS_SOURCE];
const byName = (a, b) => a.name.localeCompare(b.name, 'en');

function serialize(node) {
  const out = { name: node.name, path: node.path };
  if (node.file) {
    const f = node.file;
    out.sources = DOC_PRIORITY.filter((s) => f.sources.has(s));
    const docSource = DOC_PRIORITY.find((s) => f.docs[s]);
    if (docSource) { out.doc = f.docs[docSource]; out.docSource = docSource; }
    const hrefSource = DOC_PRIORITY.find((s) => f.hrefs[s]);
    if (hrefSource) out.moduleHref = f.hrefs[hrefSource];
    out.decls = f.decls.slice().sort((a, b) =>
      a.source === b.source ? byName(a, b) : a.source.localeCompare(b.source, 'en'));
  }
  const children = [...node.children.values()].sort(byName).map(serialize);
  if (children.length) out.children = children;
  return out;
}

function count(node) {
  let n = node.decls ? node.decls.length : 0;
  for (const c of node.children ?? []) n += count(c);
  return n;
}

const tree = serialize(root);
tree.name = 'Physlib';
const total = count(tree);
const bySource = {};
for (const f of files.values()) for (const d of f.decls) bySource[d.source] = (bySource[d.source] ?? 0) + 1;
const areas = (tree.children ?? []).map((a) => ({ name: a.name, results: count(a) }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

const output = {
  note: 'Generated by scripts/roadmap-data.mjs — do not edit by hand.',
  sources: DOC_PRIORITY,
  stats: { results: total, bySource, areas: areas.length },
  areas,
  tree,
};

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(output) + '\n');
console.error(JSON.stringify({ results: total, bySource, areas: areas.length }, null, 2));
console.error(`Wrote ${path.relative(REPO, OUT)} (${(JSON.stringify(output).length / 1e6).toFixed(2)} MB)`);
