/* heir.js — a child inherits the window, not a title.
   Crusader Kings is succession. Partition, a disputed claim, a name
   that used to be someone else's. Fin's windows on Salem already
   belonged to a person. They die. The child walks in. The fish is
   still in that glass. Someone of the same house says it is not
   theirs. No second HUD. Odds, speech, the till, a window that
   changed hands. */
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
      if (window.desk && desk.think) desk.think("heir", text);
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

  function surn(n) {
    var p = String(n || "").trim().split(/\s+/);
    return p.length > 1 ? p[p.length - 1] : p[0] || "";
  }

  function folk() {
    try {
      if (window.kin && kin.folk) return kin.folk() || [];
    } catch (e) {}
    return [];
  }

  function state() {
    var g = gs();
    if (g && g.heir && typeof g.heir === "object") return g.heir;
    var st = { last: "", child: "", parent: "", nick: "", day: -1, seen: false, dispute: "" };
    try {
      if (g) g.heir = st;
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
        st._plot ||
        st._hush ||
        st._feast ||
        st._gyve)
    );
  }

  function passWindows(parent, child) {
    var nick = "";
    try {
      if (!window.going || !going.homes) return "";
      var hs = going.homes() || [];
      for (var i = 0; i < hs.length; i++) {
        var h = hs[i];
        if (!h || h.dead) continue;
        if (h.who === parent.n || h.who === first(parent.n)) {
          h.who = child.n;
          h.heir = 1;
          if (h.nick) nick = h.nick;
        }
      }
    } catch (e) {}
    return nick;
  }

  function findPass() {
    var all = folk();
    var dead = [];
    var live = [];
    for (var i = 0; i < all.length; i++) {
      if (!all[i]) continue;
      if (all[i].dead && all[i].id !== "keep") dead.push(all[i]);
      else if (!all[i].dead) live.push(all[i]);
    }
    for (var d = 0; d < dead.length; d++) {
      var parent = dead[d];
      var child = null;
      var other = null;
      for (var k = 0; k < live.length; k++) {
        if (live[k].kinOf === parent.id || live[k].how === "child") {
          if (!child) child = live[k];
        } else if (surn(live[k].n) === surn(parent.n) && live[k].id !== "mae") {
          other = live[k];
        }
      }
      if (!child) {
        for (var m = 0; m < live.length; m++) {
          if (surn(live[m].n) === surn(parent.n) && live[m].id !== "mae") {
            child = live[m];
            break;
          }
        }
      }
      if (child) return { parent: parent, child: child, other: other && other !== child ? other : null };
    }
    return null;
  }

  function inherit(force) {
    var st = state();
    if (st.child && !force) return false;
    var pass = findPass();
    if (!pass && !force) return false;
    if (!pass) {
      var live = folk().filter(function (f) {
        return f && !f.dead && f.id !== "keep";
      });
      var deadKeep = folk().filter(function (f) {
        return f && f.dead;
      })[0];
      if (!live.length) return false;
      pass = { parent: deadKeep || { n: "Nedda Marr", id: "keep" }, child: live[0], other: live[1] || null };
    }
    var nick = passWindows(pass.parent, pass.child);
    st.child = pass.child.n;
    st.parent = pass.parent.n;
    st.nick = nick;
    st.dispute = pass.other ? pass.other.n : "";
    st.day = shopDay();
    pass.child.want = pass.parent.want || pass.child.want;
    pass.child.trust = Math.max(pass.child.trust || 0.4, (pass.parent.trust || 0.4) * 0.7);
    pass.child.last = "inherited the window";
    var line = first(st.child) + " is " + first(st.parent) + "'s now.";
    if (st.nick) line = first(st.child) + " is " + first(st.parent) + "'s now. " + st.nick + " is in the window.";
    st.last = line;
    because(line);
    if (shopDay() >= 1 || force) gold(line, true);
    egg("heirwindow", line);
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
        var hs = state();
        if (!hs.child) inherit();
        var keep = keepOf(st);
        var who = (st && (st.guestName || rec.name)) || rec.name || "";
        if (hs.child && rec.phase === "look" && st && !st._heir && !keep && who === hs.child && shopDay() >= 1) {
          st._heir = 1;
          rec.line = st.nick
            ? "I'm " + first(hs.parent) + "'s now. " + hs.nick + " is in the window."
            : "I'm " + first(hs.parent) + "'s now. The window is mine.";
          rec.want = rec.want || (st.want = rec.want);
          st.line = rec.line;
          st.lineUntil = now() + 6;
          hs.seen = true;
          hs.day = shopDay();
          if (!hs.last || !/window/.test(hs.last)) {
            hs.last = rec.line;
            gold(rec.line, true);
          }
        } else if (hs.dispute && rec.phase === "look" && st && !st._heirSaid && !keep && who === hs.dispute) {
          st._heirSaid = 1;
          rec.line = "That's not theirs. I'm the " + surn(hs.parent) + ".";
          rec.phase = "leave";
          st.phase = "leave";
          st.bought = false;
          st.line = rec.line;
          because(first(hs.dispute) + " disputed the window.");
          gold(first(hs.dispute) + " says the window is not " + first(hs.child) + "'s.", true);
        } else if (hs.child && rec.phase === "look" && st && !st._heirSaid && !keep && rec.kind === "kid") {
          st._heirSaid = 1;
          rec.line = first(hs.child) + " has the window now.";
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
        var hs = state();
        if (hs.dispute) {
          w.sour = Math.min(1, (w.sour || 0) + 0.07);
          if (!w.line) w.line = first(hs.dispute) + " says the window is not " + first(hs.child) + "'s.";
        } else if (hs.child && hs.nick) {
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
        var hs = state();
        if (hs.nick && a && a.fish && a.fish.nick === hs.nick) {
          a.fish._holdStill = 1;
          a.fish._gaze = now();
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
      if (wiki.some(function (a) {
        return a && a.id === "k_heir";
      }))
        return;
      wiki.push({
        id: "k_heir",
        sec: "You and your people",
        t: "A child inherits the window",
        tags: "succession heir inherit window disputed claim crusader partition child",
        w: "<p>Crusader Kings is succession. Partition, a disputed claim, a name that used to be someone else's. Fin's windows on Salem already belonged to a person. They die. The child walks in. The fish is still in that glass. Someone of the same house says it is not theirs.</p><p><b>What to do about it:</b> the window changed hands. Life names the child. A disputed house will not bag. Do not sell the one that is still in that glass if the child is coming for the line.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      wrapFish();
      seedWiki();
      if (now() - lastTick > 1.7) {
        lastTick = now();
        if (!state().child) inherit();
      }
    } catch (e) {}
  }

  window.heir = {
    whisper: whisper,
    line: line,
    of: state,
    seed: function () {
      inherit(true);
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
