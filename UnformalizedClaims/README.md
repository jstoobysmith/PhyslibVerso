# UnformalizedClaims

**Test data.** A small corpus of atomic physics claims in the shape of
[wiphy.org](https://wiphy.org/) — the claims backend behind PaperView — laid
out in a Physlib-like directory tree so the roadmap can show unformalized
claims alongside formalized Physlib/PhyslibAlpha results in the same boxes.

Two kinds of content:

- **Hand-written examples** (the original files: Friedmann equations, second
  law, time dilation, ...) with real arXiv references.
- **Claims gathered from wiphy.org's public API** (`/api/search`), verbatim,
  with their arXiv provenance and real paper titles from the arXiv API. Several
  of these files sit at *exactly* the path of an existing Physlib module
  (e.g. `Relativity/LorentzAlgebra/Basic`, `QFT/AnomalyCancellation/Basic`),
  so their claims land in the same roadmap box as the formalized results.

Each `*.json` file is one 'module': a `doc` (its docstring) and a list of
`claims`, each with a `name`, a `statement`, and `sources` (traditional
literature references). Replace with a full wiphy.org sync when the
connection in Things-to-do #1 is built.
