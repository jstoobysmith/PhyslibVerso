/* Physlib roadmap — a paperview-style radial concept map of every result.
 *
 * Structure is the union of three sources' directory trees, merged by relative
 * path (siblings alphabetical): Physlib and PhyslibAlpha (formalized
 * declarations, from xref.json) and UnformalizedClaims (wiphy-style claims
 * with traditional sources). Composition, matching paperview.org/roadmap:
 *   - centre: a phylogenetic tree of branches, hub → area → subdirectories;
 *   - a thick coloured band per top-level area, its name curved along it;
 *   - outside the band: one tile per FILE (polar treemap, so tiles stay
 *     near-square), holding one dot per DECLARATION, coloured by source.
 * Layout is deterministic — the same data always yields the same map.
 * Data: scripts/roadmap-data.mjs.
 *
 * Clicking a dot or a tile fills the always-on sidebar (statement, docstring,
 * traditional sources, suggest-an-edit / suggest-a-source actions).
 */
(function () {
  'use strict';

  /* Where "suggest an edit / add a source" issues are filed, per source.
     UnformalizedClaims lives in this wiki repo; the Lean libraries upstream.
     Adjust to match your forks. */
  var REPOS = {
    Physlib: 'leanprover-community/physlib',
    PhyslibAlpha: 'leanprover-community/physlib',
    UnformalizedClaims: 'leanprover-community/physlib'
  };
  var SOURCE_FILE = {
    Physlib: function (p) { return 'Physlib/' + p.split('.').join('/') + '.lean'; },
    PhyslibAlpha: function (p) { return 'PhyslibAlpha/' + p.split('.').join('/') + '.lean'; },
    UnformalizedClaims: function (p) { return 'UnformalizedClaims/' + p.split('.').join('/') + '.json'; }
  };
  var SOURCE_LABEL = { Physlib: 'Physlib', PhyslibAlpha: 'PhyslibAlpha', UnformalizedClaims: 'Unformalized claim' };
  var SOURCE_CLASS = { Physlib: 'physlib', PhyslibAlpha: 'alpha', UnformalizedClaims: 'claims' };

  var svg = d3.select('#rm-svg');
  var sidebar = document.getElementById('rm-sidebar');
  var countEl = document.getElementById('rm-count');
  var searchInput = document.getElementById('rm-search-input');

  /* Explicit theme override (auto → dark → light), persisted. */
  var themeBtn = document.getElementById('rm-theme-btn');
  try {
    var saved = localStorage.getItem('rm-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  } catch (e) { /* private mode */ }
  function themeLabel() {
    var t = document.documentElement.getAttribute('data-theme');
    themeBtn.textContent = t === 'dark' ? 'Dark' : t === 'light' ? 'Light' : 'Auto';
  }
  var loadedData = null;
  if (themeBtn) {
    themeLabel();
    themeBtn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'dark' ? 'light' : cur === 'light' ? null : 'dark';
      if (next) document.documentElement.setAttribute('data-theme', next);
      else document.documentElement.removeAttribute('data-theme');
      try {
        if (next) localStorage.setItem('rm-theme', next);
        else localStorage.removeItem('rm-theme');
      } catch (e) { /* private mode */ }
      themeLabel();
      if (loadedData) { svg.selectAll('*').remove(); render(loadedData); }
    });
  }

  d3.json('roadmap-data.json').then(function (data) {
    loadedData = data;
    render(data);
  }).catch(function (err) {
    sidebar.innerHTML = '<div class="rm-help">Could not load roadmap-data.json — run ' +
      '<code>scripts/roadmap-data.mjs</code>.</div>';
    console.error(err);
  });

  /* Transform the merged tree for the treemap: directories stay internal nodes;
     every file (a module with declarations) becomes a leaf CELL carrying its
     declarations. A file that is also a directory (has child modules) gets its
     cell added as an extra child alongside them. */
  function cellData(node) {
    return {
      name: node.name, path: node.path, cell: true, decls: node.decls || [],
      doc: node.doc, docSource: node.docSource, sources: node.sources, moduleHref: node.moduleHref
    };
  }
  function toCells(node) {
    var kids = (node.children || []).map(toCells);
    if (node.decls) {
      if (kids.length) { kids.unshift(cellData(node)); return { name: node.name, path: node.path, children: kids }; }
      return cellData(node);
    }
    return { name: node.name, path: node.path, children: kids };
  }

  function render(data) {
    countEl.textContent = data.stats.results.toLocaleString() + ' results · ' +
      data.stats.areas + ' areas · ' + data.sources.length + ' sources';
    renderDefault(data);

    var dark = themeDark();

    /* Radial geometry: an empty hub holding the phylogenetic tree
       (hub → area → subdirectory branches), and an outer annulus where each
       file is a tile and its declarations a polar grid of dots. Tiles come
       from a polar treemap: each node's annular region is split among its
       children by weight, along whichever dimension (arc or radius) is
       longer, so cells stay near-square like the reference. */
    var HUB = 70;
    var TREE_STEP = 175;      // radial distance per directory depth for tree nodes
    var TREE_MAX = 980;       // tree nodes never pass this radius
    var BAND_IN = 985;        // area band (thick coloured arc with the name)
    var BAND_OUT = 1105;
    var CELL_IN = 1140;       // inner radius of the file-tile annulus
    var R_OUT = 2600;         // outer rim
    var AGAP = 0.012;         // angular gap between areas (radians)

    var root = d3.hierarchy(toCells(data.tree))
      .sum(function (d) { return d.cell ? Math.max((d.decls && d.decls.length) || 0, 1) : 0; })
      .sort(function (a, b) { return d3.ascending(a.data.name, b.data.name); });

    var areas = root.children || [];
    areas.forEach(function (a, i) { a._hue = i / areas.length * 360; });
    function areaOf(d) { var n = d; while (n.depth > 1) n = n.parent; return n.depth === 1 ? n : null; }
    function hueOf(d) { var a = areaOf(d); return a ? a._hue : 0; }
    function branchColor(d) {
      var h = hueOf(d);
      return (dark ? d3.hsl(h, 0.45, 0.55) : d3.hsl(h, 0.55, 0.55)).formatHex();
    }
    function cellFill(d) {
      if (d._dom === 'PhyslibAlpha') return dark ? '#4a3018' : '#f9e0cb';
      if (d._dom === 'UnformalizedClaims') return dark ? '#4c2027' : '#f7dbdb';
      var h = hueOf(d);
      return (dark ? d3.hsl(h, 0.42, 0.19) : d3.hsl(h, 0.50, 0.90)).formatHex();
    }

    /* ── Polar treemap: assign every node an annular region ──────── */
    function assign(node, a0, a1, r0, r1) {
      node._a0 = a0; node._a1 = a1; node._r0 = r0; node._r1 = r1;
      if (!node.children) return;
      /* Inset directory groups a little so sibling groups read as separate
         clusters of tiles, like the reference. */
      if (node.depth >= 1) {
        var ia = Math.min(0.004, (a1 - a0) * 0.04), ir = Math.min(12, (r1 - r0) * 0.04);
        a0 += ia; a1 -= ia; r0 += ir; r1 -= ir;
      }
      /* Every directory below the areas gets its own band, name curved along
         it, at the inner edge of its region — as long as radial space allows. */
      if (node.depth >= 2 && (r1 - r0) > 200) {
        var bh = node.depth === 2 ? 52 : 42;
        node._band = { a0: a0, a1: a1, r0: r0, r1: r0 + bh };
        r0 += bh + 10;
      }
      tile(node.children.slice(), a0, a1, r0, r1);
    }
    function tile(items, a0, a1, r0, r1) {
      if (!items.length) return;
      if (items.length === 1) { assign(items[0], a0, a1, r0, r1); return; }
      var total = d3.sum(items, function (c) { return c.value; }) || 1;
      var half = total / 2, acc = 0, cut = 1;
      for (var i = 0; i < items.length - 1; i++) {
        acc += items[i].value;
        if (acc >= half) { cut = i + 1; break; }
      }
      var L = items.slice(0, cut), Rg = items.slice(cut);
      var wL = d3.sum(L, function (c) { return c.value; }) / total;
      var arcLen = (a1 - a0) * (r0 + r1) / 2, radLen = r1 - r0;
      if (arcLen >= radLen) {
        var aMid = a0 + (a1 - a0) * wL;
        tile(L, a0, aMid, r0, r1); tile(Rg, aMid, a1, r0, r1);
      } else {
        var rMid = Math.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * wL);
        tile(L, a0, a1, r0, rMid); tile(Rg, a0, a1, rMid, r1);
      }
    }
    /* Area angular spans proportional to weight, separated by AGAP. */
    var totalW = d3.sum(areas, function (a) { return a.value; }) || 1;
    var usable = 2 * Math.PI - areas.length * AGAP;
    var angle = 0;
    areas.forEach(function (a) {
      var span = a.value / totalW * usable;
      assign(a, angle, angle + span, CELL_IN, R_OUT);
      angle += span + AGAP;
    });

    var dirs = root.descendants().filter(function (d) { return d.depth >= 1 && d.children; });
    var cells = root.leaves().filter(function (d) { return d.data.cell; });

    function dirR(d) { return Math.min(HUB + d.depth * TREE_STEP, TREE_MAX); }
    function midA(d) { return ((d._a0 || 0) + (d._a1 || 0)) / 2; }

    /* Cell padding (gaps between tiles), a reserved title strip at each
       tile's inner edge (so the name never sits on top of the dots), and the
       tile's dominant source (used to tint alpha/claims tiles so the overview
       keeps the source signal while the dots are hidden). */
    cells.forEach(function (d) {
      var padA = Math.min(0.003, (d._a1 - d._a0) * 0.06);
      var padR = Math.min(10, (d._r1 - d._r0) * 0.06);
      d._a0 += padA; d._a1 -= padA; d._r0 += padR; d._r1 -= padR;
      var radLen = d._r1 - d._r0;
      var rMid0 = (d._r0 + d._r1) / 2;
      var arcLen0 = (d._a1 - d._a0) * rMid0;
      d._lo = arcLen0 >= radLen ? 't' : 'r'; // title runs along the longer axis
      var counts = {};
      (d.data.decls || []).forEach(function (x) { counts[x.source] = (counts[x.source] || 0) + 1; });
      var dom = 'Physlib', best = -1;
      Object.keys(counts).forEach(function (k2) { if (counts[k2] > best) { best = counts[k2]; dom = k2; } });
      d._dom = dom;
    });

    var g = svg.append('g');
    var gGuides = g.append('g');
    var gLinks = g.append('g');
    var gBands = g.append('g');
    var gCells = g.append('g');
    var gNodes = g.append('g');
    var gDots = g.append('g');
    var gTips = g.append('g');
    var gLabels = g.append('g');

    /* Dashed concentric guide rings in the tree region. */
    gGuides.selectAll('circle').data([260, 520, 780]).join('circle')
      .attr('class', 'rm-guide').attr('r', function (r) { return r; });

    /* ── Branches: hub → area bands → sub-bands → short stubs to boxes ── */
    var subBandDirs = dirs.filter(function (d) { return d._band; });
    var linkGen = d3.linkRadial().angle(function (p) { return p.a; }).radius(function (p) { return p.r; });
    var links = [];
    areas.forEach(function (a) {
      links.push({ s: { a: midA(a), r: 0 }, t: { a: midA(a), r: BAND_IN }, c: branchColor(a), w: 7 });
    });
    subBandDirs.forEach(function (d) {
      var anc = d.parent, from = BAND_OUT;
      while (anc && anc.depth >= 1) {
        if (anc._band) { from = anc._band.r1; break; }
        anc = anc.parent;
      }
      links.push({ s: { a: midA(d), r: from }, t: { a: midA(d), r: d._band.r0 },
                   c: branchColor(d), w: Math.max(2.6 - 0.4 * (d.depth - 2), 1) });
    });
    cells.forEach(function (d) {
      /* Each box hangs off its nearest banded ancestor with a short stub. */
      var anc = d.parent, from = BAND_OUT;
      while (anc && anc.depth >= 1) {
        if (anc._band) { from = anc._band.r1; break; }
        anc = anc.parent;
      }
      links.push({ s: { a: midA(d), r: from }, t: { a: midA(d), r: d._r0 }, c: branchColor(d), w: 0.8 });
    });
    gLinks.selectAll('path').data(links).join('path')
      .attr('class', 'rm-branch')
      .attr('d', function (l) { return linkGen({ source: l.s, target: l.t }); })
      .attr('stroke', function (l) { return l.c; })
      .attr('stroke-width', function (l) { return l.w; });

    /* ── File cells: annular tiles ───────────────────────────────── */
    var arc = d3.arc()
      .startAngle(function (d) { return d._a0; }).endAngle(function (d) { return d._a1; })
      .innerRadius(function (d) { return d._r0; }).outerRadius(function (d) { return d._r1; });
    var cellSel = gCells.selectAll('path').data(cells).join('path')
      .attr('class', 'rm-cell')
      .attr('d', arc)
      .attr('fill', cellFill)
      .on('click', function (event, d) {
        event.stopPropagation();
        selectCell(this, d.data);
        focusNode(d, d._r0);
      });

    /* Branch tips: a small node where each branch meets its tile. */
    gTips.selectAll('circle').data(cells).join('circle')
      .attr('class', 'rm-branch-tip')
      .attr('transform', function (d) { return 'translate(' + ptRadial(midA(d), d._r0) + ')'; })
      .attr('r', 5)
      .attr('fill', branchColor);

    /* ── Declarations: polar dot grid inside each cell ───────────── */
    var allDots = [];
    cells.forEach(function (d) {
      var decls = d.data.decls || [];
      var n = decls.length;
      if (!n) return;
      var a0 = d._a0, a1 = d._a1, r0 = d._r0, r1 = d._r1;
      var rMid = (r0 + r1) / 2;
      var arcLen = Math.max((a1 - a0) * rMid, 1), radLen = Math.max(r1 - r0, 1);
      var cols = Math.min(n, Math.max(1, Math.round(Math.sqrt(n * arcLen / radLen))));
      var rows = Math.ceil(n / cols);
      var sA = (a1 - a0) / cols, sR = radLen / rows;
      decls.forEach(function (dec, i) {
        var c = i % cols, rr = Math.floor(i / cols);
        var ang = a0 + (c + 0.5) * sA;
        var rad = r0 + (rr + 0.5) * sR;
        var dotR = Math.min(Math.max(1.2, 0.34 * Math.min(sA * rad, sR)), 26);
        var p = ptRadial(ang, rad);
        allDots.push({ x: p[0], y: p[1], r: dotR, cell: d,
          d: { name: dec.name, source: dec.source, href: dec.href, kind: dec.kind,
               statement: dec.statement, srcs: dec.sources, filePath: d.data.path } });
      });
    });
    /* Definitions render as stars, lemmas/theorems and claims as circles,
       always visible. */
    var symStar = d3.symbol().type(d3.symbolStar);
    var symCircle = d3.symbol().type(d3.symbolCircle);
    var dotSel = gDots.selectAll('path').data(allDots).join('path')
      .attr('class', function (o) { return 'rm-dot ' + SOURCE_CLASS[o.d.source]; })
      .attr('transform', function (o) { return 'translate(' + o.x + ',' + o.y + ')'; })
      .attr('d', function (o) {
        var sym = o.d.kind === 'def' ? symStar : symCircle;
        return sym.size(3.1 * o.r * o.r)();
      })
      .on('click', function (event, o) { event.stopPropagation(); selectDot(this, o.d); });

    /* ── Area bands: thick coloured arcs with the name curved along ── */
    var bandArc = d3.arc()
      .startAngle(function (d) { return d._a0; }).endAngle(function (d) { return d._a1; })
      .innerRadius(BAND_IN).outerRadius(BAND_OUT).padAngle(0.004).padRadius(BAND_IN);
    gBands.selectAll('.rm-band').data(areas).join('path')
      .attr('class', 'rm-band')
      .attr('d', bandArc)
      .attr('fill', branchColor)
      .style('cursor', 'pointer')
      .on('click', function (event, d) { event.stopPropagation(); focusNode(d, BAND_IN); });
    /* Curved label path per area; reversed in the bottom half so text stays
       upright. startOffset 50% centres the name on its band. */
    function bandTextPath(d, i) {
      var upper = midA(d) <= Math.PI / 2 || midA(d) >= 3 * Math.PI / 2;
      var r = upper ? (BAND_IN + BAND_OUT) / 2 + 18 : (BAND_IN + BAND_OUT) / 2 - 18;
      var a0 = upper ? d._a0 : d._a1, a1 = upper ? d._a1 : d._a0;
      var p0 = ptRadial(a0, r), p1 = ptRadial(a1, r);
      var large = Math.abs(d._a1 - d._a0) > Math.PI ? 1 : 0;
      var sweep = upper ? 1 : 0;
      return 'M' + p0[0] + ',' + p0[1] + ' A' + r + ',' + r + ' 0 ' + large + ',' + sweep + ' ' + p1[0] + ',' + p1[1];
    }
    var defs = svg.append('defs');
    areas.forEach(function (d, i) {
      defs.append('path').attr('id', 'rm-band-path-' + i).attr('d', bandTextPath(d, i));
    });
    var areaLabelSel = gLabels.selectAll('.rm-band-label').data(areas).join('text')
      .attr('class', 'rm-band-label')
      .attr('dy', '0.34em');
    areaLabelSel.append('textPath')
      .attr('href', function (d, i) { return '#rm-band-path-' + i; })
      .attr('startOffset', '50%')
      .attr('text-anchor', 'middle')
      .text(function (d) { return prettyName(d.data.name); });
    /* Shrink each name until it fits its band's arc (inline style so it wins
       over the stylesheet), then measure and correct exactly. */
    areaLabelSel.style('font-size', function (d) {
      var arcLen = (d._a1 - d._a0) * (BAND_IN + BAND_OUT) / 2;
      var chars = prettyName(d.data.name).length || 1;
      return Math.min(52, arcLen / (chars * 0.66)) + 'px';
    });

    /* ── Subdirectory bands with curved names ────────────────────── */
    function arcTextPath(a0, a1, rc) {
      var m = (a0 + a1) / 2;
      var upper = m <= Math.PI / 2 || m >= 3 * Math.PI / 2;
      var r = upper ? rc + 8 : rc - 8;
      var s0 = upper ? a0 : a1, s1 = upper ? a1 : a0;
      var p0 = ptRadial(s0, r), p1 = ptRadial(s1, r);
      var large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
      return 'M' + p0[0] + ',' + p0[1] + ' A' + r + ',' + r + ' 0 ' + large + ',' + (upper ? 1 : 0) + ' ' + p1[0] + ',' + p1[1];
    }
    var subBands = subBandDirs;
    var subArc = d3.arc()
      .startAngle(function (d) { return d._band.a0; }).endAngle(function (d) { return d._band.a1; })
      .innerRadius(function (d) { return d._band.r0; }).outerRadius(function (d) { return d._band.r1; });
    gBands.selectAll('.rm-subband').data(subBands).join('path')
      .attr('class', 'rm-subband')
      .attr('d', subArc)
      .attr('fill', function (d) {
        var h = hueOf(d);
        var t = Math.min(d.depth - 2, 3);
        return (dark ? d3.hsl(h, 0.38, 0.33 - 0.02 * t) : d3.hsl(h, 0.42, 0.74 + 0.025 * t)).formatHex();
      })
      .style('cursor', 'pointer')
      .on('click', function (event, d) { event.stopPropagation(); focusNode(d, d._band.r0); });
    subBands.forEach(function (d, i) {
      defs.append('path').attr('id', 'rm-subband-path-' + i)
        .attr('d', arcTextPath(d._band.a0, d._band.a1, (d._band.r0 + d._band.r1) / 2));
    });
    var subLabelSel = gLabels.selectAll('.rm-subband-label').data(subBands).join('text')
      .attr('class', 'rm-subband-label')
      .attr('dy', '0.34em');
    subLabelSel.append('textPath')
      .attr('href', function (d, i) { return '#rm-subband-path-' + i; })
      .attr('startOffset', '50%')
      .attr('text-anchor', 'middle')
      .text(function (d) { return prettyName(d.data.name); });
    subLabelSel.style('font-size', function (d) {
      var arcLen = (d._band.a1 - d._band.a0) * (d._band.r0 + d._band.r1) / 2;
      var chars = prettyName(d.data.name).length || 1;
      var height = (d._band.r1 - d._band.r0) * 0.72;
      return Math.min(26, height, arcLen / (chars * 0.62)) + 'px';
    });
    /* Exact fit: measure the rendered text against its path and scale down. */
    function fitBandText(sel) {
      sel.each(function () {
        var tp = this.querySelector('textPath');
        if (!tp || !this.getComputedTextLength) return;
        var ref = document.querySelector(tp.getAttribute('href'));
        if (!ref || !ref.getTotalLength) return;
        if (ref.getTotalLength() < 8) { this.style.display = 'none'; return; }
        for (var pass = 0; pass < 3; pass++) {
          var tl = this.getComputedTextLength(), pl = ref.getTotalLength();
          if (tl <= pl * 0.95 || !tl) break;
          var cur = parseFloat(this.style.fontSize) || 20;
          this.style.fontSize = Math.max(cur * (pl * 0.92) / tl, 0.4) + 'px';
        }
      });
    }
    fitBandText(areaLabelSel);
    fitBandText(subLabelSel);
    /* File labels: tangential along the cell's inner edge. */
    /* Every file's name sits centred over its box on an opaque plate, rotated
       along the box's longer axis and sized so it stays inside the box. */
    cells.forEach(function (d) {
      var chars = prettyName(d.data.name).length || 1;
      var rMid1 = (d._r0 + d._r1) / 2;
      var arcLen = (d._a1 - d._a0) * rMid1, radLen = d._r1 - d._r0;
      var along = Math.max(arcLen, radLen), across = Math.min(arcLen, radLen);
      d._labFit = Math.max(Math.min(along * 0.9 / (chars * 0.6), across * 0.6, 26), 2.2);
    });
    var titleSel = gLabels.selectAll('.rm-cell-title').data(cells).join('g')
      .attr('class', 'rm-cell-title')
      .attr('transform', function (d) {
        var a = midA(d), deg = a * 180 / Math.PI;
        var flip = a > Math.PI / 2 && a < 3 * Math.PI / 2;
        var p = ptRadial(a, (d._r0 + d._r1) / 2);
        var rot = d._lo === 'r' ? (flip ? deg + 90 : deg - 90) : (flip ? deg + 180 : deg);
        return 'translate(' + p + ') rotate(' + rot + ')';
      });
    titleSel.append('rect').attr('class', 'rm-cell-title-bg');
    titleSel.append('text')
      .attr('class', 'rm-cell-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.32em')
      .style('font-size', function (d) { return d._labFit + 'px'; })
      .text(function (d) { return prettyName(d.data.name); });
    /* Size each plate to its rendered text. */
    titleSel.each(function () {
      var t = this.querySelector('text');
      var r = this.querySelector('rect');
      if (!t || !r || !t.getBBox) return;
      var bb = t.getBBox();
      r.setAttribute('x', bb.x - bb.height * 0.3);
      r.setAttribute('y', bb.y - bb.height * 0.12);
      r.setAttribute('width', bb.width + bb.height * 0.6);
      r.setAttribute('height', bb.height * 1.24);
      r.setAttribute('rx', bb.height * 0.2);
    });

    var hub = g.append('g');
    hub.append('circle').attr('class', 'rm-hub').attr('r', HUB);
    var hubLabel = hub.append('text').attr('class', 'rm-hub-label').attr('dy', '0.35em')
      .attr('font-size', '16px').text('Physics');

    /* ── Zoom & pan ─────────────────────────────────────────────── */
    var zoom = d3.zoom().scaleExtent([0.05, 30]).on('zoom', function (event) {
      var k = event.transform.k;
      g.attr('transform', event.transform);
      hubLabel.attr('font-size', (16 / k) + 'px');
      gGuides.selectAll('circle').attr('stroke-width', 1 / k);
      cellSel.attr('stroke-width', 2 / k);
      dotSel.filter('.sel').attr('stroke-width', 1.4 / k);
    });
    svg.call(zoom).on('dblclick.zoom', null);
    svg.on('mousedown.cursor', function () { svg.classed('dragging', true); });
    d3.select(window).on('mouseup.cursor', function () { svg.classed('dragging', false); });

    function viewport() { var r = svg.node().getBoundingClientRect(); return { w: r.width, h: r.height }; }
    function fit() {
      var vp = viewport();
      var k = 0.96 * Math.min(vp.w, vp.h) / (2 * (R_OUT + 30));
      svg.call(zoom.transform, d3.zoomIdentity.translate(vp.w / 2, vp.h / 2).scale(k));
    }
    fit();
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer); resizeTimer = setTimeout(fit, 150);
    });

    /* Focus the view on a band's whole region (band + everything outside it). */
    function focusNode(node, rIn) {
      var a0 = node._a0, a1 = node._a1, r1 = node._r1;
      var pts = [ptRadial(a0, rIn), ptRadial(a1, rIn), ptRadial(a0, r1), ptRadial(a1, r1)];
      for (var c = 0; c <= 4; c++) {
        var ca = c * Math.PI / 2;
        if (ca > a0 && ca < a1) pts.push(ptRadial(ca, r1));
      }
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      var x0 = d3.min(xs), x1 = d3.max(xs), y0 = d3.min(ys), y1 = d3.max(ys);
      var vp = viewport();
      var k = Math.min(30, 0.9 * Math.min(vp.w / Math.max(x1 - x0, 1), vp.h / Math.max(y1 - y0, 1)));
      var t = d3.zoomIdentity.translate(vp.w / 2 - k * (x0 + x1) / 2, vp.h / 2 - k * (y0 + y1) / 2).scale(k);
      svg.transition().duration(600).call(zoom.transform, t);
    }

    /* ── Selection ──────────────────────────────────────────────── */
    var selCell = null, selDot = null;
    function clearSel() {
      if (selCell) selCell.classList.remove('sel');
      if (selDot) selDot.classList.remove('sel');
      selCell = selDot = null;
    }
    function selectCell(el, d) { clearSel(); el.classList.add('sel'); selCell = el; renderFile(d); }
    function selectDot(el, d) { clearSel(); el.classList.add('sel'); selDot = el; renderResult(d); }

    /* ── Search + legend filters ────────────────────────────────── */
    var srcOn = { Physlib: true, PhyslibAlpha: true, UnformalizedClaims: true };
    function applyFilters() {
      var q = searchInput.value.trim().toLowerCase();
      dotSel.classed('dim', function (o) {
        if (!srcOn[o.d.source]) return true;
        return q && o.d.name.toLowerCase().indexOf(q) === -1;
      });
    }
    searchInput.addEventListener('input', applyFilters);
    d3.selectAll('.rm-legend-item').on('click', function () {
      var s = this.getAttribute('data-source');
      if (!s) return;
      srcOn[s] = !srcOn[s];
      this.classList.toggle('off', !srcOn[s]);
      applyFilters();
    });
  }

  /* ── Sidebar renderers ────────────────────────────────────────── */
  function renderDefault(data) {
    var s = data.stats.bySource;
    sidebar.innerHTML =
      '<div class="rm-sb-kicker">Physlib roadmap</div>' +
      '<div class="rm-help">Every result across three sources, tiled by directory ' +
      'structure. Each <b>cell is a file</b>; each <b>dot is a declaration</b>, ' +
      'coloured by source.<br><br>' +
      '<b>' + (s.Physlib || 0).toLocaleString() + '</b> Physlib · ' +
      '<b>' + (s.PhyslibAlpha || 0).toLocaleString() + '</b> PhyslibAlpha · ' +
      '<b>' + (s.UnformalizedClaims || 0).toLocaleString() + '</b> unformalized claims' +
      '<br><br>Click a <b>dot</b> for a result, or a <b>cell</b> for its file docstring. ' +
      'Toggle a source in the legend; filter with the search box.</div>';
  }

  function badges(sources) {
    return '<div class="rm-sb-badges">' + (sources || []).map(function (s) {
      return '<span class="rm-badge ' + SOURCE_CLASS[s] + '">' + SOURCE_LABEL[s] + '</span>';
    }).join('') + '</div>';
  }

  function renderResult(d) {
    var cls = SOURCE_CLASS[d.source];
    var html =
      '<div class="rm-sb-kicker">' + (d.source === 'UnformalizedClaims' ? 'Unformalized claim'
        : d.kind === 'def' ? 'Definition' : 'Lemma / theorem') + '</div>' +
      '<div class="rm-sb-name">' + escapeHtml(d.name) + '</div>' +
      '<div class="rm-sb-badges"><span class="rm-badge ' + cls + '">' + SOURCE_LABEL[d.source] + '</span></div>' +
      '<div class="rm-sb-path">' + escapeHtml(dirOf(d.filePath)) + '</div>';

    if (d.statement) {
      html += '<div class="rm-sb-section">Statement</div>' +
        '<div class="rm-statement">' + escapeHtml(d.statement) + '</div>';
    }
    if (d.href) {
      html += '<div class="rm-sb-section">Formalized</div>' +
        '<a class="rm-open" href="' + d.href + '">Open in the wiki →</a>';
    }

    html += '<div class="rm-sb-section">Traditional sources</div>';
    var srcs = d.srcs || [];
    if (srcs.length) {
      html += srcs.map(function (s) {
        var url = s.url || (s.arxiv ? 'https://arxiv.org/abs/' + s.arxiv : '#');
        return '<a class="rm-source" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' +
          escapeHtml(s.title || url) +
          (s.arxiv ? '<span class="rm-src-arxiv">arXiv:' + escapeHtml(s.arxiv) + '</span>' : '') + '</a>';
      }).join('');
    } else {
      html += '<div class="rm-empty">No traditional sources recorded.</div>';
    }

    html += '<div class="rm-sb-section">Contribute</div><div class="rm-actions">' +
      actionBtn('Suggest a source', sourceIssue(d)) +
      (d.source !== 'UnformalizedClaims'
        ? actionBtn('Suggest a docstring edit', editIssue(d.source, d.filePath))
        : '') +
      '</div>';
    sidebar.innerHTML = html;
  }

  function renderFile(d) {
    var html =
      '<div class="rm-sb-kicker">File</div>' +
      '<div class="rm-sb-name">' + escapeHtml(d.path || '') + '</div>' +
      badges(d.sources);
    if (d.moduleHref) {
      html += '<a class="rm-open" href="' + d.moduleHref + '">Open in the wiki →</a>';
    }
    html += '<div class="rm-sb-section">Docstring' +
      (d.docSource ? ' · ' + SOURCE_LABEL[d.docSource] : '') + '</div>';
    html += d.doc
      ? '<div class="rm-sb-body">' + miniMarkdown(d.doc) + '</div>'
      : '<div class="rm-empty">No docstring.</div>';
    html += '<div class="rm-sb-section">Contribute</div><div class="rm-actions">' +
      (d.sources || []).map(function (s) {
        return actionBtn('Suggest an edit to the ' + SOURCE_LABEL[s] + ' docstring', editIssue(s, d.path));
      }).join('') + '</div>';
    sidebar.innerHTML = html;
  }

  function actionBtn(label, href) {
    return '<a class="rm-btn" href="' + href + '" target="_blank" rel="noopener">' + escapeHtml(label) + '</a>';
  }
  function issueUrl(repo, title, body) {
    return 'https://github.com/' + repo + '/issues/new?title=' +
      encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
  }
  function editIssue(source, filePath) {
    var repo = REPOS[source] || REPOS.Physlib;
    var file = SOURCE_FILE[source] ? SOURCE_FILE[source](filePath) : filePath;
    return issueUrl(repo, 'docs: edit docstring of ' + filePath,
      '### Docstring edit suggestion\n\n**File:** `' + file + '`\n**Source:** ' + SOURCE_LABEL[source] +
      '\n\nDescribe the suggested change to this file\'s docstring:\n\n> \n\n---\n*Suggested from the Physlib roadmap.*');
  }
  function sourceIssue(d) {
    var source = d.source;
    var repo = REPOS[source] || REPOS.Physlib;
    var file = SOURCE_FILE[source] ? SOURCE_FILE[source](d.filePath) : d.filePath;
    return issueUrl(repo, 'sources: add a traditional source for ' + d.name,
      '### Suggested traditional source\n\n**Result:** `' + d.name + '`\n**File:** `' + file +
      '`\n**Source library:** ' + SOURCE_LABEL[source] +
      '\n\nProposed reference (title, arXiv id / DOI, and why it is relevant):\n\n> \n\n---\n*Suggested from the Physlib roadmap.*');
  }

  /* ── Helpers ──────────────────────────────────────────────────── */
  function ptRadial(angle, radius) { var a = angle - Math.PI / 2; return [radius * Math.cos(a), radius * Math.sin(a)]; }
  function themeDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function prettyName(s) { return s.replace(/([a-z0-9])([A-Z])/g, '$1 $2'); }
  function dirOf(p) { return (p || '').split('.').join(' › '); }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  /* Tiny, safe Markdown: escape first, then re-introduce a few inline/block forms. */
  function miniMarkdown(src) {
    var lines = String(src).split('\n');
    var out = [], inList = false;
    function inline(t) {
      t = escapeHtml(t);
      t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
      return t;
    }
    lines.forEach(function (line) {
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      var li = line.match(/^\s*[-*]\s+(.*)$/);
      if (h) { if (inList) { out.push('</ul>'); inList = false; } out.push('<h3>' + inline(h[2]) + '</h3>'); }
      else if (li) { if (!inList) { out.push('<ul>'); inList = true; } out.push('<li>' + inline(li[1]) + '</li>'); }
      else if (!line.trim()) { if (inList) { out.push('</ul>'); inList = false; } }
      else { if (inList) { out.push('</ul>'); inList = false; } out.push('<p>' + inline(line) + '</p>'); }
    });
    if (inList) out.push('</ul>');
    return out.join('');
  }
})();
