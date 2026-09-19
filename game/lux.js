/* lux.js — a luxury is a kind the street is unhappy without.
   Civilization amenities are a number. Fin's luxury is a fish. This
   year the inland wants tetra, or goldfish, or whatever the river
   made scarce. Keep a pair and collectors stay. Don't, and the street
   says it is without. Strategic is the same mouth, louder.
   No second HUD. Odds, speech, the chord. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
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
      if (window.desk && desk.think) desk.think("lux", text);
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

  function pickKind() {
    try {
      if (window.wild && wild.of) {
        var p = wild.of().pop || {};
        var best = "";
        var low = 1;
        for (var k in p) {
          if (p[k] < low) {
            low = p[k];
            best = k;
          }
        }
        if (best) return best === "gold" ? "goldfish" : best;
      }
    } catch (e) {}
    try {
      if (window.guild && guild.mandate) return String(guild.mandate() || "tetra");
    } catch (e2) {}
    return "tetra";
  }

  function fishKind(f) {
    if (!f) return "";
    try {
      var S = typeof O !== "undefined" ? O : typeof SPECIES !== "undefined" ? SPECIES : null;
      if (S && f.sp != null && S[f.sp]) {
        return String(S[f.sp].gname || S[f.sp].name || S[f.sp].vname || "").toLowerCase();
      }
    } catch (e) {}
    return "";
  }

  function have(kind) {
    var n = 0;
    try {
      var list = typeof allFish === "function" ? allFish() || [] : [];
      var q = String(kind || "").toLowerCase();
      for (var i = 0; i < list.length; i++) {
        var k = fishKind(list[i]);
        if (k && (k.indexOf(q) >= 0 || q.indexOf(k) >= 0)) n++;
      }
    } catch (e) {}
    return n;
  }

  function state() {
    var g = gs();
    if (g && g.lux && g.lux.kind) return g.lux;
    var st = { kind: pickKind(), last: "", day: -1, missing: false, said: false };
    try {
      if (g) g.lux = st;
    } catch (e) {}
    return st;
  }

  function watch() {
    var st = state();
    var d = shopDay();
    if (d !== st.day) {
      st.day = d;
      if (d >= 1) st.kind = pickKind();
    }
    var n = have(st.kind);
    var miss = n < 2;
    if (miss === st.missing) return;
    st.missing = miss;
    if (d < 1) return;
    var line = miss
      ? "The street is without " + st.kind + "."
      : "The " + st.kind + " is on the rack. The street is quiet.";
    st.last = line;
    because(line);
    gold(line, true);
    egg(miss ? "luxmiss" : "luxhave", line);
  }

  function edge() {
    var st = state();
    return have(st.kind) >= 2 ? 0.07 : -0.09;
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
        var ls = state();
        if (keep || !st || rec.phase !== "look" || st._luxSaid) return rec;
        st._luxSaid = 1;
        if (shopDay() < 1) return rec;
        var n = have(ls.kind);
        if (n < 2) {
          rec.line =
            rec.kind === "kid"
              ? "Everyone's talking about " + ls.kind + "."
              : "The street is without " + ls.kind + ". I'm walking.";
          if (rec.kind !== "kid") {
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
          }
          st.line = rec.line;
        } else if (rec.kind === "collector") {
          rec.want = ls.kind;
          st.want = ls.kind;
          rec.line = "The " + ls.kind + " is the one this year. I'll take a pair.";
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
        var ls = state();
        if (have(ls.kind) >= 2) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.08);
          if (!w.line) w.line = "The " + ls.kind + " is the luxury. The water has it.";
        } else {
          w.sour = Math.min(1, (w.sour || 0) + 0.1);
          if (!w.line) w.line = "The street is without " + ls.kind + ".";
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
        var ls = state();
        if (a && a.fish) {
          var k = fishKind(a.fish);
          if (k && ls.kind && k.indexOf(ls.kind.toLowerCase()) >= 0) a.fish._gaze = now();
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
    if (st.last) return st.last;
    return whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) { return a && a.id === "k_lux"; })) return;
      wiki.push({
        id: "k_lux",
        sec: "The shop floor",
        t: "The luxury is a kind",
        tags: "luxury amenity resource strategic scarce civilization tetra",
        w: "<p>Civilization amenities are a number. Fin's luxury is a fish. This year the inland wants whatever the river made scarce. Keep a pair and collectors stay. Don't, and the street says it is without. Strategic is the same mouth, louder. The till feels a missing kind the way a city feels a missing luxury.</p><p><b>What to do about it:</b> keep two of that kind. The gold line will name the without.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      wrapFish();
      seedWiki();
      if (now() - lastTick > 1.6) {
        lastTick = now();
        watch();
      }
    } catch (e) {}
  }

  window.lux = {
    whisper: whisper,
    line: line,
    of: state,
    edge: edge,
    kind: function () {
      return state().kind;
    },
    seed: function () {
      var st = state();
      st.kind = pickKind();
      st.missing = have(st.kind) < 2;
      st.day = shopDay();
      var line = st.missing
        ? "The street is without " + st.kind + "."
        : "The " + st.kind + " is on the rack. The street is quiet.";
      st.last = line;
      because(line);
      gold(line, true);
      return st;
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 240);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 240);
    }, 220);
})();
