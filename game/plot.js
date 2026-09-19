/* plot.js — someone on the aisle is waiting for someone else.
   Crusader Kings schemes: murder, abduct, sway. Fin's shop is the
   room they wait in. A gift that is a vector. A person who does not
   bag. If the target walks in, the plot advances. Bag the gift and
   the window on Salem goes wrong. No second HUD. Odds, speech, the
   till, a chord that sours. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var didBrowse = false;
  var didChoir = false;

  var KINDS = ["murder", "abduct", "sway"];

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
      if (window.desk && desk.think) desk.think("plot", text);
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

  function first(n) {
    return String(n || "Someone").split(" ")[0];
  }

  function folk() {
    try {
      if (window.kin && kin.folk) return kin.folk() || [];
    } catch (e) {}
    return [];
  }

  function living() {
    return folk().filter(function (f) {
      return f && !f.dead && f.id !== "keep" && f.id !== "mae";
    });
  }

  function state() {
    var g = gs();
    if (g && g.plot && typeof g.plot === "object") return g.plot;
    var st = { last: "", who: "", target: "", kind: "", day: -1, seen: false, done: false, bagged: false };
    try {
      if (g) g.plot = st;
    } catch (e) {}
    return st;
  }

  function keepOf(st) {
    return !!(
      st &&
      (st._lateMae ||
        st._goingHold ||
        st._lateKid ||
        st._mask ||
        st._hold ||
        st._lord ||
        st._great ||
        st._envoy ||
        st._wed ||
        st._heir ||
        st._hush ||
        st._feast ||
        st._gyve)
    );
  }

  function pickScheme() {
    var live = living();
    if (live.length < 2) return null;
    var h = hash32("plot:" + shopDay());
    var a = live[h % live.length];
    var b = live[(h + 3) % live.length];
    if (a === b) b = live[(h + 1) % live.length];
    if (!a || !b || a === b) return null;
    return { who: a.n, target: b.n, kind: KINDS[h % KINDS.length] };
  }

  function start(rec, st, force) {
    var ps = state();
    if (ps.seen && !force) return false;
    if (shopDay() < 1 && !force) return false;
    var sch = pickScheme();
    if (!sch && !force) return false;
    if (!sch) sch = { who: rec.name || "Tomas Russo", target: "Ev Chen", kind: "murder" };
    rec.kind = "collector";
    rec.phase = "look";
    rec.name = sch.who;
    rec.line =
      sch.kind === "sway"
        ? "I'm waiting for " + first(sch.target) + "."
        : "A fish. For " + first(sch.target) + ".";
    if (st) {
      st._plot = 1;
      st.guestName = sch.who;
      st.line = rec.line;
      st.lineUntil = now() + 6;
      st.until = Math.max(st.until || 0, now() + 8);
    }
    ps.seen = true;
    ps.day = shopDay();
    ps.who = sch.who;
    ps.target = sch.target;
    ps.kind = sch.kind;
    ps.done = false;
    ps.bagged = false;
    var line = first(ps.who) + " is waiting for " + first(ps.target) + ".";
    ps.last = line;
    because(line);
    gold(line, true);
    egg("plotwait", line);
    return true;
  }

  function fire(targetSt) {
    var ps = state();
    if (!ps.seen || ps.done) return;
    ps.done = true;
    var line = "";
    if (ps.kind === "murder") {
      line = first(ps.who) + " sent a bag to " + first(ps.target) + ".";
      try {
        if (window.ill && ill.seed) ill.seed();
      } catch (e) {}
      try {
        if (window.going && going.homes) {
          var hs = going.homes() || [];
          for (var i = 0; i < hs.length; i++) {
            if (hs[i] && hs[i].who === ps.target) hs[i].ill = 1;
          }
        }
      } catch (e2) {}
    } else if (ps.kind === "abduct") {
      line = first(ps.target) + " left with " + first(ps.who) + ". Not a bag.";
      if (targetSt) {
        targetSt.phase = "leave";
        targetSt.bought = false;
        targetSt.line = "I have to go with them.";
      }
      try {
        if (window.kin && kin.hurt) kin.hurt(ps.target, 0.12, "taken from the aisle");
      } catch (e3) {}
    } else {
      line = first(ps.who) + " talked " + first(ps.target) + " around.";
      try {
        if (window.kin && kin.gift) kin.gift(ps.who, 0.06, "a sway on the aisle");
        if (window.kin && kin.hurt) kin.hurt(ps.target, 0.04, "talked around");
      } catch (e4) {}
    }
    ps.last = line;
    because(line);
    gold(line, true);
    egg("plotfire", line);
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
        var ps = state();
        var keep = keepOf(st);
        if (!keep && rec.phase === "look" && st && !st._plot && shopDay() >= 1 && !ps.seen && (idx | 0) === 0) {
          start(rec, st);
        }
        if (ps.seen && rec.phase === "pay" && st && st._plot) {
          ps.bagged = true;
        }
        if (ps.seen && !ps.done && st && !keep) {
          var who = st.guestName || rec.name || "";
          if (who === ps.target && (rec.phase === "look" || rec.phase === "pay")) {
            fire(st);
            rec.line = st.line || rec.line;
            rec.phase = st.phase || rec.phase;
          }
        }
        if (ps.seen && ps.day === shopDay() && rec.phase === "look" && st && !st._plot && !st._plotSaid && !keep) {
          st._plotSaid = 1;
          rec.line = rec.kind === "kid" ? first(ps.who) + " is waiting." : first(ps.who) + " is waiting for " + first(ps.target) + ".";
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
        if (ps.done && ps.kind !== "sway") {
          w.sour = Math.min(1, (w.sour || 0) + 0.12);
          if (!w.line) w.line = ps.last;
        } else if (ps.seen && !ps.done && ps.day === shopDay()) {
          w.sour = Math.min(1, (w.sour || 0) + 0.05);
          if (!w.line) w.line = first(ps.who) + " is waiting for " + first(ps.target) + ".";
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
      if (wiki.some(function (a) {
        return a && a.id === "k_plot";
      }))
        return;
      wiki.push({
        id: "k_plot",
        sec: "The shop floor",
        t: "Someone is waiting",
        tags: "scheme plot murder abduct sway intrigue crusader wait aisle",
        w: "<p>Crusader Kings schemes: murder, abduct, sway. Fin's shop is the room they wait in. A gift that is a vector. A person who does not bag. If the target walks in, the plot advances. Bag the gift and the window on Salem goes wrong.</p><p><b>What to do about it:</b> listen. A collector who is waiting is not buying. Life names who they waited for. The gold line does not cheer you.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      seedWiki();
      if (now() - lastTick > 1.5) lastTick = now();
    } catch (e) {}
  }

  window.plot = {
    whisper: whisper,
    line: line,
    of: state,
    seed: function (a, b) {
      var rec = { kind: "collector", phase: "look", line: "", name: a || "" };
      var st = { phase: "look", bought: false };
      start(rec, st, true);
      var ps = state();
      if (b) ps.target = b;
      return ps;
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 240);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 240);
    }, 220);
})();
