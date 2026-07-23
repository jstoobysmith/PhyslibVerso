/* Physlib wiki — paperview-style page furniture.
   Injected on every page (see extra_js in literate.toml). All URLs are
   relative so they resolve through each page's <base> tag. */
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  var SEARCH_ICON =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

  ready(function () {
    /* ── 1. Top header bar ─────────────────────────────────────── */
    var header = document.createElement('div');
    header.className = 'pv-header';

    var logo = document.createElement('a');
    logo.className = 'pv-logo';
    logo.href = '.';
    logo.textContent = 'Physlib';
    header.appendChild(logo);

    var title = document.createElement('a');
    title.className = 'pv-title';
    title.href = '.';
    title.textContent = 'PHYSICS WIKI';
    header.appendChild(title);

    var stats = document.createElement('span');
    stats.className = 'pv-stats';
    header.appendChild(stats);

    var right = document.createElement('div');
    right.className = 'pv-right';
    var search = document.createElement('a');
    search.className = 'pv-search';
    search.href = 'search/';
    search.innerHTML = SEARCH_ICON + '<span>Search definitions and text…</span>';
    right.appendChild(search);
    header.appendChild(right);

    document.body.insertBefore(header, document.body.firstChild);
    document.body.classList.add('pv');

    /* Site-wide work-in-progress banner above the header. */
    var wip = document.createElement('div');
    wip.className = 'pv-wip-banner';
    wip.innerHTML = 'Work in progress (and for demonstration purposes only): ' +
      'Based of <a href="https://paperview.org/">https://paperview.org/</a> ' +
      'by Sabrina Pasterski.';
    document.body.insertBefore(wip, document.body.firstChild);
    document.body.classList.add('pv-has-banner');

    /* ── 2. Breadcrumbs: move from the title bar to above the
           article title, like a wiki crumb line ─────────────────── */
    var crumbs = document.querySelector('.title-bar .breadcrumbs');
    var content = document.querySelector('.code-content');
    if (crumbs && content) {
      var wrap = document.createElement('div');
      wrap.className = 'pv-crumb';
      wrap.appendChild(crumbs);
      content.insertBefore(wrap, content.firstChild);
      var bar = document.querySelector('.title-bar');
      if (bar) bar.remove();

      /* ── 3. Meta line under the article title ────────────────── */
      var modName = (content.id || '').replace(/___/g, '.');
      var heading = content.querySelector('.mod-doc h1, .mod-doc h2');
      if (modName && heading) {
        var meta = document.createElement('div');
        meta.className = 'pv-meta';
        meta.textContent = 'Formalized in Lean · module ' + modName;
        heading.insertAdjacentElement('afterend', meta);
      }

      /* ── 3a. Alpha notice on PhyslibAlpha pages ──────────────── */
      if (/^PhyslibAlpha(\.|$)/.test(modName)) {
        var notice = document.createElement('div');
        notice.className = 'pv-alpha-banner';
        notice.innerHTML =
          '<strong>Alpha content.</strong> This page comes from ' +
          '<code>PhyslibAlpha</code>, which has not been reviewed to the ' +
          'same extent as the main Physlib library.';
        if (heading && meta) meta.insertAdjacentElement('afterend', notice);
        else content.insertBefore(notice, content.children[1] || null);
      }
    }

    /* ── 3b. Per-command cleanup and callouts. A .code-box contains
           one <code> element per command (plus an injected Copy
           button, so box-level text matching is unreliable):
           - `@[…] … section` scoping commands are removed;
           - TODO commands become "Open problem" cards;
           - informal_definition / informal_lemma become "Informal"
             cards that absorb their statement docstring. ──────────── */
    var calloutBodies = [];
    var pendingDepChips = [];

    function makeCallout(cls, kicker, titleText) {
      var card = document.createElement('div');
      card.className = 'pv-callout ' + cls;
      var head = document.createElement('div');
      head.className = 'pv-callout-kicker';
      head.textContent = kicker;
      card.appendChild(head);
      if (titleText) {
        var title = document.createElement('div');
        title.className = 'pv-callout-title';
        title.textContent = titleText;
        card.appendChild(title);
      }
      return card;
    }

    document.querySelectorAll('.code-box').forEach(function (box) {
      var codes = Array.prototype.slice.call(
        box.querySelectorAll(':scope > code.hl.lean.block'));
      var after = []; // callouts to place after the box, in order

      codes.forEach(function (cb, ci) {
        var t = cb.textContent.trim();

        /* Scoping commands that hide_commands cannot match
           (attribute-prefixed commands have no leading keyword). */
        if (/^@\[[^\]]*\]\s*(public\s+|private\s+|noncomputable\s+)*section$/
            .test(t.replace(/\s+/g, ' '))) {
          cb.remove();
          return;
        }

        /* TODO commands. */
        if (/^TODO\s/.test(t)) {
          var todoRe = /TODO\s+"((?:[^"\\]|\\.)*)"/g;
          var texts = [], mm, consumed = t;
          while ((mm = todoRe.exec(t))) {
            texts.push(mm[1]);
            consumed = consumed.replace(mm[0], '');
          }
          if (texts.length && consumed.trim() === '') {
            texts.forEach(function (txt) {
              var card = makeCallout('pv-callout-todo', 'Open problem', null);
              var body = document.createElement('div');
              body.className = 'pv-callout-body';
              body.textContent = txt.replace(/\\"/g, '"').replace(/\s+/g, ' ');
              card.appendChild(body);
              calloutBodies.push(card);
              after.push(card);
            });
            cb.remove();
          }
          return;
        }

        /* Informal definitions and lemmas. */
        var im = t.match(/^informal_(definition|lemma)\s+([^\s]+)\s+where([\s\S]*)$/);
        if (!im) return;
        var fields = im[3];
        var fieldRe = /^(\s*(deps\s*:=\s*\[[^\]]*\]|tag\s*:=\s*"(?:[^"\\]|\\.)*"|math\s*:≈\s*"(?:[^"\\]|\\.)*"|physics\s*:≈\s*"(?:[^"\\]|\\.)*"))*\s*$/;
        if (!fieldRe.test(fields)) return;
        var card2 = makeCallout('pv-callout-informal-' + im[1],
          'Informal ' + im[1], im[2]);

        /* The statement usually lives in the docstring just above the
           box; absorb it when this command starts the box. */
        var prev = box.previousElementSibling;
        if (ci === 0 && prev &&
            /\bmd-text\b|\bverso-text\b/.test(prev.className) &&
            (prev.getAttribute('style') || '').indexOf('--indent') !== -1) {
          var body2 = document.createElement('div');
          body2.className = 'pv-callout-body';
          while (prev.firstChild) body2.appendChild(prev.firstChild);
          prev.remove();
          card2.appendChild(body2);
        }
        var mathField = fields.match(/math\s*:≈\s*"((?:[^"\\]|\\.)*)"/);
        if (mathField) {
          var body3 = document.createElement('div');
          body3.className = 'pv-callout-body';
          body3.textContent = mathField[1].replace(/\\"/g, '"');
          card2.appendChild(body3);
        }
        var depsField = fields.match(/deps\s*:=\s*\[([^\]]*)\]/);
        if (depsField && depsField[1].trim()) {
          var depRow = document.createElement('div');
          depRow.className = 'pv-callout-deps';
          var lbl = document.createElement('span');
          lbl.textContent = 'Depends on:';
          depRow.appendChild(lbl);
          depsField[1].split(',').forEach(function (d) {
            var name = d.trim().replace(/^`+/, '');
            if (!name) return;
            var chip = document.createElement('code');
            chip.textContent = name;
            depRow.appendChild(chip);
            pendingDepChips.push({ el: chip, name: name });
          });
          card2.appendChild(depRow);
        }
        calloutBodies.push(card2);
        after.push(card2);
        cb.remove();
      });

      after.reverse().forEach(function (card) {
        box.parentNode.insertBefore(card, box.nextSibling);
      });
      if (!box.querySelector('code.hl.lean.block')) box.remove();
    });

    /* ── 3c. Sidebar: paperview-style tree (colored subfield dots,
           tinted trunk lines, depth-graded typography) ───────────── */
    var tree = document.querySelector('nav.module-tree');
    if (tree) {
      /* Multi-library sites have no .nav-title; synthesize one so the
         section-head strip is always present. */
      var navTitle = tree.querySelector('.nav-title');
      if (!navTitle) {
        navTitle = document.createElement('div');
        navTitle.className = 'nav-title';
        var siteName = (document.title || '').split('—').pop().trim();
        navTitle.textContent = siteName || 'Wiki';
        tree.insertBefore(navTitle, tree.firstChild);
      }
      {
        var treeWrap = document.createElement('div');
        treeWrap.className = 'pv-tree';
        while (navTitle.nextSibling) treeWrap.appendChild(navTitle.nextSibling);
        tree.appendChild(treeWrap);

        /* Merge extra library roots (PhyslibAlpha, …) into the first
           (Physlib), so alpha pages sit inside the same structure.
           Moved rows get an "α" marker via .pv-alpha-node. */
        var rowLabel = function (el) {
          var s = el.tagName === 'DETAILS' ? el.querySelector(':scope > summary') : el;
          return (s ? s.textContent : '').trim().toLowerCase();
        };
        var tagAlpha = function (el) {
          if (el.classList && el.classList.contains('leaf')) {
            el.classList.add('pv-alpha-node');
          }
          if (el.tagName === 'DETAILS') {
            el.querySelectorAll('.leaf, summary').forEach(function (x) {
              x.classList.add('pv-alpha-node');
            });
            var s0 = el.querySelector(':scope > summary');
            if (s0) s0.classList.add('pv-alpha-node');
          }
        };
        var mergeTree = function (target, source) {
          Array.prototype.slice.call(source.children).forEach(function (kid) {
            if (kid.tagName === 'SUMMARY') return;
            var label = rowLabel(kid);
            var match = null;
            if (kid.tagName === 'DETAILS') {
              Array.prototype.slice.call(target.children).forEach(function (tc) {
                if (!match && tc.tagName === 'DETAILS' && rowLabel(tc) === label) {
                  match = tc;
                }
              });
            }
            if (match) {
              mergeTree(match, kid);
            } else {
              tagAlpha(kid);
              var placed = false;
              var tcs = Array.prototype.slice.call(target.children);
              for (var i = 0; i < tcs.length; i++) {
                if (tcs[i].tagName === 'SUMMARY') continue;
                if (rowLabel(tcs[i]) > label) {
                  target.insertBefore(kid, tcs[i]);
                  placed = true;
                  break;
                }
              }
              if (!placed) target.appendChild(kid);
            }
          });
          source.remove();
        };
        var libRoots = Array.prototype.slice.call(
          treeWrap.querySelectorAll(':scope > details'));
        if (libRoots.length > 1) {
          for (var r = 1; r < libRoots.length; r++) {
            mergeTree(libRoots[0], libRoots[r]);
          }
        }

        /* Flatten the (now single) library root: the section-head strip
           already names the library, so hoist the areas to top level.
           Loose top-level pages go after the area folders. */
        var singleRoot = treeWrap.querySelectorAll(':scope > details');
        if (singleRoot.length === 1) {
          var rootD = singleRoot[0];
          Array.prototype.slice.call(rootD.children).forEach(function (c) {
            if (c.tagName !== 'SUMMARY') treeWrap.appendChild(c);
          });
          rootD.remove();
        }
        Array.prototype.slice.call(treeWrap.querySelectorAll(':scope > .leaf'))
          .forEach(function (l) { treeWrap.appendChild(l); });

        /* Collapse folders that contain exactly one page and nothing
           else (the Topic/Basic.lean convention) into a single row,
           named after the page title — or the folder, if the page has
           no custom title. */
        for (var pass = 0; pass < 3; pass++) {
          var collapsed = false;
          Array.prototype.slice.call(treeWrap.querySelectorAll('details'))
            .reverse()
            .forEach(function (d) {
              var inner = Array.prototype.slice.call(d.children)
                .filter(function (c) { return c.tagName !== 'SUMMARY'; });
              var s = d.querySelector(':scope > summary');
              if (inner.length === 1 && s && !s.querySelector('a') &&
                  inner[0].classList && inner[0].classList.contains('leaf')) {
                var leaf = inner[0];
                var a = leaf.querySelector('a');
                if (a && !a.classList.contains('custom-title')) {
                  a.textContent = s.textContent.trim();
                }
                if (s.classList.contains('pv-alpha-node')) {
                  leaf.classList.add('pv-alpha-node');
                }
                d.parentNode.replaceChild(leaf, d);
                collapsed = true;
              }
            });
          if (!collapsed) break;
        }

        /* Human-readable labels: split CamelCase for folder names and
           for pages that have no custom title. */
        var spaceCamel = function (t) {
          return t.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                  .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
        };
        treeWrap.querySelectorAll('summary').forEach(function (s) {
          var link = s.querySelector('a');
          if (link) link.textContent = spaceCamel(link.textContent);
          else s.textContent = spaceCamel(s.textContent.trim());
        });
        treeWrap.querySelectorAll('.leaf > a:not(.custom-title)')
          .forEach(function (a) { a.textContent = spaceCamel(a.textContent); });
        /* Re-open the path to the current page (its original ancestors
           may have been merged into closed folders). */
        var cur = treeWrap.querySelector('.current');
        if (cur) {
          for (var anc = cur.parentElement; anc && anc !== treeWrap; anc = anc.parentElement) {
            if (anc.tagName === 'DETAILS') anc.setAttribute('open', '');
          }
        }

        var PALETTE = ['#5B8DBE', '#C45B7C', '#E07850', '#C4A835',
                       '#8BB048', '#7C3AED', '#0AA2C0', '#B25BC4'];

        /* With multiple libraries (Physlib, PhyslibAlpha) the tree has
           an extra root level: style those roots as section labels and
           put the colored dots on the *area* level beneath them. */
        var tops = Array.prototype.slice.call(
          treeWrap.querySelectorAll(':scope > details'));
        var multiRoot = tops.length > 0 && tops.length <= 3;
        var areas = [];
        if (multiRoot) {
          tops.forEach(function (root) {
            var s = root.querySelector(':scope > summary');
            if (s) s.classList.add('pv-lib-row');
            root.querySelectorAll(':scope > details').forEach(function (d) {
              areas.push(d);
            });
          });
        } else {
          areas = tops;
        }

        areas.forEach(function (d, i) {
          var color = PALETTE[i % PALETTE.length];
          d.style.setProperty('--tree-color', color);
          var s = d.querySelector(':scope > summary');
          if (s) {
            var dot = document.createElement('span');
            dot.className = 'nav-dot';
            dot.style.background = color;
            s.insertBefore(dot, s.firstChild);
            s.classList.add('pv-area-row');
          }
        });

        treeWrap.querySelectorAll('summary, .leaf').forEach(function (el) {
          var depth = 0;
          var p = el.parentElement;
          while (p && p !== treeWrap) {
            if (p.tagName === 'DETAILS') depth++;
            p = p.parentElement;
          }
          if (el.tagName === 'SUMMARY') depth -= 1;
          if (multiRoot) depth = Math.max(0, depth - 1);
          el.setAttribute('data-pv-depth', String(Math.min(depth, 2)));
        });

        /* Page counts on the area rows, like paperview's nav badges. */
        treeWrap.querySelectorAll(':scope > details').forEach(function (d) {
          var s = d.querySelector(':scope > summary');
          if (!s) return;
          var n = d.querySelectorAll('a[title]').length;
          if (!n) return;
          var badge = document.createElement('span');
          badge.className = 'nav-count';
          badge.textContent = String(n);
          s.appendChild(badge);
        });

        /* Filter box: live-filters pages and folders, expanding the
           ancestors of every match. */
        var filterWrap = document.createElement('div');
        filterWrap.className = 'pv-filter';
        var filterInput = document.createElement('input');
        filterInput.type = 'search';
        filterInput.placeholder = 'Filter pages…';
        filterInput.setAttribute('aria-label', 'Filter pages');
        filterWrap.appendChild(filterInput);
        tree.insertBefore(filterWrap, treeWrap);

        var savedOpen = null;
        var showSubtree = function (el) {
          el.classList.remove('pv-hidden');
          el.querySelectorAll('.pv-hidden').forEach(function (x) {
            x.classList.remove('pv-hidden');
          });
          if (el.tagName === 'DETAILS') {
            el.querySelectorAll('details').forEach(function (x) {
              x.setAttribute('open', '');
            });
          }
        };
        var showWithAncestors = function (el) {
          el.classList.remove('pv-hidden');
          for (var p = el.parentElement; p && p !== treeWrap; p = p.parentElement) {
            if (p.tagName === 'DETAILS') {
              p.classList.remove('pv-hidden');
              p.setAttribute('open', '');
            }
          }
        };
        filterInput.addEventListener('input', function () {
          var q = filterInput.value.trim().toLowerCase();
          var all = treeWrap.querySelectorAll('details, .leaf');
          if (!q) {
            all.forEach(function (el) { el.classList.remove('pv-hidden'); });
            if (savedOpen) {
              treeWrap.querySelectorAll('details').forEach(function (d) {
                if (savedOpen.has(d)) d.setAttribute('open', '');
                else d.removeAttribute('open');
              });
              savedOpen = null;
            }
            return;
          }
          if (!savedOpen) {
            savedOpen = new Set();
            treeWrap.querySelectorAll('details[open]').forEach(function (d) {
              savedOpen.add(d);
            });
          }
          all.forEach(function (el) { el.classList.add('pv-hidden'); });
          treeWrap.querySelectorAll('.leaf').forEach(function (leaf) {
            var a = leaf.querySelector('a');
            var hay = ((a ? a.textContent : '') + ' ' +
                       (a ? a.getAttribute('title') || '' : '')).toLowerCase();
            if (hay.indexOf(q) !== -1) showWithAncestors(leaf);
          });
          treeWrap.querySelectorAll('details').forEach(function (d) {
            var s = d.querySelector(':scope > summary');
            if (s && s.textContent.toLowerCase().indexOf(q) !== -1) {
              showWithAncestors(d);
              showSubtree(d);
            }
          });
        });

        /* Bring the current page into view. */
        var curRow = treeWrap.querySelector('.leaf.current, summary.current');
        if (curRow && curRow.scrollIntoView) {
          curRow.scrollIntoView({ block: 'center' });
        }
      }
    }

    /* ── 4. Landing page: hero + card grid instead of nested TOC ── */
    var landing = document.querySelector('main.landing-page');
    if (landing) {
      document.body.classList.add('pv-landing');
      var h1 = landing.querySelector('h1');
      var desc = document.querySelector('meta[name="description"]');

      var hero = document.createElement('div');
      hero.className = 'pv-hero';
      var kicker = document.createElement('div');
      kicker.className = 'pv-kicker';
      kicker.textContent = 'Physics Wiki';
      hero.appendChild(kicker);
      var heroTitle = document.createElement('div');
      heroTitle.className = 'pv-hero-title';
      heroTitle.textContent = h1 ? h1.textContent.trim() : 'Physlib';
      hero.appendChild(heroTitle);
      if (desc && desc.content) {
        var sub = document.createElement('div');
        sub.className = 'pv-hero-sub';
        sub.textContent = desc.content;
        hero.appendChild(sub);
      }

      /* Group articles by top-level area (the segment after the
         library prefix), one titled card grid per group. */
      var links = landing.querySelectorAll('.module-toc a');
      var groups = [];
      var groupsByKey = {};
      links.forEach(function (a) {
        var mod = a.textContent.trim();
        var segs = mod.split('.');
        if (segs.length < 2) return; // skip the bare library-root module
        var key = segs[1]; // alpha modules merge into the same area
        var isAlpha = segs[0] === 'PhyslibAlpha';
        if (!groupsByKey[key]) {
          groupsByKey[key] = [];
          groups.push(key);
        }
        groupsByKey[key].push({
          href: a.getAttribute('href'),
          mod: mod,
          alpha: isAlpha,
          label: (segs.length > 2 ? segs.slice(2) : segs.slice(1)).join(' › ') || key
        });
      });

      if (h1) h1.remove();
      var toc = landing.querySelector('.module-toc');
      if (toc) toc.remove();
      landing.appendChild(hero);

      groups.forEach(function (key) {
        var sectionTitle = document.createElement('div');
        sectionTitle.className = 'pv-section-title';
        sectionTitle.textContent = key.replace(/([a-z])([A-Z])/g, '$1 $2');
        landing.appendChild(sectionTitle);
        var grid = document.createElement('div');
        grid.className = 'pv-card-grid';
        groupsByKey[key].forEach(function (entry) {
          var card = document.createElement('a');
          card.className = 'pv-card';
          card.href = entry.href;
          var label = document.createElement('div');
          label.className = 'pv-card-label';
          label.textContent = entry.label;
          if (entry.alpha) {
            var chip = document.createElement('span');
            chip.className = 'pv-chip-alpha';
            chip.textContent = 'Alpha';
            label.appendChild(chip);
          }
          card.appendChild(label);
          var path = document.createElement('div');
          path.className = 'pv-card-path';
          path.textContent = entry.mod;
          card.appendChild(path);
          grid.appendChild(card);
        });
        landing.appendChild(grid);
      });
    }

    /* ── 6. Capture prose sources, then render TeX math ─────────── */
    var proseBlocks = Array.prototype.slice.call(
      document.querySelectorAll('.code-content > .md-text, .code-content > .verso-text'));
    proseBlocks.forEach(function (b) { b.pvSource = b.innerText.trim(); });

    function renderMathIn(container) {
      if (typeof katex === 'undefined') return;
      var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          for (var p = n.parentElement; p && p !== container; p = p.parentElement) {
            var t = p.tagName;
            if (t === 'CODE' || t === 'PRE' || t === 'SCRIPT' || t === 'STYLE') {
              return NodeFilter.FILTER_REJECT;
            }
          }
          return /\$|\\\(|\\\[/.test(n.nodeValue)
            ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      });
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      var re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$(\S(?:[^$\n]*?\S)?)\$/g;
      nodes.forEach(function (node) {
        var text = node.nodeValue;
        var m, last = 0, found = false;
        var frag = document.createDocumentFragment();
        re.lastIndex = 0;
        while ((m = re.exec(text))) {
          found = true;
          frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          var tex = m[1] || m[2] || m[3] || m[4];
          var display = !!(m[1] || m[2]);
          var el = document.createElement(display ? 'div' : 'span');
          el.className = 'pv-math' + (display ? ' pv-math-display' : '');
          try {
            katex.render(tex, el, { throwOnError: false, displayMode: display });
          } catch (e) {
            el.textContent = m[0];
          }
          frag.appendChild(el);
          last = m.index + m[0].length;
        }
        if (found) {
          frag.appendChild(document.createTextNode(text.slice(last)));
          node.parentNode.replaceChild(frag, node);
        }
      });
    }
    proseBlocks.forEach(renderMathIn);
    calloutBodies.forEach(renderMathIn);

    /* ── 6b. Auto-link concept mentions in prose to their pages.
           xref.json maps every constant to its page and anchor; inline
           code chips whose text is an unambiguous (suffix of a) known
           name become links, as do callout dependency chips. ───────── */
    fetch('xref.json').then(function (r) { return r.json(); }).then(function (d) {
      var contents = (d['VersoHtml.constant'] || {}).contents || {};
      var index = {};
      Object.keys(contents).forEach(function (userName) {
        contents[userName].forEach(function (entry) {
          if (entry.data && entry.data.private) return;
          var parts = userName.split('.');
          for (var k = 1; k <= parts.length; k++) {
            var suffix = parts.slice(parts.length - k).join('.');
            (index[suffix] = index[suffix] || []).push(entry);
          }
        });
      });
      var lookup = function (name) {
        var entries = index[name];
        return entries && entries.length === 1 ? entries[0] : null;
      };
      var linkify = function (codeEl, name) {
        var entry = lookup(name);
        if (!entry) return;
        var a = document.createElement('a');
        a.className = 'pv-xref';
        a.href = entry.address.replace(/^\//, '') + '#' + entry.id;
        codeEl.parentNode.insertBefore(a, codeEl);
        a.appendChild(codeEl);
      };
      document.querySelectorAll(
        '.code-content > .md-text code, .code-content > .verso-text code, ' +
        '.pv-callout .pv-callout-body code'
      ).forEach(function (codeEl) {
        if (codeEl.closest('a') || codeEl.querySelector('*')) return;
        linkify(codeEl, codeEl.textContent.trim());
      });
      pendingDepChips.forEach(function (p) {
        if (!p.el.closest('a')) linkify(p.el, p.name);
      });
    }).catch(function () { /* offline / file:// — links stay plain */ });

    /* ── 7. Suggest-edit: diff modal → prefilled GitHub issue ────── */
    var GITHUB_REPO = 'leanprover-community/physlib';

    function diffLines(a, b) {
      var A = a.split('\n'), B = b.split('\n');
      var n = A.length, mLen = B.length;
      var L = [];
      for (var i = 0; i <= n; i++) L.push(new Array(mLen + 1).fill(0));
      for (var i2 = n - 1; i2 >= 0; i2--) {
        for (var j = mLen - 1; j >= 0; j--) {
          L[i2][j] = A[i2] === B[j]
            ? L[i2 + 1][j + 1] + 1
            : Math.max(L[i2 + 1][j], L[i2][j + 1]);
        }
      }
      var out = [], x = 0, y = 0;
      while (x < n && y < mLen) {
        if (A[x] === B[y]) { out.push(' ' + A[x]); x++; y++; }
        else if (L[x + 1][y] >= L[x][y + 1]) { out.push('-' + A[x]); x++; }
        else { out.push('+' + B[y]); y++; }
      }
      while (x < n) out.push('-' + A[x++]);
      while (y < mLen) out.push('+' + B[y++]);
      return out.join('\n');
    }

    function openIssue(modName, original, suggestion) {
      var srcPath = modName.split('.').join('/') + '.lean';
      var body = '### Documentation edit suggestion\n\n' +
        '**Module:** `' + modName + '`\n' +
        '**Source file:** https://github.com/' + GITHUB_REPO +
        '/blob/master/' + srcPath + '\n\n' +
        'Suggested change to the rendered documentation text:\n\n' +
        '```diff\n' + diffLines(original, suggestion) + '\n```\n\n' +
        '---\n*Suggested from the Physlib wiki.*\n';
      var url = 'https://github.com/' + GITHUB_REPO + '/issues/new' +
        '?title=' + encodeURIComponent('docs: suggestion for ' + modName) +
        '&body=' + encodeURIComponent(body);
      if (url.length > 7500) {
        var short = 'The suggested diff was too long for a URL and has been ' +
          'copied to the suggester’s clipboard — paste it here.';
        if (navigator.clipboard) navigator.clipboard.writeText(body);
        alert('The diff is too long for a prefilled issue and was copied ' +
          'to your clipboard — please paste it into the issue body.');
        url = 'https://github.com/' + GITHUB_REPO + '/issues/new' +
          '?title=' + encodeURIComponent('docs: suggestion for ' + modName) +
          '&body=' + encodeURIComponent(short);
      }
      window.open(url, '_blank');
    }

    function openEditModal(block, modName) {
      var overlay = document.createElement('div');
      overlay.className = 'pv-modal-overlay';
      var modal = document.createElement('div');
      modal.className = 'pv-modal';
      modal.innerHTML =
        '<div class="pv-modal-title">Suggest an edit</div>' +
        '<div class="pv-modal-sub">Edits open a prefilled GitHub issue on ' +
        '<code>' + GITHUB_REPO + '</code> showing the diff against the ' +
        'current text of <code>' + modName + '</code>.</div>';
      var ta = document.createElement('textarea');
      ta.className = 'pv-modal-text';
      ta.value = block.pvSource || '';
      modal.appendChild(ta);
      var row = document.createElement('div');
      row.className = 'pv-modal-actions';
      var cancel = document.createElement('button');
      cancel.className = 'pv-btn';
      cancel.textContent = 'Cancel';
      cancel.onclick = function () { overlay.remove(); };
      var submit = document.createElement('button');
      submit.className = 'pv-btn pv-btn-primary';
      submit.textContent = 'Open GitHub issue';
      submit.onclick = function () {
        var suggestion = ta.value.trim();
        if (suggestion === (block.pvSource || '').trim()) {
          alert('No changes made yet — edit the text first.');
          return;
        }
        openIssue(modName, block.pvSource || '', suggestion);
        overlay.remove();
      };
      row.appendChild(cancel);
      row.appendChild(submit);
      modal.appendChild(row);
      overlay.appendChild(modal);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.remove();
      });
      document.body.appendChild(overlay);
      ta.focus();
    }

    if (content) {
      var editModName = (content.id || '').replace(/___/g, '.');
      if (editModName) {
        proseBlocks.forEach(function (block) {
          var btn = document.createElement('button');
          btn.className = 'pv-edit-btn';
          btn.title = 'Suggest an edit to this text';
          btn.innerHTML = '✎';
          btn.onclick = function () { openEditModal(block, editModName); };
          block.classList.add('pv-editable');
          block.appendChild(btn);
        });
      }
    }

    /* ── 5. Header stats (pages · areas), like paperview's ──────── */
    var nPages = document.querySelectorAll('.module-tree a[title]').length ||
                 document.querySelectorAll('.pv-card').length;
    var nAreas = document.querySelectorAll('.pv-area-row').length ||
                 document.querySelectorAll('.pv-tree > details').length ||
                 document.querySelectorAll('.pv-section-title').length;
    if (nPages) {
      stats.textContent = (nAreas ? nAreas + ' areas · ' : '') + nPages + ' pages';
    }
  });
})();
