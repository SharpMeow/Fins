/* cut.js — the glass keeps the morning.

   Fin's glass was etching as weather. Now it cuts a sentence: who
   died, who took it, who was born, who was written on the wall. Vinegar cleans
   the haze. It does not clean the morning. People on Salem read it
   from the street. They come in because of what it says, or they
   walk. No second HUD. Odds, speech, a faint line in the pane. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var lastBecause = 0;
  var overlay = null;
  var octx = null;
  var didBrowse = false;
  var didChoir = false;
  var didStock = false;

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
      if (window.desk && desk.think) desk.think("cut", text);
    } catch (e2) {}
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

  function egg(id, line) {
    try {
      if (typeof findEgg === "function") findEgg(id, line);
    } catch (e) {}
  }

  function state() {
    var g = gs();
    if (g && g.cut && Array.isArray(g.cut.cuts)) return g.cut;
    var st = { cuts: [], last: "", washed: 0 };
    try {
      if (g) g.cut = st;
    } catch (e) {}
    return st;
  }

  function loud(s) {
    s = String(s || "");
    return /died|stole|took |is on the board|name on the wall|white-spot|gold-dust|fin-rot|still-sickness|salt-itch|was born|walked|strange mood|artifact|pinched|made it right|never brought|in the glass|walking the glass|died in a fight|little one is in|brought fry|had a row|is on the aisle|left the till|left a cat|golden age|dark age|was founded|raising a shop|envoy|Haymarket|the .* is on the aisle|is raised|took the |under a keel|harbor is shut|inland town|on the glass|the pact|denounced|without |writing the names|the others follow|brought an edict|taking vows|are here for a pair|houses bind|is .* now|waiting for |has a hook|claims |broke on the aisle|laying a table|said no|did not come back|harbor is cruel|faction emptied|filter clogged/i.test(
      s
    );
  }

  function shortOf(s) {
    s = String(s || "").replace(/^Year\s+\d+\.\s*/, "");
    if (s.length > 42) s = s.slice(0, 40) + "…";
    return s;
  }

  function addCut(text, quiet) {
    if (!text || !loud(text)) return;
    var st = state();
    var s = shortOf(text);
    if (st.cuts.length && st.cuts[st.cuts.length - 1].s === s) return;
    st.cuts.push({ s: s, y: year(), d: shopDay(), at: now() });
    if (st.cuts.length > 3) st.cuts.shift();
    st.last = s;
    try {
      var g = gs();
      if (g && g.pane && typeof g.pane.etch === "number") {
        g.pane.etch = Math.min(1, g.pane.etch + 0.04);
      }
    } catch (e) {}
    if (!quiet) {
      because("The glass cut it: " + s);
      gold("The glass cut it. " + s, true);
      egg("cutglass", s);
    }
  }

  function watchBecause() {
    try {
      if (!window.weave || !weave.of) return;
      var bec = weave.of().because || [];
      if (bec.length <= lastBecause) {
        if (!lastBecause) lastBecause = bec.length;
        return;
      }
      var rec = bec[bec.length - 1];
      lastBecause = bec.length;
      if (rec && rec.s && !/^The glass cut it/.test(rec.s)) addCut(rec.s, false);
    } catch (e) {}
  }

  function clarity() {
    try {
      if (window.pane && pane.clarity) return pane.clarity();
    } catch (e) {}
    return 0.7;
  }

  function ensureOverlay() {
    if (overlay && overlay.parentNode) return;
    overlay = document.getElementById("cutVeil");
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.id = "cutVeil";
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

  function drawCuts() {
    var sc = sceneName();
    if (sc === "title" || sc === "work" || (sc !== "shop" && sc !== "front")) {
      if (octx && overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }
    resize();
    var w = window.innerWidth;
    var h = window.innerHeight;
    octx.clearRect(0, 0, w, h);
    var cuts = state().cuts;
    if (!cuts.length) return;
    var cl = clarity();
    var a = 0.18 + cl * 0.42;
    octx.save();
    octx.font = "italic 600 12px Nunito, serif";
    octx.textAlign = "center";
    octx.fillStyle = "rgba(210, 200, 170," + a.toFixed(3) + ")";
    var x = w * 0.5;
    var y = h * 0.16;
    for (var i = 0; i < cuts.length; i++) {
      octx.fillText(cuts[i].s, x, y + i * 16);
    }
    octx.restore();
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
        var cuts = state().cuts;
        if (!cuts.length) return rec;
        var keep = typeof keepGuest === "function" ? keepGuest(st) : !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
        if (rec.phase === "look" && st && !st._cutSaid && !keep) {
          st._cutSaid = 1;
          var latest = cuts[cuts.length - 1];
          var cl = clarity();
          if (cl < 0.38) {
            rec.line = rec.kind === "kid" ? "There's writing. I can't read it." : "Something's cut in the glass. Can't read it from here.";
          } else {
            rec.line =
              rec.kind === "kid"
                ? "It says " + latest.s + "."
                : "I saw it from the street. \"" + latest.s + ".\"";
            if (/died|took |still gone/i.test(latest.s) && Math.random() < 0.35) {
              rec.phase = "leave";
              st.phase = "leave";
              st.bought = false;
            } else {
              st.until = Math.max(st.until || 0, now() + 5);
            }
          }
          st.line = rec.line;
          st.lineUntil = now() + 4;
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
        var cuts = state().cuts;
        if (cuts.length) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.04);
          if (!w.line) w.line = "The glass is keeping " + cuts[cuts.length - 1].s + ".";
        }
      } catch (e) {}
      return w;
    };
  }

  function wrapStock() {
    if (didStock || !window.stock || !stock.use) return;
    didStock = true;
    var orig = stock.use;
    stock.use = function (id) {
      var r = orig.apply(this, arguments);
      try {
        if (id === "glass") {
          state().washed = (state().washed || 0) + 1;
          var cuts = state().cuts;
          if (cuts.length) {
            var line = "Vinegar took the haze. The morning is still in the glass.";
            because(line);
            gold(line, true);
          }
        }
      } catch (e) {}
      return r;
    };
  }

  function whisper() {
    if (lastGold && now() - lastGoldAt < 12) return lastGold;
    return "";
  }

  function line() {
    var cuts = state().cuts;
    if (!cuts.length) return whisper();
    return "Cut in the glass: " + cuts.map(function (c) { return c.s; }).join(" / ") + ".";
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) {
        return a && a.id === "k_cut";
      }))
        return;
      wiki.push({
        id: "k_cut",
        sec: "The chronicle",
        t: "The glass keeps the morning",
        tags: "etch engraving glass morning history pane",
        w: "<p>Fin's glass was etching as weather. Now it cuts a sentence: who died, who took it, who was born, who was written on the wall. Vinegar cleans the haze. It does not clean the morning. People on Salem read it from the street. They come in because of what it says, or they walk.</p><p><b>What to do about it:</b> wash the window if you want them to read it. Leave the haze if you do not. The cut stays either way. Life lists the mornings.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      wrapStock();
      seedWiki();
      if (sceneName() === "title") return;
      if (now() - lastTick > 0.8) {
        lastTick = now();
        watchBecause();
      }
      if (now() - lastUi > 0.12) {
        lastUi = now();
        drawCuts();
      }
    } catch (e) {}
  }

  window.cut = {
    whisper: whisper,
    line: line,
    of: function () {
      return state().cuts;
    },
    add: function (s) {
      addCut(s, true);
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 90);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 90);
    }, 180);
})();
