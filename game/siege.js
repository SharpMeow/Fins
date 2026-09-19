/* siege.js — a war is a keel on the glass, not a combat screen.
   Civilization sieges empty a city. Fin's embargo and forgotten beast
   were numbers. Now militia walk the aisle. Named fish hold still.
   At night the thing in the harbor is in the shop window. People leave.
   No second HUD. Odds, speech, the chord. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var didBrowse = false;
  var didChoir = false;
  var didFish = false;
  var overlay = null;
  var octx = null;

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

  function shopDay() {
    try {
      var g = gs();
      if (g && isFinite(g.t)) return Math.floor((((g.t % 1e9) + 1e9) % 1e9) / 2400);
    } catch (e) {}
    return 0;
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

  function sceneName() {
    try {
      if (document.body.classList.contains("titling")) return "title";
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
      if (window.desk && desk.think) desk.think("siege", text);
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

  function beastName() {
    try {
      if (window.beast && beast.state) {
        var s = beast.state();
        if (s && s.list) {
          for (var i = 0; i < s.list.length; i++) {
            if (s.list[i] && s.list[i].n && s.list[i].near) return s.list[i].n;
          }
          if (s.list[0] && s.list[0].n) return s.list[0].n;
        }
      }
    } catch (e) {}
    return "the thing in the harbor";
  }

  function threat() {
    try {
      if (window.realm && realm.embargo && realm.embargo()) return "war";
    } catch (e) {}
    try {
      if (window.beast && beast.near && beast.near() > 0.04) return "beast";
    } catch (e2) {}
    try {
      if (window.road && road.cut && road.cut()) return "cut";
    } catch (e3) {}
    return "";
  }

  function state() {
    var g = gs();
    if (g && g.siege && typeof g.siege === "object") return g.siege;
    var st = { last: "", on: false, day: -1, who: "", kind: "" };
    try {
      if (g) g.siege = st;
    } catch (e) {}
    return st;
  }

  function raise(kind, force) {
    var st = state();
    if (st.on && st.day === shopDay() && !force) return;
    if (shopDay() < 1 && !force) return;
    kind = kind || threat() || "beast";
    st.on = true;
    st.day = shopDay();
    st.kind = kind;
    st.who = kind === "beast" ? beastName() : "the inland war";
    var line = kind === "beast" ? st.who + " is on the glass." : "The harbor is under a keel.";
    st.last = line;
    because(line);
    gold(line, true);
    egg("siege" + kind, line);
    try {
      if (window.feel && feel.play) feel.play("warn");
    } catch (e) {}
    try {
      var list = typeof allFish === "function" ? allFish() || [] : [];
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].nick) list[i]._holdStill = 1;
      }
    } catch (e2) {}
  }

  function watch() {
    var t = threat();
    var st = state();
    if (t && shopDay() >= 1 && (!st.on || st.day !== shopDay())) raise(t);
    if (!t && st.on && st.day !== shopDay()) {
      st.on = false;
    }
  }

  function edge() {
    return state().on ? -0.14 : 0;
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
        var keep = !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
        var sg = state();
        if (!sg.on || !st) return rec;
        if (rec.phase === "look" && !st._siegeSaid && !keep) {
          st._siegeSaid = 1;
          if (rec.kind === "kid") rec.line = "We're not supposed to be out.";
          else rec.line = sg.kind === "beast" ? "That is in the glass. I'm leaving." : "The hold is under the keel.";
          rec.phase = "leave";
          st.phase = "leave";
          st.bought = false;
          st.line = rec.line;
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
        var sg = state();
        if (sg.on) {
          w.sour = Math.min(1, (w.sour || 0) + 0.18);
          w.beast = Math.max(w.beast || 0, 0.2);
          if (!w.line) w.line = sg.last || "The harbor is under a keel.";
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
        if (state().on && a && a.fish && a.fish.nick) {
          a.fish._holdStill = 1;
          a.fish._gaze = now();
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  }

  function ensureOverlay() {
    if (overlay && overlay.parentNode) return;
    overlay = document.getElementById("siegeVeil");
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.id = "siegeVeil";
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

  function drawKeel() {
    var sc = sceneName();
    if (sc === "title" || sc === "work" || (sc !== "shop" && sc !== "front")) {
      if (octx && overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }
    var sg = state();
    if (!sg.on) {
      if (octx && overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }
    resize();
    var w = window.innerWidth;
    var h = window.innerHeight;
    octx.clearRect(0, 0, w, h);
    var t = now();
    var a = night() ? 0.42 : 0.16;
    a += 0.06 * Math.sin(t * 0.9);
    octx.fillStyle = "rgba(8,10,18," + a.toFixed(3) + ")";
    octx.fillRect(0, 0, w, h * 0.38);
    octx.save();
    octx.translate(w * 0.5, h * 0.18);
    octx.fillStyle = "rgba(12,16,28," + Math.min(0.86, a + 0.3).toFixed(3) + ")";
    octx.beginPath();
    octx.moveTo(-70, 10);
    octx.lineTo(0, -28);
    octx.lineTo(70, 10);
    octx.lineTo(40, 18);
    octx.lineTo(-40, 18);
    octx.closePath();
    octx.fill();
    octx.strokeStyle = "rgba(244,196,83," + (night() ? 0.35 : 0.12).toFixed(3) + ")";
    octx.lineWidth = 1.2;
    octx.stroke();
    octx.restore();
    octx.font = "600 12px Nunito, sans-serif";
    octx.fillStyle = "rgba(244,196,83,.78)";
    octx.textAlign = "center";
    octx.fillText(sg.who || "the keel", w * 0.5, h * 0.3);
  }

  function whisper() {
    if (lastGold && now() - lastGoldAt < 12) return lastGold;
    return "";
  }

  function line() {
    return state().last || whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) { return a && a.id === "k_siege"; })) return;
      wiki.push({
        id: "k_siege",
        sec: "The chronicle",
        t: "The harbor is under a keel",
        tags: "war siege beast barbarian militia glass civilization embargo",
        w: "<p>Civilization sieges empty a city. Fin's embargo and forgotten beast were numbers. Now militia walk the aisle. Named fish hold still. At night the thing in the harbor is in the shop window. People leave. The till feels a war that is not a combat screen.</p><p><b>What to do about it:</b> wait it out. Keep the pair. The gold line will say if the keel lifted.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      wrapFish();
      seedWiki();
      watch();
      drawKeel();
      if (now() - lastTick > 1.1) lastTick = now();
    } catch (e) {}
  }

  window.siege = {
    whisper: whisper,
    line: line,
    of: state,
    edge: edge,
    on: function () {
      return !!state().on;
    },
    seed: function () {
      raise("beast", true);
      return state();
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 200);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 200);
    }, 200);
})();
