/* pact.js — an alliance is a caravan, a denunciation is an empty kind.
   Fin's two civs
   sign a pact and a person walks in off that road. They denounce and
   that mouth stops bagging here. Trade is a pair that keeps moving.
   No second HUD. Odds, speech, the till. */
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
      if (window.desk && desk.think) desk.think("pact", text);
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

  function twoCivs() {
    var a = { n: "the harbor league" };
    var b = { n: "the inland kingdom" };
    try {
      var w = window.realm && realm.world && realm.world();
      if (w && w.civs && w.civs.length >= 2) {
        a = w.civs[0];
        b = w.civs[1];
        if (a.n === b.n && w.civs[2]) b = w.civs[2];
      }
    } catch (e) {}
    return [a, b];
  }

  function kindOf() {
    try {
      if (window.guild && guild.mandate) return String(guild.mandate() || "guppy");
    } catch (e) {}
    return "guppy";
  }

  function state() {
    var g = gs();
    if (g && g.pact && g.pact.a) return g.pact;
    var pair = twoCivs();
    var st = {
      a: pair[0].n,
      b: pair[1].n,
      want: kindOf(),
      last: "",
      mood: "open",
      seen: false,
      day: -1,
    };
    try {
      if (g) g.pact = st;
    } catch (e) {}
    return st;
  }

  function setMood(mood, force) {
    var st = state();
    if (st.mood === mood && st.seen && !force) return;
    if (shopDay() < 1 && !force) {
      st.mood = mood;
      return;
    }
    st.mood = mood;
    st.day = shopDay();
    st.seen = true;
    var line =
      mood === "pact"
        ? "A pact. " + st.a + " and " + st.b + " share a road."
        : mood === "denounce"
          ? st.b + " denounced the harbor. They will not bag here."
          : "The road between " + st.a + " and " + st.b + " is quiet.";
    st.last = line;
    because(line);
    gold(line, true);
    egg("pact" + mood, line);
  }

  function watch() {
    var st = state();
    if (st.seen && st.day === shopDay()) return;
    if (shopDay() < 1) return;
    try {
      if (window.realm && realm.embargo && realm.embargo()) {
        setMood("denounce");
        return;
      }
    } catch (e) {}
    try {
      if (window.guild && guild.standing && guild.standing() > 0.62) {
        setMood("pact");
        return;
      }
    } catch (e2) {}
    if (!st.seen && shopDay() >= 1) setMood("pact");
  }

  function edge() {
    var m = state().mood;
    if (m === "pact") return 0.08;
    if (m === "denounce") return -0.09;
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
        var ps = state();
        if (keep || !st || rec.phase !== "look" || st._pactSaid) return rec;
        st._pactSaid = 1;
        if (shopDay() < 1) return rec;
        if (ps.mood === "pact") {
          rec.line =
            rec.kind === "kid"
              ? "The caravan brought sweets."
              : "The pact said a pair of " + ps.want + ". From " + ps.b + ".";
          rec.want = rec.want || ps.want;
          st.want = st.want || ps.want;
          st.line = rec.line;
        } else if (ps.mood === "denounce") {
          rec.line = rec.kind === "kid" ? "They said don't buy here." : ps.b + " said stay away.";
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
        var ps = state();
        if (ps.mood === "pact") {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.07);
          if (!w.line) w.line = "A pact on the water.";
        } else if (ps.mood === "denounce") {
          w.sour = Math.min(1, (w.sour || 0) + 0.09);
          if (!w.line) w.line = ps.b + " denounced the harbor.";
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
      if (wiki.some(function (a) { return a && a.id === "k_pact"; })) return;
      wiki.push({
        id: "k_pact",
        sec: "The quarter",
        t: "A pact is a caravan",
        tags: "alliance diplomacy trade denounce caravan pact",
        w: "<p>Fin's two civs sign a pact and a person walks in off that road. They denounce and that mouth stops bagging here. Trade is a pair that keeps moving. A war inland is a denunciation you can hear.</p><p><b>What to do about it:</b> keep the hall. Fill the pair the caravan named. The gold line will say if the road soured.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      seedWiki();
      if (now() - lastTick > 1.5) {
        lastTick = now();
        watch();
      }
    } catch (e) {}
  }

  window.pact = {
    whisper: whisper,
    line: line,
    of: state,
    edge: edge,
    seed: function (m) {
      setMood(m === "denounce" ? "denounce" : "pact", true);
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
