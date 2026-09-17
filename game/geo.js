/* geo.js — the ground under the map.
   Soil, stone, three caverns, magma. Ores. A warm board is not weather. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var ORE = ["iron", "copper", "salt", "mica", "bogwood", "gold"];
  var LAYER = ["soil", "stone", "cavern", "deep", "magma"];

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

  function realmW() {
    try {
      if (window.realm && typeof realm.world === "function") return realm.world();
    } catch (e) {}
    return null;
  }

  function state() {
    var g = gs();
    if (g && g.geo && g.geo.veins) return g.geo;
    var rw = realmW();
    var seed = (rw && rw.seed) || 1000;
    var rng = mulberry(seed ^ 0x51ed);
    var veins = [];
    var mines = 4 + ((rng() * 5) | 0);
    for (var i = 0; i < mines; i++) {
      veins.push({
        i: i,
        ore: ORE[(rng() * ORE.length) | 0],
        layer: LAYER[1 + ((rng() * 3) | 0)],
        x: (rng() * 48) | 0,
        y: (rng() * 32) | 0,
        yield: 0.3 + rng() * 0.7,
        dry: 0,
      });
    }
    var caverns = [];
    for (var c = 0; c < 3; c++) {
      caverns.push({
        i: c,
        n: ["the Upper Dark", "the Still Water", "the Magma Shore"][c],
        fish: ["cave tetra", "blind cat", "ash goby"][c],
        heat: c === 2 ? 0.9 : 0.2 + c * 0.2,
        wet: c === 1 ? 0.8 : 0.3,
      });
    }
    var geo = { veins: veins, caverns: caverns, heat: 0, note: "", lastY: 0 };
    try {
      if (g) g.geo = geo;
    } catch (e) {}
    return geo;
  }

  function harborVolc() {
    try {
      if (window.realm && typeof realm.harbor === "function") return realm.harbor().volc || 0;
    } catch (e) {}
    return 0.3;
  }

  function heat() {
    var g = state();
    var v = harborVolc();
    g.heat = v > 0.72 ? 0.18 : v > 0.55 ? 0.08 : 0;
    return g.heat;
  }

  function dryMines() {
    var rw = realmW();
    if (!rw) return 0;
    var n = 0;
    for (var i = 0; i < rw.sites.length; i++) {
      if (rw.sites[i].kind === "mine" && rw.sites[i].ruin) n++;
    }
    return n;
  }

  function scarce(ore) {
    var g = state();
    var hit = 0;
    var live = 0;
    for (var i = 0; i < g.veins.length; i++) {
      if (g.veins[i].ore !== ore) continue;
      live++;
      if (g.veins[i].dry) hit++;
    }
    if (!live) return false;
    return hit / live > 0.5 || dryMines() > 2;
  }

  function lotOf(ore) {
    var rw = realmW();
    var site = "inland";
    if (rw && rw.sites) {
      for (var i = 0; i < rw.sites.length; i++) {
        if (rw.sites[i].kind === "mine" && !rw.sites[i].ruin) {
          site = rw.sites[i].n;
          break;
        }
      }
    }
    return ore + " from " + site;
  }

  function tickYear() {
    var g = state();
    var y = 1000;
    try {
      if (window.saga && typeof saga.year === "function") y = saga.year();
    } catch (e) {}
    if (g.lastY >= y) return;
    g.lastY = y;
    var rng = mulberry(((g.veins.length * 17) ^ y) >>> 0);
    if (rng() < 0.12 && g.veins.length) {
      var v = g.veins[(rng() * g.veins.length) | 0];
      v.dry = 1;
      g.note = "The " + v.ore + " vein in the " + v.layer + " packed.";
      try {
        if (window.weave && weave.because) weave.because("A mine inland went quiet. " + v.ore + " will cost.");
      } catch (e2) {}
    }
    if (heat() > 0.1) {
      g.note = "The boards run warm. Something under the street is not weather.";
      try {
        if (window.shopSite && shopSite.grid) {
          /* site physics already has temp; a hint is enough */
        }
      } catch (e3) {}
    }
  }

  function coupleSite() {
    try {
      if (!window.shopSite || typeof shopSite.tick !== "function") return;
      var h = heat();
      if (h > 0.1 && shopSite.state) {
        var st = shopSite.state();
        if (st && typeof st.temp === "number") st.temp = Math.min(1, (st.temp || 0.4) + h * 0.02);
      }
    } catch (e) {}
  }

  function enhance() {
    var body = document.getElementById("dbody");
    var title = document.getElementById("dtitle");
    if (!body || !title) return;
    if (!/atlas/i.test(title.textContent || "")) return;
    var g = state();
    var html = '<div class="sec">Under the map</div>';
    html += '<div class="note">Three caverns. Veins of ' + ORE.join(", ") + ". A sacked mine is a dry counter.</div>";
    for (var i = 0; i < g.caverns.length; i++) {
      var c = g.caverns[i];
      html += '<div class="row"><div></div><div><div class="n">' + c.n + '</div><div class="d">' + c.fish + " · heat " + c.heat.toFixed(1) + "</div></div><div></div></div>";
    }
    for (var v = 0; v < g.veins.length && v < 5; v++) {
      var vein = g.veins[v];
      html += '<div class="row"><div></div><div><div class="d">' + vein.ore + " in the " + vein.layer + (vein.dry ? " · dry" : "") + "</div></div><div></div></div>";
    }
    if (g.note) html += '<div class="note">' + g.note + "</div>";
    var wrap = body.querySelector(".geo-atlas");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "geo-atlas";
      var realm = body.querySelector(".realm-atlas");
      if (realm && realm.nextSibling) body.insertBefore(wrap, realm.nextSibling);
      else body.appendChild(wrap);
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
        id: "k_geo",
        sec: "The shop floor",
        t: "Under the map",
        tags: "geology cavern mine ore magma vein stone",
        w: "<p>The continent has a basement. Soil, stone, an upper dark, still water, a magma shore. Veins of iron, copper, salt, mica, bogwood, gold. A mine that was sacked is a dry lot on the counter. If the boards run warm, that is volcanism under the harbor, not the weather.</p><p><b>What to do about it:</b> Atlas, Under the map. The cavern fish are not stock until a hold comes in.</p>",
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
      if (now() - lastTick > 1.6) {
        lastTick = now();
        tickYear();
        coupleSite();
      }
      if (now() - lastUi > 1.2) {
        lastUi = now();
        enhance();
      }
    } catch (e) {}
  }

  window.geo = {
    of: state,
    heat: heat,
    scarce: scarce,
    lot: lotOf,
    caverns: function () {
      return state().caverns;
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 420);
  else setTimeout(function loop() { tick(); setTimeout(loop, 420); }, 420);
})();
