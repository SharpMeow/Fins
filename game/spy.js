/* spy.js — someone on the aisle is writing the names down.
   Civilization spies steal a tech. Fin's spy copies the cards, the
   relic, the pair that is unique. They do not bag. A kid sees them.
   Three looks and a rival hold knows what you keep. No second HUD.
   Odds, speech, the till. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var didBrowse = false;
  var didChoir = false;

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
      if (window.desk && desk.think) desk.think("spy", text);
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

  function rival() {
    try {
      var w = window.realm && realm.world && realm.world();
      if (w && w.sites) {
        for (var i = 1; i < w.sites.length; i++) {
          if (w.sites[i] && !w.sites[i].ruin && w.sites[i].kind === "port") return w.sites[i].n;
        }
        if (w.sites[4] && w.sites[4].n) return w.sites[4].n;
      }
    } catch (e) {}
    return "Haymarket";
  }

  function state() {
    var g = gs();
    if (g && g.spy && typeof g.spy === "object") return g.spy;
    var st = { last: "", seen: false, day: -1, looks: 0, leaked: false, who: rival() };
    try {
      if (g) g.spy = st;
    } catch (e) {}
    return st;
  }

  function arrive(rec, st, force) {
    var ss = state();
    if (ss.seen && ss.day === shopDay() && !force) return false;
    if (shopDay() < 1 && !force) return false;
    rec.kind = "collector";
    rec.phase = "look";
    rec.line = "Just looking at the cards.";
    rec.name = rec.name || "Someone from " + ss.who;
    if (st) {
      st._spy = 1;
      st.bought = false;
      st.line = rec.line;
      st.guestName = rec.name;
      st.until = Math.max(st.until || 0, now() + 9);
      st.lineUntil = now() + 5;
    }
    ss.seen = true;
    ss.day = shopDay();
    ss.looks = (ss.looks || 0) + 1;
    var line = "Someone was writing the names down.";
    ss.last = line;
    because(line);
    gold(line, true);
    egg("spyin", line);
    if (ss.looks >= 2 && !ss.leaked) leak(ss);
    return true;
  }

  function leak(ss) {
    ss.leaked = true;
    var line = ss.who + " knows the rack now.";
    ss.last = line;
    because(line);
    try {
      if (window.hold && hold.of) {
        var h = hold.of();
        if (h && !h.found) h.loyal = Math.min(h.loyal || 0.5, 0.28);
      }
    } catch (e) {}
    try {
      if (window.weave && weave.bumpWord) weave.bumpWord(-0.05);
    } catch (e2) {}
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
        var ss = state();
        if (
          !keep &&
          rec.phase === "look" &&
          st &&
          !st._spy &&
          shopDay() >= 1 &&
          !ss.seen &&
          ((idx | 0) === 3 || rec.kind === "lunch" || rec.kind === "collector")
        ) {
          arrive(rec, st);
        }
        if (ss.seen && ss.day === shopDay() && rec.phase === "look" && st && !st._spy && !st._spySaid && !keep) {
          st._spySaid = 1;
          if (rec.kind === "kid") {
            rec.line = "They're writing the names down.";
            st.line = rec.line;
          } else if (rec.kind === "neighbor") {
            rec.line = "That's not a customer. That's " + ss.who + ".";
            st.line = rec.line;
          }
        }
        if (st && st._spy && rec.phase === "pay") {
          rec.phase = "leave";
          st.phase = "leave";
          st.bought = false;
          rec.line = rec.line || "Just looking at the cards.";
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
        var ss = state();
        if (ss.seen && ss.day === shopDay()) {
          w.sour = Math.min(1, (w.sour || 0) + 0.06);
          if (!w.line) w.line = "Someone is writing the names down.";
        }
      } catch (e) {}
      return w;
    };
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
      if (wiki.some(function (a) { return a && a.id === "k_spy"; })) return;
      wiki.push({
        id: "k_spy",
        sec: "The shop floor",
        t: "Someone is writing the names down",
        tags: "spy espionage cards rival haymarket civilization leak",
        w: "<p>Civilization spies steal a tech. Fin's spy copies the cards, the relic, the pair that is unique. They do not bag. A kid sees them. Two looks and a rival hold knows what you keep. A theft still takes a fish. This takes the list.</p><p><b>What to do about it:</b> you cannot stop the look. You can keep a pair so the list is not a unique. Life will name them.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      seedWiki();
      if (now() - lastTick > 1.1) lastTick = now();
    } catch (e) {}
  }

  window.spy = {
    whisper: whisper,
    line: line,
    of: state,
    seed: function () {
      var rec = { kind: "collector", phase: "look", line: "", name: "" };
      var st = { phase: "look", bought: false };
      arrive(rec, st, true);
      leak(state());
      return state();
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 240);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 240);
    }, 220);
})();
