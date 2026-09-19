/* bond.js — friend, rival, lover, nemesis.
   They are a person you
   walk in with, or will not stand next to, or would undo a bag for.
   Fin's kin had grudges. Now two names have a bond. Lovers want a
   pair. Rivals walk. A nemesis comes to undo the last bag. A
   soulmate will not bag alone. No second HUD. Odds, speech, the till. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var didBrowse = false;
  var didChoir = false;

  var KINDS = ["friend", "rival", "lover", "nemesis", "soulmate"];

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
      if (window.desk && desk.think) desk.think("bond", text);
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
      return f && !f.dead && f.id !== "keep";
    });
  }

  function state() {
    var g = gs();
    if (g && g.bond && typeof g.bond === "object") return g.bond;
    var st = { last: "", a: "", b: "", kind: "", day: -1 };
    try {
      if (g) g.bond = st;
    } catch (e) {}
    return st;
  }

  function ensure() {
    var st = state();
    if (st.a) return st;
    var live = living();
    if (live.length < 2) return st;
    var h = hash32("bond:" + (live[0].id || live[0].n) + (live[1].id || live[1].n));
    st.a = live[0].n;
    st.b = live[1].n;
    st.kind = KINDS[h % KINDS.length];
    live[0].bond = st.kind;
    live[0].bondWith = st.b;
    live[1].bond = st.kind;
    live[1].bondWith = st.a;
    return st;
  }

  function keepOf(st) {
    try {
      if (typeof keepGuest === "function") return keepGuest(st);
    } catch (e) {}
    return !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
  }

  function otherOnAisle(name) {
    try {
      var br = (window.shopLife && shopLife.browse && shopLife.browse()) || [];
      for (var i = 0; i < br.length; i++) {
        var n = br[i] && (br[i].guestName || br[i].name);
        if (n === name && br[i].phase !== "leave") return br[i];
      }
    } catch (e) {}
    return null;
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
        var bs = ensure();
        if (!bs.a) return rec;
        var who = st.guestName || rec.name || "";
        var mate = who === bs.a ? bs.b : who === bs.b ? bs.a : "";
        if (!mate || rec.phase !== "look" || st._bondSaid) return rec;
        st._bondSaid = 1;
        var them = otherOnAisle(mate);
        if (bs.kind === "lover" || bs.kind === "soulmate") {
          if (them) {
            rec.want = rec.want || "goldfish";
            st.want = rec.want;
            rec.line = bs.kind === "soulmate" ? "We bag together or we don't." : "We're together. A pair of " + (st.want || "goldfish") + ".";
            st.line = rec.line;
            st.lineUntil = now() + 4;
            if (shopDay() >= 1 && !bs.last) {
              bs.last = first(bs.a) + " and " + first(bs.b) + " came together.";
              bs.day = shopDay();
              because(bs.last);
              gold(bs.last, true);
              egg("bondpair", bs.last);
            }
          } else if (bs.kind === "soulmate") {
            rec.line = "Not without " + first(mate) + ".";
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
            st.line = rec.line;
          }
        } else if (bs.kind === "rival" && them) {
          rec.line = first(mate) + " is on the aisle. I'm not staying.";
          rec.phase = "leave";
          st.phase = "leave";
          st.bought = false;
          st.line = rec.line;
          try {
            if (window.kin && kin.hurt) {
              kin.hurt(who, 0.03, "a rival on the aisle");
              kin.hurt(mate, 0.03, "a rival on the aisle");
            }
          } catch (eR) {}
        } else if (bs.kind === "nemesis") {
          rec.line = "I'm here about " + first(mate) + "'s bag.";
          rec.phase = "leave";
          st.phase = "leave";
          st.bought = false;
          st.line = rec.line;
          try {
            if (window.kin && kin.hurt) kin.hurt(mate, 0.05, "a nemesis on the aisle");
          } catch (eN) {}
          if (shopDay() >= 1 && !bs.last) {
            bs.last = first(who) + " came to undo " + first(mate) + "'s bag.";
            gold(bs.last, true);
          }
        } else if (bs.kind === "friend") {
          rec.line = them
            ? first(mate) + " is here. The usual."
            : first(mate) + " said this counter was all right.";
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
        var bs = state();
        if (bs.kind === "lover" || bs.kind === "soulmate" || bs.kind === "friend") {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.04);
        } else if (bs.kind === "rival" || bs.kind === "nemesis") {
          w.sour = Math.min(1, (w.sour || 0) + 0.05);
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
      if (wiki.some(function (a) {
        return a && a.id === "k_bond";
      }))
        return;
      wiki.push({
        id: "k_bond",
        sec: "You and your people",
        t: "Friend, rival, lover, nemesis",
        tags: "friend rival lover soulmate nemesis relation bond pair",
        w: "<p>They are a person you walk in with, or will not stand next to, or would undo a bag for. Fin's kin had grudges. Now two names have a bond. Lovers want a pair. Rivals walk. A nemesis comes to undo the last bag. A soulmate will not bag alone.</p><p><b>What to do about it:</b> listen for two names. Life writes the bond. A pair on the aisle is not always a wedding.</p>",
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
        ensure();
      }
    } catch (e) {}
  }

  function edge() {
    var bs = state();
    if (bs.kind === "rival" || bs.kind === "nemesis") return -0.04;
    if ((bs.kind === "lover" || bs.kind === "soulmate") && bs.last) return 0.03;
    return 0;
  }

  window.bond = {
    whisper: whisper,
    line: line,
    of: state,
    edge: edge,
    seed: function (a, b, k) {
      var st = state();
      var live = living();
      st.a = a || (live[0] && live[0].n) || "Mae Costa";
      st.b = b || (live[1] && live[1].n) || "Tomas Russo";
      st.kind = k || "lover";
      st.last = first(st.a) + " and " + first(st.b) + " are " + st.kind + "s.";
      st.day = shopDay();
      gold(st.last, true);
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
