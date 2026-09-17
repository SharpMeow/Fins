/* live.js — the atlas keeps happening.
   Historical figures act each year. Fifty facets each. Materials with reactions.
   The record is not a book that closed in Year 1000. */
(function () {
  "use strict";

  var lastNow = 0;
  var lastUi = 0;
  var lastTick = 0;
  var wired = false;
  var yearLog = [];
  var facCache = Object.create(null);
  var FAC_N = 0;

  var FACETS = [
    { id: "love", lo: "has little time for affection", hi: "falls in love easily" },
    { id: "hate", lo: "rarely holds a grudge", hi: "is quick to hatred" },
    { id: "envy", lo: "is content with a neighbor's luck", hi: "is eaten by envy" },
    { id: "cheer", lo: "seldom smiles", hi: "is given to mirth" },
    { id: "depress", lo: "is not easily brought low", hi: "sinks into melancholy" },
    { id: "anger", lo: "is slow to anger", hi: "is often inflamed" },
    { id: "anxiety", lo: "is calm under the weather", hi: "is a nervous wreck" },
    { id: "lust", lo: "has a modest appetite", hi: "is given to lust" },
    { id: "stress", lo: "is impervious to strain", hi: "cracks under little weight" },
    { id: "greed", lo: "does not care for coin", hi: "is greedy" },
    { id: "immod", lo: "is temperate", hi: "cannot leave a bottle" },
    { id: "violent", lo: "avoids a fight", hi: "is given to violence" },
    { id: "persist", lo: "gives up early", hi: "will not let a thing go" },
    { id: "waste", lo: "is careful with goods", hi: "is wasteful" },
    { id: "discord", lo: "keeps the peace", hi: "enjoys discord" },
    { id: "friend", lo: "keeps their own company", hi: "makes friends of strangers" },
    { id: "polite", lo: "is blunt", hi: "is unfailingly polite" },
    { id: "advice", lo: "takes counsel", hi: "disdains advice" },
    { id: "brave", lo: "is a coward", hi: "is brave to a fault" },
    { id: "conf", lo: "doubts themselves", hi: "is overconfident" },
    { id: "vanity", lo: "does not look in a glass", hi: "is vain" },
    { id: "ambition", lo: "has no ambition", hi: "would rule water" },
    { id: "gratitude", lo: "forgets a kindness", hi: "never forgets a kindness" },
    { id: "modest", lo: "is modest", hi: "cannot stop talking of themselves" },
    { id: "humor", lo: "has no humor", hi: "finds a joke in a wreck" },
    { id: "vengeful", lo: "lets injuries go", hi: "is vengeful" },
    { id: "proud", lo: "has no pride", hi: "is fiercely proud" },
    { id: "cruel", lo: "cannot stand cruelty", hi: "is cruel" },
    { id: "single", lo: "is easily distracted", hi: "is single-minded" },
    { id: "hope", lo: "expects the worst", hi: "is hopeful past reason" },
    { id: "curious", lo: "does not ask", hi: "is endlessly curious" },
    { id: "bashful", lo: "has no shame", hi: "is bashful" },
    { id: "privacy", lo: "lives in public", hi: "guards their privacy" },
    { id: "perfect", lo: "is sloppy", hi: "is a perfectionist" },
    { id: "closed", lo: "will hear anything", hi: "is close-minded" },
    { id: "tolerant", lo: "cannot stand difference", hi: "is tolerant" },
    { id: "obsess", lo: "lets feelings pass", hi: "is emotionally obsessive" },
    { id: "swayed", lo: "is unmoved", hi: "is swayed by every feeling" },
    { id: "altruism", lo: "looks to themselves", hi: "is altruistic" },
    { id: "duty", lo: "shades a duty", hi: "is dutiful" },
    { id: "thought", lo: "thinks things through", hi: "is thoughtless" },
    { id: "order", lo: "lives in a mess", hi: "cannot stand disorder" },
    { id: "trust", lo: "trusts no one", hi: "trusts too easily" },
    { id: "gregarious", lo: "avoids a crowd", hi: "is gregarious" },
    { id: "assert", lo: "will not speak up", hi: "is assertive" },
    { id: "active", lo: "is idle", hi: "cannot sit still" },
    { id: "excite", lo: "wants a quiet life", hi: "seeks excitement" },
    { id: "imagine", lo: "has no imagination", hi: "lives in imagined water" },
    { id: "abstract", lo: "wants the concrete", hi: "loves an abstract argument" },
    { id: "art", lo: "has no eye for art", hi: "is moved by craft" },
  ];

  var MATS = [
    { id: "bogwood", cls: "wood", hard: 2, dense: 0.4, val: 3, react: { salt: "swells", iron: "stains black", water: "softens" } },
    { id: "oak", cls: "wood", hard: 3, dense: 0.75, val: 5, react: { water: "rots in the end", salt: "holds" } },
    { id: "mica", cls: "stone", hard: 3, dense: 0.9, val: 8, react: { iron: "sparks", glass: "cuts" } },
    { id: "riverstone", cls: "stone", hard: 6, dense: 2.7, val: 2, react: { water: "rounds" } },
    { id: "brass", cls: "metal", hard: 4, dense: 8.4, val: 12, react: { salt: "tarnishes", water: "dulls" } },
    { id: "iron", cls: "metal", hard: 5, dense: 7.8, val: 6, react: { salt: "rusts", water: "rusts", copper: "pairs" } },
    { id: "copper", cls: "metal", hard: 3, dense: 8.9, val: 8, react: { salt: "goes green", water: "patinas" } },
    { id: "gold", cls: "metal", hard: 2, dense: 19.3, val: 40, react: {} },
    { id: "salt", cls: "crystal", hard: 2, dense: 2.2, val: 1, react: { iron: "eats", copper: "greens", bone: "cures" } },
    { id: "glass", cls: "glass", hard: 5, dense: 2.5, val: 7, react: { mica: "is cut", salt: "etches" } },
    { id: "driftglass", cls: "glass", hard: 5, dense: 2.4, val: 9, react: { salt: "is already of it" } },
    { id: "bone", cls: "organic", hard: 3, dense: 1.8, val: 4, react: { salt: "cures", water: "yellows" } },
    { id: "shell", cls: "organic", hard: 3, dense: 2.6, val: 6, react: { salt: "brightens", mica: "is scored" } },
    { id: "leather", cls: "organic", hard: 1, dense: 0.9, val: 5, react: { salt: "cures", water: "stiffens then rots" } },
    { id: "silk", cls: "fiber", hard: 1, dense: 0.3, val: 14, react: { water: "spots", salt: "crisps" } },
    { id: "gravel", cls: "stone", hard: 6, dense: 2.4, val: 1, react: { water: "settles" } },
  ];

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function atlas() {
    try {
      if (typeof atlGen === "function") return atlGen();
    } catch (e) {}
    return null;
  }

  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function pick(arr, r) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(r() * arr.length)];
  }

  function facetsOf(seed, inherit) {
    var key = String(seed);
    if (facCache[key]) return facCache[key];
    var r = rng((seed * 2654435761) >>> 0);
    var a = new Array(FACETS.length);
    for (var i = 0; i < FACETS.length; i++) {
      var base = inherit && inherit[i] != null ? inherit[i] : 50;
      a[i] = Math.max(0, Math.min(100, Math.round(base + (r() - 0.5) * 48 + (r() - 0.5) * 20)));
    }
    if (FAC_N > 4000) {
      facCache = Object.create(null);
      FAC_N = 0;
    }
    facCache[key] = a;
    FAC_N++;
    return a;
  }

  function ensureFig(fig) {
    if (!fig) return null;
    if (!fig.fac || fig.fac.length !== FACETS.length) fig.fac = facetsOf((fig.i + 1) * 9973 + (fig.born || 0));
    fig.spouse = fig.spouse == null ? -1 : fig.spouse;
    fig.kids = fig.kids || [];
    fig.feud = fig.feud == null ? -1 : fig.feud;
    return fig;
  }

  function notable(fac) {
    var out = [];
    for (var i = 0; i < FACETS.length; i++) {
      var v = fac[i];
      if (v <= 18) out.push(FACETS[i].lo);
      else if (v >= 82) out.push(FACETS[i].hi);
    }
    return out;
  }

  function describe(fac, she) {
    var n = notable(fac);
    if (!n.length) return (she || "They") + " is unremarkable in the ways that get written down.";
    var who = she || "They";
    return who + " " + n.slice(0, 4).join("; ") + ".";
  }

  function sheOf(fig) {
    if (!fig) return "They";
    if (fig.sex === "f") return "She";
    if (fig.sex === "m") return "He";
    var r = rng((fig.i + 11) * 17)();
    return r < 0.48 ? "He" : r < 0.96 ? "She" : "They";
  }

  function matById(id) {
    for (var i = 0; i < MATS.length; i++) if (MATS[i].id === id) return MATS[i];
    return MATS[0];
  }

  function react(a, b) {
    if (!a || !b || a.id === b.id) return "";
    if (a.react && a.react[b.id]) return a.id + " " + a.react[b.id] + " against " + b.id;
    if (b.react && b.react[a.id]) return b.id + " " + b.react[a.id] + " against " + a.id;
    if (a.react && a.react[b.cls]) return a.id + " " + a.react[b.cls] + " with " + b.id;
    if (b.react && b.react[a.cls]) return b.id + " " + b.react[a.cls] + " with " + a.id;
    return a.id + " and " + b.id + " sit together without a quarrel";
  }

  function pushEv(a, k, rec) {
    var ev = Object.assign({ k: k, y: a.now }, rec || {});
    a.e.push(ev);
    if (a.e.length > 1600) a.e.splice(0, a.e.length - 1200);
    if (a.e.length > 4200) a.e.splice(0, 400);
    yearLog.push(ev);
    if (yearLog.length > 24) yearLog.shift();
    return ev;
  }

  function writeShop(text) {
    try {
      if (typeof chronicle === "function") chronicle("era", "Year " + (atlas() && atlas().now) + ". " + text, []);
    } catch (e) {}
    try {
      if (window.weave && typeof weave.because === "function") weave.because(text);
      if (window.weave && typeof weave.rumor === "function") weave.rumor("atlas", text, 0.7);
    } catch (e2) {}
  }

  function firstName(n) {
    n = String(n || "Someone");
    return n.split(" ")[0] || n;
  }

  function childName(parent, r) {
    var bits = ["Ren", "Kae", "Sol", "Mir", "Tov", "Ash", "Len", "Iri", "Nem", "Ves", "Ora", "Sid"];
    var last = String(parent.n || "").split(" ").pop() || "of the water";
    return pick(bits, r) + " " + last;
  }

  function openTheFuture(a) {
    if (!a || a._future) return;
    a._future = 1;
    var open = 1000;
    for (var i = 0; i < a.f.length; i++) {
      var f = a.f[i];
      if (!f) continue;
      if (f.died >= open) {
        var remain = 18 + ((f.i * 7919) % 42);
        f.died = open + remain;
        f._opened = 1;
      }
    }
  }

  function kinOf(fig, other) {
    if (!fig || !other || fig.i === other.i) return "";
    if (fig.par != null && other.par != null && fig.par === other.par) return "sibling";
    if (other.i === fig.par || fig.i === other.par) return "parent";
    if (fig.par != null && other.par != null) {
      var a = atlas();
      if (a && a.f) {
        var fp = a.f[fig.par];
        var op = a.f[other.par];
        if (fp && op && fp.par != null && op.par != null && fp.par === op.par) return "cousin";
      }
    }
    return "";
  }

  function yearSim() {
    var a = atlas();
    if (!a || !a.f || !a.f.length) return;
    openTheFuture(a);
    if (a.now === lastNow) return;
    lastNow = a.now;
    var r = rng((a.seed ^ (a.now * 2654435761)) >>> 0);
    var living = [];
    for (var i = 0; i < a.f.length; i++) {
      var f = a.f[i];
      if (!f) continue;
      if (f.died >= a.now) living.push(f);
    }
    a.living = living.map(function (f) {
      return f.i;
    });
    if (!living.length) return;
    living.sort(function (x, y) {
      return (y.fame || 0) - (x.fame || 0);
    });
    var nAct = Math.min(48, living.length);
    var births = 0;
    var arts = a.goods || (a.goods = []);
    function adult(fig) {
      if (fig._opened) return a.now < fig.died - 1;
      var ag = a.now - fig.born;
      return ag >= 16 && ag < 58;
    }
    for (var n = 0; n < nAct; n++) {
      var fig = ensureFig(living[n]);
      var fac = fig.fac;
      var place = fig.h >= 0 ? fig.h : 0;
      if (fig.died <= a.now && !fig._deadEv) {
        fig._deadEv = 1;
        fig.died = a.now;
        pushEv(a, "death", { a: fig.i, p: place });
        fig.deeds = (fig.deeds || 0) + 1;
        continue;
      }
      if (!adult(fig)) continue;
      if (fig.spouse < 0 && r() < 0.1) {
        var other = pick(living, r);
        if (other && other.i !== fig.i && adult(other)) {
          ensureFig(other);
          if (other.spouse < 0) {
            fig.spouse = other.i;
            other.spouse = fig.i;
            var blood = kinOf(fig, other);
            fig.close = !!blood;
            other.close = !!blood;
            fig.kin = blood;
            other.kin = blood;
            var mline = fig.n + " and " + other.n + " were married.";
            if (blood === "sibling") mline += " They are of one blood — siblings.";
            else if (blood === "parent") mline += " They are of one blood — parent and child.";
            else if (blood === "cousin") mline += " They are of one blood — cousins.";
            pushEv(a, blood ? "incest" : "marry", { a: fig.i, b: other.i, p: place, s: mline, kin: blood });
            fig.deeds++;
            fig.fame = (fig.fame || 0) + (blood ? 2 : 1);
            if (blood) {
              try {
                if (window.weave && weave.because) weave.because(mline);
                if (window.weave && weave.rumor) weave.rumor("blood", mline, 1.4);
              } catch (eKin) {}
            }
          }
        }
      }
      if (fig.spouse >= 0 && births < 3 && r() < 0.09) {
        var sp = a.f[fig.spouse];
        var close = !!(fig.close || (sp && sp.close) || kinOf(fig, sp));
        if (close && r() < 0.38) {
          pushEv(a, "still", {
            a: fig.i,
            p: place,
            s: "A child of " + fig.n + " and " + (sp && sp.n ? sp.n : "theirs") + " did not thrive. The line is close.",
          });
          fig.deeds++;
          births++;
        } else {
        var kid = {
          i: a.f.length,
          n: childName(fig, r),
          r: fig.r,
          born: a.now,
          died: a.now + (close ? 8 + Math.floor(r() * 22) : 38 + Math.floor(r() * 50)),
          h: fig.h,
          w: fig.w,
          fame: 0,
          deeds: 0,
          par: fig.i,
          close: close,
        };
        kid.fac = facetsOf(kid.i * 13 + a.now, fig.fac && sp && sp.fac ? fig.fac.map(function (v, ix) {
          return (v + (sp.fac[ix] || 50)) / 2;
        }) : fig.fac);
        if (close && kid.fac) {
          kid.fac[4] = Math.min(100, (kid.fac[4] || 50) + 25);
          kid.fac[8] = Math.min(100, (kid.fac[8] || 50) + 20);
        }
        a.f.push(kid);
        fig.kids = fig.kids || [];
        fig.kids.push(kid.i);
        births++;
        pushEv(a, "birth", {
          a: fig.i,
          b: kid.i,
          p: place,
          s: kid.n + " was born of " + fig.n + (close ? ". The blood is close." : "."),
        });
        fig.deeds++;
        }
      }
      if (fac[25] > 78 && fig.feud < 0 && r() < 0.04) {
        var foe = pick(living, r);
        if (foe && foe.i !== fig.i) {
          fig.feud = foe.i;
          pushEv(a, "feud", { a: fig.i, b: foe.i, p: place, s: fig.n + " took against " + foe.n + "." });
          fig.deeds++;
          fig.fame += 1;
        }
      }
      if (fac[49] > 76 && r() < 0.045) {
        var m1 = pick(MATS, r);
        var m2 = pick(MATS, r);
        var rx = react(m1, m2);
        var art = {
          n: firstName(fig.n) + "'s " + pick(["Wake", "Measure", "Chart", "Claim", "Quiet", "Salt-Mark"], r),
          who: fig.n,
          y: a.now,
          mat: m1.id + (m2 && m2.id !== m1.id ? " and " + m2.id : ""),
          rx: rx,
        };
        arts.push(art);
        if (arts.length > 40) arts.shift();
        pushEv(a, "art", { a: fig.i, p: place, s: fig.n + " made " + art.n + " of " + art.mat + ". " + rx + "." });
        fig.deeds++;
        fig.fame += 2;
        if (r() < 0.35) writeShop(fig.n + " made " + art.n + " of " + art.mat + ".");
        try {
          if (window.saga && saga.book) {
            var b = saga.book();
            b.arts = b.arts || [];
            b.arts.push(art);
            if (b.arts.length > 24) b.arts.shift();
          }
        } catch (eArt) {}
      }
      if (fac[30] > 74 && a.p && a.p.length && r() < 0.04) {
        var pl = a.p[Math.floor(r() * a.p.length)];
        if (pl && !pl.disc) {
          pl.disc = a.now;
          pushEv(a, "chart", { a: fig.i, p: pl.i });
          fig.deeds++;
          fig.fame += 3;
        } else if (pl) {
          fig.h = pl.i;
          fig.deeds++;
        }
      }
      if (fac[21] > 80 && fig.w >= 0 && r() < 0.012 && a.w && a.w.length > 1) {
        var otherW = Math.floor(r() * a.w.length);
        if (otherW !== fig.w && a.w[otherW] && !a.w[otherW].gone) {
          pushEv(a, "war", { w: fig.w, b: otherW, a: fig.i });
          fig.deeds += 2;
          fig.fame += 4;
          writeShop(fig.n + " of a power put water to war.");
        }
      }
    }
  }

  function wrapTick() {
    try {
      var d = Object.getOwnPropertyDescriptor(globalThis, "atlTick");
      if (d && d.get && !d.get.__live) {
        var g = d.get;
        function ng() {
          var fn = g.call(this);
          if (typeof fn === "function" && !fn.__live) {
            var inner = function () {
              var res = fn.apply(this, arguments);
              try {
                yearSim();
              } catch (e) {}
              return res;
            };
            inner.__live = 1;
            return inner;
          }
          return fn;
        }
        ng.__live = 1;
        Object.defineProperty(globalThis, "atlTick", { configurable: true, get: ng });
      }
    } catch (e) {}
  }

  function wrapLine() {
    try {
      var d = Object.getOwnPropertyDescriptor(globalThis, "atlLine");
      if (d && d.get && !d.get.__live) {
        var g = d.get;
        function ng() {
          var fn = g.call(this);
          if (typeof fn === "function" && !fn.__live) {
            var inner = function (atl, ev) {
              if (ev && ev.s) return ev.s;
              if (ev && ev.k === "marry") return (ateName(atl, ev.a) || "Someone") + " and " + (ateName(atl, ev.b) || "another") + " were married.";
              if (ev && ev.k === "incest") return ev.s || (ateName(atl, ev.a) + " and " + ateName(atl, ev.b) + " were married. They are of one blood.");
              if (ev && ev.k === "still") return ev.s || "A child of a close line did not thrive.";
              if (ev && ev.k === "birth") return (ateName(atl, ev.b) || "A child") + " was born of " + (ateName(atl, ev.a) || "someone") + ".";
              if (ev && ev.k === "feud") return (ateName(atl, ev.a) || "Someone") + " took against " + (ateName(atl, ev.b) || "another") + ".";
              if (ev && ev.k === "art") return ev.s || (ateName(atl, ev.a) + " made a thing that the record kept.");
              return fn.apply(this, arguments);
            };
            inner.__live = 1;
            return inner;
          }
          return fn;
        }
        ng.__live = 1;
        Object.defineProperty(globalThis, "atlLine", { configurable: true, get: ng });
      }
    } catch (e) {}
  }

  function ateName(atl, i) {
    try {
      if (atl && atl.f && atl.f[i]) return atl.f[i].n;
    } catch (e) {}
    return "somebody";
  }

  function wrapPerson() {
    try {
      if (typeof sgPerson !== "function" || sgPerson.__live) return;
      var orig = sgPerson;
      var wrapped = function (who) {
        var p = orig.apply(this, arguments);
        if (p && !p.fac) {
          p.fac = facetsOf((who || 0) >>> 0);
          p.mindLine = describe(p.fac, p.name ? p.name.split(" ")[0] : "They");
        }
        return p;
      };
      wrapped.__live = 1;
      try {
        Object.defineProperty(globalThis, "sgPerson", { configurable: true, get: function () { return wrapped; } });
      } catch (e2) {
        /* getter already — leave */
      }
    } catch (e) {}
  }

  function esc(s) {
    var map = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;" };
    return String(s || "").replace(/[&<>"]/g, function (c) {
      return map[c];
    });
  }

  function enhanceAtlas() {
    var body = document.getElementById("dbody");
    var title = document.getElementById("dtitle");
    if (!body || !title) return;
    if (!/atlas/i.test(title.textContent || "")) return;
    var a = atlas();
    if (!a) return;
    yearSim();
    var html = '<div class="sec">The living year <span>' + a.now + "</span></div>";
    var livingN = 0;
    for (var i = 0; i < a.f.length; i++) if (a.f[i] && a.f[i].died >= a.now) livingN++;
    html +=
      '<div class="row"><div></div><div><div class="d">' +
      livingN +
      " historical figures still alive. Each year they marry, feud, chart, die, and make things. The clock does not stop.</div></div><div></div></div>";
    var log = yearLog.slice().reverse();
    for (var y = 0; y < log.length && y < 6; y++) {
      var line = log[y].s;
      try {
        if (!line && typeof atlLine === "function") line = atlLine(a, log[y]);
      } catch (e) {}
      if (!line) continue;
      html +=
        '<div class="row"><div></div><div><div class="d">' +
        esc(String(log[y].y)) +
        " · " +
        esc(line) +
        "</div></div><div></div></div>";
    }
    var goods = a.goods || [];
    if (goods.length) {
      html += '<div class="sec">Things made of matter</div>';
      for (var g = goods.length - 1; g >= 0 && g >= goods.length - 4; g--) {
        html +=
          '<div class="row"><div></div><div><div class="n">' +
          esc(goods[g].n) +
          '</div><div class="d">' +
          esc(goods[g].mat) +
          (goods[g].rx ? ". " + esc(goods[g].rx) : "") +
          " · " +
          goods[g].y +
          "</div></div><div></div></div>";
      }
    }
    html += '<div class="sec">Matter</div>';
    html +=
      '<div class="row"><div></div><div><div class="d">' +
      MATS.length +
      " substances. Hardness, density, value, and what they do to each other. Iron rusts in salt. Bogwood swells. Gold does nothing, which is the point of gold.</div></div><div></div></div>";
    var famed = a.f.slice().sort(function (x, y) {
      return (y.fame || 0) - (x.fame || 0);
    });
    var shown = 0;
    for (var fi = 0; fi < famed.length && shown < 3; fi++) {
      var fig = famed[fi];
      if (!fig || fig.died < a.now) continue;
      ensureFig(fig);
      html +=
        '<div class="row"><div></div><div><div class="n">' +
        esc(fig.n) +
        ' <span class="pill">living</span></div><div class="d">' +
        esc(describe(fig.fac, sheOf(fig))) +
        "</div></div><div></div></div>";
      shown++;
    }
    var wrap = body.querySelector(".live-atlas");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "live-atlas";
      body.insertBefore(wrap, body.firstChild);
    }
    if (wrap.getAttribute("data-h") !== String(html.length)) {
      wrap.innerHTML = html;
      wrap.setAttribute("data-h", String(html.length));
    }
  }

  function enhanceLife() {
    try {
      var body = document.getElementById("dbody");
      if (!body) return;
      var old = body.querySelector("live-life");
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (e) {}
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : WIKI;
      if (!w || !w.push) return;
      var extra = [
        {
          id: "k_live",
          sec: "The chronicle",
          t: "The living atlas",
          tags: "atlas living year historical figure marry feud birth death agent worldgen",
          w: "<p>Year 1000 was not the last year. Every day in the shop is a year out there. The people in the record are still marrying, charting, feuding, dying, and having children. Close blood is not forbidden in the record. Siblings marry. A parent and a child marry. The line is written: they are of one blood. Children of that union often do not thrive; the ones who live are sickly and short-lived. Atlas, The living year, is the feed.</p><p><b>What to do about it:</b> open Atlas after a few days. The green mark is alive. A marriage with a blood note is not a bug. It is the line paying.</p>",
        },
        {
          id: "k_facets",
          sec: "The street",
          t: "Fifty facets",
          tags: "personality facets brave greedy vengeful art curious dwarf",
          w: "<p>Every person in the record, and every person who can walk into the shop, is rated on fifty facets: greed, bravery, vengefulness, curiosity, art, duty, and the rest. Only the extremes get written down, the way a dwarf's thoughts only mention that she is a nervous wreck or that he is greedy. Average people are silent. Extreme people start wars, make artifacts, or take against a neighbor.</p><p><b>What to do about it:</b> Atlas, a living name. The four lines under it are the facets that crossed the line.</p>",
        },
        {
          id: "k_matter",
          sec: "The shop floor",
          t: "Matter",
          tags: "material science iron salt rust bogwood gold hardness density react artifact",
          w: "<p>Bogwood, oak, mica, riverstone, brass, iron, copper, gold, salt, glass, driftglass, bone, shell, leather, silk, gravel. Each has hardness, density, value, and a table of what it does to the others. Iron rusts in salt. Copper goes green. Bogwood swells. Gold does nothing, which is why people want it. When a historical figure in a strange craft-mood makes an artifact, two substances are put together and the reaction is the description.</p><p><b>What to do about it:</b> Atlas, Things made of matter. The shop's own strange moods use the same table.</p>",
        },
      ];
      for (var i = 0; i < extra.length; i++) {
        var hit = false;
        for (var j = 0; j < w.length; j++) if (w[j] && w[j].id === extra[i].id) hit = true;
        if (!hit) w.push(extra[i]);
      }
    } catch (e) {}
  }

  function tick() {
    try {
      wrapTick();
      wrapLine();
      wrapPerson();
      seedWiki();
      if (now() - lastTick > 1.2) {
        lastTick = now();
        yearSim();
      }
      if (now() - lastUi > 0.9) {
        lastUi = now();
        enhanceAtlas();
        enhanceLife();
      }
    } catch (e) {}
  }
window.liveAtlas = {
    sim: yearSim,
    facets: facetsOf,
    describe: describe,
    mats: MATS,
    react: react,
    log: function () {
      return yearLog;
    },
  };


  if (window.__onBeat) window.__onBeat(tick, 280);
  else setTimeout(function loop() { tick(); setTimeout(loop, 280); }, 280);

})();
