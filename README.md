# PhyslibVerso

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

> Opening `index.html` via `file://` mostly works, but search and some hover
> popups need an HTTP server, so prefer the command above.

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
