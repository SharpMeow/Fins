/* vow.js — a religion is a belief that walks, not a holy-day table.
   Faith already has a festival. This is the founding: a prophet, a
   kind that is holy, a last-of-a-pair that is taboo. Kids repeat it.
   People bag the blessed one in the puddle. They will not bag the last.
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
      if (window.desk && desk.think) desk.think("vow", text);
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

  function godName() {
    try {
      if (window.faith && faith.today) {
        var t = faith.today();
        if (t && t.n) return t.n;
      }
    } catch (e) {}
    try {
      var w = window.realm && realm.world && realm.world();
      if (w && w.civs && w.civs[0] && w.civs[0].faith) return w.civs[0].faith;
    } catch (e2) {}
    return "the Salt Mother";
  }

  function kindOf() {
    try {
      if (window.faith && faith.taboo) {
        var t = faith.taboo();
        if (t) return t;
      }
    } catch (e) {}
    try {
      if (window.guild && guild.mandate) return String(guild.mandate() || "tetra");
    } catch (e2) {}
    return "tetra";
  }

  function state() {
    var g = gs();
    if (g && g.vow && typeof g.vow === "object") return g.vow;
    var st = { last: "", found: false, god: "", holy: "", day: -1, seen: false };
    try {
      if (g) g.vow = st;
    } catch (e) {}
    return st;
  }

  function found(kind, force) {
    var st = state();
    if (st.found && !force) return st;
    st.found = true;
    st.god = godName();
    st.holy = kind || kindOf();
    st.day = shopDay();
    var line = st.god + " took the " + st.holy + ". It is holy now.";
    st.last = line;
    because(line);
    if (shopDay() >= 1 || force) gold(line, true);
    egg("vowfound", line);
    return st;
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

  function hasHoly() {
    var st = state();
    if (!st.found || !st.holy) return false;
    try {
      var list = typeof allFish === "function" ? allFish() || [] : [];
      var q = st.holy.toLowerCase();
      for (var i = 0; i < list.length; i++) {
        var k = fishKind(list[i]);
        if (k && k.indexOf(q) >= 0) return true;
      }
    } catch (e) {}
    return false;
  }

  function countHoly() {
    var st = state();
    var n = 0;
    if (!st.found || !st.holy) return 0;
    try {
      var list = typeof allFish === "function" ? allFish() || [] : [];
      var q = st.holy.toLowerCase();
      for (var i = 0; i < list.length; i++) {
        var k = fishKind(list[i]);
        if (k && k.indexOf(q) >= 0) n++;
      }
    } catch (e) {}
    return n;
  }

  function edge() {
    var st = state();
    if (!st.found) return 0;
    if (hasHoly()) return 0.07;
    return -0.06;
  }

  function arrive(rec, st, force) {
    var vs = state();
    if (vs.seen && vs.day === shopDay() && !force) return false;
    if (shopDay() < 1 && !force) return false;
    if (!vs.found) found(kindOf(), force);
    rec.kind = rec.kind === "kid" ? "kid" : "collector";
    rec.phase = "look";
    rec.want = vs.holy;
    rec.line = vs.god + " took the " + vs.holy + ". Keep a pair.";
    if (st) {
      st._vow = 1;
      st.want = vs.holy;
      st.line = rec.line;
      st.lineUntil = now() + 6;
    }
    vs.seen = true;
    vs.day = shopDay();
    if (!vs.last) vs.last = rec.line;
    because(rec.line);
    gold(vs.last, true);
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
        var keep = typeof keepGuest === "function" ? keepGuest(st) : !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
        var vs = state();
        if (
          !keep &&
          rec.phase === "look" &&
          st &&
          !st._vow &&
          shopDay() >= 1 &&
          !vs.seen &&
          (rec.kind === "collector" || rec.kind === "kid" || (idx | 0) === 2)
        ) {
          arrive(rec, st);
        }
        if (vs.found && rec.phase === "look" && st && !st._vowSaid && !keep) {
          st._vowSaid = 1;
          if (rec.kind === "kid") {
            rec.line = "The " + vs.holy + " is holy. " + vs.god + " said.";
            st.line = rec.line;
          } else if (countHoly() < 2 && rec.phase === "pay") {
            rec.line = "Not the last " + vs.holy + ". That's a vow.";
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
            st.line = rec.line;
          } else if (rec.kind === "collector") {
            rec.want = rec.want || vs.holy;
            st.want = st.want || vs.holy;
            rec.line = rec.line || "The blessed " + vs.holy + ". I'll take that pair.";
            st.line = rec.line;
          }
        }
        if (vs.found && rec.phase === "pay" && st && vs.holy) {
          var want = String(rec.want || st.want || "").toLowerCase();
          if (want.indexOf(vs.holy.toLowerCase()) >= 0 && countHoly() <= 2) {
            rec.line = "Not the last " + vs.holy + ". That's a vow.";
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
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
        var vs = state();
        if (vs.found && hasHoly()) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.1);
          w.bless = Math.max(w.bless || 0, 0.1);
          if (!w.line) w.line = vs.god + " is in the water. The " + vs.holy + ".";
        } else if (vs.found) {
          w.sour = Math.min(1, (w.sour || 0) + 0.08);
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
        var vs = state();
        if (vs.found && vs.holy && a && a.fish) {
          var k = fishKind(a.fish);
          if (k && k.indexOf(vs.holy.toLowerCase()) >= 0) a.fish._gaze = now();
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
    return state().last || whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) { return a && a.id === "k_vow"; })) return;
      wiki.push({
        id: "k_vow",
        sec: "The chronicle",
        t: "A belief that walks",
        tags: "religion vow pantheon holy taboo prophet faith",
        w: "<p>Faith already has a festival. This is the founding. A prophet, a kind that is holy, a last-of-a-pair that is taboo. Kids repeat it. People will bag the blessed one even when the aisle is a little wet. They will not bag the last. The choir knows which voice is holy.</p><p><b>What to do about it:</b> keep two of the holy kind. The gold line will name the vow.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      wrapFish();
      seedWiki();
      if (now() - lastTick > 1.2) lastTick = now();
    } catch (e) {}
  }

  window.vow = {
    whisper: whisper,
    line: line,
    of: state,
    edge: edge,
    found: found,
    seed: function () {
      found(kindOf(), true);
      var rec = { kind: "collector", phase: "look", line: "", name: "" };
      var st = { phase: "look", bought: false };
      arrive(rec, st, true);
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
