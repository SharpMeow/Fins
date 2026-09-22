/* relic.js — the artifact sits in the window.
   A strange mood leaves an object. Fin's puts it in the glass. People
   come to see it. The gold line names it. The previous keeper left one.
   Sell the fish that made it — the object stays. No second HUD. Odds,
   speech, the choir, a glint in the pane. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var seenArts = {};
  var overlay = null;
  var octx = null;
  var didBrowse = false;
  var didChoir = false;
  var didFish = false;

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
    return "shop";
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
      if (window.desk && desk.think) desk.think("relic", text);
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

  function arts() {
    try {
      if (window.mind && mind.book) {
        var b = mind.book();
        if (b && Array.isArray(b.arts)) return b.arts;
      }
    } catch (e) {}
    return [];
  }

  function state() {
    var g = gs();
    if (g && g.relic && typeof g.relic === "object") return g.relic;
    var st = { window: null, case: [], seen: 0, lastWho: "" };
    try {
      if (g) g.relic = st;
    } catch (e) {}
    return st;
  }

  function keeperRelic() {
    var k = null;
    try {
      if (window.late && late.keeper) k = late.keeper();
    } catch (e) {}
    if (!k || !k.n) {
      k = { n: "the last keeper", leftY: year() - 1 };
    }
    var first = k.n.split(" ")[0];
    return {
      n: first + "'s Key",
      mat: "brass",
      who: k.n,
      y: k.leftY || year() - 1,
      img: "the last lock",
      rx: "Salt in the grain",
      from: "keeper",
    };
  }

  function seedWindow() {
    var st = state();
    if (st.window && st.window.n) return;
    st.window = keeperRelic();
    st.seen = 1;
    because(st.window.n + " is in the window. " + st.window.who + " left it.");
    egg("relickey", st.window.n + " in the glass.");
  }

  // What landed at the end of a capped list since the last look. The list drops its oldest
  // entry once it is full, so its length stops moving and cannot say what is new; the last
  // record seen can. A different list object means a load or a new game, and the first look
  // at it only notes where it ends, so a reload does not replay what the save already holds.
  function since(mark, list) {
    var last = list.length ? list[list.length - 1] : null;
    if (mark.list !== list) {
      mark.list = list;
      mark.last = last;
      return [];
    }
    if (last === mark.last) return [];
    var at = mark.last ? list.lastIndexOf(mark.last) : -1;
    mark.last = last;
    return list.slice(at + 1);
  }

  function watchArts() {
    var fresh = since(seenArts, arts());
    if (!fresh.length) return;
    var art = fresh[fresh.length - 1];
    if (!art || !art.n) return;
    var st = state();
    if (st.window && st.window.n && st.window.n !== art.n) {
      st.case.push(st.window);
      if (st.case.length > 12) st.case.shift();
    }
    st.window = {
      n: art.n,
      mat: art.mat || "driftglass",
      who: art.who || "a fish",
      y: art.y || year(),
      img: art.img || "the shop as it stood",
      rx: art.rx || "",
      from: "mood",
    };
    var line = st.window.n + " is in the window.";
    because(line);
    gold(line, true);
    egg("relicin", line);
  }

  function matColor(mat) {
    var s = String(mat || "");
    if (/brass|gold|mica/.test(s)) return "rgba(244,196,83,.85)";
    if (/shell|bone/.test(s)) return "rgba(232,220,200,.9)";
    if (/bog|oak|wood/.test(s)) return "rgba(120,78,42,.9)";
    if (/glass|drift/.test(s)) return "rgba(140,200,220,.85)";
    if (/stone|river/.test(s)) return "rgba(150,150,160,.85)";
    return "rgba(200,180,140,.85)";
  }

  function ensureOverlay() {
    if (overlay && overlay.parentNode) return;
    overlay = document.getElementById("relicVeil");
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.id = "relicVeil";
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

  function drawRelic() {
    var sc = sceneName();
    if (sc === "title" || sc === "work") {
      if (octx && overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }
    if (sc !== "shop" && sc !== "front") {
      if (octx && overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }
    resize();
    var w = window.innerWidth;
    var h = window.innerHeight;
    octx.clearRect(0, 0, w, h);
    var st = state();
    var art = st.window;
    if (!art) return;
    var x = w * 0.18;
    var y = h * 0.22;
    var t = now();
    var glow = 0.18 + 0.08 * Math.sin(t * 1.4);
    octx.save();
    octx.translate(x, y);
    octx.rotate(-0.08);
    var g = octx.createRadialGradient(0, 0, 2, 0, 0, 28);
    g.addColorStop(0, "rgba(244,196,83," + glow.toFixed(3) + ")");
    g.addColorStop(1, "rgba(244,196,83,0)");
    octx.fillStyle = g;
    octx.beginPath();
    octx.arc(0, 0, 28, 0, 7);
    octx.fill();
    octx.fillStyle = "rgba(18,12,8,.72)";
    octx.fillRect(-9, -13, 18, 22);
    octx.strokeStyle = matColor(art.mat);
    octx.lineWidth = 1.4;
    octx.strokeRect(-9, -13, 18, 22);
    octx.beginPath();
    octx.moveTo(-5, -4);
    octx.lineTo(0, 2);
    octx.lineTo(5, -6);
    octx.stroke();
    octx.restore();
    octx.font = "600 11px Nunito, sans-serif";
    octx.fillStyle = "rgba(244,196,83,.82)";
    octx.textAlign = "center";
    octx.fillText(art.n, x, y + 26);
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
        var art = state().window;
        if (!art || !art.n) return rec;
        var keep = typeof keepGuest === "function" ? keepGuest(st) : !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
        if (rec.phase === "look" && st && !st._relicSaid && !keep) {
          st._relicSaid = 1;
          if (rec.kind === "collector" || rec.kind === "neighbor" || Math.random() < 0.28) {
            rec.line = rec.kind === "kid" ? "What's the shiny one?" : "I came for " + art.n + ".";
            st.line = rec.line;
            st.lineUntil = now() + 4;
            st.until = Math.max(st.until || 0, now() + 5.5);
            state().lastWho = rec.name || rec.kind || "";
            because((rec.name || "Someone") + " came to see " + art.n + ".");
            if (rec.kind === "collector") gold("A collector came for " + art.n + ".", true);
          }
        }
        if (rec.phase === "pay" && st && !st._relicPay && rec.kind === "collector" && art.from === "mood") {
          st._relicPay = 1;
          rec.line = rec.line || "The " + (art.who || "one") + " that made it. I'll take that line.";
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
        var art = state().window;
        if (art && art.n) {
          w.sweet = Math.min(1, (w.sweet || 0) + (art.from === "mood" ? 0.14 : 0.06));
          if (!w.line) w.line = art.n + " is in the window.";
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
        var art = state().window;
        if (art && a && a.fish && a.fish.nick && art.who && a.fish.nick === art.who) {
          a.fish._gaze = now();
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  }

  function whisper() {
    if (lastGold && now() - lastGoldAt < 12) return lastGold;
    return "";
  }

  function line() {
    var st = state();
    if (st.window && st.window.n) {
      return (
        st.window.n +
        ", " +
        st.window.mat +
        (st.window.rx ? ". " + st.window.rx : "") +
        ". Engraved is " +
        (st.window.img || "the shop") +
        "."
      );
    }
    return whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) { return a && a.id === "k_relic"; })) return;
      wiki.push({
        id: "k_relic",
        sec: "The chronicle",
        t: "The artifact is in the window",
        tags: "artifact relic mood window brass engraving collector",
        w: "<p>A strange mood leaves an object. Fin's puts it in the glass. The previous keeper left a key. A named fish leaves a Wake, a Filigree, a Salt-Mark. Collectors come to see it, not to buy a SKU. The choir sweetens while it sits. The gold line names it.</p><p><b>What to do about it:</b> leave the mood. Watch the window. A collector who came for the object will take the line that made it. Do not bag the fish in the middle of the work.</p>",
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
      seedWindow();
      if (now() - lastTick > 0.8) {
        lastTick = now();
        watchArts();
      }
      if (now() - lastUi > 0.08) {
        lastUi = now();
        drawRelic();
      }
    } catch (e) {}
  }

  window.relic = {
    whisper: whisper,
    line: line,
    of: function () {
      return state().window;
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 90);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 90);
    }, 180);
})();
