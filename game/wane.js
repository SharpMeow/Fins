/* wane.js — the unplated walk the glass.
   Dwarf Fortress ghosts appear. Fin's haunt was a count, a sour note, an
   empty nail. Ingum has been dead since Year 412. At night she is in the
   shop window. People leave. Named fish hold still. Chalk writes the name
   and she rests. No second HUD. Odds, speech, the choir, a figure in the pane. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var overlay = null;
  var octx = null;
  var didBrowse = false;
  var didChoir = false;
  var didFish = false;
  var saidNight = -1;

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

  function hour() {
    try {
      if (typeof jt === "function") return jt() * 24;
      var g = gs();
      if (g && isFinite(g.t)) return (((g.t % 2400) + 2400) % 2400) / 100;
    } catch (e) {}
    return 12;
  }

  function shopDay() {
    try {
      var g = gs();
      if (g && isFinite(g.t)) return Math.floor((((g.t % 1e9) + 1e9) % 1e9) / 2400);
    } catch (e) {}
    return 0;
  }

  function night() {
    var h = hour();
    return h < 6.2 || h >= 19.2;
  }

  function sceneName() {
    try {
      if (document.body.classList.contains("titling")) return "title";
      if (document.body.classList.contains("work")) return "work";
      if (typeof sceneNow === "function") return String(sceneNow() || "");
    } catch (e) {}
    return "shop";
  }

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.desk && desk.think) desk.think("wane", text);
    } catch (e2) {}
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

  function due() {
    try {
      if (window.mark && mark.due) return mark.due() || [];
    } catch (e) {}
    return [];
  }

  function oldest() {
    var d = due();
    return d.length ? d[0] : null;
  }

  function standing() {
    return !!(night() && oldest());
  }

  function state() {
    var g = gs();
    if (g && g.wane && typeof g.wane === "object") return g.wane;
    var st = { last: "", seen: 0 };
    try {
      if (g) g.wane = st;
    } catch (e) {}
    return st;
  }

  function notice() {
    if (!standing()) return;
    var rec = oldest();
    if (!rec || !rec.n) return;
    var d = shopDay();
    if (saidNight === d) return;
    saidNight = d;
    var line = rec.n + " is in the glass.";
    state().last = line;
    state().seen = (state().seen || 0) + 1;
    because(line);
    gold(line, true);
    egg("waneghost", line);
    try {
      if (window.feel && feel.play) feel.play("warn");
    } catch (e) {}
  }

  function ensureOverlay() {
    if (overlay && overlay.parentNode) return;
    overlay = document.getElementById("waneVeil");
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.id = "waneVeil";
      overlay.setAttribute("aria-hidden", "true");
      document.body.appendChild(overlay);
    }
    octx = overlay.getContext("2d");
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

  function drawGhost() {
    var sc = sceneName();
    if (sc === "title" || sc === "work" || (sc !== "shop" && sc !== "front")) {
      if (octx && overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }
    resize();
    var w = window.innerWidth;
    var h = window.innerHeight;
    octx.clearRect(0, 0, w, h);
    if (!standing()) return;
    var rec = oldest();
    if (!rec) return;
    var t = now();
    var x = w * (0.52 + Math.sin(t * 0.35) * 0.04);
    var y = h * (0.34 + Math.cos(t * 0.28) * 0.03);
    var a = 0.16 + 0.1 * Math.sin(t * 1.1);
    octx.save();
    octx.translate(x, y);
    octx.globalAlpha = a;
    octx.fillStyle = "rgba(210, 226, 232, 1)";
    octx.beginPath();
    octx.moveTo(-22, 0);
    octx.quadraticCurveTo(-4, -10, 16, -3);
    octx.quadraticCurveTo(22, 0, 16, 4);
    octx.quadraticCurveTo(-4, 10, -22, 0);
    octx.fill();
    octx.beginPath();
    octx.moveTo(-18, 0);
    octx.lineTo(-28, -8);
    octx.lineTo(-26, 0);
    octx.lineTo(-28, 8);
    octx.closePath();
    octx.fill();
    octx.fillStyle = "rgba(40, 70, 88, 0.9)";
    octx.beginPath();
    octx.arc(10, -1.5, 1.6, 0, 7);
    octx.fill();
    octx.restore();
    octx.font = "italic 600 11px Nunito, serif";
    octx.textAlign = "center";
    octx.fillStyle = "rgba(196, 214, 220," + (0.35 + a * 0.8).toFixed(3) + ")";
    octx.fillText(rec.n, x, y + 22);
  }

  function wrapBrowse() {
    if (didBrowse || !window.shopBrowse) return;
    didBrowse = true;
    var orig = window.shopBrowse;
    window.shopBrowse = function (idx, slot, W, floorY, personS, simT) {
      var rec = orig.apply(this, arguments);
      try {
        if (!rec) return rec;
        if (!standing()) return rec;
        var st = window.shopLife && shopLife.browse ? shopLife.browse()[idx] : null;
        var keep = typeof keepGuest === "function" ? keepGuest(st) : !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
        if (keep) return rec;
        var n = oldest();
        n = n && n.n;
        if (!n) return rec;
        if (rec.phase === "look" && st && !st._waneSaid) {
          st._waneSaid = 1;
          rec.line =
            rec.kind === "kid"
              ? "Who's that in the window?"
              : rec.kind === "neighbor"
                ? n + " is in your glass. I'm not staying."
                : "There's someone in the glass. I'm going.";
          rec.phase = "leave";
          st.phase = "leave";
          st.bought = false;
          st.line = rec.line;
          st.lineUntil = now() + 3.8;
          because((rec.name || "Someone") + " saw " + n + " in the glass and walked.");
        }
      } catch (e) {}
      return rec;
    };
  }

  function wrapChoir() {
    if (didChoir || !window.choir || !choir.weather) return;
    didChoir = true;
    var orig = choir.weather;
    choir.weather = function () {
      var w = orig.apply(this, arguments);
      try {
        if (standing()) {
          var n = oldest();
          w.sour = Math.min(1, (w.sour || 0) + 0.14);
          if (n && n.n && !w.line) w.line = n.n + " is walking the glass.";
        }
      } catch (e) {}
      return w;
    };
  }

  function wrapFish() {
    if (didFish || typeof window.drawFishSprite !== "function") return;
    didFish = true;
    var orig = window.drawFishSprite;
    window.drawFishSprite = function (a) {
      try {
        if (standing() && a && a.fish && a.fish.nick) {
          a.fish._holdStill = 1;
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  }

  function whisper() {
    if (lastGold && now() - lastGoldAt < 12) return lastGold;
    if (standing()) {
      var rec = oldest();
      if (rec && rec.n) return rec.n + " is walking the glass.";
    }
    return "";
  }

  function line() {
    var rec = oldest();
    if (standing() && rec) return rec.n + " is in the glass. Chalk would rest them.";
    if (rec) return rec.n + " has no plate. Night will bring them to the glass.";
    return state().last || whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) {
        return a && a.id === "k_wane";
      }))
        return;
      wiki.push({
        id: "k_wane",
        sec: "The chronicle",
        t: "The unplated walk the glass",
        tags: "ghost haunt slab plate night ingum glass unburied dwarf",
        w: "<p>Dwarf Fortress ghosts appear. Fin's haunt was a count, a sour note, an empty nail. Ingum has been dead since Year 412. At night she is in the shop window. People leave. Named fish hold still. The choir keeps a wronger note. Chalk writes the name. She rests.</p><p><b>What to do about it:</b> Harbor Supply, counter chalk. Write the oldest name before last hour. Life lists who is still walking. Do not raise them instead. That is a different wrong note.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      wrapFish();
      seedWiki();
      if (sceneName() === "title") return;
      if (now() - lastTick > 0.8) {
        lastTick = now();
        notice();
      }
      if (now() - lastUi > 0.1) {
        lastUi = now();
        drawGhost();
      }
    } catch (e) {}
  }

  window.wane = {
    whisper: whisper,
    line: line,
    of: function () {
      return oldest();
    },
    standing: standing,
    seed: function () {
      var rec = oldest();
      if (!rec) {
        try {
          if (window.mark && mark.want) mark.want("Ingum", "has no plate", "the shop", 412, true);
        } catch (e) {}
        rec = oldest();
      }
      if (!rec) return null;
      saidNight = -1;
      notice();
      if (!lastGold) gold(rec.n + " is in the glass.", true);
      return rec;
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 90);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 90);
    }, 180);
})();
