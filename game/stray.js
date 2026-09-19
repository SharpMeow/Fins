/* stray.js — Nedda left a cat.
   Dwarf Fortress does not spawn "a pet." It has a cat that sleeps on a
   stockpile, hunts vermin, and whose death is a tantrum. Aquarium shops
   have a till-cat. Fin's has the one the previous keeper left. It sits
   in the window. Regulars ask. It takes the flashing off the glass.
   Days without a bag and it leaves. Mae will not bag if it is gone.
   No second HUD. Odds, speech, the choir, a shape on the sill. */
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
  var NAMES = ["Moth", "Soot", "Ink", "Rill", "Pebble", "Ash", "Nettle", "Cinder"];

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
      if (window.desk && desk.think) desk.think("stray", text);
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

  function keeper() {
    try {
      if (window.late && late.keeper) return late.keeper();
    } catch (e) {}
    return null;
  }

  function keeperFirst() {
    var k = keeper();
    if (!k || !k.n) return "Nedda";
    return k.n.split(" ")[0];
  }

  function state() {
    var g = gs();
    if (g && g.stray && g.stray.n) return g.stray;
    var k = keeper();
    var h = hash32("stray:" + ((k && k.n) || "Nedda") + ":" + year());
    var st = {
      n: NAMES[h % NAMES.length],
      alive: true,
      hunger: 0.18,
      lastBagDay: 0,
      lastBags: -1,
      said: false,
      last: "",
      hunted: 0,
      left: false,
      who: (k && k.n) || "Nedda Quill",
    };
    try {
      if (g) g.stray = st;
    } catch (e) {}
    return st;
  }

  function notice() {
    var st = state();
    if (!st.alive || st.said) return;
    st.said = true;
    var line = keeperFirst() + " left a cat. " + st.n + " is on the till.";
    st.last = line;
    because(line);
    gold(line, true);
    egg("stray", line);
  }

  function watchBags() {
    var st = state();
    if (!st.alive) return;
    try {
      var bags = 0;
      if (window.hookRun) {
        var h = hookRun();
        if (h && isFinite(h.bags)) bags = h.bags;
      }
      if (st.lastBags == null || st.lastBags < 0) {
        st.lastBags = bags;
        return;
      }
      if (bags > st.lastBags) {
        st.hunger = Math.max(0, (st.hunger || 0) - 0.28 * (bags - st.lastBags));
        st.lastBagDay = shopDay();
        st.lastBags = bags;
      }
    } catch (e) {}
  }

  function hunt() {
    var st = state();
    if (!st.alive || st.hunger > 0.62) return;
    var tank = 0;
    try {
      if (window.ill && ill.of) tank = ill.of().tank || 0;
    } catch (e) {}
    if (tank < 0.12) return;
    try {
      var list = typeof allFish === "function" ? allFish() || [] : [];
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        if (!f || f.dead) continue;
        if (f.sick || f.ill) {
          f.sick = Math.max(0, (f.sick || 0) * 0.35);
          if (f.sick < 0.1) {
            f.sick = 0;
            f.ill = 0;
          }
          break;
        }
      }
      if (window.ill && ill.of) {
        var il = ill.of();
        il.tank = Math.max(0, (il.tank || 0) * 0.72);
      }
    } catch (e2) {}
    st.hunted = (st.hunted || 0) + 1;
    var line = st.n + " took the flashing off the glass.";
    st.last = line;
    because(line);
    gold(line, true);
    egg("strayhunt", line);
  }

  function leave() {
    var st = state();
    if (!st.alive) return;
    st.alive = false;
    st.left = true;
    var line = st.n + " left. The till was quiet.";
    st.last = line;
    because(line);
    gold(line, true);
    egg("straygone", line);
    try {
      if (window.kin && kin.hurt) kin.hurt("Mae Costa", 0.1, st.n + " left");
    } catch (e) {}
    try {
      if (window.feel && feel.play) feel.play("warn");
    } catch (e2) {}
  }

  function tickDay() {
    var st = state();
    if (!st.alive) return;
    var d = shopDay();
    if (st._day === d) return;
    st._day = d;
    if (d < 1) return;
    if (d - (st.lastBagDay || 0) >= 1) {
      st.hunger = Math.min(1, (st.hunger || 0) + 0.2);
    }
    if (st.hunger > 0.55 && st.hunger < 0.86) hunt();
    else if (Math.random() < 0.35) hunt();
    if (st.hunger > 0.86) leave();
  }

  function ensureOverlay() {
    if (overlay && overlay.parentNode) return;
    overlay = document.getElementById("strayVeil");
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.id = "strayVeil";
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

  function drawCat() {
    var sc = sceneName();
    if (sc === "title" || sc === "work" || (sc !== "shop" && sc !== "front")) {
      if (octx && overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }
    resize();
    var w = window.innerWidth;
    var h = window.innerHeight;
    octx.clearRect(0, 0, w, h);
    var st = state();
    if (!st.alive) return;
    var x = w * 0.68;
    var y = h * 0.26;
    var t = now();
    var hungry = st.hunger > 0.55;
    var a = hungry ? 0.5 : 0.86;
    octx.save();
    octx.translate(x, y);
    octx.fillStyle = "rgba(18,12,8," + a.toFixed(3) + ")";
    octx.beginPath();
    octx.ellipse(0, 8, 14, 9, 0, 0, 7);
    octx.fill();
    octx.beginPath();
    octx.arc(-10, -2, 6.4, 0, 7);
    octx.fill();
    octx.beginPath();
    octx.moveTo(-15.2, -6);
    octx.lineTo(-14.2, -14);
    octx.lineTo(-9.2, -7.4);
    octx.moveTo(-5.2, -7.6);
    octx.lineTo(-4.2, -14.2);
    octx.lineTo(-0.8, -6.4);
    octx.closePath();
    octx.fill();
    octx.strokeStyle = "rgba(18,12,8," + a.toFixed(3) + ")";
    octx.lineWidth = 1.6;
    octx.beginPath();
    octx.moveTo(12, 8);
    octx.quadraticCurveTo(22, 2 + Math.sin(t * 1.6) * 3, 20, 16);
    octx.stroke();
    octx.fillStyle = hungry ? "rgba(196,80,60,.88)" : "rgba(244,196,83,.92)";
    octx.beginPath();
    octx.arc(-12.4, -2.4, 1.15, 0, 7);
    octx.arc(-8, -2.4, 1.15, 0, 7);
    octx.fill();
    octx.restore();
    octx.font = "600 11px Nunito, sans-serif";
    octx.fillStyle = "rgba(232,214,170,.82)";
    octx.textAlign = "center";
    octx.fillText(st.n, x, y + 26);
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
        var keep = !!(st && (st._lateMae || st._goingHold || st._lateKid));
        var cat = state();
        if (rec.phase === "look" && st && !st._straySaid && !keep) {
          st._straySaid = 1;
          if (!cat.alive) {
            if (rec.kind === "neighbor" || rec.kind === "kid") {
              rec.line =
                rec.kind === "kid"
                  ? "Where's " + cat.n + "?"
                  : cat.n + " is gone. I'm not bagging today.";
              rec.phase = "leave";
              st.phase = "leave";
              st.bought = false;
              st.line = rec.line;
              st.lineUntil = now() + 3.8;
              because((rec.name || "Someone") + " walked. " + cat.n + " is gone.");
            }
          } else if (rec.kind === "kid") {
            rec.line = "Can I pet " + cat.n + "?";
            st.line = rec.line;
            st.until = Math.max(st.until || 0, now() + 5.5);
          } else if (rec.kind === "neighbor") {
            rec.line = "That's " + keeperFirst() + "'s. " + cat.n + " still sleeps here.";
            st.line = rec.line;
            st.lineUntil = now() + 3.8;
          } else if (cat.hunger > 0.6 && Math.random() < 0.4) {
            rec.line = cat.n + " looks thin. You feeding that cat?";
            st.line = rec.line;
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
        var st = state();
        if (!st.alive) {
          w.sour = Math.min(1, (w.sour || 0) + 0.1);
          if (!w.line) w.line = st.n + " is gone.";
        } else if (st.hunger > 0.6) {
          w.sour = Math.min(1, (w.sour || 0) + 0.05);
        } else {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.04);
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
        var st = state();
        if (st.alive && a && a.fish && a.fish.nick && sceneName() === "tank" && st.hunger < 0.5) {
          if (((a.fish.fid || 0) + shopDay()) % 3 === 0) a.fish._holdStill = 1;
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
    if (!st.alive) return (st.n || "The cat") + " left. The till was quiet.";
    if (st.hunger > 0.6) return st.n + " looks thin. A bag feeds the till-cat.";
    if (st.last) return st.last;
    return st.n + " is on the till. " + keeperFirst() + " left them.";
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) {
        return a && a.id === "k_stray";
      }))
        return;
      wiki.push({
        id: "k_stray",
        sec: "The shop floor",
        t: "The till-cat",
        tags: "cat stray pet till moth nedda vermin hunt bag dwarf",
        w: "<p>Dwarf Fortress does not spawn a pet. It has a cat that sleeps on a stockpile, hunts vermin, and whose death is a tantrum. Aquarium shops have a till-cat. The previous keeper left one. It sits in the window. Regulars ask. It takes the flashing off the glass. Days without a bag and it leaves. Mae will not bag if it is gone.</p><p><b>What to do about it:</b> string a bag. The cat eats when the till does. Life names them. The gold line will say if they left.</p>",
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
      notice();
      if (now() - lastTick > 0.9) {
        lastTick = now();
        watchBags();
        tickDay();
      }
      if (now() - lastUi > 0.12) {
        lastUi = now();
        drawCat();
      }
    } catch (e) {}
  }

  window.stray = {
    whisper: whisper,
    line: line,
    of: function () {
      return state();
    },
    seed: function () {
      var st = state();
      st.alive = true;
      st.left = false;
      st.hunger = 0.2;
      st.said = false;
      notice();
      return st;
    },
    go: function () {
      leave();
      return state();
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 160);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 160);
    }, 200);
})();
