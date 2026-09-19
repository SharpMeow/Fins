/* age.js — the harbor has eras, and they are not a tree.
   Civilization golden ages are a banner. Fin's is the street staying
   or walking. The atlas already named the Age. Now it lands on the
   aisle: a golden morning, they bag; a dark one, they don't.
   No second HUD. Odds, speech, the chord. */
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
      if (window.desk && desk.think) desk.think("age", text);
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

  function eraName() {
    try {
      var w = window.realm && realm.world && realm.world();
      if (w && w.age) return String(w.age);
    } catch (e) {}
    return "Age of Quiet Water";
  }

  function state() {
    var g = gs();
    if (g && g.age && typeof g.age === "object") return g.age;
    var st = { era: eraName(), mood: "normal", last: "", day: -1 };
    try {
      if (g) g.age = st;
    } catch (e) {}
    return st;
  }

  function scoreMood() {
    var n = 0;
    try {
      if (window.guild && guild.standing) n += (guild.standing() - 0.42) * 1.4;
    } catch (e) {}
    try {
      if (window.craft && craft.quality) n += (craft.quality() - 0.4) * 0.8;
    } catch (e2) {}
    try {
      if (window.realm && realm.embargo && realm.embargo()) n -= 0.55;
    } catch (e3) {}
    try {
      if (window.guild && guild.boycott && guild.boycott()) n -= 0.4;
    } catch (e4) {}
    try {
      if (window.beast && beast.near) n -= (beast.near() || 0) * 2;
    } catch (e5) {}
    if (n > 0.28) return "gold";
    if (n < -0.22) return "dark";
    return "normal";
  }

  function applyMood(force) {
    var st = state();
    st.era = eraName();
    var next = scoreMood();
    if (force) next = force;
    if (next === st.mood) return;
    var d = shopDay();
    st.mood = next;
    st.day = d;
    if (d < 1 && !force) return;
    var line =
      next === "gold"
        ? "A golden age. The street is staying."
        : next === "dark"
          ? "A dark age. They're walking."
          : st.era + " is quiet again.";
    st.last = line;
    because(line);
    gold(line, true);
    egg("age" + next, line);
  }

  function edge() {
    var m = state().mood;
    if (m === "gold") return 0.08;
    if (m === "dark") return -0.1;
    return 0;
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
        var keep = typeof keepGuest === "function" ? keepGuest(st) : !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
        if (keep || !st || rec.phase !== "look" || st._ageSaid) return rec;
        st._ageSaid = 1;
        if (shopDay() < 1) return rec;
        var m = state().mood;
        if (m === "dark") {
          rec.line = rec.kind === "kid" ? "Nobody's coming out today." : "Not in this age.";
          rec.phase = "leave";
          st.phase = "leave";
          st.bought = false;
          st.line = rec.line;
        } else if (m === "gold") {
          rec.line =
            rec.kind === "collector"
              ? "A good year for a pair. I'll take my time."
              : "The street is staying. I'll look.";
          st.line = rec.line;
          st.until = Math.max(st.until || 0, now() + 6);
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
        var m = state().mood;
        if (m === "gold") {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.12);
          if (!w.line) w.line = "A golden age. The water knows.";
        } else if (m === "dark") {
          w.sour = Math.min(1, (w.sour || 0) + 0.14);
          if (!w.line) w.line = "A dark age. The chord is thin.";
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
    var st = state();
    if (st.last) return st.last;
    return whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) { return a && a.id === "k_age"; })) return;
      wiki.push({
        id: "k_age",
        sec: "The chronicle",
        t: "The age lands on the aisle",
        tags: "era golden dark age civilization atlas harbor",
        w: "<p>Civilization puts a golden age on a banner. Fin's puts it on the boards. The atlas already named the Age. A good hall, a good bag, no war inland: the street stays. A boycott, a beast, a keel: they walk. The choir sweetens or sours with it. The till feels it.</p><p><b>What to do about it:</b> keep the hall. Fill the pair. The gold line will say if the age turned. It will not steal the letter.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      seedWiki();
      if (now() - lastTick > 1.4) {
        lastTick = now();
        applyMood();
      }
    } catch (e) {}
  }

  window.age = {
    whisper: whisper,
    line: line,
    of: state,
    mood: function () {
      return state().mood;
    },
    edge: edge,
    seed: function (m) {
      applyMood(m === "dark" ? "dark" : "gold");
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
