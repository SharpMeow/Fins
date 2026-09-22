/* wild.js — the living water outside the tanks.
   Biome populations, overfish, bloom, migration. A river that empties is a want you cannot fill. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var KINDS = ["tetra", "betta", "guppy", "gold", "cichlid", "koi", "angel", "clown"];
  var BIOME_KIND = {
    river: ["tetra", "guppy", "gold"],
    stream: ["betta", "tetra"],
    brackish: ["guppy", "clown"],
    marine: ["clown", "angel"],
    fresh: ["gold", "koi", "cichlid"],
    warm: ["discus", "angel", "betta"],
    cold: ["gold"],
    none: [],
  };

  function gs() {
    try {
      if (typeof gameState === "function") return gameState();
      if (typeof gameState === "object" && gameState) return gameState;
    } catch (e) {}
    return null;
  }

  function mulberry(a) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function yearNow() {
    try {
      if (window.saga && typeof saga.year === "function") return saga.year();
    } catch (e) {}
    return 1000;
  }

  function state() {
    var g = gs();
    if (g && g.wild && g.wild.pop) return g.wild;
    var pop = {};
    for (var i = 0; i < KINDS.length; i++) pop[KINDS[i]] = 0.55 + Math.random() * 0.35;
    var st = { pop: pop, events: [], lastY: 0, note: "" };
    try {
      if (g) g.wild = st;
    } catch (e) {}
    return st;
  }

  function scarce(kind) {
    if (!kind) return false;
    var k = String(kind).toLowerCase();
    var st = state();
    var n = st.pop[k];
    if (typeof n !== "number") {
      for (var key in st.pop) if (k.indexOf(key) >= 0) return st.pop[key] < 0.22;
      return false;
    }
    return n < 0.22;
  }

  function stockOf(kind) {
    var st = state();
    var k = String(kind || "").toLowerCase();
    if (typeof st.pop[k] === "number") return st.pop[k];
    return 0.5;
  }

  function ev(st, y, text) {
    st.events.push({ y: y, s: text });
    if (st.events.length > 24) st.events.shift();
    st.note = text;
  }

  function tickYear() {
    var st = state();
    var y = yearNow();
    if (st.lastY >= y) return;
    st.lastY = y;
    var rng = mulberry((y * 7919) >>> 0);
    var k = KINDS[(rng() * KINDS.length) | 0];
    if (rng() < 0.2) {
      st.pop[k] = Math.max(0.05, st.pop[k] * 0.45);
      ev(st, y, "The " + k + " run failed inland. Holds of them will be thin.");
      try {
        if (window.weave && weave.because) weave.because("No " + k + " on the water. People will ask and leave.");
        if (window.weave && weave.rumor) weave.rumor("stock", "no " + k + " inland", 1.0);
      } catch (e) {}
    } else if (rng() < 0.18) {
      st.pop[k] = Math.min(1, st.pop[k] + 0.35);
      ev(st, y, "A bloom of " + k + ". The river is loud with them.");
    } else if (rng() < 0.15) {
      var k2 = KINDS[(rng() * KINDS.length) | 0];
      st.pop[k2] = Math.min(1, (st.pop[k2] || 0.4) + 0.2);
      ev(st, y, k2 + " came down with the season.");
    }
    for (var i = 0; i < KINDS.length; i++) {
      st.pop[KINDS[i]] = Math.max(0.05, Math.min(1, st.pop[KINDS[i]] + (rng() - 0.5) * 0.04));
    }
  }

  function enhance() {
    var body = document.getElementById("dbody");
    var title = document.getElementById("dtitle");
    if (!body || !title) return;
    if (!/atlas/i.test(title.textContent || "")) return;
    var st = state();
    var html = '<div class="sec">The living water</div>';
    html += '<div class="note">Populations inland, not in your glass. A failed run is a walk-in who asks and leaves.</div>';
    for (var i = 0; i < KINDS.length; i++) {
      var k = KINDS[i];
      var n = st.pop[k];
      var tag = n < 0.22 ? "scarce" : n > 0.8 ? "bloom" : "";
      html += '<div class="row"><div></div><div><div class="n">' + k + (tag ? ' <span class="pill">' + tag + "</span>" : "") + '</div><div class="d">' + Math.round(n * 100) + " on the water</div></div><div></div></div>";
    }
    for (var e = st.events.length - 1, c = 0; e >= 0 && c < 4; e--, c++) {
      html += '<div class="row"><div></div><div><div class="d">' + st.events[e].y + " · " + st.events[e].s + "</div></div><div></div></div>";
    }
    var wrap = body.querySelector(".wild-atlas");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "wild-atlas";
      body.appendChild(wrap);
    }
    if (wrap.getAttribute("data-h") !== String(html.length)) {
      wrap.innerHTML = html;
      wrap.setAttribute("data-h", String(html.length));
    }
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!w || !w.push) return;
      var extra = {
        id: "k_wild",
        sec: "The animals",
        t: "The living water",
        tags: "wild ecology overfish bloom migration population river",
        w: "<p>The tanks are not the only water. Inland, each kind has a population. A failed run makes that kind scarce on the counter: people still ask, they just do not buy. A bloom is the opposite. The season can walk a kind down from a colder river.</p><p><b>What to do about it:</b> Atlas, The living water. If the gold line says nobody is buying, check whether the river itself is empty.</p>",
      };
      for (var i = 0; i < w.length; i++) if (w[i] && w[i].id === extra.id) return;
      w.push(extra);
    } catch (e) {}
  }

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function tick() {
    try {
      seedWiki();
      if (now() - lastTick > 1.5) {
        lastTick = now();
        tickYear();
      }
      if (now() - lastUi > 1.2) {
        lastUi = now();
        enhance();
      }
    } catch (e) {}
  }

  window.wild = {
    of: state,
    scarce: scarce,
    stock: stockOf,
    kinds: KINDS,
    biome: BIOME_KIND,
  };

  if (window.__onBeat) window.__onBeat(tick, 430);
  else setTimeout(function loop() { tick(); setTimeout(loop, 430); }, 430);
})();
