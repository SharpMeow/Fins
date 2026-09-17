/* realm.js — the world beyond the harbor.
   Five fields, biomes, rivers, civilizations, sites, gods, ethics, ages.
   Boston is one coastal cell. The rest of the map is generated from the shop seed. */
(function () {
  "use strict";

  var GW = 48;
  var GH = 32;
  var HARBOR = { x: 38, y: 13 };
  var lastTick = 0;
  var lastUi = 0;
  var cached = null;

  var BIOME = [
    { id: "ocean", ch: "~", name: "ocean", fish: "marine" },
    { id: "coast", ch: ".", name: "coast", fish: "brackish" },
    { id: "marsh", ch: "n", name: "marsh", fish: "brackish" },
    { id: "plain", ch: ",", name: "plain", fish: "river" },
    { id: "forest", ch: "t", name: "forest", fish: "river" },
    { id: "hill", ch: "h", name: "hills", fish: "stream" },
    { id: "mount", ch: "^", name: "mountains", fish: "none" },
    { id: "desert", ch: ":", name: "desert", fish: "none" },
    { id: "tundra", ch: "_", name: "tundra", fish: "cold" },
    { id: "taiga", ch: "T", name: "taiga", fish: "cold" },
    { id: "jungle", ch: "Y", name: "jungle", fish: "warm" },
    { id: "lake", ch: "o", name: "lake", fish: "fresh" },
  ];

  var CIV_KIND = ["harbor league", "inland kingdom", "hill clan", "river republic", "desert satrapy", "forest hold", "island thanedom"];
  var SITE_KIND = ["city", "town", "hamlet", "fort", "ruin", "port", "abbey", "mine"];
  var GODS = ["the Salt Mother", "the Dry Eye", "the Wheel", "the First Net", "the Quiet Oak", "the Red Vein", "the Night Ledger"];
  var ETHIC = ["trade", "war", "craft", "faith", "law", "kin", "sea"];
  var JOBS = ["fisher", "smith", "scribe", "captain", "priest", "merchant", "soldier", "glassblower", "miller", "judge"];
  var ON = ["Al", "Ber", "Cal", "Dor", "El", "Fen", "Gar", "Hel", "Ith", "Jon", "Kel", "Lor", "Mar", "Ner", "Or", "Pel", "Quin", "Rav", "Sel", "Tor", "Ul", "Ver", "Wen", "Xor", "Yl", "Zed"];
  var OD = ["a", "en", "or", "um", "ith", "el", "an", "os", "ia", "ek", "ard", "ine"];
  var PLACE = ["wick", "ford", "haven", "holm", "mouth", "bridge", "fell", "dale", "port", "stead", "burg", "gate"];
  var AGE_A = ["Glass", "Salt", "Oak", "Iron", "Fog", "Net", "Ash", "Bone"];
  var AGE_B = ["Quiet Water", "the Open Road", "the First Bell", "Broken Keels", "the Long Freeze", "Green Years"];

  function mulberry(a) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedOf() {
    try {
      if (typeof world === "function" && world() && world().seed) return world().seed >>> 0;
    } catch (e) {}
    try {
      if (typeof gameState === "function") {
        var g = gameState();
        if (g && g.seed) return g.seed >>> 0;
      }
    } catch (e2) {}
    return 1000;
  }

  function yearNow() {
    try {
      if (window.saga && typeof saga.year === "function") return saga.year();
    } catch (e) {}
    return 1000;
  }

  function nameFrom(rng, a, b) {
    return a[(rng() * a.length) | 0] + b[(rng() * b.length) | 0];
  }

  function personName(rng) {
    return nameFrom(rng, ON, OD) + " " + nameFrom(rng, ON, OD);
  }

  function placeName(rng) {
    return nameFrom(rng, ON, OD) + PLACE[(rng() * PLACE.length) | 0];
  }

  function noise2(table, x, y) {
    return table[(y & 15) * 16 + (x & 15)];
  }

  function valueNoise(table, x, y, oct) {
    var v = 0;
    var amp = 1;
    var freq = 1;
    var n = 0;
    for (var o = 0; o < oct; o++) {
      var fx = x * freq;
      var fy = y * freq;
      var x0 = Math.floor(fx);
      var y0 = Math.floor(fy);
      var tx = fx - x0;
      var ty = fy - y0;
      var a = noise2(table, x0, y0);
      var b = noise2(table, x0 + 1, y0);
      var c = noise2(table, x0, y0 + 1);
      var d = noise2(table, x0 + 1, y0 + 1);
      var u = a + (b - a) * tx;
      var w = c + (d - c) * tx;
      v += (u + (w - u) * ty) * amp;
      n += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return v / n;
  }

  function biomeOf(elev, rain, temp, drain) {
    if (elev < 0.28) return "ocean";
    if (elev < 0.34) return rain > 0.55 ? "marsh" : "coast";
    if (elev > 0.78) return "mount";
    if (temp < 0.28) return rain > 0.45 ? "taiga" : "tundra";
    if (temp > 0.72 && rain < 0.35) return "desert";
    if (temp > 0.68 && rain > 0.62) return "jungle";
    if (elev > 0.58) return "hill";
    if (rain > 0.58 && drain < 0.4) return "lake";
    if (rain > 0.52) return "forest";
    return "plain";
  }

  function biomeMeta(id) {
    for (var i = 0; i < BIOME.length; i++) if (BIOME[i].id === id) return BIOME[i];
    return BIOME[3];
  }

  function idx(x, y) {
    return y * GW + x;
  }

  function emptyWorld(seed) {
    return {
      seed: seed,
      w: GW,
      h: GH,
      name: "",
      age: "",
      harbor: { x: HARBOR.x, y: HARBOR.y, name: "the Harbor", site: 0 },
      elev: [],
      rain: [],
      temp: [],
      drain: [],
      volc: [],
      savage: [],
      biome: [],
      rivers: [],
      civs: [],
      sites: [],
      figs: [],
      rels: [],
      arts: [],
      wars: [],
      events: [],
      now: 1,
      lastSim: 0,
    };
  }

  function generate(seed) {
    seed = (seed >>> 0) || seedOf();
    var rng = mulberry(seed ^ 0x9e3779b9);
    var table = [];
    for (var i = 0; i < 256; i++) table[i] = rng();
    var w = emptyWorld(seed);
    w.name = "The " + AGE_A[(rng() * AGE_A.length) | 0] + " and " + AGE_A[(rng() * AGE_A.length) | 0];
    w.age = "Age of " + AGE_B[(rng() * AGE_B.length) | 0];

    for (var y = 0; y < GH; y++) {
      for (var x = 0; x < GW; x++) {
        var nx = x / GW;
        var ny = y / GH;
        var e = valueNoise(table, nx * 6, ny * 6, 4);
        e = e * 0.72 + (1 - nx) * 0.18 + (0.5 - Math.abs(ny - 0.42)) * 0.1;
        if (x > GW - 8) e -= (x - (GW - 8)) / 18;
        var r = valueNoise(table, nx * 5 + 20, ny * 5, 3);
        var t = 0.15 + (1 - ny) * 0.7 + (valueNoise(table, nx * 3, ny * 3 + 8, 2) - 0.5) * 0.2;
        var d = valueNoise(table, nx * 4 + 3, ny * 4 + 11, 3);
        var v = valueNoise(table, nx * 7 + 40, ny * 7, 2);
        var s = valueNoise(table, nx * 4 + 90, ny * 4, 2);
        var i2 = idx(x, y);
        w.elev[i2] = e;
        w.rain[i2] = r;
        w.temp[i2] = t;
        w.drain[i2] = d;
        w.volc[i2] = v;
        w.savage[i2] = s;
        w.biome[i2] = biomeOf(e, r, t, d);
      }
    }
    w.biome[idx(HARBOR.x, HARBOR.y)] = "coast";
    w.biome[idx(HARBOR.x + 1, HARBOR.y)] = "ocean";
    carveRivers(w, rng);
    birthCivs(w, rng);
    birthSites(w, rng);
    birthRels(w, rng);
    history(w, rng);
    w.now = yearNow();
    return w;
  }

  function carveRivers(w, rng) {
    var n = 6 + ((rng() * 4) | 0);
    for (var r = 0; r < n; r++) {
      var x = (rng() * (GW - 10)) | 0;
      var y = (rng() * (GH - 8) + 2) | 0;
      var path = [];
      for (var step = 0; step < 40; step++) {
        path.push([x, y]);
        var i = idx(x, y);
        if (w.elev[i] < 0.3) break;
        if (w.elev[i] < 0.36) w.biome[i] = "marsh";
        else if (w.biome[i] === "desert") w.biome[i] = "plain";
        var best = [1, 0];
        var be = w.elev[i];
        var dirs = [[1, 0], [1, 1], [1, -1], [0, 1], [0, -1]];
        for (var d = 0; d < dirs.length; d++) {
          var nx = x + dirs[d][0];
          var ny = y + dirs[d][1];
          if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
          var e = w.elev[idx(nx, ny)];
          if (e < be) {
            be = e;
            best = dirs[d];
          }
        }
        x += best[0];
        y += best[1];
      }
      w.rivers.push({ i: r, path: path, name: placeName(rng) + " Water" });
    }
  }

  function landCells(w) {
    var out = [];
    for (var y = 0; y < GH; y++) {
      for (var x = 0; x < GW; x++) {
        var b = w.biome[idx(x, y)];
        if (b !== "ocean" && b !== "mount") out.push([x, y, b]);
      }
    }
    return out;
  }

  function birthCivs(w, rng) {
    var land = landCells(w);
    var n = 7 + ((rng() * 4) | 0);
    for (var i = 0; i < n && land.length; i++) {
      var pick = land[(rng() * land.length) | 0];
      w.civs.push({
        i: i,
        n: placeName(rng),
        kind: CIV_KIND[(rng() * CIV_KIND.length) | 0],
        x: pick[0],
        y: pick[1],
        found: 40 + ((rng() * 220) | 0),
        power: 0.3 + rng() * 0.6,
        faith: GODS[(rng() * GODS.length) | 0],
        ethic: ETHIC[(rng() * ETHIC.length) | 0],
        tongue: nameFrom(rng, ON, OD),
        alive: 1,
      });
    }
  }

  function nearestCiv(w, x, y) {
    var best = w.civs[0];
    var bd = 1e9;
    for (var i = 0; i < w.civs.length; i++) {
      var c = w.civs[i];
      var d = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  function birthSites(w, rng) {
    var civ0 = nearestCiv(w, HARBOR.x, HARBOR.y);
    w.sites.push({
      i: 0,
      n: "the Harbor",
      kind: "port",
      x: HARBOR.x,
      y: HARBOR.y,
      civ: civ0 ? civ0.i : 0,
      found: 1,
      pop: 1200,
      ruin: 0,
      fish: "brackish",
    });
    var land = landCells(w);
    var n = 28 + ((rng() * 16) | 0);
    for (var i = 1; i <= n && land.length; i++) {
      var pick = land[(rng() * land.length) | 0];
      var civ = nearestCiv(w, pick[0], pick[1]);
      var kind = SITE_KIND[(rng() * SITE_KIND.length) | 0];
      if (w.biome[idx(pick[0], pick[1])] === "coast") kind = rng() < 0.6 ? "port" : "town";
      w.sites.push({
        i: i,
        n: placeName(rng),
        kind: kind,
        x: pick[0],
        y: pick[1],
        civ: civ.i,
        found: civ.found + ((rng() * 80) | 0),
        pop: kind === "city" ? 800 + ((rng() * 2400) | 0) : kind === "hamlet" ? 40 + ((rng() * 120) | 0) : 200 + ((rng() * 600) | 0),
        ruin: kind === "ruin" ? 1 : 0,
        fish: biomeMeta(w.biome[idx(pick[0], pick[1])]).fish,
      });
    }
  }

  function birthRels(w, rng) {
    for (var i = 0; i < GODS.length; i++) {
      w.rels.push({ i: i, n: GODS[i], seats: 1 + ((rng() * 4) | 0), found: 10 + ((rng() * 200) | 0) });
    }
  }

  function addFig(w, rng, year, civ, site) {
    var fig = {
      i: w.figs.length,
      n: personName(rng),
      born: year - (16 + ((rng() * 30) | 0)),
      died: 0,
      civ: civ,
      site: site,
      job: JOBS[(rng() * JOBS.length) | 0],
      fame: rng() * 0.4,
      parent: -1,
    };
    w.figs.push(fig);
    return fig;
  }

  function ev(w, y, kind, text) {
    w.events.push({ y: y, k: kind, s: text });
    if (w.events.length > 500) w.events.shift();
  }

  function history(w, rng) {
    for (var y = 1; y <= 1000; y += 1 + ((rng() * 3) | 0)) {
      if (rng() < 0.12 && w.civs.length >= 2) {
        var a = w.civs[(rng() * w.civs.length) | 0];
        var b = w.civs[(rng() * w.civs.length) | 0];
        if (a !== b && a.alive && b.alive) {
          var win = rng() < a.power / (a.power + b.power) ? a : b;
          var lose = win === a ? b : a;
          lose.power = Math.max(0.05, lose.power * 0.86);
          win.power = Math.min(1, win.power * 1.06);
          w.wars.push({ y: y, a: a.i, b: b.i, win: win.i });
          ev(w, y, "war", win.n + " broke " + lose.n + " in the field.");
          if (rng() < 0.2) {
            var site = w.sites[(rng() * w.sites.length) | 0];
            if (site && site.i !== 0 && rng() < 0.5) {
              site.ruin = 1;
              site.pop = Math.max(10, (site.pop * 0.3) | 0);
              ev(w, y, "sack", site.n + " was sacked. The stones remember.");
            }
          }
        }
      }
      if (rng() < 0.08) {
        var s = w.sites[(rng() * w.sites.length) | 0];
        if (s && !s.ruin) {
          s.pop = (s.pop * (0.55 + rng() * 0.2)) | 0;
          ev(w, y, "plague", "A fever walked " + s.n + ".");
        }
      }
      if (rng() < 0.1) {
        var fig = addFig(w, rng, y, (rng() * w.civs.length) | 0, (rng() * w.sites.length) | 0);
        if (rng() < 0.35 && w.figs.length > 4) fig.parent = (rng() * (w.figs.length - 1)) | 0;
        if (rng() < 0.15) {
          fig.fame += 0.5;
          w.arts.push({
            y: y,
            n: fig.n + "'s " + ["cup", "blade", "net", "tablet", "ring"][(rng() * 5) | 0],
            who: fig.i,
            site: fig.site,
          });
          ev(w, y, "art", fig.n + " made a thing that will outlast the hand.");
        }
      }
      if (rng() < 0.04) {
        var c = w.civs[(rng() * w.civs.length) | 0];
        ev(w, y, "faith", "They kept " + c.faith + " in " + c.n + ".");
      }
    }
    ev(w, 1000, "now", "The Harbor opens a shop. The rest of the map does not pause.");
  }

  function gs() {
    try {
      if (typeof gameState === "function") return gameState();
      if (typeof gameState === "object" && gameState) return gameState;
    } catch (e) {}
    return null;
  }

  function worldState() {
    var g = gs();
    if (g && g.realm && g.realm.sites && g.realm.sites.length) {
      cached = g.realm;
      return cached;
    }
    var w = generate(seedOf());
    try {
      if (g) g.realm = w;
    } catch (e) {}
    cached = w;
    return w;
  }

  function tickYear() {
    var w = worldState();
    var y = yearNow();
    if (w.lastSim >= y) return;
    w.lastSim = y;
    w.now = y;
    var rng = mulberry((w.seed ^ (y * 997)) >>> 0);
    if (rng() < 0.18 && w.civs.length >= 2) {
      var a = w.civs[(rng() * w.civs.length) | 0];
      var b = w.civs[(rng() * w.civs.length) | 0];
      if (a !== b) {
        w.wars.push({ y: y, a: a.i, b: b.i, win: a.i });
        ev(w, y, "war", a.n + " and " + b.n + " are at war beyond the harbor.");
        try {
          if (window.weave && weave.bumpWord) weave.bumpWord(-0.1);
          if (window.weave && weave.because) weave.because("War inland. Stock will go dear.");
        } catch (e) {}
      }
    }
    if (rng() < 0.12) {
      var s = w.sites[(rng() * w.sites.length) | 0];
      ev(w, y, "trade", "A hold from " + s.n + " is on the water.");
    }
    if (w.events.length > 480) w.events = w.events.slice(-400);
  }

  function mapLines(w) {
    w = w || worldState();
    var lines = [];
    for (var y = 0; y < GH; y++) {
      var row = "";
      for (var x = 0; x < GW; x++) {
        if (x === HARBOR.x && y === HARBOR.y) {
          row += "@";
          continue;
        }
        var mark = "";
        for (var s = 0; s < w.sites.length; s++) {
          if (w.sites[s].x === x && w.sites[s].y === y) {
            mark = w.sites[s].ruin ? "x" : w.sites[s].kind === "city" ? "#" : w.sites[s].kind === "port" ? "P" : "*";
            break;
          }
        }
        row += mark || biomeMeta(w.biome[idx(x, y)]).ch;
      }
      lines.push(row);
    }
    return lines;
  }

  function embargo() {
    var w = worldState();
    var y = yearNow();
    for (var i = w.wars.length - 1; i >= 0 && i >= w.wars.length - 6; i--) {
      if (y - w.wars[i].y < 8) return w.wars[i];
    }
    return null;
  }

  function traveler() {
    var w = worldState();
    var rng = mulberry((w.seed ^ (yearNow() * 131)) >>> 0);
    var s = w.sites[1 + ((rng() * Math.max(1, w.sites.length - 1)) | 0)];
    var fig = w.figs.length ? w.figs[(rng() * w.figs.length) | 0] : null;
    return {
      site: s,
      fig: fig,
      line: (fig ? fig.n : "Someone") + " of " + s.n + " came in off a longer road.",
    };
  }

  function pressure() {
    return embargo() ? 0.22 : 0;
  }

  function harborCell() {
    var w = worldState();
    var i = idx(HARBOR.x, HARBOR.y);
    return { elev: w.elev[i], rain: w.rain[i], temp: w.temp[i], volc: w.volc[i], savage: w.savage[i], biome: w.biome[i] };
  }

  function esc(s) {
    return String(s || "").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  }

  function panelHtml() {
    var w = worldState();
    tickYear();
    var html = '<div class="sec">' + esc(w.name) + ' <span>' + esc(w.age) + " · seed " + w.seed + "</span></div>";
    html += '<div class="note">Boston is one port. The rest was generated: elevation, rain, heat, drainage, volcanism, savagery. Civilizations found sites. Gods take seats. Wars sack towns. @ is the shop.</div>';
    html += '<pre class="realm-map" aria-label="world map">' + esc(mapLines(w).join("\n")) + "</pre>";
    html += '<div class="d">~ ocean  . coast  , plain  t forest  ^ mountain  : desert  o lake  # city  * town  P port  x ruin  @ you</div>';
    html += '<div class="sec">Civilizations <span>' + w.civs.length + "</span></div>";
    for (var i = 0; i < w.civs.length && i < 8; i++) {
      var c = w.civs[i];
      html += '<div class="row"><div></div><div><div class="n">' + esc(c.n) + '</div><div class="d">' + esc(c.kind) + " · " + esc(c.ethic) + " · " + esc(c.faith) + " · " + esc(c.tongue) + " · founded " + c.found + "</div></div><div></div></div>";
    }
    html += '<div class="sec">Sites <span>' + w.sites.length + "</span></div>";
    for (var s = 0; s < w.sites.length && s < 8; s++) {
      var site = w.sites[s];
      html += '<div class="row"><div></div><div><div class="n">' + esc(site.n) + (site.i === 0 ? ' <span class="pill">here</span>' : "") + '</div><div class="d">' + esc(site.kind) + (site.ruin ? " · ruin" : "") + " · pop " + site.pop + " · " + esc(site.fish) + " water</div></div><div></div></div>";
    }
    html += '<div class="sec">The years inland</div>';
    for (var e = w.events.length - 1, n = 0; e >= 0 && n < 8; e--, n++) {
      html += '<div class="row"><div></div><div><div class="d">' + w.events[e].y + " · " + esc(w.events[e].s) + "</div></div><div></div></div>";
    }
    if (embargo()) html += '<div class="note">A war is still warm. Holds come in late. The till will feel it.</div>';
    return html;
  }

  function enhance() {
    var body = document.getElementById("dbody");
    var title = document.getElementById("dtitle");
    if (!body || !title) return;
    if (!/atlas/i.test(title.textContent || "")) return;
    var wrap = body.querySelector(".realm-atlas");
    var html = panelHtml();
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "realm-atlas";
      var live = body.querySelector(".live-atlas");
      if (live && live.nextSibling) body.insertBefore(wrap, live.nextSibling);
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
        id: "k_realm",
        sec: "The chronicle",
        t: "The world beyond the harbor",
        tags: "world worldgen realm continent biome civilization war atlas beyond boston",
        w: "<p>The shop is one port on a generated continent. Elevation, rainfall, heat, drainage, volcanism, and savagery decide the biome. Rivers run downhill. Civilizations found sites and keep a tongue and an ethic. Gods take seats. Wars sack towns. Artifacts outlast hands. A thousand years of that, and then you hang a sign. @ on the map is you.</p><p>A war inland is not flavor. Holds come late. Word on the street drops. Someone will walk in off a longer road and name a town you have never stood in.</p><p><b>What to do about it:</b> Atlas. The map under The living year. Same seed as the shop.</p>",
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
      if (now() - lastTick > 1.4) {
        lastTick = now();
        tickYear();
      }
      if (now() - lastUi > 1.1) {
        lastUi = now();
        enhance();
      }
    } catch (e) {}
  }

  window.realm = {
    generate: generate,
    world: worldState,
    tick: tickYear,
    map: mapLines,
    embargo: embargo,
    traveler: traveler,
    pressure: pressure,
    harbor: harborCell,
    panel: panelHtml,
  };

  if (window.__onBeat) window.__onBeat(tick, 400);
  else setTimeout(function loop() { tick(); setTimeout(loop, 400); }, 400);
})();
