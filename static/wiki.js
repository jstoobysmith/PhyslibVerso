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
    var contributeLink = document.createElement('a');
    contributeLink.className = 'pv-navlink pv-navlink-cta';
    contributeLink.href = 'contribute/';
    contributeLink.textContent = 'Contribute';
    contributeLink.title = 'How to improve this wiki — no Lean needed';
    right.appendChild(contributeLink);
    var roadmap = document.createElement('a');
    roadmap.className = 'pv-navlink';
    roadmap.href = 'roadmap/';
    roadmap.textContent = 'Roadmap';
    right.appendChild(roadmap);
    var search = document.createElement('a');
    search.className = 'pv-search';
    search.href = 'search/';
    search.innerHTML = SEARCH_ICON + '<span>Search definitions and text…</span>';
    right.appendChild(search);
    header.appendChild(right);

    document.body.insertBefore(header, document.body.firstChild);
    document.body.classList.add('pv');

    /* ── 1a. Sidebar toggle (works at every screen size) ─────────
           Replaces Verso's mobile-only hamburger with a header button that
           collapses the docked sidebar on desktop and drives an overlay
           drawer on mobile. Open/closed state is persisted. */
    var sidebarEl = document.querySelector('.layout .sidebar') || document.querySelector('.sidebar');
    if (sidebarEl) {
      var navToggle = document.createElement('button');
      navToggle.className = 'pv-nav-toggle';
      navToggle.setAttribute('aria-label', 'Toggle navigation sidebar');
      navToggle.title = 'Show/hide the navigation sidebar';
      navToggle.innerHTML = '<span></span><span></span><span></span>';
      header.insertBefore(navToggle, header.firstChild);

      var NAV_KEY = 'pv-nav-open';
      var isPhone = function () { return window.innerWidth <= 768; };
      function setNav(open, persist) {
        document.body.classList.toggle('pv-nav-open', open);
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        /* Behind an open drawer the page must not scroll, or a swipe that
           misses the drawer scrolls the article underneath it. */
        document.documentElement.classList.toggle('pv-nav-locked',
          open && isPhone());
        /* Only the docked (desktop) state is remembered: on a phone the drawer
           is a modal, and restoring it open would hide the next page behind it. */
        if (persist !== false && !isPhone()) {
          try { localStorage.setItem(NAV_KEY, open ? '1' : '0'); } catch (e) { /* private */ }
        }
      }
      var stored = null;
      try { stored = localStorage.getItem(NAV_KEY); } catch (e) { /* private */ }
      /* Default: docked open on wide screens, drawer closed on phones. */
      setNav(isPhone() ? false : stored !== '0', false);
      navToggle.addEventListener('click', function () {
        setNav(!document.body.classList.contains('pv-nav-open'));
      });

      var scrim = document.createElement('div');
      scrim.className = 'pv-scrim';
      scrim.addEventListener('click', function () { setNav(false); });
      document.body.appendChild(scrim);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isPhone()) setNav(false);
      });
      /* Tapping a page link closes the drawer: same-page anchors would
         otherwise scroll the article while the drawer still covers it. */
      sidebarEl.addEventListener('click', function (e) {
        if (isPhone() && e.target.closest && e.target.closest('a')) setNav(false);
      });
      /* Rotating a phone to landscape (or resizing a window) crosses the
         breakpoint: re-apply the mode's default rather than leaving a
         drawer-shaped sidebar docked open, or vice versa. */
      var wasPhone = isPhone();
      window.addEventListener('resize', function () {
        if (isPhone() === wasPhone) return;
        wasPhone = isPhone();
        setNav(isPhone() ? false : stored !== '0', false);
      });
    }

    /* The design credit lives in a page footnote (added near the end of this
       function), not a top banner. */

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

      /* ── 3c. "On this page" as an in-page box, not a right rail.
             Moving Verso's .page-toc into the article collapses the empty
             right column (so the article uses the full width) and gives phones
             a table of contents too. It's collapsible and scrolls if tall. */
      var toc = document.querySelector('.page-toc');
      if (toc) {
        toc.classList.add('pv-toc-box');
        var anchor = content.querySelector('.pv-alpha-banner') ||
                     content.querySelector('.pv-meta');
        if (anchor) anchor.insertAdjacentElement('afterend', toc);
        else content.insertBefore(toc, content.querySelector('.mod-doc') || content.firstChild);
        /* On a phone a full table of contents can be a screen and a half of
           links before the article even starts, so start it folded away. */
        if (window.innerWidth <= 768) toc.classList.add('pv-toc-collapsed');
        var tocTitle = toc.querySelector('.page-toc-title');
        if (tocTitle) {
          tocTitle.classList.add('pv-toc-toggle');
          tocTitle.setAttribute('role', 'button');
          tocTitle.setAttribute('tabindex', '0');
          var toggleToc = function () { toc.classList.toggle('pv-toc-collapsed'); };
          tocTitle.addEventListener('click', toggleToc);
          tocTitle.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleToc(); }
          });
        }
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

        /* Bring the current page into view by scrolling the sidebar itself.
           `scrollIntoView` would also scroll every ancestor scroller — on a
           phone, where the document scrolls, that jumps past the article. */
        var curRow = treeWrap.querySelector('.leaf.current, summary.current');
        var navScroller = document.querySelector('.layout .sidebar') || sidebarEl;
        if (curRow && navScroller) {
          navScroller.scrollTop += curRow.getBoundingClientRect().top -
            navScroller.getBoundingClientRect().top - navScroller.clientHeight / 2;
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

      /* ── Contributor pitch: what this is, and the three steps ────
             The library is long on formalized physics and short on prose, so
             the front page leads with the ask rather than burying it. */
      var editCallout = document.createElement('div');
      editCallout.className = 'pv-edit-callout';
      editCallout.innerHTML =
        '<span class="pv-edit-callout-ico" aria-hidden="true">✎</span>' +
        '<div><b>This is a wiki — and it needs physicists, not Lean users.</b> ' +
        'Every result here has been machine-checked; what most pages lack is the ' +
        'English explaining what it means, which convention it uses and where it ' +
        'comes from. If you know the physics you can fix that today, in the browser, ' +
        'without installing anything.</div>';
      landing.appendChild(editCallout);

      var howto = document.createElement('div');
      howto.className = 'pv-howto';
      var HOW_STEPS = [
        ['Find a page', 'Anything in your field — use the list below, the sidebar, ' +
          'or the search box.'],
        ['Press <span class="pv-inline-edit">✎&nbsp;Edit</span>',
          'Every block of prose has one. Type into it like a document; there is a ' +
          'preview for your maths.'],
        ['Press “Propose”', 'It opens GitHub with the change already written up. A ' +
          'maintainer reviews it and credits you as a co-author.']
      ];
      howto.innerHTML = HOW_STEPS.map(function (s, i) {
        return '<div class="pv-howto-step"><span class="pv-howto-n">' + (i + 1) +
          '</span><b>' + s[0] + '</b><span>' + s[1] + '</span></div>';
      }).join('') +
        '<div class="pv-howto-cta"><a href="contribute/">Read the contributor guide — ' +
        'what to write, how to write maths, and what happens next →</a></div>';
      landing.appendChild(howto);

      /* ── "Start here": the pages most starved of documentation ───
             Ranked by formalized results per character of prose, two per area.
             This is the concrete answer to "what should I write?", so it comes
             before everything else on the page. */
      var editSection = document.createElement('div');
      editSection.className = 'pv-edit-candidates';
      editSection.style.display = 'none';
      editSection.innerHTML =
        '<div class="pv-section-title">Start here: pages that need documentation</div>' +
        '<div class="pv-candidates-note">Two pages from each area, ranked by how much ' +
        'formalized physics they carry per character of explanation — many results, ' +
        'almost no prose. Pick one in your field and write the paragraph that should ' +
        'have been at the top of it.</div>' +
        '<div class="pv-candidates-body"></div>' +
        '<div class="pv-cand-foot"></div>';
      landing.appendChild(editSection);

      fetch('edit-candidates.json')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var cands = data.candidates || [];
          if (!cands.length) return;
          var rows = cands.map(function (c) {
            var title = c.path.replace(/\./g, ' \u203a ');
            var alpha = c.source === 'PhyslibAlpha'
              ? ' <span class="pv-chip-alpha">Alpha</span>' : '';
            /* The numbers carry their own labels: on a phone the table collapses
               to one row per page and a header line would be lost. */
            return '<a class="pv-cand-row" href="' + c.href + '">' +
              '<span class="pv-cand-name">' + title + alpha + '</span>' +
              '<span class="pv-cand-num"><span class="pv-cand-lbl">results </span>' +
              c.decls + '</span>' +
              '<span class="pv-cand-num"><span class="pv-cand-lbl">prose </span>' +
              (c.docChars || 0) + ' ch</span></a>';
          }).join('');
          editSection.querySelector('.pv-candidates-body').innerHTML =
            '<div class="pv-cand-row pv-cand-head"><span class="pv-cand-name">Page</span>' +
            '<span class="pv-cand-num">Results</span>' +
            '<span class="pv-cand-num">Prose</span></div>' + rows;
          /* "Pick one for me" removes the last excuse not to start. */
          var foot = editSection.querySelector('.pv-cand-foot');
          var pick = document.createElement('button');
          pick.className = 'pv-linkbtn';
          pick.type = 'button';
          pick.textContent = 'Pick one for me →';
          pick.onclick = function () {
            var c = cands[Math.floor(Math.random() * cands.length)];
            window.location.href = c.href;
          };
          foot.appendChild(pick);
          var guide = document.createElement('a');
          guide.href = 'contribute/';
          guide.textContent = 'How to write a good page overview';
          foot.appendChild(guide);
          editSection.style.display = '';
        })
        .catch(function () { /* file absent (e.g. no roadmap build) — hide */ });

      /* ── Leaderboard: who has opened the most `documentation` issues ──
             Queried live from the GitHub API (public, CORS-enabled). Hidden if
             the API is unreachable/rate-limited or there are none yet. */
      var board = document.createElement('div');
      board.className = 'pv-leaderboard';
      board.style.display = 'none';
      board.innerHTML =
        '<div class="pv-section-title">Documentation contributors</div>' +
        '<div class="pv-candidates-note">People who have opened the most issues ' +
        'labelled <code>documentation</code> on ' +
        '<a href="https://github.com/leanprover-community/physlib/labels/documentation" ' +
        'target="_blank" rel="noopener">leanprover-community/physlib</a>.</div>' +
        '<div class="pv-board-body"></div>';
      landing.appendChild(board);

      fetch('https://api.github.com/search/issues?per_page=100&q=' +
            encodeURIComponent('repo:leanprover-community/physlib label:documentation is:issue'))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.items || !data.items.length) return;
          var byUser = {};
          data.items.forEach(function (it) {
            var u = it.user || {};
            if (!u.login) return;
            if (!byUser[u.login]) byUser[u.login] = { login: u.login, avatar: u.avatar_url, url: u.html_url, n: 0 };
            byUser[u.login].n += 1;
          });
          var ranked = Object.keys(byUser).map(function (k) { return byUser[k]; })
            .sort(function (a, b) { return b.n - a.n || a.login.localeCompare(b.login); })
            .slice(0, 10);
          if (!ranked.length) return;
          board.querySelector('.pv-board-body').innerHTML = ranked.map(function (u, i) {
            return '<a class="pv-board-row" href="' + u.url + '" target="_blank" rel="noopener">' +
              '<span class="pv-board-rank">' + (i + 1) + '</span>' +
              '<img class="pv-board-avatar" src="' + u.avatar + '" alt="" width="22" height="22">' +
              '<span class="pv-board-name">' + u.login + '</span>' +
              '<span class="pv-board-count">' + u.n + (u.n === 1 ? ' issue' : ' issues') + '</span></a>';
          }).join('');
          board.style.display = '';
        })
        .catch(function () { /* offline / rate-limited — leave hidden */ });

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

    /* Serialize a rendered docstring back to its Markdown source, so the
       edit box shows `code`, *emphasis*, headings and lists rather than
       flattened text. Two Verso-isms: a docstring's `#` heading renders as
       <h2> (so levels shift down by one), and list items are direct <p>
       children of <ul>/<ol> — there are no <li> elements. Math is left
       alone: this runs before KaTeX, so `$…$` is still literal text. */
    /* Elements this script injects (the meta line, the alpha banner, the edit
       button, keyword rows) are page furniture, not part of the docstring —
       they must never be serialized back into the Markdown source. */
    function isInjectedNode(n) {
      if (n.tagName === 'BUTTON') return true;
      var c = n.classList;
      return !!(c && (c.contains('pv-meta') || c.contains('pv-alpha-banner') ||
        c.contains('pv-edit-btn') || c.contains('pv-kw-row') ||
        c.contains('page-toc') || c.contains('pv-lean-help') ||
        c.contains('pv-improve')));
    }

    function mdInline(node) {
      var out = '';
      Array.prototype.forEach.call(node.childNodes, function (n) {
        if (n.nodeType === 3) { out += n.nodeValue; return; }
        if (n.nodeType !== 1 || isInjectedNode(n)) return;
        var tag = n.tagName;
        if (tag === 'CODE') out += '`' + n.textContent + '`';
        else if (tag === 'EM' || tag === 'I') out += '*' + mdInline(n) + '*';
        else if (tag === 'STRONG' || tag === 'B') out += '**' + mdInline(n) + '**';
        else if (tag === 'A') {
          var href = n.getAttribute('href') || '';
          var label = mdInline(n);
          /* <url> autolinks render with the URL as their own label. */
          out += label.trim() === href ? '<' + href + '>' : '[' + label + '](' + href + ')';
        } else if (tag === 'BR') out += '\n';
        else out += mdInline(n);
      });
      return out;
    }

    /* Indent every line after the first, so wrapped list items and nested
       blocks stay inside their item. */
    function mdHang(text, pad) {
      return text.split('\n').join('\n' + pad);
    }

    function mdList(list, hShift) {
      var ordered = list.tagName === 'OL';
      var nestPad = ordered ? '   ' : '  ';
      var lines = [];
      var count = 0;
      Array.prototype.forEach.call(list.children, function (child) {
        var tag = child.tagName;
        if (tag === 'P' || tag === 'LI') {
          count += 1;
          var marker = ordered ? count + '. ' : '- ';
          var body = tag === 'LI' ? mdBlocks(child, hShift) : mdInline(child).trim();
          var pad = new Array(marker.length + 1).join(' ');
          lines.push(marker + mdHang(body.trim(), pad));
        } else if (tag === 'UL' || tag === 'OL') {
          lines.push(nestPad + mdHang(mdList(child, hShift), nestPad));
        } else {
          var other = mdBlocks(child, hShift).trim();
          if (other) lines.push(other);
        }
      });
      return lines.join('\n');
    }

    var BLOCK_TAGS = /^(H[1-6]|P|UL|OL|PRE|HR|BLOCKQUOTE|DIV|FIGURE|TABLE)$/;

    function mdInlineNodes(nodes) {
      var span = document.createElement('span');
      nodes.forEach(function (n) { span.appendChild(n.cloneNode(true)); });
      return mdInline(span).trim();
    }

    /* `hShift` maps rendered heading levels back to `#` counts. Verso renders a
       docstring's `#` as <h2>, so capture passes -1; the visual editor renders
       Markdown with marked (`#` → <h1>), so it passes 0.
       Consecutive inline children (text, `code`, *em*, links) are grouped into
       one paragraph — otherwise `<li><code>X</code> y</li>` would split. */
    function mdBlocks(node, hShift) {
      if (hShift == null) hShift = -1;
      var out = [];
      var push = function (text, kind) {
        if (text) out.push({ text: text, kind: kind });
      };
      var run = [];
      var flush = function () {
        if (run.length) { push(mdInlineNodes(run), 'para'); run = []; }
      };
      Array.prototype.forEach.call(node.childNodes, function (n) {
        if (n.nodeType === 3) { run.push(n); return; }
        if (n.nodeType !== 1 || isInjectedNode(n)) return;
        var tag = n.tagName;
        if (!BLOCK_TAGS.test(tag)) { run.push(n); return; } // inline element
        flush();
        if (/^H[1-6]$/.test(tag)) {
          var level = Math.max(1, parseInt(tag.charAt(1), 10) + hShift);
          push(new Array(level + 1).join('#') + ' ' + mdInline(n).trim(), 'head');
        } else if (tag === 'P' || tag === 'DIV' || tag === 'FIGURE') {
          push(mdBlocks(n, hShift).trim(), 'para');
        } else if (tag === 'UL' || tag === 'OL') {
          push(mdList(n, hShift), 'list');
        } else if (tag === 'PRE') {
          push('```\n' + n.textContent.replace(/^\n+|\n+$/g, '') + '\n```', 'pre');
        } else if (tag === 'HR') {
          push('---', 'rule');
        } else if (tag === 'BLOCKQUOTE') {
          push(mdBlocks(n, hShift).split('\n').map(function (line) {
            return line ? '> ' + line : '>';
          }).join('\n'), 'quote');
        } else {
          push(mdBlocks(n, hShift).trim(), 'para');
        }
      });
      flush();
      /* A list directly under its introducing paragraph stays tight, the way
         it is written in the docstring; everything else gets a blank line. */
      return out.map(function (item, i) {
        if (!i) return item.text;
        var tight = item.kind === 'list' && out[i - 1].kind === 'para';
        return (tight ? '\n' : '\n\n') + item.text;
      }).join('');
    }

    var proseBlocks = Array.prototype.slice.call(
      document.querySelectorAll('.code-content > .md-text, .code-content > .verso-text'));
    proseBlocks.forEach(function (b) { b.pvSource = mdBlocks(b, -1).trim(); });

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
    /* Label applied to wiki issues; the home-page leaderboard counts it. The
       `labels=` URL param only takes effect for users with triage/write access
       to the repo — for others GitHub drops it and a maintainer (or a
       label-on-footer Action) must apply it. */
    var GITHUB_LABEL = 'documentation';

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

    function srcPathOf(modName) {
      return modName.split('.').join('/') + '.lean';
    }
    function srcUrlOf(modName) {
      return 'https://github.com/' + GITHUB_REPO + '/blob/master/' + srcPathOf(modName);
    }

    /* Prefilled GitHub issue. `reason` is the contributor's own note ("why"),
       which is what a maintainer reads first. */
    function openIssue(modName, original, suggestion, reason) {
      var body = '### Documentation edit suggestion\n\n' +
        '**Module:** `' + modName + '`\n' +
        '**Source file:** ' + srcUrlOf(modName) + '\n\n' +
        (reason ? '**Why:** ' + reason + '\n\n' : '') +
        'Suggested change to the docstring Markdown (reconstructed from the ' +
        'rendered page, so formatting may differ slightly from the source):\n\n' +
        '```diff\n' + diffLines(original, suggestion) + '\n```\n\n' +
        '_If this suggestion is accepted, please credit the issue author as a ' +
        'co-author of the change (`Co-authored-by:`)._\n\n' +
        '---\n*Suggested from the Physlib wiki.*\n';
      var base = 'https://github.com/' + GITHUB_REPO + '/issues/new' +
        '?labels=' + encodeURIComponent(GITHUB_LABEL) +
        '&title=' + encodeURIComponent('docs: suggestion for ' + modName);
      var url = base + '&body=' + encodeURIComponent(body);
      if (url.length > 7500) {
        var short = 'The suggested diff was too long for a URL and has been ' +
          'copied to the suggester’s clipboard — paste it here.';
        if (navigator.clipboard) navigator.clipboard.writeText(body);
        alert('The diff is too long for a prefilled issue and was copied ' +
          'to your clipboard — please paste it into the issue body.');
        url = base + '&body=' + encodeURIComponent(short);
      }
      window.open(url, '_blank');
    }

    /* A short prefilled issue for the page-level actions ("add a reference",
       "report an error", "ask a question") — no diff, just a template. */
    function openTemplateIssue(modName, kind) {
      var TEMPLATES = {
        reference: {
          title: 'docs: add a reference to ' + modName,
          heading: 'Suggested reference',
          prompt: 'Which book, paper, review or lecture notes should this page ' +
            'point to, and which part of the page does it support?\n\n' +
            '- **Reference:** \n- **Relevant to:** \n- **Why it helps:** \n'
        },
        error: {
          title: 'docs: possible error on ' + modName,
          heading: 'Possible error',
          prompt: 'What looks wrong, and what do you think it should say?\n\n' +
            '- **Where:** \n- **What it says:** \n- **What I think it should say:** \n'
        },
        question: {
          title: 'docs: question about ' + modName,
          heading: 'Question',
          prompt: 'What was unclear? Questions are useful even when nothing is ' +
            'wrong — a page that needs a question answered is a page that needs ' +
            'better documentation.\n\n- **My question:** \n'
        },
        notation: {
          title: 'docs: explain the notation on ' + modName,
          heading: 'Notation that needs explaining',
          prompt: 'Which symbol, name or convention on this page is not defined ' +
            'in the prose?\n\n- **Notation:** \n- **What it means:** \n'
        }
      };
      var t = TEMPLATES[kind] || TEMPLATES.question;
      var body = '### ' + t.heading + '\n\n' +
        '**Page:** ' + location.href + '\n' +
        '**Module:** `' + modName + '`\n' +
        '**Source file:** ' + srcUrlOf(modName) + '\n\n' +
        t.prompt + '\n---\n*Sent from the Physlib wiki. No Lean knowledge ' +
        'required — a maintainer will make the change.*\n';
      window.open('https://github.com/' + GITHUB_REPO + '/issues/new' +
        '?labels=' + encodeURIComponent(GITHUB_LABEL) +
        '&title=' + encodeURIComponent(t.title) +
        '&body=' + encodeURIComponent(body), '_blank');
    }

    /* Render Markdown to HTML for the visual editor, using the marked bundle
       Verso already ships. Falls back to escaped text if it's unavailable. */
    function renderMarkdown(md) {
      if (window.marked) {
        try { return (marked.parse ? marked.parse(md) : marked(md)); } catch (e) { /* fall through */ }
      }
      var esc = md.replace(/[&<>]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
      });
      return '<p>' + esc.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
    }

    /* ── Drafts ───────────────────────────────────────────────────
       An edit is often interrupted (a phone call, a closed tab). Keeping the
       work in localStorage means a contributor never loses it, which matters
       most for the people we are trying not to scare off. */
    var DRAFT_PREFIX = 'pv-draft:';
    function draftKey(modName, idx) { return DRAFT_PREFIX + modName + '#' + idx; }
    function saveDraft(key, md) {
      try { localStorage.setItem(key, JSON.stringify({ md: md, t: Date.now() })); }
      catch (e) { /* private mode / quota — drafts are a nicety, not a promise */ }
    }
    function loadDraft(key) {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }
    function clearDraft(key) {
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }
    function ago(t) {
      var s = Math.max(1, Math.round((Date.now() - t) / 1000));
      if (s < 90) return s + ' seconds ago';
      if (s < 5400) return Math.round(s / 60) + ' minutes ago';
      if (s < 172800) return Math.round(s / 3600) + ' hours ago';
      return Math.round(s / 86400) + ' days ago';
    }

    var HELP_SEEN_KEY = 'pv-edit-help-seen';

    /* A Wikipedia-style editor: Visual (WYSIWYG), Markdown and Preview tabs
       kept in sync, submitting a prefilled GitHub issue with the diff. */
    function openEditModal(block, modName, blockIndex) {
      var original = (block.pvSource || '').trim();
      var haveVisual = !!window.marked;
      var key = draftKey(modName, blockIndex);

      var overlay = document.createElement('div');
      overlay.className = 'pv-modal-overlay';
      var modal = document.createElement('div');
      modal.className = 'pv-modal pv-modal-edit';

      var head = document.createElement('div');
      head.className = 'pv-modal-head';
      head.innerHTML =
        '<div class="pv-modal-title">Edit this documentation</div>' +
        '<div class="pv-modal-sub">You are editing the <b>English explanation</b> ' +
        'only — the Lean statements and proofs on the page are not touched, and ' +
        'you do not need to know any Lean. Submitting opens a prefilled GitHub ' +
        'issue for a maintainer to review.</div>';
      modal.appendChild(head);

      /* First-timers get the three-step explanation opened for them; after one
         edit it stays folded away. */
      var seenHelp = false;
      try { seenHelp = localStorage.getItem(HELP_SEEN_KEY) === '1'; } catch (e) { /* private */ }
      var help = document.createElement('details');
      help.className = 'pv-help-box';
      if (!seenHelp) help.setAttribute('open', '');
      help.innerHTML =
        '<summary>First time? Here is exactly what happens</summary>' +
        '<ol class="pv-help-steps">' +
        '<li><b>Write.</b> Change the text below like any document. ' +
        'Use the toolbar for bold, headings, lists, links and maths — or switch ' +
        'to the <i>Markdown</i> tab if you prefer plain text. Maths goes between ' +
        'dollar signs: <code>$E = mc^2$</code>. Check it in the <i>Preview</i> tab.</li>' +
        '<li><b>Say why (optional).</b> One line telling a maintainer what you ' +
        'improved makes a suggestion much easier to accept.</li>' +
        '<li><b>Propose.</b> The button opens GitHub with everything filled in; ' +
        'you press <i>Submit new issue</i>. A maintainer copies your text into the ' +
        'Lean source and credits you as a co-author.</li>' +
        '</ol>' +
        '<div class="pv-help-foot">Nothing you do here can break the library: ' +
        'suggestions are reviewed before anything changes. ' +
        '<a href="contribute/" target="_blank" rel="noopener">' +
        'Read the full guide →</a></div>';
      modal.appendChild(help);
      try { localStorage.setItem(HELP_SEEN_KEY, '1'); } catch (e) { /* private */ }

      /* Tab strip (Visual | Markdown | Preview). */
      var tabs = document.createElement('div');
      tabs.className = 'pv-tabs';
      var mkTab = function (label, title) {
        var b = document.createElement('button');
        b.className = 'pv-tab';
        b.type = 'button';
        b.textContent = label;
        b.title = title;
        tabs.appendChild(b);
        return b;
      };
      var tabVisual = mkTab('Visual', 'Edit the formatted text directly');
      var tabMd = mkTab('Markdown', 'Edit the Markdown source');
      var tabPreview = mkTab('Preview', 'See it the way it will appear, with maths rendered');
      if (!haveVisual) tabVisual.style.display = 'none';
      modal.appendChild(tabs);

      /* Formatting toolbar (visual mode). */
      var toolbar = document.createElement('div');
      toolbar.className = 'pv-toolbar';
      var TOOLS = [
        ['bold', '<b>B</b>', 'Bold'],
        ['italic', '<i>I</i>', 'Italic'],
        ['code', '&lt;&gt;', 'Inline code — use it for Lean names, e.g. MassUnit'],
        ['math', '<i>∑</i>', 'Maths: wraps the selection in $…$ (LaTeX)'],
        ['h2', 'H2', 'Heading'],
        ['h3', 'H3', 'Subheading'],
        ['ul', '• List', 'Bulleted list'],
        ['ol', '1. List', 'Numbered list'],
        ['link', '🔗', 'Link']
      ];

      var visual = document.createElement('div');
      visual.className = 'pv-visual';
      visual.contentEditable = 'true';
      visual.spellcheck = true;
      visual.innerHTML = renderMarkdown(original);

      var ta = document.createElement('textarea');
      ta.className = 'pv-modal-text';
      ta.value = original;

      var preview = document.createElement('div');
      preview.className = 'pv-preview';

      function runTool(cmd) {
        if (mode === 'markdown') { runToolMd(cmd); return; }
        visual.focus();
        try { document.execCommand('styleWithCSS', false, false); } catch (e) { /* */ }
        if (cmd === 'bold' || cmd === 'italic') document.execCommand(cmd);
        else if (cmd === 'ul') document.execCommand('insertUnorderedList');
        else if (cmd === 'ol') document.execCommand('insertOrderedList');
        else if (cmd === 'h2' || cmd === 'h3') {
          var tag = cmd.toUpperCase();
          var inHeading = document.queryCommandValue &&
            (document.queryCommandValue('formatBlock') || '').toLowerCase() === cmd;
          document.execCommand('formatBlock', false, inHeading ? 'P' : tag);
        } else if (cmd === 'code' || cmd === 'math') {
          var sel = window.getSelection();
          var text = sel && !sel.isCollapsed ? sel.toString() : '';
          var esc = function (s) {
            return s.replace(/[&<>]/g, function (c) {
              return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
            });
          };
          /* Maths stays literal `$…$` in the source, so it round-trips through
             the Markdown serializer and renders on the page via KaTeX. */
          document.execCommand('insertHTML', false, cmd === 'code'
            ? '<code>' + esc(text || 'code') + '</code>'
            : esc('$' + (text || 'E = mc^2') + '$'));
        } else if (cmd === 'link') {
          var url = window.prompt('Link URL');
          if (url) document.execCommand('createLink', false, url);
        }
      }
      /* The same buttons work on the Markdown tab by wrapping the selection. */
      function runToolMd(cmd) {
        var WRAP = {
          bold: ['**', '**'], italic: ['*', '*'], code: ['`', '`'],
          math: ['$', '$'], h2: ['# ', ''], h3: ['## ', ''],
          ul: ['- ', ''], ol: ['1. ', '']
        };
        ta.focus();
        var s = ta.selectionStart, e = ta.selectionEnd;
        var sel = ta.value.slice(s, e);
        if (cmd === 'link') {
          var url = window.prompt('Link URL');
          if (!url) return;
          var text = sel || 'link text';
          ta.setRangeText('[' + text + '](' + url + ')', s, e, 'end');
        } else {
          var w = WRAP[cmd];
          if (!w) return;
          ta.setRangeText(w[0] + (sel || '') + w[1], s, e, sel ? 'end' : 'end');
        }
        onEdit();
      }
      TOOLS.forEach(function (t) {
        var b = document.createElement('button');
        b.className = 'pv-tool';
        b.type = 'button';
        b.innerHTML = t[1];
        b.title = t[2];
        /* mousedown-preventDefault keeps the editor selection alive. */
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () { runTool(t[0]); });
        toolbar.appendChild(b);
      });

      var editWrap = document.createElement('div');
      editWrap.className = 'pv-edit-wrap';
      editWrap.appendChild(toolbar);
      editWrap.appendChild(visual);
      editWrap.appendChild(ta);
      editWrap.appendChild(preview);
      modal.appendChild(editWrap);

      /* Contenteditable Enter should make paragraphs, not <div>s. */
      try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* */ }

      var mode = haveVisual ? 'visual' : 'markdown';
      function currentMarkdown() {
        return (mode === 'markdown' ? ta.value : mdBlocks(visual, 0)).trim();
      }
      function setMarkdown(md) {
        ta.value = md;
        visual.innerHTML = renderMarkdown(md);
      }
      function syncTo(next) {
        if (next === mode) return;
        var md = currentMarkdown();
        if (next === 'markdown') ta.value = md;
        else if (next === 'visual') visual.innerHTML = renderMarkdown(md);
        else {
          preview.innerHTML = renderMarkdown(md);
          renderMathIn(preview);
        }
        mode = next;
        modal.classList.toggle('pv-mode-md', mode === 'markdown');
        modal.classList.toggle('pv-mode-preview', mode === 'preview');
        tabVisual.classList.toggle('active', mode === 'visual');
        tabMd.classList.toggle('active', mode === 'markdown');
        tabPreview.classList.toggle('active', mode === 'preview');
        if (mode !== 'preview') (mode === 'visual' ? visual : ta).focus();
      }
      tabVisual.addEventListener('click', function () { syncTo('visual'); });
      tabMd.addEventListener('click', function () { syncTo('markdown'); });
      tabPreview.addEventListener('click', function () { syncTo('preview'); });
      modal.classList.toggle('pv-mode-md', mode === 'markdown');
      tabVisual.classList.toggle('active', mode === 'visual');
      tabMd.classList.toggle('active', mode === 'markdown');

      /* Autosave, debounced. */
      var saveTimer = null;
      var status = document.createElement('div');
      status.className = 'pv-edit-status';
      function onEdit() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
          var md = currentMarkdown();
          if (md === original) { clearDraft(key); status.textContent = ''; return; }
          saveDraft(key, md);
          status.textContent = 'Draft saved in this browser';
        }, 700);
      }
      visual.addEventListener('input', onEdit);
      ta.addEventListener('input', onEdit);

      /* An interrupted edit is offered back rather than silently dropped. */
      var draft = loadDraft(key);
      if (draft && draft.md && draft.md !== original) {
        var bar = document.createElement('div');
        bar.className = 'pv-draft-bar';
        bar.innerHTML = '<span>You have an unsent draft of this section from ' +
          ago(draft.t) + '.</span>';
        var restore = document.createElement('button');
        restore.className = 'pv-linkbtn';
        restore.type = 'button';
        restore.textContent = 'Restore it';
        restore.onclick = function () {
          setMarkdown(draft.md);
          if (mode === 'preview') syncTo('visual');
          bar.remove();
        };
        var discard = document.createElement('button');
        discard.className = 'pv-linkbtn';
        discard.type = 'button';
        discard.textContent = 'Discard';
        discard.onclick = function () { clearDraft(key); bar.remove(); };
        bar.appendChild(restore);
        bar.appendChild(discard);
        editWrap.insertBefore(bar, toolbar);
      }

      /* "Why this change?" — the single most useful thing a reviewer can read. */
      var why = document.createElement('div');
      why.className = 'pv-why';
      why.innerHTML = '<label for="pv-why-input">Why this change? ' +
        '<span>(optional, one line — e.g. “the overview never says what ' +
        '<i>MassUnit</i> is for”)</span></label>';
      var whyInput = document.createElement('input');
      whyInput.type = 'text';
      whyInput.id = 'pv-why-input';
      whyInput.className = 'pv-why-input';
      whyInput.placeholder = 'What does this improve?';
      why.appendChild(whyInput);
      modal.appendChild(why);

      modal.appendChild(status);

      /* Submitting posts a GitHub issue, which needs a signed-in account. */
      var note = document.createElement('div');
      note.className = 'pv-modal-note';
      note.innerHTML = '<span class="pv-note-ico" aria-hidden="true">🔒</span>' +
        '<span>Submitting opens GitHub in a new tab. You must be <b>signed in to ' +
        'a GitHub account</b> to post the suggestion — it’s free to ' +
        '<a href="https://github.com/join" target="_blank" rel="noopener">create one</a>. ' +
        '<b>If your suggestion is accepted, you’ll be credited as a co-author.</b></span>';
      modal.appendChild(note);

      var row = document.createElement('div');
      row.className = 'pv-modal-actions';
      var cancel = document.createElement('button');
      cancel.className = 'pv-btn';
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.onclick = function () { overlay.remove(); };

      var submit = document.createElement('button');
      submit.className = 'pv-btn pv-btn-primary';
      submit.type = 'button';
      submit.textContent = 'Propose on GitHub →';
      function doSubmit() {
        var suggestion = currentMarkdown();
        if (suggestion === original) {
          alert('No changes made yet — edit the text first.');
          return;
        }
        openIssue(modName, original, suggestion, whyInput.value.trim());
        clearDraft(key);
        overlay.remove();
      }
      submit.onclick = doSubmit;
      row.appendChild(cancel);
      row.appendChild(submit);
      modal.appendChild(row);

      overlay.appendChild(modal);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.remove();
      });
      overlay.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') overlay.remove();
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') doSubmit();
      });
      document.body.appendChild(overlay);
      (haveVisual ? visual : ta).focus();
    }

    /* The first node of a block that is actual documentation rather than page
       furniture: the heading, the meta line, the alpha notice and the table of
       contents are all injected into the overview block above the prose. */
    function firstProseNode(block) {
      var found = null;
      Array.prototype.some.call(block.childNodes, function (n) {
        if (n.nodeType === 3) return !!n.nodeValue.trim() && (found = n);
        if (n.nodeType !== 1) return false;
        if (/^H[1-6]$/.test(n.tagName)) return false;
        var c = n.classList;
        if (c && (c.contains('pv-meta') || c.contains('pv-alpha-banner') ||
                  c.contains('page-toc') || c.contains('pv-lean-help'))) return false;
        found = n;
        return true;
      });
      return found;
    }

    if (content) {
      var editModName = (content.id || '').replace(/___/g, '.');
      if (editModName) {
        /* The page overview is the block worth the most to a reader and the
           one most often missing, so it gets a full-width invitation rather
           than the small ✎ pill the other docstrings carry.

           Identifying it takes two steps. A module docstring is split into one
           block per `/-! … -/` in the source, so a page has several `mod-doc`
           blocks — the overview plus a header for each section — and
           declaration docstrings carry `mod-doc` too, distinguished only by an
           `--indent` inline style (see the matching note in wiki.css). The
           overview is therefore the *first* un-indented `mod-doc` block. */
        var seenOverview = false;
        proseBlocks.forEach(function (block, blockIndex) {
          var isOverview = !seenOverview && block.classList.contains('mod-doc') &&
            (block.getAttribute('style') || '').indexOf('--indent') === -1;
          if (isOverview) seenOverview = true;
          var btn = document.createElement('button');
          btn.type = 'button';
          if (isOverview) {
            /* Prose only: the `#` title line is not an overview. Under ~240
               characters there is effectively nothing here, and the button
               asks for an overview; above it, it asks for an improvement —
               inviting someone to "add an overview" below three good
               paragraphs reads as though nobody looked. */
            var prose = (block.pvSource || '').split('\n')
              .filter(function (l) { return !/^#{1,6}\s/.test(l.trim()); })
              .join(' ').trim();
            var thin = prose.length < 240;
            btn.className = 'pv-edit-btn pv-edit-btn-main';
            btn.title = thin
              ? 'Write this page’s overview — no Lean needed'
              : 'Improve this page’s overview — no Lean needed';
            btn.innerHTML = '<span class="pv-edit-ico" aria-hidden="true">✎</span>' +
              '<span class="pv-edit-main-text"><b>Know this area?</b> ' +
              (thin
                ? 'Add a brief overview of the physics here to help us improve.'
                : 'Help us improve the overview of the physics on this page.') +
              '</span>' +
              '<span class="pv-edit-main-cta">' +
              (thin ? 'Add overview' : 'Edit overview') + '</span>';
          } else {
            btn.className = 'pv-edit-btn';
            btn.title = 'Improve this explanation — no Lean needed';
            btn.innerHTML = '<span class="pv-edit-ico">✎</span>' +
              '<span class="pv-edit-label">Edit</span>';
            /* Marks the blocks whose pill floats in the top-right corner, so
               the stylesheet can keep their text clear of it. */
            block.classList.add('pv-editable-pill');
          }
          btn.onclick = function () { openEditModal(block, editModName, blockIndex); };
          block.classList.add('pv-editable');
          if (isOverview) {
            /* Above the prose, not after it: an invitation to write the
               overview belongs where the overview should be, and on a page
               that has none there is otherwise nothing to scroll past to
               find it. It goes below the title and the meta line — asking
               "know this area?" before the page has said which area it is
               would be backwards. */
            block.insertBefore(btn, firstProseNode(block));
          } else {
            block.appendChild(btn);
          }
          /* A draft left behind is easy to forget about; flag it on the button. */
          var d = loadDraft(draftKey(editModName, blockIndex));
          if (d && d.md) {
            btn.classList.add('pv-edit-btn-draft');
            btn.title = 'You have an unsent draft for this section';
            var dot = document.createElement('span');
            dot.className = 'pv-edit-dot';
            dot.setAttribute('aria-hidden', 'true');
            btn.appendChild(dot);
          }
        });
      }
    }

    /* ── 7b. Decoder ring: how to read a Lean page ────────────────
           A physicist arriving here has never seen Lean. Rather than send
           them away to learn it, name the handful of symbols that actually
           appear on these pages and say which parts they can ignore. */
    if (content && typeof editModName === 'string' && editModName) {
      var LEAN_ROWS = [
        ['def', 'A <b>definition</b> — it introduces an object or a piece of notation.'],
        ['theorem&nbsp;/&nbsp;lemma', 'A <b>statement that has been proved</b>. The proof after ' +
          '<code>:=&nbsp;by</code> is machine-checked; you can skip it.'],
        [':=', 'Reads “<b>is defined to be</b>”.'],
        ['(x&nbsp;:&nbsp;ℝ)', '“<b>x is a real number</b>” — the colon gives the type of a symbol.'],
        ['∀&nbsp;x,&nbsp;P&nbsp;x', '“<b>for every</b> x, P(x)”. <code>∃</code> is “there exists”, ' +
          '<code>→</code> is “implies”.'],
        ['Hover a name', 'Every blue name is a link or a hover: it shows what that ' +
          'symbol means and where it is defined.']
      ];
      var leanBox = document.createElement('details');
      leanBox.className = 'pv-lean-help';
      leanBox.innerHTML =
        '<summary>New to Lean? How to read this page</summary>' +
        '<p class="pv-lean-intro">The <b>prose</b> between the code boxes is ordinary ' +
        'English written by physicists — that is the part you are invited to improve, ' +
        'and it needs no Lean at all. The code boxes are the same physics stated so a ' +
        'computer can check it. A rough phrasebook:</p>' +
        '<dl class="pv-lean-gloss">' +
        LEAN_ROWS.map(function (r) {
          return '<dt><code>' + r[0] + '</code></dt><dd>' + r[1] + '</dd>';
        }).join('') +
        '</dl>' +
        '<p class="pv-lean-intro">Coloured cards mark what is <i>not</i> settled: a blue ' +
        '<b>Open problem</b> is work nobody has done yet, and a green or purple ' +
        '<b>Informal</b> card is a statement written in words but not yet formalized. ' +
        'Both are good places to contribute. ' +
        '<a href="contribute/">The full contributor guide →</a></p>';
      var LEAN_KEY = 'pv-lean-help-open';
      try { if (localStorage.getItem(LEAN_KEY) === '1') leanBox.setAttribute('open', ''); }
      catch (e) { /* private */ }
      leanBox.addEventListener('toggle', function () {
        try { localStorage.setItem(LEAN_KEY, leanBox.open ? '1' : '0'); } catch (e) { /* private */ }
      });
      /* Below the overview invitation, which is the more important of the two
         and has to stay directly under the title. */
      var leanAnchor = content.querySelector('.pv-edit-btn-main') ||
                       content.querySelector('.page-toc') ||
                       content.querySelector('.pv-alpha-banner') ||
                       content.querySelector('.pv-meta');
      if (leanAnchor) leanAnchor.insertAdjacentElement('afterend', leanBox);
      else content.insertBefore(leanBox, content.firstChild);

      /* ── 7c. "Help improve this page" ──────────────────────────
             The ✎ buttons only cover *rewriting existing prose*. Most of what
             a page is missing is something else: a reference, an explanation
             of the notation, a correction, or simply a question that reveals
             what is unclear. Each of these opens a prefilled issue, so a
             reader who cannot write the fix can still report it. */
      var improve = document.createElement('section');
      improve.className = 'pv-improve';
      improve.innerHTML =
        '<div class="pv-improve-title">Help improve this page</div>' +
        '<div class="pv-improve-sub">You do not need to know Lean, and you cannot ' +
        'break anything: every action below sends a suggestion for a maintainer to ' +
        'review, and accepted suggestions credit you as a co-author.</div>';
      var actions = document.createElement('div');
      actions.className = 'pv-improve-actions';
      var addAction = function (icon, label, hint, onClick) {
        var b = document.createElement('button');
        b.className = 'pv-improve-btn';
        b.type = 'button';
        b.innerHTML = '<span class="pv-improve-ico" aria-hidden="true">' + icon + '</span>' +
          '<span class="pv-improve-text"><b>' + label + '</b><span>' + hint + '</span></span>';
        b.addEventListener('click', onClick);
        actions.appendChild(b);
      };
      if (proseBlocks.length) {
        addAction('✎', 'Improve the overview',
          'Rewrite or expand the explanation at the top of the page.',
          function () {
            var target = proseBlocks[0];
            target.scrollIntoView({ block: 'start', behavior: 'smooth' });
            openEditModal(target, editModName, 0);
          });
      }
      addAction('📚', 'Suggest a reference',
        'Point to the book, paper or lecture notes this result comes from.',
        function () { openTemplateIssue(editModName, 'reference'); });
      addAction('🔤', 'Explain the notation',
        'Flag a symbol or name the prose never defines.',
        function () { openTemplateIssue(editModName, 'notation'); });
      addAction('⚠️', 'Report an error',
        'Something here reads as wrong, out of date or misleading.',
        function () { openTemplateIssue(editModName, 'error'); });
      addAction('❓', 'Ask a question',
        'A question is a bug report about the documentation.',
        function () { openTemplateIssue(editModName, 'question'); });
      improve.appendChild(actions);
      var links = document.createElement('div');
      links.className = 'pv-improve-links';
      links.innerHTML =
        '<a href="contribute/">Read the contributor guide</a>' +
        '<a href="' + srcUrlOf(editModName) + '" target="_blank" rel="noopener">' +
        'View this page’s source file on GitHub</a>';
      improve.appendChild(links);
      content.appendChild(improve);
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

    /* ── Footnote crediting the design (replaces the old top banner). ── */
    var foot = document.createElement('div');
    foot.className = 'pv-footnote';
    foot.innerHTML = 'Work in progress, for demonstration only. The design of ' +
      'this wiki is copied from ' +
      '<a href="https://paperview.org/" target="_blank" rel="noopener">paperview.org</a> ' +
      'by Sabrina Pasterski.';
    var footHost = content || landing;
    if (footHost) footHost.appendChild(foot);
  });
})();
