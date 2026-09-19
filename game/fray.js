/* fray.js — stress, and a break on the aisle.
   Crusader Kings: stress, coping, a mental break. Fin's people already
   had a row. This is one person. They confess. They weep and bag the
   wrong fish. They isolate. They smash and the boards go wet. A
   comfort fish is what they ask for. No second HUD. Odds, speech,
   the till, a chord that sours. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var didBrowse = false;
  var didChoir = false;

  var BREAKS = ["confess", "weep", "isolate", "smash"];

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
      if (window.desk && desk.think) desk.think("fray", text);
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

  function state() {
    var g = gs();
    if (g && g.fray && typeof g.fray === "object") return g.fray;
    var st = { last: "", who: "", kind: "", day: -1, seen: false };
    try {
      if (g) g.fray = st;
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
        st._plot ||
        st._hush ||
        st._feast ||
        st._gyve ||
        st._claim)
    );
  }

  function raise(fig, amt) {
    if (!fig || fig.dead) return;
    fig.fray = Math.min(1, (fig.fray || 0) + amt);
  }

  function tickStress() {
    var all = folk();
    for (var i = 0; i < all.length; i++) {
      var f = all[i];
      if (!f || f.dead) continue;
      if ((f.trust || 0.4) < 0.22) raise(f, 0.04);
      if (f.last && /row|took |died|hurt|walked|slight/.test(f.last)) raise(f, 0.03);
    }
    try {
      if (window.siege && siege.of && siege.of().on) {
        for (var j = 0; j < all.length; j++) if (all[j] && !all[j].dead) raise(all[j], 0.02);
      }
    } catch (e) {}
  }

  function spill() {
    try {
      if (!window.shopSite || !shopSite.of) return;
      var s = shopSite.of();
      if (!s || !s.cells) return;
      for (var i = 0; i < s.cells.length; i++) {
        if (s.cells[i].kind === "floor") s.cells[i].wet = Math.max(s.cells[i].wet || 0, 0.5);
      }
      s.wetMax = Math.max(s.wetMax || 0, 0.5);
    } catch (e) {}
  }

  function breakOf(fig) {
    var h = hash32("fray:" + (fig.id || fig.n) + shopDay());
    return BREAKS[h % BREAKS.length];
  }

  function fire(rec, st, fig, force) {
    var fs = state();
    if (fs.seen && fs.day === shopDay() && !force) return false;
    if (shopDay() < 1 && !force) return false;
    var kind = breakOf(fig);
    rec.phase = "look";
    rec.name = fig.n;
    if (kind === "confess") {
      rec.line = "I have to say it. " + (fig.last || "Something is wrong.");
      try {
        if (window.hush && hush.seed) hush.seed(fig.n);
      } catch (e) {}
    } else if (kind === "weep") {
      rec.line = "Anything. Just a fish. I can't go home empty.";
      rec.want = fig.want || "guppy";
      if (st) st.want = rec.want;
    } else if (kind === "isolate") {
      rec.line = "Don't talk to me. I'm looking.";
      rec.phase = "leave";
      if (st) {
        st.phase = "leave";
        st.bought = false;
      }
    } else {
      rec.line = "I didn't mean to. The boards.";
      rec.phase = "leave";
      if (st) {
        st.phase = "leave";
        st.bought = false;
      }
      spill();
    }
    if (st) {
      st._fray = 1;
      st.guestName = fig.n;
      st.line = rec.line;
      st.lineUntil = now() + 6;
    }
    fig.fray = 0.2;
    fs.seen = true;
    fs.day = shopDay();
    fs.who = fig.n;
    fs.kind = kind;
    var line =
      kind === "smash"
        ? first(fig.n) + " broke on the aisle. The boards are wet."
        : first(fig.n) + " broke on the aisle.";
    fs.last = line;
    because(line);
    gold(line, true);
    egg("fray" + kind, line);
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
        if (keepOf(st) || !st) return rec;
        var fig = null;
        try {
          if (window.kin && kin.of) fig = kin.of(st.guestName || rec.name);
        } catch (e) {}
        if (!fig) return rec;
        if (rec.phase === "look" && !st._fray && (fig.fray || 0) > 0.72 && shopDay() >= 1) {
          fire(rec, st, fig);
        } else if (rec.phase === "look" && !st._fraySaid && (fig.fray || 0) > 0.45) {
          st._fraySaid = 1;
          rec.line = "I need a fish. Something that stays.";
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
        var fs = state();
        if (fs.seen && fs.day === shopDay()) {
          w.sour = Math.min(1, (w.sour || 0) + (fs.kind === "smash" ? 0.14 : 0.08));
          if (!w.line) w.line = fs.last;
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
        return a && a.id === "k_fray";
      }))
        return;
      wiki.push({
        id: "k_fray",
        sec: "The shop floor",
        t: "Someone broke on the aisle",
        tags: "stress mental break confess weep isolate smash crusader coping",
        w: "<p>Crusader Kings: stress, coping, a mental break. Fin's people already had a row. This is one person. They confess. They weep and bag the wrong fish. They isolate. They smash and the boards go wet. A comfort fish is what they ask for.</p><p><b>What to do about it:</b> a person who is fraying is still a customer. Keep a small one. Floss if they smash. Life names the break.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      seedWiki();
      if (now() - lastTick > 1.6) {
        lastTick = now();
        tickStress();
      }
    } catch (e) {}
  }

  window.fray = {
    whisper: whisper,
    line: line,
    of: state,
    seed: function (n) {
      var fig = null;
      try {
        if (window.kin && kin.of) fig = kin.of(n);
        if (!fig && window.kin && kin.folk) fig = (kin.folk() || []).filter(function (f) { return f && !f.dead && f.id !== "keep"; })[0];
      } catch (e) {}
      if (!fig) fig = { n: n || "Rita Russo", id: "f1", last: "walked" };
      fig.fray = 1;
      var rec = { kind: "collector", phase: "look", line: "", name: fig.n };
      var st = { phase: "look", bought: false, guestName: fig.n };
      fire(rec, st, fig, true);
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
