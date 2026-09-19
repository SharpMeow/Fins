/* realm.js — the world beyond the harbor.
   Five fields, biomes, rivers, civilizations, sites, gods, ethics, ages.
   Boston is a harbor on a painted continent. The rest is generated from the shop seed. */
(function () {
  "use strict";

  var GW = 48;
  var GH = 32;
  var HARBOR = { x: 38, y: 13 };
  var lastTick = 0;
  var lastUi = 0;
  var cached = null;
  var selected = -1;

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
    w.lastSim = w.now;
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

  var BIOME_RGB = {
    ocean: [156, 186, 204],
    coast: [214, 196, 148],
    marsh: [132, 148, 108],
    plain: [176, 180, 112],
    forest: [92, 124, 82],
    hill: [186, 152, 96],
    mount: [198, 186, 164],
    desert: [204, 168, 104],
    tundra: [214, 210, 196],
    taiga: [110, 132, 104],
    jungle: [74, 112, 72],
    lake: [148, 176, 186],
  };

  var CIV_WASH = [
    [176, 132, 74],
    [124, 148, 92],
    [186, 166, 96],
    [148, 112, 74],
    [108, 132, 96],
    [196, 156, 88],
    [132, 120, 78],
    [164, 140, 92],
  ];

  var PAPER = [243, 234, 212];
  var WATER_SHAL = [176, 202, 214];
  var WATER_DEEP = [128, 166, 188];
  var INK = [72, 58, 42];

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function smooth(t) {
    t = clamp01(t);
    return t * t * (3 - 2 * t);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function hash2(x, y, s) {
    var n = Math.sin(x * 127.1 + y * 311.7 + (s || 0) * 0.013) * 43758.5453;
    return n - Math.floor(n);
  }

  function fbm(x, y, s) {
    return hash2(x, y, s) * 0.5 + hash2(x * 2.13, y * 2.13, s + 1) * 0.27 + hash2(x * 4.27, y * 4.27, s + 2) * 0.14 + hash2(x * 8.1, y * 8.1, s + 3) * 0.07;
  }

  function sampleGrid(arr, x, y) {
    if (!arr || !arr.length) return 0.4;
    x = x < 0 ? 0 : x > GW - 1.001 ? GW - 1.001 : x;
    y = y < 0 ? 0 : y > GH - 1.001 ? GH - 1.001 : y;
    var x0 = x | 0;
    var y0 = y | 0;
    var x1 = x0 + 1 < GW ? x0 + 1 : GW - 1;
    var y1 = y0 + 1 < GH ? y0 + 1 : GH - 1;
    var tx = smooth(x - x0);
    var ty = smooth(y - y0);
    var a = arr[idx(x0, y0)] || 0;
    var b = arr[idx(x1, y0)] || 0;
    var c = arr[idx(x0, y1)] || 0;
    var d = arr[idx(x1, y1)] || 0;
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }

  function harborBias(x, y) {
    var dx = x - HARBOR.x;
    var dy = y - HARBOR.y;
    var wx = dx + (fbm(x * 1.15, y * 1.15, 7) - 0.5) * 1.55;
    var wy = dy + (fbm(x * 1.15 + 21, y * 1.15, 9) - 0.5) * 1.35;
    var shelf = wx * 0.055;
    var k1 = (wx - 0.95) * (wx - 0.95) / 10.5 + (wy + 0.12) * (wy + 0.12) / 3.6;
    var k2 = (wx - 0.35) * (wx - 0.35) / 5.8 + (wy - 0.62) * (wy - 0.62) / 2.7;
    var kidney = k1 < k2 ? k1 : k2;
    var basin = smooth(1.08 - kidney) * 0.27;
    if (wx < -1.05) basin *= 0.06;
    if (wx > 1.15 && wy * wy < 3.4) basin = basin > 0.16 ? basin : 0.16;
    var hook = Math.exp(-((wx + 0.4) * (wx + 0.4)) / 0.78) * Math.exp(-(wy * wy) / 6.2) * 0.175;
    if (wx > 0.12) hook *= 0.42;
    var meander = (fbm(x * 0.65, y * 2.35, 3) - 0.5) * 0.85;
    var charles = 0;
    if (wx < 1.25) {
      var ch = wy + 0.18 + meander;
      charles = Math.exp(-ch * ch * 4.1) * 0.095;
    }
    return hook - shelf - basin - charles;
  }

  function sampleElev(w, x, y) {
    var ux = x + (fbm(x * 0.72, y * 0.72, 15) - 0.5) * 1.15;
    var uy = y + (fbm(x * 0.72 + 9, y * 0.72, 16) - 0.5) * 1.15;
    var e = sampleGrid(w.elev, ux, uy);
    e += harborBias(x, y);
    e += (fbm(x * 0.42, y * 0.42, w.seed) - 0.5) * 0.05;
    e += (fbm(x * 3.6, y * 3.6, (w.seed || 0) + 4) - 0.5) * 0.1;
    e += (fbm(x * 7.4, y * 7.4, (w.seed || 0) + 8) - 0.5) * 0.035;
    return e;
  }

  function biomeAt(w, x, y) {
    var x0 = x | 0;
    var y0 = y | 0;
    if (x0 < 0 || y0 < 0 || x0 >= GW || y0 >= GH) return "ocean";
    return w.biome[idx(x0, y0)] || "ocean";
  }

  function rgbOf(id) {
    return BIOME_RGB[id] || BIOME_RGB.plain;
  }

  function mixRgb(a, b, t) {
    t = clamp01(t);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  function landColor(w, x, y) {
    var ux = x + (fbm(x * 0.85, y * 0.85, 5) - 0.5) * 1.7;
    var uy = y + (fbm(x * 0.85 + 11, y * 0.85, 6) - 0.5) * 1.7;
    var col = rgbOf(biomeAt(w, Math.round(ux), Math.round(uy)));
    var speckle = hash2(x * 18.3, y * 18.3, 9);
    if (speckle > 0.74) col = mixRgb(col, INK, 0.08);
    else if (speckle < 0.08) col = mixRgb(col, PAPER, 0.14);
    return mixRgb(col, PAPER, 0.1);
  }

  function civWash(w, x, y) {
    var civs = w.civs;
    if (!civs || !civs.length) return null;
    var ux = x + (fbm(x * 0.55, y * 0.55, 22) - 0.5) * 3.4;
    var uy = y + (fbm(x * 0.55 + 6, y * 0.55, 23) - 0.5) * 3.4;
    var best = 0;
    var bd = 1e9;
    var second = 1e9;
    for (var i = 0; i < civs.length; i++) {
      var c = civs[i];
      var d = (c.x - ux) * (c.x - ux) + (c.y - uy) * (c.y - uy);
      if (d < bd) {
        second = bd;
        bd = d;
        best = i;
      } else if (d < second) second = d;
    }
    var edge = second > 0 ? bd / second : 1;
    var alpha = 0.34 * smooth(1.15 - edge * 1.05);
    return { rgb: CIV_WASH[best % CIV_WASH.length], a: alpha };
  }

  function chaikin(pts, rounds) {
    var p = pts;
    for (var r = 0; r < rounds; r++) {
      if (p.length < 2) break;
      var n = [p[0]];
      for (var i = 0; i < p.length - 1; i++) {
        var a = p[i];
        var b = p[i + 1];
        n.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
        n.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      n.push(p[p.length - 1]);
      p = n;
    }
    return p;
  }

  function riverPts(path, seed) {
    if (!path || path.length < 2) return [];
    var pts = [];
    var last = null;
    for (var i = 0; i < path.length; i++) {
      var x = path[i][0] + 0.5;
      var y = path[i][1] + 0.5;
      if (last && last[0] === x && last[1] === y) continue;
      pts.push([x, y]);
      last = pts[pts.length - 1];
    }
    if (pts.length < 2) return pts;
    var sm = chaikin(pts, 4);
    for (var k = 1; k < sm.length - 1; k++) {
      var dx = sm[k + 1][0] - sm[k - 1][0];
      var dy = sm[k + 1][1] - sm[k - 1][1];
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var mag = (hash2(sm[k][0], sm[k][1], seed) - 0.5) * 0.7;
      mag += (hash2(sm[k][0] * 2.2, sm[k][1] * 2.2, seed + 3) - 0.5) * 0.35;
      sm[k][0] += (-dy / len) * mag;
      sm[k][1] += (dx / len) * mag;
    }
    return chaikin(sm, 3);
  }

  function drawKeep(ctx, x, y, scale, here) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(70,50,30,.22)";
    ctx.beginPath();
    ctx.ellipse(0, 5.5, 7, 2.4, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = here ? "#e8d9a4" : "#d2c4a4";
    ctx.strokeStyle = here ? "#8a6a28" : "#5a4a34";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.lineTo(-6, -3);
    ctx.lineTo(-2.2, -3);
    ctx.lineTo(-2.2, -11);
    ctx.lineTo(3.4, -11);
    ctx.lineTo(3.4, -3);
    ctx.lineTo(6, -3);
    ctx.lineTo(6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(-2.2, -13.2, 1.4, 2.2);
    ctx.fillRect(0, -13.2, 1.4, 2.2);
    ctx.fillRect(2, -13.2, 1.4, 2.2);
    ctx.fillStyle = here ? "#c45a3a" : "#6a4a38";
    ctx.fillRect(-1.4, -16, 1.2, 3);
    ctx.beginPath();
    ctx.moveTo(-1.4, -16);
    ctx.lineTo(3.6, -15);
    ctx.lineTo(-1.4, -14);
    ctx.fill();
    if (here) {
      ctx.beginPath();
      ctx.arc(0, -1, 11, 0, 7);
      ctx.strokeStyle = "rgba(212, 160, 48, 0.95)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -1, 13.2, 0, 7);
      ctx.strokeStyle = "rgba(244, 196, 83, 0.55)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintTerrain(cv, w) {
    var W = cv.width;
    var H = cv.height;
    var ctx = cv.getContext("2d");
    var img = ctx.createImageData(W, H);
    var data = img.data;
    var sx = W / GW;
    var sy = H / GH;
    var i = 0;
    for (var py = 0; py < H; py++) {
      var gy = py / sy;
      for (var px = 0; px < W; px++) {
        var gx = px / sx;
        var e = sampleElev(w, gx, gy);
        var grain = 0.94 + hash2(px, py, 1) * 0.1;
        var col;
        if (e < 0.278) {
          var depth = smooth((0.278 - e) / 0.12);
          col = mixRgb(WATER_SHAL, WATER_DEEP, depth);
          col = mixRgb(col, PAPER, 0.16);
        } else if (e < 0.302) {
          var t = smooth((e - 0.278) / 0.024);
          var land = landColor(w, gx, gy);
          var wet = mixRgb(WATER_SHAL, [214, 202, 168], 0.4);
          col = mixRgb(wet, land, t);
          col = mixRgb(col, INK, (1 - Math.abs(t - 0.5) * 2) * 0.1);
        } else {
          col = landColor(w, gx, gy);
          var wash = civWash(w, gx, gy);
          if (wash) col = mixRgb(col, wash.rgb, wash.a);
          if (e > 0.7) col = mixRgb(col, rgbOf("mount"), smooth((e - 0.7) / 0.18) * 0.45);
        }
        data[i++] = Math.min(255, col[0] * grain);
        data[i++] = Math.min(255, col[1] * grain);
        data[i++] = Math.min(255, col[2] * grain);
        data[i++] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    var rivers = w.rivers || [];
    for (var r = 0; r < rivers.length; r++) {
      var rp = riverPts(rivers[r].path, (w.seed || 0) + r * 17);
      if (rp.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(rp[0][0] * sx, rp[0][1] * sy);
      for (var p = 1; p < rp.length; p++) ctx.lineTo(rp[p][0] * sx, rp[p][1] * sy);
      ctx.strokeStyle = "rgba(120, 148, 156, 0.35)";
      ctx.lineWidth = 3.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rp[0][0] * sx, rp[0][1] * sy);
      for (var p2 = 1; p2 < rp.length; p2++) ctx.lineTo(rp[p2][0] * sx, rp[p2][1] * sy);
      ctx.strokeStyle = "rgba(92, 128, 148, 0.72)";
      ctx.lineWidth = 1.45;
      ctx.stroke();
    }

    var routes = [];
    try {
      if (window.road && road.of) routes = (road.of().routes) || [];
    } catch (eR) {}
    if (!routes.length && w.sites) {
      for (var si = 0; si < w.sites.length; si++) {
        var a = w.sites[si];
        if (!a || a.ruin) continue;
        var best = -1;
        var bd = 1e9;
        for (var sj = 0; sj < w.sites.length; sj++) {
          if (si === sj) continue;
          var b = w.sites[sj];
          if (!b || b.ruin) continue;
          var d = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
          if (d < bd) {
            bd = d;
            best = sj;
          }
        }
        if (best >= 0 && si < best) routes.push({ a: si, b: best, cut: 0 });
      }
    }
    ctx.strokeStyle = "rgba(46, 86, 128, 0.55)";
    ctx.lineWidth = 1.55;
    for (var rt = 0; rt < routes.length; rt++) {
      var ra = w.sites[routes[rt].a];
      var rb = w.sites[routes[rt].b];
      if (!ra || !rb) continue;
      var ax = (ra.x + 0.5) * sx;
      var ay = (ra.y + 0.5) * sy;
      var bx = (rb.x + 0.5) * sx;
      var by = (rb.y + 0.5) * sy;
      var mx = (ax + bx) / 2;
      var my = (ay + by) / 2;
      var rdx = bx - ax;
      var rdy = by - ay;
      var rlen = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
      var bend = (hash2(ra.x, ra.y, 40 + rt) - 0.5) * Math.min(70, rlen * 0.28);
      mx += (-rdy / rlen) * bend;
      my += (rdx / rlen) * bend;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my, bx, by);
      if (routes[rt].cut) ctx.setLineDash([5, 6]);
      else ctx.setLineDash([]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    var sites = w.sites || [];
    for (var s = 0; s < sites.length; s++) {
      var site = sites[s];
      if (!site) continue;
      var px2 = (site.x + 0.5) * sx;
      var py2 = (site.y + 0.5) * sy;
      var here = site.x === HARBOR.x && site.y === HARBOR.y;
      var sc = here ? 1.15 : site.kind === "city" || site.kind === "port" ? 0.92 : 0.72;
      drawKeep(ctx, px2, py2, sc, here);
      if (here) {
        ctx.font = "700 13px Nunito, sans-serif";
        ctx.fillStyle = "rgba(90, 64, 28, 0.9)";
        ctx.fillText("Boston", px2 + 16, py2 - 10);
      }
    }
  }


  function mapCanvas(w) {
    var key = "v5:" + String(w.seed) + ":" + (w.rivers && w.rivers.length) + ":" + (w.sites && w.sites.length);
    if (w._mapKey === key && w._mapCv) return w._mapCv;
    var cv = document.createElement("canvas");
    cv.width = 960;
    cv.height = 640;
    paintTerrain(cv, w);
    w._mapCv = cv;
    w._mapKey = key;
    return cv;
  }

  function paintRealmMap(el, w) {
    if (!el || !w) return;
    var src = mapCanvas(w);
    var ctx = el.getContext("2d");
    if (!ctx) return;
    if (el.width !== src.width) el.width = src.width;
    if (el.height !== src.height) el.height = src.height;
    ctx.drawImage(src, 0, 0);
  }

  function dossier(w, site) {
    if (!w || !site) return "";
    var html = '<div class="sec">' + esc(site.n) + (site.i === 0 ? ' <span class="pill">here</span>' : "") + "</div>";
    html +=
      '<div class="note">' +
      esc(site.kind) +
      (site.ruin ? " · ruin" : "") +
      " · pop " +
      site.pop +
      " · " +
      esc(site.fish) +
      " water. Click another keep on the plate, or a name below.</div>";
    var civ = null;
    if (w.civs) {
      for (var i = 0; i < w.civs.length; i++) {
        if (w.civs[i] && (w.civs[i].seat === site.i || w.civs[i].x === site.x)) civ = w.civs[i];
      }
      if (!civ) {
        var bd = 1e9;
        for (var c = 0; c < w.civs.length; c++) {
          var d = (w.civs[c].x - site.x) * (w.civs[c].x - site.x) + (w.civs[c].y - site.y) * (w.civs[c].y - site.y);
          if (d < bd) {
            bd = d;
            civ = w.civs[c];
          }
        }
      }
    }
    if (civ) {
      html +=
        '<div class="row"><div></div><div><div class="n">' +
        esc(civ.n) +
        '</div><div class="d">' +
        esc(civ.kind) +
        " · " +
        esc(civ.ethic) +
        " · " +
        esc(civ.faith) +
        " · " +
        esc(civ.tongue) +
        " · founded " +
        civ.found +
        "</div></div><div></div></div>";
    }
    var evs = [];
    if (w.events) {
      for (var e = w.events.length - 1; e >= 0 && evs.length < 6; e--) {
        var ev = w.events[e];
        if (!ev || !ev.s) continue;
        if (ev.s.indexOf(site.n) >= 0 || (civ && ev.s.indexOf(civ.n) >= 0)) evs.push(ev);
      }
    }
    if (evs.length) {
      html += '<div class="sec">What happened here</div>';
      for (var k = 0; k < evs.length; k++) {
        html += '<div class="row"><div></div><div><div class="d">' + evs[k].y + " · " + esc(evs[k].s) + "</div></div><div></div></div>";
      }
    }
    try {
      var L = window.going && going.letter && going.letter();
      if (L && L.open && L.from === site.n) {
        html +=
          '<div class="note">The letter on the counter is from here. They asked for a pair of ' +
          esc(L.want) +
          ". Fill it and a road can reopen.</div>";
      }
    } catch (eL) {}
    var figs = [];
    if (w.figs) {
      for (var f = 0; f < w.figs.length && figs.length < 4; f++) {
        if (w.figs[f] && w.figs[f].site === site.i) figs.push(w.figs[f]);
      }
    }
    if (figs.length) {
      html += '<div class="sec">People of ' + esc(site.n) + "</div>";
      for (var p = 0; p < figs.length; p++) {
        html +=
          '<div class="row"><div></div><div><div class="d">' +
          esc(figs[p].n) +
          (figs[p].fame > 0.4 ? " · known inland" : "") +
          "</div></div><div></div></div>";
      }
    }
    return html;
  }

  function nearestSite(w, gx, gy) {
    if (!w || !w.sites) return -1;
    var best = -1;
    var bd = 2.8;
    for (var i = 0; i < w.sites.length; i++) {
      var s = w.sites[i];
      if (!s) continue;
      var d = (s.x + 0.5 - gx) * (s.x + 0.5 - gx) + (s.y + 0.5 - gy) * (s.y + 0.5 - gy);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }

  function panelHtml() {
    var w = worldState();
    tickYear();
    var html = '<div class="sec">' + esc(w.name) + ' <span>' + esc(w.age) + " · seed " + w.seed + "</span></div>";
    html += '<div class="note">Boston is one harbor. Click a keep. The plate is the same seed as the shop: elevation, rain, heat, drainage, a tongue, a war, a fish. Gold is here.</div>';
    html += '<div class="realm-map-wrap"><canvas class="realm-map" width="960" height="640" aria-label="The continent. Click a keep. The gold mark is Boston."></canvas></div>';
    var site = selected >= 0 && w.sites[selected] ? w.sites[selected] : w.sites[0];
    if (site) html += '<div class="realm-dossier">' + dossier(w, site) + "</div>";
    html += '<div class="sec">Civilizations <span>' + w.civs.length + "</span></div>";
    for (var i = 0; i < w.civs.length && i < 12; i++) {
      var c = w.civs[i];
      html += '<div class="row"><div></div><div><div class="n">' + esc(c.n) + '</div><div class="d">' + esc(c.kind) + " · " + esc(c.ethic) + " · " + esc(c.faith) + " · " + esc(c.tongue) + " · founded " + c.found + "</div></div><div></div></div>";
    }
    html += '<div class="sec">Sites <span>' + w.sites.length + "</span></div>";
    for (var s = 0; s < w.sites.length && s < 16; s++) {
      var st = w.sites[s];
      html +=
        '<div class="row" data-realm-site="' +
        s +
        '"><div></div><div><div class="n">' +
        esc(st.n) +
        (st.i === 0 ? ' <span class="pill">here</span>' : "") +
        '</div><div class="d">' +
        esc(st.kind) +
        (st.ruin ? " · ruin" : "") +
        " · pop " +
        st.pop +
        " · " +
        esc(st.fish) +
        " water</div></div><div></div></div>";
    }
    html += '<div class="sec">The years inland</div>';
    for (var e = w.events.length - 1, n = 0; e >= 0 && n < 10; e--, n++) {
      html += '<div class="row"><div></div><div><div class="d">' + w.events[e].y + " · " + esc(w.events[e].s) + "</div></div><div></div></div>";
    }
    if (embargo()) html += '<div class="note">A war is still warm. Holds come in late. The till will feel it.</div>';
    return html;
  }

  function bindMap(wrap) {
    if (!wrap) return;
    var cv = wrap.querySelector("canvas.realm-map");
    if (cv && !cv.__realmClick) {
      cv.__realmClick = 1;
      cv.style.cursor = "pointer";
      cv.addEventListener("click", function (e) {
        var r = cv.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var gx = ((e.clientX - r.left) / r.width) * GW;
        var gy = ((e.clientY - r.top) / r.height) * GH;
        var hit = nearestSite(worldState(), gx, gy);
        if (hit < 0) return;
        selected = hit;
        wrap.removeAttribute("data-h");
        enhance();
      });
    }
    if (!wrap.__realmRows) {
      wrap.__realmRows = 1;
      wrap.addEventListener("click", function (e) {
        var row = e.target.closest("[data-realm-site]");
        if (!row) return;
        var i = +row.getAttribute("data-realm-site");
        if (!isFinite(i)) return;
        selected = i;
        wrap.removeAttribute("data-h");
        enhance();
      });
    }
  }

  function enhance() {
    var body = document.getElementById("dbody");
    var title = document.getElementById("dtitle");
    if (!body || !title) return;
    if (!/atlas/i.test(title.textContent || "")) return;
    var wrap = body.querySelector(".realm-atlas");
    var html = panelHtml();
    var key = String(html.length) + ":" + selected;
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "realm-atlas";
      var live = body.querySelector(".live-atlas");
      if (live && live.nextSibling) body.insertBefore(wrap, live.nextSibling);
      else body.appendChild(wrap);
    }
    if (wrap.getAttribute("data-h") !== key) {
      wrap.innerHTML = html;
      wrap.setAttribute("data-h", key);
      wrap.__realmRows = 0;
    }
    bindMap(wrap);
    try {
      paintRealmMap(wrap.querySelector("canvas.realm-map"), worldState());
    } catch (eP) {}
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!w || !w.push) return;
      var extra = {
        id: "k_realm",
        sec: "The chronicle",
        t: "The world beyond the harbor",
        tags: "world realm continent biome war atlas beyond boston",
        w: "<p>The shop is one harbor on a generated continent. Elevation, rainfall, heat, drainage, volcanism, and savagery decide the biome. Rivers run downhill. Civilizations found sites and keep a tongue and an ethic. Gods take seats. Wars sack towns. Artifacts outlast hands. A thousand years of that, and then you hang a sign. The gold mark is Boston.</p><p>A war inland is not flavor. Towns come late. Word on the street drops. Someone will walk in off a longer road and name a town you have never stood in.</p><p><b>What to do about it:</b> Atlas. The painted map under The living year. Same seed as the shop.</p>",
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
    paint: paintRealmMap,
  };

  if (window.__onBeat) window.__onBeat(tick, 400);
  else setTimeout(function loop() { tick(); setTimeout(loop, 400); }, 400);
})();
