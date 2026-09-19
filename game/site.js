/* site.js — the shop as a physical site.
   Tiles, matter, heat, standing water, gravity. Not a tab. The building. */
(function () {
  "use strict";

  var W = 16;
  var H = 10;
  var lastTick = 0;
  var lastNote = "";
  var log = [];

  var KIND = {
    wall: { ch: "#", col: "#2a3340", mat: "stone", solid: 1 },
    floor: { ch: ".", col: "#6b5340", mat: "oak", solid: 0 },
    tank: { ch: "~", col: "#1a6a88", mat: "glass", solid: 1 },
    counter: { ch: "=", col: "#8a6a44", mat: "oak", solid: 1 },
    filter: { ch: "F", col: "#4a5a4a", mat: "iron", solid: 1 },
    door: { ch: "+", col: "#c4a06a", mat: "oak", solid: 0 },
    window: { ch: "W", col: "#7ec8e8", mat: "glass", solid: 1 },
    island: { ch: "o", col: "#185a48", mat: "glass", solid: 1 },
  };

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function gs() {
    try {
      if (typeof gameState === "function") return gameState();
      if (typeof gameState === "object" && gameState) return gameState;
    } catch (e) {}
    return null;
  }

  function wx() {
    try {
      if (window.wxState) return wxState;
    } catch (e) {}
    return { rain: 0, day: 0.6, wind: 8 };
  }

  function outsideC() {
    try {
      if (typeof wxWord === "function") {
        var s = String(wxWord() || "");
        var f = s.match(/(-?\d+)\s*°F/);
        if (f) return ((parseInt(f[1], 10) - 32) * 5) / 9;
        var c = s.match(/(-?\d+)\s*°C/);
        if (c) return parseInt(c[1], 10);
      }
    } catch (e) {}
    var w = wx();
    if (w.seaT != null) return w.seaT;
    var day = w.day == null ? 0.6 : w.day;
    var rain = w.rain || 0;
    return 6 + day * 16 - rain * 4;
  }

  function blank() {
    var cells = [];
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var kind = "floor";
        if (y === 0 || y === H - 1 || x === 0 || x === W - 1) kind = "wall";
        if (y === 0 && x >= 2 && x <= 4) kind = "window";
        if (x === W - 1 && y >= 4 && y <= 6) kind = "door";
        if (y === 1 && x >= 5 && x <= 13) kind = "tank";
        if (y === 2 && x >= 5 && x <= 7) kind = "tank";
        if (y === 5 && x >= 6 && x <= 9) kind = "island";
        if (y === 8 && x >= 4 && x <= 11) kind = "counter";
        if (y === 8 && x === 12) kind = "filter";
        var spec = KIND[kind];
        cells.push({
          x: x,
          y: y,
          kind: kind,
          mat: spec.mat,
          temp: 18,
          water: kind === "tank" || kind === "island" ? 0.92 : 0,
          wet: 0,
          press: kind === "tank" || kind === "island" ? 1 : 0,
        });
      }
    }
    return { w: W, h: H, cells: cells, leak: 0, aisleC: 18, wetMax: 0 };
  }

  function site() {
    var g = gs();
    if (g && g.site && g.site.cells && g.site.cells.length === W * H) return g.site;
    var s = blank();
    try {
      if (g) g.site = s;
    } catch (e) {}
    return s;
  }

  function at(s, x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    return s.cells[y * W + x];
  }

  function note(text) {
    if (!text || text === lastNote) return;
    lastNote = text;
    log.push({ s: text, at: now() });
    if (log.length > 8) log.shift();
    try {
      if (window.desk && desk.think) desk.think("site", text);
    } catch (e) {}
  }

  function tickSite() {
    var s = site();
    var out = outsideC();
    var clog = false;
    try {
      clog = !!window.clogged;
    } catch (e) {}
    var rain = wx().rain || 0;
    var wind = wx().wind || 0;
    var wetMax = 0;
    var aisle = 0;
    var aisleN = 0;

    for (var i = 0; i < s.cells.length; i++) {
      var c = s.cells[i];
      var spec = KIND[c.kind] || KIND.floor;
      var nbs = [at(s, c.x + 1, c.y), at(s, c.x - 1, c.y), at(s, c.x, c.y + 1), at(s, c.x, c.y - 1)];
      var tsum = c.temp;
      var tn = 1;
      for (var n = 0; n < 4; n++) {
        if (nbs[n]) {
          tsum += nbs[n].temp;
          tn++;
        }
      }
      var target = tsum / tn;
      if (c.kind === "window") target = target * 0.55 + out * 0.45;
      if (c.kind === "door") target = target * 0.7 + out * 0.3;
      c.temp += (target - c.temp) * 0.18;

      if (c.kind === "filter" && clog) {
        c.water = Math.min(1, c.water + 0.05);
        c.press = Math.min(2, (c.press || 0) + 0.08);
        var floor = at(s, c.x, c.y - 1);
        if (floor && floor.kind === "floor") floor.wet = Math.min(1, floor.wet + 0.11);
      }
      if ((c.kind === "tank" || c.kind === "island") && clog && c.press > 1.15) {
        var south = at(s, c.x, c.y + 1);
        if (south && south.kind === "floor") south.wet = Math.min(1, south.wet + 0.04);
      }
      if (c.kind === "door" && rain > 0.35) {
        var inF = at(s, c.x - 1, c.y);
        if (inF && inF.kind === "floor") inF.wet = Math.min(1, inF.wet + rain * 0.03);
      }
      if (c.kind === "window" && wind > 22 && rain > 0.2) {
        var inW = at(s, c.x, c.y + 1);
        if (inW && inW.kind === "floor") inW.wet = Math.min(1, inW.wet + 0.02);
      }

      if (c.kind === "floor" && c.wet > 0.02) {
        for (var k = 0; k < 4; k++) {
          var nb = nbs[k];
          if (nb && nb.kind === "floor" && nb.wet < c.wet - 0.08) {
            var give = (c.wet - nb.wet) * 0.08;
            c.wet -= give;
            nb.wet += give;
          }
        }
        c.wet *= c.temp > 20 ? 0.97 : 0.985;
      }

      if (c.kind === "floor") {
        aisle += c.temp;
        aisleN++;
        if (c.wet > wetMax) wetMax = c.wet;
      }
    }

    s.aisleC = aisleN ? aisle / aisleN : 18;
    s.wetMax = wetMax;
    s.leak = clog ? Math.min(1, (s.leak || 0) + 0.04) : Math.max(0, (s.leak || 0) - 0.06);

    if (s.leak > 0.45 && s.leak < 0.55) note("The filter is pushing water onto the boards.");
    if (wetMax > 0.55 && wetMax < 0.7) note("The aisle is wet under the tanks.");
    if (s.aisleC < 12) note("The room is taking the street's cold.");
    if (s.aisleC > 24) note("Heat is pooling by the glass.");

    if (wetMax > 0.22 && now() - (s._dripAt || 0) > 1.7) {
      s._dripAt = now();
      try {
        if (window.feel && feel.play) feel.play("drip");
      } catch (eD) {}
    }
  }

  function dry(amt) {
    var s = site();
    amt = amt == null ? 0.4 : amt;
    for (var i = 0; i < s.cells.length; i++) {
      var c = s.cells[i];
      if (c.kind === "floor") c.wet = Math.max(0, c.wet - amt);
      if (c.kind === "filter") {
        c.water = Math.max(0, c.water - amt);
        c.press = Math.max(0, (c.press || 0) - amt);
      }
    }
    s.leak = Math.max(0, (s.leak || 0) - amt);
    s.wetMax = Math.max(0, (s.wetMax || 0) - amt * 0.8);
    note("The boards went drier.");
  }

  function line() {
    var s = site();
    var bits = [];
    bits.push(s.aisleC.toFixed(1) + "° on the boards");
    if (s.wetMax > 0.25) bits.push("the aisle is wet");
    if (s.leak > 0.3) bits.push("the filter is leaking");
    try {
      if (window.clogged) bits.push("flow is packed");
    } catch (e) {}
    return bits.join(" · ");
  }

  function paintGrid() {
    var s = site();
    var html = '<div class="site-grid" aria-label="The shop as a site">';
    for (var i = 0; i < s.cells.length; i++) {
      var c = s.cells[i];
      var spec = KIND[c.kind] || KIND.floor;
      var col = spec.col;
      if (c.kind === "floor" && c.wet > 0.15) col = "#3d5a6a";
      if (c.kind === "floor" && c.wet > 0.45) col = "#2a4a62";
      html += '<i style="background:' + col + '" title="' + spec.mat + " " + c.temp.toFixed(1) + '°"></i>';
    }
    html += "</div>";
    return html;
  }

  function tick() {
    if (now() - lastTick < 0.8) return;
    lastTick = now();
    tickSite();
  }

  if (window.__onBeat) window.__onBeat(tick, 400);
  else setTimeout(function loop() {
    tick();
    setTimeout(loop, 400);
  }, 400);

  window.shopSite = {
    of: site,
    line: line,
    log: function () {
      return log;
    },
    grid: paintGrid,
    wet: function () {
      return site().wetMax || 0;
    },
    temp: function () {
      return site().aisleC || 18;
    },
    puddle: function () {
      var s = site();
      var best = null;
      for (var i = 0; i < s.cells.length; i++) {
        var c = s.cells[i];
        if (c.kind === "floor" && c.wet > 0.1 && (!best || c.wet > best.wet)) best = c;
      }
      if (!best) return { nx: 0.48, ny: 0.74, wet: 0 };
      return {
        nx: (best.x + 0.5) / W,
        ny: 0.58 + (best.y / H) * 0.32,
        wet: best.wet,
      };
    },
    dry: dry,
  };
})();
