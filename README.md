# PhyslibVerso

> **Disclaimer.** The look and structure of this wiki are based on
> [paperview.org](https://paperview.org/) by Sabrina Pasterski. Please refer to
> [paperview.org](https://paperview.org/) as the original.

A standalone [Verso](https://github.com/leanprover/verso) literate-programming
site generator that renders the
[Physlib](https://github.com/leanprover-community/physlib) library as a physics
wiki: prose from the modules' documentation comments, interleaved with the
(syntax-highlighted, hoverable) Lean code, with a navigation sidebar, per-page
table of contents, search, KaTeX math, and light/dark themes.

This repository carries **no physics content of its own**. Physlib is an
external git dependency (see `lakefile.lean`); pages are rendered directly from
Physlib's source files, so there are no per-page files to write and no
post-processing step. Adding a module to Physlib gives it a page here
automatically on the next build.

## Structure

```
PhyslibVerso/
├── lakefile.lean        # Lake project + the `wiki` package facet (site generator)
├── lean-toolchain       # Lean version, must match Physlib and Verso
├── literate.toml        # Which modules to render, titles, theme, sidebar, …
├── static/
│   ├── wiki.css         # Extra styling (paperview-style furniture)
│   └── wiki.js          # Math, concept links, callouts, "suggest an edit", …
└── .github/workflows/
    └── deploy.yml       # Build and publish to GitHub Pages
```

## What is included

[`literate.toml`](./literate.toml) targets the **whole `Physlib` and
`PhyslibAlpha` libraries**, so every module gets a page automatically.
`PhyslibAlpha` pages carry an orange "Alpha content — not reviewed to the same
extent" notice, injected by `static/wiki.js`.

To give a page a human-readable title (instead of its module name), add:

```toml
[modules."Physlib.ClassicalMechanics.DampedHarmonicOscillator.Basic"]
title = "The damped harmonic oscillator"
```

To publish only a curated list of pages instead of whole libraries, replace the
`[[targets]] library = ...` entries with one `[[targets]] module = "..."` entry
per page. Modules can also be excluded with `exclude = ["Physlib.Meta"]`
(recursive). See the "Literate Programming" chapter of the
[Verso users' guide](https://github.com/leanprover/verso) for ordering the
sidebar, choosing a landing page, hiding commands, and more.

## Pointing at a specific Physlib version

`lakefile.lean` requires Physlib from git at `master`. For reproducible builds,
pin it to a tag or commit instead:

```lean
require Physlib from git "https://github.com/leanprover-community/physlib.git"@"<tag-or-sha>"
```

After changing the pin, run `lake update Physlib`. The `lean-toolchain` here
must match the Physlib revision you point at (both currently
`leanprover/lean4:v4.32.0`).

## Building and viewing locally

From a clean checkout, this single command builds the whole site:

```sh
lake update && lake exe cache get && lake query :wiki
```

The three steps are explained below.

First, resolve dependencies and download the prebuilt mathlib cache (Physlib
depends on mathlib):

```sh
lake update           # fetch verso + Physlib (+ their deps), write lake-manifest.json
lake exe cache get    # download prebuilt mathlib .olean files
```

Then generate the site:

```sh
lake query :wiki
```

The first run is slow (it compiles Verso and any Physlib modules that aren't
cached). On success the command prints the path of the generated site,
`.lake/build/literate-html`. Serve it locally:

```sh
python3 -m http.server 8000 --directory .lake/build/literate-html
```

and open <http://localhost:8000>.

> Opening `index.html` via `file://` mostly works, but search, the roadmap,
> and some hover popups need an HTTP server (they `fetch` JSON), so prefer the
> command above.

To include the roadmap in a local build, run the install step once after
rendering (it reads the site's `xref.json`):

```sh
node scripts/install-roadmap.mjs
```

then reload; the header gains a **Roadmap** link.

## Roadmap

`/roadmap/` is a [paperview-style](https://paperview.org/roadmap/index.html)
radial concept map of **every result** across three sources, whose structure is
the union of their **directory trees**, merged by relative path with siblings
alphabetical:

1. `Physlib` and `PhyslibAlpha` — formalized declarations, read from the built
   site's `xref.json`;
2. [`UnformalizedClaims/`](./UnformalizedClaims/) — **fake test data** in the
   shape of [wiphy.org](https://wiphy.org/): atomic physics claims with arXiv
   provenance, laid out in a Physlib-like file tree. A path present in more
   than one source lands in the same tile, so formalized results and
   unformalized claims sit side by side (e.g.
   `Relativity/LorentzGroup/Basic`).

The composition matches paperview's roadmap: a **phylogenetic tree** of
branches radiating from the hub to a thick coloured **band per area** (name
curved along the band), thinner bands for subdirectories, and outside them one
**tile per file** holding one **dot per declaration/claim**, coloured by source
(Physlib blue, PhyslibAlpha orange, UnformalizedClaims red — validated
colourblind-safe in both modes). Tiles come from a polar treemap, so they stay
near-square; the layout is deterministic (no force-simulation jitter).

An **always-on sidebar** shows, on click:

- **a dot** — the result's name, source badge, path, its *statement* (for
  claims), an "Open in the wiki" link (for formalized results), its
  **Traditional sources** (arXiv links), and *Contribute* actions that open
  prefilled GitHub issues: **suggest a source**, and **suggest a docstring
  edit** (the target repos are the `REPOS` constant at the top of
  [`static/roadmap.js`](./static/roadmap.js));
- **a tile (file)** — the file's docstring (the Lean module's `/-! … -/` block,
  or the claim file's `doc`), source badges, and the same suggest-an-edit
  action.

The header has a search filter, per-source legend toggles, and an explicit
theme toggle (auto → dark → light, persisted). Clicking any band or box
focuses the view on it; the ~10k dots are always visible, and tiles whose
results are mostly PhyslibAlpha or unformalized claims are additionally tinted
by that source. Vendored [D3](./static/d3.v7.min.js) is loaded only on this
page; nothing is fetched from a CDN at runtime.

The data is generated, not hand-written:

```sh
node scripts/roadmap-data.mjs      # merges xref.json + UnformalizedClaims → roadmap-data.json
node scripts/install-roadmap.mjs   # regenerates it + copies the page into the built site
```

`install-roadmap.mjs` is what the deploy workflow runs after `lake query :wiki`;
`roadmap-data.json` (currently ~2.5 MB — 10,060 results, 18 areas) is
git-ignored and rebuilt each time.

## Publishing to GitHub Pages

[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) builds the site
and deploys `.lake/build/literate-html` to GitHub Pages on every push to the
default branch. Enable it under **Settings → Pages → Build and deployment →
Source: GitHub Actions**.

> **Note on size.** Verso embeds the full proof state at every tactic step
> inline in each page, so the generated site can be large. If you hit GitHub's
> size limits, strip proof content from `.lake/build/literate-html` before the
> upload step.

## How it works

- `lakefile.lean` requires `verso` and `Physlib` (both from git).
- It defines a `wiki` package facet — a copy of Verso's `literateHtml` facet,
  adapted to collect modules from the `Physlib` package while reading
  `literate.toml` from this repo and writing output to `.lake/build/literate-html`.
- For each listed module, Verso extracts code, docstrings, and module docstrings
  to JSON (`verso-literate`), plans the site (`verso-literate-plan`), and emits
  the HTML (`verso-literate-html`).

## Site behaviour (`static/wiki.js`)

- **Merged structure.** PhyslibAlpha modules are merged into the same sidebar
  tree and landing sections as Physlib; alpha rows carry an "α" marker.
- **Math.** `$...$`, `$$...$$`, `\(...\)`, and `\[...\]` in docstrings are
  rendered client-side with the KaTeX bundle Verso ships.
- **Concept links.** Inline code mentions of formalized names in prose link to
  where the name is defined (resolved from `xref.json`).
- **Callouts.** `TODO` commands render as blue "Open problem" cards;
  `informal_definition` / `informal_lemma` render as green / purple cards.
- **Suggest an edit.** Every prose block has a hover "✎" button that opens a
  prefilled GitHub issue. The target repository is the `GITHUB_REPO` constant at
  the top of `static/wiki.js`.

## Styling

- Palette overrides live under `[theme]` in `literate.toml`.
- Finer-grained rules live in [`static/wiki.css`](./static/wiki.css), linked
  after Verso's own stylesheet and using Verso's CSS variables so dark mode
  keeps working.

## Things to do

1. **Connect the wiki to [wiphy.org](https://wiphy.org/).** Find the best way to
   link the two: wiki pages to wiphy keywords, and formalized lemmas to the
   corresponding claims. This could be done with the API as part of https://wiphy.org/, 
   but also if necessary via AI. 
2. Have the ability to see those claims which are not associated with anything, and those which are in the halo 
    of Physlib (i.e. could be formalized next).
3. Have a 'reviewed' tag on everything in Physlib but not PhyslibAlpha. 
4. New pages have to be added via adding Lean code to Physlib or PhyslibAlpha. Can we try and do this from the wiki?
5. There should be a graph showing the declerations: 
  - The graph should be similar in style to: 
    https://paperview.org/roadmap/index.html
  - It should have the same philogentic tree structure as paperview.
  - The overall structure should be determined by the 
    file structure of: 
    1. ./Physlib 
    2. ./PhyslibAlpha 
    3. ./UnformalizedClaims (not made yet, but to include 
      essentially the data of: https://wiphy.org in a 
      file structure similar to ./Physlib - we should make some fake data here to test this) 
  - The dots of the graph should correspond to the 
    invidual results in these repositories. 
  - There should be a side bar which is always on. 
  - On clickng a dot, the sidebar should give the relevant information. Part of which should be "Traditional sources". 
  - It should be possible for people to e.g. suggest edits of doc-strings from the graph, or suggest adding sources etc. 
  - On clicking a file the sidebar should show the doc-string of that file.