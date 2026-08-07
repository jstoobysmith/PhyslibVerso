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

This repository carries **almost no physics content of its own**. Physlib is an
external git dependency (see `lakefile.lean`); pages are rendered directly from
Physlib's source files, so there are no per-page files to write and no
post-processing step. Adding a module to Physlib gives it a page here
automatically on the next build. (The one exception is the small
[`UnformalizedClaims/`](./UnformalizedClaims/) corpus described below.)

## The corpus: one body of physics, at several levels of certainty

For a corpus of knowledge, a node of that corpus should contain a result from physics. It seems useful to have a couple of different types of nodes: 
1. An informal non-reviewed node. 
2. An informal reviewed node. 
3. A formal non-reviewed node. 
4. A formal reviewed node. 
Two different axis here informal--formal and non-reviewed--reviewed.
Associated with each node should be information related to its 
traditional source (e.g. book, paper, stack-exchange post) (if any exist). 

The nodes themselves should be connected somehow. The natural idea would be to form a knowledge-graph. However, unlike in mathematics where such a graph makes concrete sense from the point of view of mathematical dependencies, it does not in physics. 

So instead, it makes sense to think about buckets of nodes, where each bucket corresponds to one high-level concept in physics. This should be at the right level so there is a limit on the number of nodes each bucket can contain (buckets with too many nodes should be split into smaller buckets). 

The buckets themselves can then sit in a knowledge graph, or tree. 

Physlib (corresponding to 4) and PhyslibAlpha (3) are naturally organized like this already. Each file corresponds to a bucket, and the declerations (definitions and lemmas) in each file are the corresponding nodes in that bucket. 

If we organize the claims in [wiphy.org](https://wiphy.org/) into buckets with the same sort of heirarchical structure, this could form the source of nodes for 1. 

Each bucket should have associated with it its own meta-data. This should include an overview of what results live in that bucket, and should ideally be the module doc-string of ./Physlib. The metadata should also include where it sits within the graph of such buckets (which can be derived from the directory structure), and concept references. 

The above describes the underlying archtecture. What we want to sit on top is a way to view and explore this achetecture. There are a couple of ways to do this: 
1. For each bucket show the 'wiki' page containing the bucket overview, 
  and all of the nodes which sit in it. (A first-pass example of this is:  https://jstoobysmith.github.io/PhyslibVerso/Physlib/ClassicalMechanics/Mass/MassUnit/) 
2. A graph which shows the buckets and the nodes which are in them (a first-order pass at this is: https://jstoobysmith.github.io/PhyslibVerso/roadmap/)

It should also be possible to edit the documentation, references etc, of each of these sources from the webview, similar to how it is possible to edit articles on Wikipedia. 



## Structure

```
PhyslibVerso/
├── lakefile.lean        # Lake project + the `wiki` package facet (site generator)
├── lean-toolchain       # Lean version, must match Physlib and Verso
├── literate.toml        # Which modules to render, titles, theme, sidebar, …
├── static/
│   ├── wiki.css         # Extra styling (paperview-style furniture + mobile layout)
│   ├── wiki.js          # Math, concept links, callouts, the wiki editor, …
│   ├── contribute.html  # The standalone /contribute/ guide (no Lean required)
│   ├── roadmap.html     # The standalone /roadmap/ concept map
│   └── roadmap.js       # …and its renderer
├── scripts/
│   ├── roadmap-data.mjs      # xref.json + UnformalizedClaims → roadmap-data.json
│   ├── edit-candidates.mjs   # → edit-candidates.json ("pages that need docs")
│   ├── install-roadmap.mjs   # copies the roadmap into a built site
│   └── install-contribute.mjs # copies the contributor guide into a built site
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

The two standalone pages — the roadmap and the contributor guide — are not
Verso module pages, so `lake query :wiki` does not emit them. Install them
after rendering (the roadmap step reads the site's `xref.json`):

```sh
node scripts/install-roadmap.mjs      # → /roadmap/  (+ edit-candidates.json)
node scripts/install-contribute.mjs   # → /contribute/
```

then reload; the header gains **Contribute** and **Roadmap** links. Run the
roadmap step first: the contributor guide's "pages that are asking for it"
list reads the `edit-candidates.json` it produces (and hides itself if it is
missing).

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
- **Collapsible sidebar.** A header toggle shows/hides the navigation at every
  screen size — it collapses the docked sidebar (reflowing the article) on
  desktop and drives an overlay drawer on phones; the state is persisted.
- **Home page for contributors.** The landing page leads with what the wiki
  needs: a "this needs physicists, not Lean users" callout, a three-step
  *find a page → press Edit → press Propose* strip, and a **Start here: pages
  that need documentation** table ranked by declarations per docstring character
  (lots of formalized results, little prose), with a *Pick one for me* button.
  The table is generated by [`scripts/edit-candidates.mjs`](./scripts/edit-candidates.mjs)
  (from `roadmap-data.json`) into `edit-candidates.json` at the site root, which
  `install-roadmap.mjs` produces during the build. Below it, a leaderboard of
  people who have opened the most `documentation` issues.
- **Math.** `$...$`, `$$...$$`, `\(...\)`, and `\[...\]` in docstrings are
  rendered client-side with the KaTeX bundle Verso ships.
- **Concept links.** Inline code mentions of formalized names in prose link to
  where the name is defined (resolved from `xref.json`).
- **Callouts.** `TODO` commands render as blue "Open problem" cards;
  `informal_definition` / `informal_lemma` render as green / purple cards.
- **"New to Lean?" decoder ring.** Every article opens with a collapsible
  phrasebook — `def`, `theorem`, `:=`, `(x : ℝ)`, `∀` — that says which parts of
  the page are prose (yours to edit) and which are machine-checked (safe to
  skip). Its open/closed state is remembered.
- **"Help improve this page".** Every article ends with five one-tap actions,
  none of which need Lean: *improve the overview* (opens the editor on the
  page's first prose block), *suggest a reference*, *explain the notation*,
  *report an error*, *ask a question*. The last four open a prefilled GitHub
  issue from a template, so a reader who cannot write the fix can still report
  what is missing.
- **Edit the docs (wiki-style).** Every prose block carries a visible "✎ Edit"
  button. The page **overview** — the first un-indented `mod-doc` block, i.e.
  the module docstring rather than one of its section headers or a declaration
  docstring — instead gets a full-width invitation, *"Know this area? Add a
  brief overview of the physics here to help us improve"*, since it is the block
  worth the most to a reader and the one most often empty. Its wording switches
  to *"Help us improve the overview"* once the page has more than ~240
  characters of prose, so a well-documented page is not asked for an overview it
  already has. Both open an editor with three tabs — a **Visual** (WYSIWYG) surface
  with a formatting toolbar, a **Markdown** source view, and a **Preview** that
  renders the result with KaTeX — all kept in sync. The rendered HTML is
  serialized back to Markdown by the `mdBlocks` serializer (the same one that
  reconstructs the docstring source), so the tabs round-trip. Around that:
  - a first-run panel spelling out the three steps and what happens afterwards,
    folded away once seen;
  - a `$…$` **maths** toolbar button, and toolbar buttons that also work on the
    Markdown tab by wrapping the selection;
  - **draft autosave** to `localStorage`, offered back when the editor reopens
    (an Edit button with an unsent draft carries an orange dot);
  - an optional **"Why this change?"** line, which leads the issue body.

  Submitting opens a prefilled GitHub issue with the reason and a diff of the
  change for a maintainer to review; the target repository is the `GITHUB_REPO`
  constant at the top of `static/wiki.js`.

## Mobile

Verso's desktop layout pins the page to the viewport (`body { height: 100dvh;
overflow: hidden }`) and scrolls the article inside `.code-content`. That model
does not survive on a phone — anything taller than the fixed body is simply
clipped, with no way to reach it. Below 768px, `static/wiki.css` therefore:

- unpins `html`/`body`/`.layout`/`.code-content` so the **document** scrolls the
  way a normal web page does, and makes the header `position: sticky`;
- gives `.main-area`, `.content-wrapper` and `.code-content` `min-width: 0`, so
  a wide imports block or proof line no longer inflates the article column to
  ~800px (a flex item will not otherwise shrink below its min-content width),
  and gives those blocks their own horizontal scrollers instead;
- turns the sidebar into an overlay drawer docked below the sticky header, with
  a scrim, a scroll lock, an ✕ state on the toggle, and *closed* as the phone
  default (the docked/open state is only persisted on desktop, so tapping a
  page link never leaves the drawer covering the next page);
- enlarges nav rows, header controls and secondary links to tappable sizes,
  raises body copy to 15px, left-aligns the justified prose, moves the "✎ Edit"
  button below its block (there is no hover to reveal it), starts the page's
  table of contents folded, and turns the editor into a full-screen sheet with
  16px fields (below that, iOS Safari zooms on focus).

The roadmap gets the same treatment: the sidebar becomes a bottom sheet that
expands when you tap a dot, the hints are rewritten for touch, and its controls
grow to tappable sizes.

The layout is checked at 320/375/390/412/768/1024/1440px with headless Chrome —
no horizontal page scroll at any width, on the landing page, article pages, the
search page, the roadmap and the contributor guide.

## Contributing to the wiki (`/contribute/`)

[`static/contribute.html`](./static/contribute.html) is a standalone guide
written for a physicist who has never seen Lean. It covers what the wiki is and
what it is missing, an explicit split of *what you can change today* versus
*what needs Lean* (with the "ask instead" route for the latter), the six-step
first edit, before/after examples of a good page overview, a Markdown + LaTeX +
citation cheat sheet, the six pieces of Lean syntax worth recognising, a menu
of tasks graded by how long they take, a live list of the pages most starved of
documentation, what happens after you submit, and an FAQ.

`scripts/install-contribute.mjs` copies it to `<site>/contribute/index.html`;
the deploy workflow runs it after the roadmap step.

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