/* wonder.js — a wonder is a pilgrimage, not a production queue.
   Civilization wonders are a slot. Fin's inland hold is raising one.
   They need a pair. Fill it and pilgrims come to look, not always to
   bag. The object sits in the glass next to the keeper's key.
   No second HUD. Odds, speech, the chord. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var didBrowse = false;
  var didChoir = false;
  var overlay = null;
  var octx = null;
  var NAMES = ["First Net", "Quiet Oak", "Salt Spire", "Night Ledger", "Wheel House", "Dry Eye"];

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

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.desk && desk.think) desk.think("wonder", text);
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

  function anArt() {
    try {
      var w = window.realm && realm.world && realm.world();
      if (w && w.arts && w.arts.length) {
        for (var i = w.arts.length - 1; i >= 0; i--) {
          if (w.arts[i] && w.arts[i].n) return w.arts[i].n;
        }
      }
    } catch (e) {}
    try {
      var w2 = window.realm && realm.world && realm.world();
      var site = w2 && w2.sites && (w2.sites[2] || w2.sites[1]);
      var nm = NAMES[(year() + (site ? site.i : 0)) % NAMES.length];
      return "the " + nm + (site ? " of " + site.n : "");
    } catch (e2) {}
    return "the First Net";
  }

  function kindOf() {
    try {
      if (window.guild && guild.mandate) return String(guild.mandate() || "goldfish");
    } catch (e) {}
    return "goldfish";
  }

  function letterWant() {
    try {
      var L = window.going && going.letter && going.letter();
      if (L && L.open && L.want) return String(L.want);
    } catch (e) {}
    return "";
  }

  function state() {
    var g = gs();
    if (g && g.wonder && g.wonder.n) return g.wonder;
    var want = kindOf();
    var skip = letterWant();
    if (skip && want === skip) want = want === "goldfish" ? "tetra" : "goldfish";
    var st = { n: anArt(), want: want, done: false, last: "", seen: false, day: -1, pilgrims: 0 };
    try {
      if (g) g.wonder = st;
    } catch (e) {}
    return st;
  }

  function finish(force) {
    var st = state();
    if (st.done && !force) return;
    st.done = true;
    var line = st.n + " is raised. Pilgrims are on the road.";
    st.last = line;
    because(line);
    gold(line, true);
    egg("wonderup", line);
    try {
      if (window.weave && weave.bumpWord) weave.bumpWord(0.07);
    } catch (e) {}
  }

  function noteBag(kind) {
    var st = state();
    if (st.done) return;
    if (st.want && kind && String(kind).toLowerCase().indexOf(String(st.want).toLowerCase()) >= 0) {
      finish();
    }
  }

  function edge() {
    return state().done ? 0.07 : 0;
  }

  function ask(rec, st, force) {
    var ws = state();
    if (ws.done) return false;
    if (ws.seen && ws.day === shopDay() && !force) return false;
    if (shopDay() < 1 && !force) return false;
    rec.kind = rec.kind === "kid" ? "collector" : rec.kind || "collector";
    rec.phase = "look";
    rec.want = ws.want;
    rec.line = "For " + ws.n + ". A pair of " + ws.want + ".";
    if (st) {
      st._wonder = 1;
      st.want = ws.want;
      st.line = rec.line;
      st.lineUntil = now() + 6;
    }
    ws.seen = true;
    ws.day = shopDay();
    var line = "They are raising " + ws.n + ".";
    ws.last = line;
    because(line);
    gold(line, true);
    egg("wonderask", line);
    return true;
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
        var ws = state();
        if (
          !keep &&
          !ws.done &&
          rec.phase === "look" &&
          st &&
          !st._wonder &&
          shopDay() >= 1 &&
          !ws.seen &&
          (rec.kind === "collector" || (idx | 0) === 0)
        ) {
          ask(rec, st);
        }
        if (rec.phase === "pay" && st && (st._wonder || (ws.want && rec.want === ws.want))) {
          noteBag(rec.want || st.want);
        }
        if (ws.done && rec.phase === "look" && st && !st._wondSaid && !keep) {
          st._wondSaid = 1;
          rec.line = rec.kind === "kid" ? "I came to see it." : "I came for " + ws.n + ".";
          st.line = rec.line;
          st.until = Math.max(st.until || 0, now() + 5);
          ws.pilgrims++;
          if (rec.kind !== "collector" && Math.random() < 0.45) {
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
          }
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
        var ws = state();
        if (ws.done) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.11);
          if (!w.line) w.line = ws.n + " is raised. The water is a site.";
        } else if (ws.seen && !w.line) {
          w.line = "They are raising " + ws.n + ".";
        }
      } catch (e) {}
      return w;
    };
  }

  function sceneName() {
    try {
      if (document.body.classList.contains("titling")) return "title";
      if (typeof sceneNow === "function") return String(sceneNow() || "");
    } catch (e) {}
    return "shop";
  }

  function ensureOverlay() {
    if (overlay && overlay.parentNode) return;
    overlay = document.getElementById("wonderVeil");
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.id = "wonderVeil";
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
        "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:4";
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function drawWonder() {
    var sc = sceneName();
    if (sc === "title" || sc === "work" || (sc !== "shop" && sc !== "front")) {
      if (octx && overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }
    if (!state().done) {
      if (octx && overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }
    resize();
    var w = window.innerWidth;
    var h = window.innerHeight;
    octx.clearRect(0, 0, w, h);
    var x = w * 0.28;
    var y = h * 0.2;
    var t = now();
    var glow = 0.16 + 0.08 * Math.sin(t * 1.1);
    octx.save();
    octx.translate(x, y);
    var g = octx.createRadialGradient(0, -8, 2, 0, -8, 34);
    g.addColorStop(0, "rgba(220,211,255," + glow.toFixed(3) + ")");
    g.addColorStop(1, "rgba(220,211,255,0)");
    octx.fillStyle = g;
    octx.beginPath();
    octx.arc(0, -8, 34, 0, 7);
    octx.fill();
    octx.fillStyle = "rgba(24,18,32,.78)";
    octx.beginPath();
    octx.moveTo(0, -22);
    octx.lineTo(12, 10);
    octx.lineTo(-12, 10);
    octx.closePath();
    octx.fill();
    octx.strokeStyle = "rgba(244,196,83,.9)";
    octx.lineWidth = 1.3;
    octx.stroke();
    octx.restore();
    octx.font = "600 11px Nunito, sans-serif";
    octx.fillStyle = "rgba(220,211,255,.86)";
    octx.textAlign = "center";
    octx.fillText(state().n, x, y + 22);
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
      if (wiki.some(function (a) { return a && a.id === "k_wonder"; })) return;
      wiki.push({
        id: "k_wonder",
        sec: "The chronicle",
        t: "They are raising a wonder",
        tags: "wonder pilgrimage pair glass civilization site",
        w: "<p>Civilization wonders are a production slot. Fin's inland hold is raising one. They need a pair. Fill it and pilgrims come to look. They do not always bag. The object sits in the glass next to the keeper's key. The choir sweetens. The street came because of it.</p><p><b>What to do about it:</b> keep two of what they asked for. Life will say if it is raised.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      seedWiki();
      drawWonder();
      if (now() - lastTick > 1.1) lastTick = now();
    } catch (e) {}
  }

  window.wonder = {
    whisper: whisper,
    line: line,
    of: state,
    edge: edge,
    seed: function () {
      var rec = { kind: "collector", phase: "look", line: "", name: "" };
      var st = { phase: "look", bought: false };
      ask(rec, st, true);
      finish(true);
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
