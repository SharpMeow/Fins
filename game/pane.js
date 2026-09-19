/* pane.js — the glass is two-way.
   The shop window is a shopfront. People on Salem see the tank.
   Rain, night, etch, a risen name, a fish holding still: they see that
   from the street. They come in because of what they saw, or they walk.
   The glass etches from the harbor. Oak rots where the puddle sat.
   Iron rusts at the filter. Floss dries the aisle. It does not clean
   the glass. No second HUD. Odds, speech, the gold line, a stain. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var lastMopSaid = 0;
  var overlay = null;
  var octx = null;
  var scratches = [];
  var didStock = false;
  var didSite = false;
  var didChoir = false;
  var didBrowse = false;

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

  function year() {
    try {
      if (window.saga && typeof saga.year === "function") return saga.year();
    } catch (e) {}
    return 1000;
  }

  function sceneName() {
    try {
      if (document.body.classList.contains("titling")) return "title";
      if (document.body.classList.contains("work")) return "work";
      if (typeof sceneNow === "function") return String(sceneNow() || "");
    } catch (e) {}
    return "tank";
  }

  function fishList() {
    try {
      if (typeof allFish === "function") return allFish() || [];
    } catch (e) {}
    return [];
  }

  function clamp01(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function hash32(s) {
    var h = 2166136261;
    s = String(s || "");
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.desk && desk.think) desk.think("pane", text);
    } catch (e2) {}
  }

  function say(msg, kind) {
    try {
      if (typeof k === "function") k(msg, kind || "");
    } catch (e) {}
  }

  function egg(id, line) {
    try {
      if (typeof findEgg === "function") findEgg(id, line);
    } catch (e) {}
  }

  function gold(text, force) {
    if (!text) return;
    lastGold = text;
    lastGoldAt = now();
    try {
      var el = document.getElementById("hookWhisper");
      if (el && (force || el.textContent !== text)) {
        el.textContent = text;
        el.classList.add("on", "pop");
      }
    } catch (e) {}
  }

  function kindOf(f) {
    if (!f) return "fish";
    try {
      var S = typeof O !== "undefined" ? O : typeof SPECIES !== "undefined" ? SPECIES : null;
      if (S && f.sp != null && S[f.sp]) {
        var nm = S[f.sp].gname || S[f.sp].name || S[f.sp].vname;
        if (nm) return String(nm).toLowerCase();
      }
    } catch (e) {}
    var sp = String((f && f.sp) || "");
    if (/gold/.test(sp)) return "goldfish";
    if (/betta/.test(sp)) return "betta";
    if (/guppy/.test(sp)) return "guppy";
    if (/tetra/.test(sp)) return "tetra";
    if (/angel/.test(sp)) return "angelfish";
    if (/cichlid/.test(sp)) return "cichlid";
    if (!sp || /^\d+$/.test(sp)) return "fish";
    return sp.toLowerCase();
  }

  function tide() {
    try {
      if (window.going && going.tide) return going.tide() || 0;
    } catch (e) {}
    return 0;
  }

  function wet() {
    try {
      if (window.shopSite && shopSite.wet) return shopSite.wet() || 0;
    } catch (e) {}
    return 0;
  }

  function clogged() {
    try {
      return !!window.clogged;
    } catch (e) {}
    return false;
  }

  function hour() {
    try {
      if (typeof jt === "function") return jt() * 24;
      var g = gs();
      if (g && isFinite(g.t)) return (((g.t % 2400) + 2400) % 2400) / 100;
    } catch (e) {}
    return 12;
  }

  function night() {
    var h = hour();
    return h < 6.2 || h >= 19.2;
  }

  function rainAmt() {
    try {
      if (window.wxState && isFinite(wxState.rain)) return wxState.rain;
      if (typeof wxWord === "function" && /rain|storm|sleet/i.test(String(wxWord() || ""))) return 0.55;
    } catch (e) {}
    return 0;
  }

  function seedEtch() {
    var left = 997;
    try {
      if (window.late && late.keeper) {
        var k = late.keeper();
        if (k && isFinite(k.leftY)) left = k.leftY;
      }
    } catch (e) {}
    var age = Math.max(0, year() - left);
    return clamp01(0.1 + age * 0.05 + (hash32("etch:" + year()) % 17) / 120);
  }

  function state() {
    var g = gs();
    if (g && g.pane && isFinite(g.pane.etch)) return g.pane;
    var st = {
      etch: seedEtch(),
      rot: 0.1,
      rust: 0.06,
      seen: "",
      seenSp: "",
      seenAt: 0,
      seenKind: "",
      mopped: 0,
    };
    try {
      if (g) g.pane = st;
    } catch (e) {}
    return st;
  }

  function face() {
    var list = fishList();
    var named = null;
    var still = null;
    var risen = null;
    var sick = null;
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (!f) continue;
      n++;
      if (f.nick && !named) named = f;
      if (f.risen || f._risen) risen = f;
      if (f.sick || f.ill || (f.mind && f.mind.stress > 0.62) || f._holdStill) {
        if (!still) still = f;
      }
      if (f.sick || f.ill || f.cond) sick = f;
    }
    return { named: named, still: still, risen: risen, sick: sick, n: n };
  }

  function clarity() {
    var st = state();
    var rain = rainAmt();
    var nite = night() ? 0.22 : 0;
    return clamp01(1 - st.etch * 0.85 - rain * 0.28 - nite);
  }

  function applyCells() {
    var st = state();
    try {
      if (!window.shopSite || !shopSite.of) return;
      var s = shopSite.of();
      if (!s || !s.cells) return;
      for (var i = 0; i < s.cells.length; i++) {
        var c = s.cells[i];
        if (c.kind === "window") c.etch = st.etch;
        if (c.kind === "floor" && c.mat === "oak") {
          c.rot = Math.max(c.rot || 0, st.rot * (0.4 + (c.wet || 0)));
          if (c.rot > 0.28) {
            c.wet = Math.min(1, (c.wet || 0) + c.rot * 0.012);
          }
        }
        if (c.kind === "filter") {
          c.rust = st.rust;
          if (st.rust > 0.35) {
            c.press = Math.min(2, (c.press || 0) + st.rust * 0.02);
            c.water = Math.min(1, (c.water || 0) + st.rust * 0.012);
          }
        }
        if (c.kind === "counter" && st.rot > 0.4) c.rot = st.rot * 0.4;
      }
      if (st.rot > 0.42 && s.wetMax < st.rot * 0.5) {
        s.wetMax = Math.max(s.wetMax || 0, st.rot * 0.38);
      }
    } catch (e) {}
  }

  function wearTick() {
    var st = state();
    var t = tide();
    var w = wet();
    var clog = clogged();
    if (t > 0.25) st.etch = clamp01(st.etch + 0.00004 + t * 0.00006);
    if (w > 0.28) st.rot = clamp01(st.rot + 0.00005 + w * 0.00007);
    if (clog) st.rust = clamp01(st.rust + 0.00008);
    if (w < 0.16) {
      st.rot = clamp01(st.rot - 0.0015);
      if (t < 0.2) st.etch = clamp01(st.etch - 0.0007);
    }
    if (!clog) st.rust = clamp01(st.rust - 0.0012);
    applyCells();
    if (st.etch > 0.52 && !st._etchSaid) {
      st._etchSaid = 1;
      var line = "The glass is etching. They can't see in.";
      because(line);
      gold(line, true);
      egg("etch", line);
    }
    if (st.rot > 0.55 && !st._rotSaid) {
      st._rotSaid = 1;
      var rline = "The oak is going. The wet stays.";
      because(rline);
      gold(rline, true);
      egg("oakrot", rline);
    }
    if (st.rust > 0.55 && !st._rustSaid) {
      st._rustSaid = 1;
      var uline = "The housing is rusting. The filter packs faster.";
      because(uline);
      gold(uline, true);
    }
    if (st.etch < 0.4) st._etchSaid = 0;
    if (st.rot < 0.4) st._rotSaid = 0;
    if (st.rust < 0.4) st._rustSaid = 0;
  }

  function hexMix(a, b, t) {
    function h(s) {
      return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
    }
    var A = h(a),
      B = h(b);
    var r = (A[0] + (B[0] - A[0]) * t) | 0;
    var g = (A[1] + (B[1] - A[1]) * t) | 0;
    var bl = (A[2] + (B[2] - A[2]) * t) | 0;
    return "rgb(" + r + "," + g + "," + bl + ")";
  }

  function paintWornGrid() {
    try {
      if (!window.shopSite || !shopSite.of) return "";
      var s = shopSite.of();
      var st = state();
      var html = '<div class="site-grid" aria-label="The shop as a site">';
      for (var i = 0; i < s.cells.length; i++) {
        var c = s.cells[i];
        var col = "#6b5340";
        if (c.kind === "wall") col = "#2a3340";
        else if (c.kind === "tank" || c.kind === "island") col = "#1a6a88";
        else if (c.kind === "counter") col = "#8a6a44";
        else if (c.kind === "filter") col = hexMix("#4a5a4a", "#8a3a18", st.rust);
        else if (c.kind === "door") col = "#c4a06a";
        else if (c.kind === "window") col = hexMix("#7ec8e8", "#cdd6cc", st.etch);
        else if (c.kind === "floor") {
          col = "#6b5340";
          if (c.wet > 0.15) col = "#3d5a6a";
          if (c.wet > 0.45) col = "#2a4a62";
          if (st.rot > 0.18) col = hexMix(col.length === 7 ? col : "#3d5a6a", "#3a2414", st.rot);
        }
        var tip = (c.mat || "") + " " + (c.temp || 0).toFixed(1) + "°";
        if (c.kind === "window" && st.etch > 0.2) tip += " · etching";
        if (c.kind === "floor" && st.rot > 0.2) tip += " · oak going";
        if (c.kind === "filter" && st.rust > 0.2) tip += " · rust";
        html += '<i style="background:' + col + '" title="' + tip + '"></i>';
      }
      html += "</div>";
      return html;
    } catch (e) {
      return "";
    }
  }

  function wrapStock() {
    if (didStock || !window.stock || !stock.use) return;
    didStock = true;
    var orig = stock.use;
    stock.use = function (id) {
      var r = orig.apply(this, arguments);
      try {
        if (id === "glass") {
          var st = state();
          var before = st.etch;
          st.etch = clamp01(st.etch * 0.22);
          st._etchSaid = 0;
          applyCells();
          var line =
            before > 0.22
              ? "Vinegar and newsprint. They can see in."
              : "The storefront is a mirror.";
          because(line);
          gold(line, true);
          egg("wash", line);
        }
      } catch (e) {}
      return r;
    };
  }

  function wrapSite() {
    if (didSite || !window.shopSite || !shopSite.grid) return;
    didSite = true;
    var origGrid = shopSite.grid;
    shopSite.grid = function () {
      var worn = paintWornGrid();
      return worn || origGrid.apply(this, arguments);
    };
    var origLine = shopSite.line;
    shopSite.line = function () {
      var s = origLine.apply(this, arguments);
      var st = state();
      var bits = [];
      if (st.etch > 0.28) bits.push("the glass is etching");
      if (st.rot > 0.28) bits.push("the oak is going");
      if (st.rust > 0.28) bits.push("the housing is rusting");
      return bits.length ? s + " · " + bits.join(" · ") : s;
    };
    var origDry = shopSite.dry;
    shopSite.dry = function (amt) {
      origDry.apply(this, arguments);
      var st = state();
      st.rot = clamp01(st.rot - (amt == null ? 0.4 : amt) * 0.35);
      st.mopped = (st.mopped || 0) + 1;
      applyCells();
      if (st.etch > 0.32 && now() - lastMopSaid > 18) {
        lastMopSaid = now();
        var line = "Floss dries the aisle. It does not clean the glass.";
        because(line);
        gold(line, true);
        say(line, "");
      }
    };
  }

  function wrapChoir() {
    if (didChoir || !window.choir || !choir.weather) return;
    didChoir = true;
    var orig = choir.weather;
    choir.weather = function () {
      var w = orig.apply(this, arguments);
      try {
        var st = state();
        var cl = clarity();
        w.etch = st.etch;
        w.rot = st.rot;
        w.rust = st.rust;
        w.clear = cl;
        if (st.etch > 0.34) w.sour = Math.min(1, (w.sour || 0) + st.etch * 0.22);
        if (st.rot > 0.4) w.sour = Math.min(1, (w.sour || 0) + 0.08);
        if (!w.line) {
          if (st.etch > 0.5) w.line = "The glass is etching. They can't see in.";
          else if (st.rot > 0.52) w.line = "The oak is going. The wet stays.";
          else if (cl < 0.45) w.line = "Rain on the glass. They look from the door.";
        }
      } catch (e) {}
      return w;
    };
  }

  function wrapBrowse() {
    if (didBrowse || !window.shopBrowse) return;
    didBrowse = true;
    var orig = window.shopBrowse;
    window.shopBrowse = function (idx, slot, W, floorY, personS, simT) {
      var rec = orig.apply(this, arguments);
      try {
        if (!rec) return rec;
        var st = window.shopLife && shopLife.browse ? shopLife.browse()[idx] : null;
        var P = state();
        var f = face();
        var cl = clarity();
        var seenNick = f.named && f.named.nick ? f.named.nick : "";
        var seenSp = f.named ? kindOf(f.named) : f.n ? "fish" : "";

        if (rec.phase === "look" && st && !st._paneSaid) {
          st._paneSaid = 1;
          var had = rec.line;
          var keep = !!(st._lateMae || st._goingHold || st._lateKid);
          if (f.risen && P.etch < 0.55 && !keep) {
            rec.line = "What's wrong with its eyes. From the street.";
            st.line = rec.line;
            st.lineUntil = now() + 3.4;
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
            P.seen = seenNick || "the risen one";
            P.seenKind = "risen";
            P.seenAt = now();
            because(rec.line);
            gold("They saw it from the street. They walked.", true);
          } else if (f.still && cl > 0.38 && !keep) {
            rec.line =
              rec.kind === "kid"
                ? "Is that one dead? I saw it from outside."
                : "That one isn't moving. From outside.";
            st.line = rec.line;
            st.lineUntil = now() + 3.6;
            P.seen = (f.still.nick || "") || "a still one";
            P.seenSp = kindOf(f.still);
            P.seenKind = "still";
            P.seenAt = now();
            if (Math.random() < 0.4) {
              rec.phase = "leave";
              st.phase = "leave";
              st.bought = false;
            }
          } else if ((P.etch > 0.48 || cl < 0.36) && !keep) {
            rec.line = rec.kind === "kid" ? "I can't see the fish." : "Can't see a thing in the window.";
            st.line = rec.line;
            st.lineUntil = now() + 3.2;
            P.seenKind = "etch";
            P.seenAt = now();
            if (P.etch > 0.58 && rec.kind !== "neighbor" && Math.random() < 0.45) {
              rec.phase = "leave";
              st.phase = "leave";
              st.bought = false;
            }
          } else if (!had && seenNick && cl > 0.5 && rec.kind !== "neighbor") {
            rec.line = "I saw " + seenNick + " from the street.";
            st.line = rec.line;
            st.lineUntil = now() + 4;
            st.until = Math.max(st.until || 0, now() + 5.2);
            P.seen = seenNick;
            P.seenSp = seenSp;
            P.seenKind = "named";
            P.seenAt = now();
            because(rec.line);
          } else if (!had && f.n && cl > 0.55 && rec.kind === "lunch") {
            rec.line = rec.line || "That one watched me. From the glass on the street.";
            st.line = rec.line;
            P.seen = seenNick || "the window";
            P.seenKind = "watch";
            P.seenAt = now();
          }
        }

        if (rec.phase === "pay" && st && !st._panePay) {
          st._panePay = 1;
          if (P.etch > 0.6 && rec.kind !== "neighbor" && Math.random() < 0.5) {
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
            rec.line = "I couldn't see what you keep.";
            st.line = rec.line;
          }
        }
      } catch (e) {}
      return rec;
    };
  }

  function ensureOverlay() {
    if (overlay && overlay.parentNode) return;
    overlay = document.getElementById("paneVeil");
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.id = "paneVeil";
      overlay.setAttribute("aria-hidden", "true");
      document.body.appendChild(overlay);
    }
    octx = overlay.getContext("2d");
  }

  function ensureScratches() {
    if (scratches.length) return;
    var h = hash32("scratch:" + year());
    for (var i = 0; i < 18; i++) {
      h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
      scratches.push({
        x: (h % 1000) / 1000,
        y: ((h >>> 10) % 1000) / 1000 * 0.55,
        w: 0.04 + ((h >>> 20) % 40) / 400,
        a: 0.4 + ((h >>> 4) % 50) / 100,
      });
    }
  }

  function resize() {
    ensureOverlay();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (overlay.width !== ((w * dpr) | 0) || overlay.height !== ((h * dpr) | 0)) {
      overlay.width = (w * dpr) | 0;
      overlay.height = (h * dpr) | 0;
      overlay.style.cssText =
        "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3";
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function drawPane() {
    var sc = sceneName();
    if (sc === "title" || sc === "work" || sc === "street") {
      if (octx && overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }
    resize();
    var w = window.innerWidth;
    var h = window.innerHeight;
    octx.clearRect(0, 0, w, h);
    var st = state();
    ensureScratches();

    if (sc === "shop" || sc === "front" || sc === "tank") {
      if (st.etch > 0.12) {
        var a = st.etch * (sc === "tank" ? 0.16 : 0.28);
        octx.fillStyle = "rgba(210,220,214," + a.toFixed(3) + ")";
        octx.fillRect(0, 0, w, h * (sc === "tank" ? 1 : 0.58));
        octx.save();
        octx.globalAlpha = Math.min(0.45, st.etch * 0.55);
        octx.strokeStyle = "rgba(236,240,234,.55)";
        octx.lineWidth = 1;
        for (var i = 0; i < scratches.length; i++) {
          var s = scratches[i];
          octx.beginPath();
          octx.moveTo(s.x * w, s.y * h);
          octx.lineTo(s.x * w + s.w * w, s.y * h + 6 * s.a);
          octx.stroke();
        }
        octx.restore();
      }
    }

    if (sc === "shop" || sc === "front") {
      if (st.rot > 0.18) {
        octx.save();
        var rx = w * 0.42;
        var ry = h * 0.78;
        var g = octx.createRadialGradient(rx, ry, 8, rx, ry, w * (0.16 + st.rot * 0.12));
        g.addColorStop(0, "rgba(42,22,10," + (st.rot * 0.38).toFixed(3) + ")");
        g.addColorStop(1, "rgba(42,22,10,0)");
        octx.fillStyle = g;
        octx.beginPath();
        octx.ellipse(rx, ry, w * (0.14 + st.rot * 0.1), 18 + st.rot * 16, -0.12, 0, Math.PI * 2);
        octx.fill();
        octx.restore();
      }
      if (st.rust > 0.2) {
        octx.save();
        var ux = w * 0.84;
        var uy = h * 0.18;
        var rg = octx.createRadialGradient(ux, uy, 2, ux, uy, 48 + st.rust * 40);
        rg.addColorStop(0, "rgba(140,52,18," + (0.12 + st.rust * 0.28).toFixed(3) + ")");
        rg.addColorStop(1, "rgba(140,52,18,0)");
        octx.fillStyle = rg;
        octx.fillRect(ux - 60, uy - 40, 120, 90);
        octx.restore();
      }
    }
  }

  function whisper() {
    var st = state();
    if (lastGold && now() - lastGoldAt < 12) return lastGold;
    if (st.seenKind && now() - (st.seenAt || 0) < 10) {
      if (st.seenKind === "named" && st.seen) return "They saw " + st.seen + " from the street.";
      if (st.seenKind === "still") return "That one isn't moving. They saw it from outside.";
      if (st.seenKind === "risen") return "They saw it from the street. They walked.";
      if (st.seenKind === "etch") return "Can't see a thing in the window.";
    }
    if (st.etch > 0.52) return "The glass is etching. They can't see in.";
    if (st.rot > 0.55) return "The oak is going. The wet stays.";
    return "";
  }

  function line() {
    var st = state();
    var bits = [];
    bits.push("etch " + Math.round(st.etch * 100) + "%");
    if (st.rot > 0.18) bits.push("oak going");
    if (st.rust > 0.18) bits.push("housing rusting");
    var cl = clarity();
    if (cl < 0.5) bits.push("they can't see in");
    else bits.push("they can see in");
    if (st.seen && now() - (st.seenAt || 0) < 40) bits.push("they saw " + st.seen);
    return bits.join(" · ");
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) { return a && a.id === "k_pane"; })) return;
      wiki.push({
        id: "k_pane",
        sec: "The shop floor",
        t: "The glass is two-way",
        tags: "window shopfront street etch see glass rain night risen still",
        w: "<p>The shop window is a shopfront. People on Salem see the tank. Rain, night, etch, a risen name, a fish holding still: they see that from the street. They come in because of what they saw, or they walk. That is not a backdrop. That is odds.</p><p><b>What to do about it:</b> keep the named ones moving. Do not raise a name into the window. The gold line will say if they saw it from outside.</p>",
      });
      wiki.push({
        id: "k_wear",
        sec: "The shop floor",
        t: "The building remembers water",
        tags: "oak rot rust etch iron filter floss mop tide salt boards",
        w: "<p>The glass etches from the harbor. Oak rots where the puddle sat. Iron rusts at the filter. Rotten boards hold the wet. A rusty housing packs faster. Floss dries the aisle. It does not clean the glass. Window wash does — vinegar and newsprint, Harbor Supply, a dollar nine. Then they can see in.</p><p><b>What to do about it:</b> mop. Unclog the filter. Wash the glass when the gold line says they can't see in. The little map in Life goes the color of the damage. That is the shop as a body, not a menu.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapSite();
      wrapChoir();
      wrapBrowse();
      wrapStock();
      seedWiki();
      if (sceneName() === "title") return;
      if (now() - lastTick > 0.85) {
        lastTick = now();
        wearTick();
      }
      if (now() - lastUi > 0.08) {
        lastUi = now();
        drawPane();
      }
    } catch (e) {}
  }

  window.pane = {
    whisper: whisper,
    line: line,
    etch: function () {
      return state().etch;
    },
    rot: function () {
      return state().rot;
    },
    rust: function () {
      return state().rust;
    },
    clarity: clarity,
    seen: function () {
      return state().seen;
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 90);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 90);
    }, 180);
})();
