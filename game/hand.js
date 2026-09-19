/* hand.js — skills rust.
   Bags, water, glass: three hands. A week without a bag and the next
   one is sloppy. People say so. They walk. Treat with rusty water-hands
   and the still comes back. No second HUD. Odds, speech, the till. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var lastSales = -1;
  var tillReady = false;
  var lastRustD = -1;
  var didBrowse = false;
  var didChoir = false;
  var didStock = false;
  var didTreat = false;

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
      if (typeof sceneNow === "function") return String(sceneNow() || "");
    } catch (e) {}
    return "shop";
  }

  function clamp01(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.desk && desk.think) desk.think("hand", text);
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
    if (g && g.hand && typeof g.hand.bag === "number") return g.hand;
    var d = shopDay();
    var st = { bag: 0.62, water: 0.55, glass: 0.5, lastBag: d, lastWater: d, lastGlass: d, last: "" };
    try {
      if (g) g.hand = st;
    } catch (e) {}
    return st;
  }

  function rustDay() {
    var d = shopDay();
    if (d === lastRustD) return;
    lastRustD = d;
    if (d < 1) return;
    var st = state();
    var rusted = [];
    if (d - (st.lastBag || 0) >= 1) {
      st.bag = clamp01(st.bag - 0.07);
      rusted.push("the knot");
      try {
        if (window.craft && craft.noteBag) craft.noteBag(false);
      } catch (e) {}
    }
    if (d - (st.lastWater || 0) >= 2) {
      st.water = clamp01(st.water - 0.06);
      rusted.push("the column");
    }
    if (d - (st.lastGlass || 0) >= 2) {
      st.glass = clamp01(st.glass - 0.05);
      rusted.push("the pane");
    }
    if (rusted.length && st.bag < 0.34) {
      var line = "Your hands forgot " + rusted[0] + ".";
      st.last = line;
      because(line);
      gold(line, true);
      egg("handrust", line);
    }
  }

  function noteBag() {
    var st = state();
    st.bag = clamp01(st.bag + 0.05);
    st.lastBag = shopDay();
    st.last = "The knot held.";
    try {
      if (window.craft && craft.noteBag) craft.noteBag(st.bag > 0.42);
    } catch (e) {}
  }

  function watchTill() {
    try {
      if (!window.shopLife || !shopLife.day) return;
      var day = shopLife.day();
      if (!day || !isFinite(day.sales)) return;
      if (!tillReady) {
        lastSales = day.sales;
        tillReady = true;
        return;
      }
      if (day.sales === lastSales + 1) {
        lastSales = day.sales;
        noteBag();
      } else if (day.sales !== lastSales) {
        lastSales = day.sales;
      }
    } catch (e) {}
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
        var h = state();
        var keep = typeof keepGuest === "function" ? keepGuest(st) : !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
        if (rec.phase === "pay" && st && !st._handPay && !keep) {
          st._handPay = 1;
          if (h.bag < 0.3 && Math.random() < 0.42) {
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
            rec.line = "The last knot was loose. Not this one.";
            st.line = rec.line;
            because((rec.name || "Someone") + " walked. The knot was loose.");
            gold("The knot was loose. They walked.", true);
          } else if (h.bag > 0.78 && rec.kind === "collector") {
            rec.line = rec.line || "Whoever bags here knows their hands.";
            st.line = rec.line;
          }
        }
        if (rec.phase === "look" && st && !st._handSaid && !keep && h.bag < 0.32) {
          st._handSaid = 1;
          rec.line = rec.line || "I saw the last bag. The water went everywhere.";
          st.line = rec.line;
          st.lineUntil = now() + 3.2;
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
        var h = state();
        if (h.bag < 0.32) {
          w.sour = Math.min(1, (w.sour || 0) + 0.1);
          if (!w.line) w.line = "The knot is rusting.";
        } else if (h.bag > 0.8) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.08);
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
        var st = state();
        var d = shopDay();
        if (id === "salt" || id === "almond" || id === "carbon" || id === "starter" || id === "cond") {
          st.water = clamp01(st.water + 0.08);
          st.lastWater = d;
          st.last = "The column remembers.";
        }
        if (id === "glass" || id === "chalk") {
          st.glass = clamp01(st.glass + 0.1);
          st.lastGlass = d;
        }
      } catch (e) {}
      return r;
    };
  }

  function wrapTreat() {
    if (didTreat || !window.ill || !ill.treat) return;
    didTreat = true;
    var orig = ill.treat;
    ill.treat = function (id) {
      var r = orig.apply(this, arguments);
      try {
        var st = state();
        if (st.water < 0.32) {
          var s = ill.of ? ill.of() : null;
          if (s) s.tank = Math.min(1, (s.tank || 0) + 0.22);
          because("The vial went in. The hands were rusty. The still held.");
          gold("The hands were rusty. The still held.", true);
        } else {
          st.water = clamp01(st.water + 0.05);
          st.lastWater = shopDay();
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
    var st = state();
    var bits = [];
    bits.push("knot " + Math.round(st.bag * 100));
    bits.push("column " + Math.round(st.water * 100));
    bits.push("pane " + Math.round(st.glass * 100));
    if (st.bag < 0.34) return "The knot is rusting. " + bits.join(" · ") + ".";
    if (st.last) return st.last + " " + bits.join(" · ") + ".";
    return bits.join(" · ") + ".";
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) {
        return a && a.id === "k_hand";
      }))
        return;
      wiki.push({
        id: "k_hand",
        sec: "The shop floor",
        t: "The hands rust",
        tags: "skill rust bag knot hands craft idle",
        w: "<p>The knot goes. Bags, water, glass: three hands. A day without a bag and the next one is sloppy. People say so. They walk. Treat with rusty water-hands and the still comes back. String a run and the hands remember.</p><p><b>What to do about it:</b> bag. Treat. Wash. Do not tab out for a week and expect the first knot to hold. The gold line will say when the hands forgot.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      wrapStock();
      wrapTreat();
      seedWiki();
      if (sceneName() === "title") return;
      if (now() - lastTick > 1) {
        lastTick = now();
        rustDay();
        watchTill();
      }
    } catch (e) {}
  }

  window.hand = {
    whisper: whisper,
    line: line,
    of: function () {
      return state();
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 280);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 280);
    }, 230);
})();
