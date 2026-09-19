/* bent.js — a trait is why they walked.

   Fin's inner lives were a like and a hate. Now the like has a bent:
   they leave if the aisle is crowded, they bag the wet boards, they
   want a named line, they tell you who took it. No second HUD. Odds,
   speech, the till. Not a character sheet. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var didBrowse = false;
  var didChoir = false;

  var BENTS = [
    "paranoid",
    "wrathful",
    "kind",
    "greedy",
    "zealous",
    "craven",
    "ambitious",
    "honest",
    "deceitful",
    "gregarious",
    "shy",
    "temperate",
    "vengeful",
    "generous",
    "arrogant",
    "brave",
  ];

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

  function pick(arr, h) {
    if (!arr || !arr.length) return "";
    return arr[(h >>> 0) % arr.length];
  }

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.desk && desk.think) desk.think("bent", text);
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
    if (g && g.bent && typeof g.bent === "object") return g.bent;
    var st = { last: "", day: -1 };
    try {
      if (g) g.bent = st;
    } catch (e) {}
    return st;
  }

  function stamp(fig) {
    if (!fig || fig.bent) return fig && fig.bent;
    var h = hash32("bent:" + (fig.id || fig.n));
    var a = pick(BENTS, h);
    var b = pick(BENTS, h >>> 8);
    if (b === a) b = pick(BENTS, h >>> 4);
    fig.bent = a;
    fig.bent2 = b === a ? "" : b;
    return fig.bent;
  }

  function stampAll() {
    var all = folk();
    for (var i = 0; i < all.length; i++) stamp(all[i]);
  }

  function ofName(n) {
    try {
      if (window.kin && kin.of && n) {
        var fig = kin.of(n);
        if (fig) return stamp(fig);
      }
    } catch (e) {}
    return "";
  }

  function keepOf(st) {
    try {
      if (typeof keepGuest === "function") return keepGuest(st);
    } catch (e) {}
    return !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
  }

  function lookingCount() {
    var n = 0;
    try {
      var br = (window.shopLife && shopLife.browse && shopLife.browse()) || [];
      for (var i = 0; i < br.length; i++) {
        if (br[i] && (br[i].phase === "look" || br[i].phase === "pay")) n++;
      }
    } catch (e) {}
    return n;
  }

  function wet() {
    try {
      return !!(window.shopSite && shopSite.wet && shopSite.wet() > 0.36);
    } catch (e) {}
    return false;
  }

  function night() {
    try {
      if (window.pane && pane.night) return !!pane.night();
    } catch (e) {}
    return false;
  }

  function namedOf(want) {
    try {
      var list = typeof allFish === "function" ? allFish() || [] : [];
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].nick) return list[i];
      }
    } catch (e) {}
    return null;
  }

  function applyBent(rec, st, fig, bent) {
    var line = "";
    var leave = false;
    if (bent === "paranoid" && lookingCount() >= 2) {
      line = "Too many people. I'm not staying.";
      leave = true;
    } else if (bent === "wrathful" && wet()) {
      line = "These boards. I'm not paying for this.";
      leave = true;
      try {
        if (window.kin && kin.hurt) kin.hurt(fig.n, 0.04, "wrath at the wet");
      } catch (e) {}
    } else if (bent === "kind" && wet()) {
      line = "I don't mind the boards. The usual.";
    } else if (bent === "greedy") {
      var named = namedOf();
      if (!named) {
        line = "I wanted a named one. The line.";
        leave = true;
      } else {
        line = "That's " + named.nick + ". Don't round it.";
        st.want = rec.want;
      }
    } else if (bent === "zealous") {
      try {
        if (window.vow && vow.of) {
          var v = vow.of();
          if (v && v.kind) {
            rec.want = v.kind;
            st.want = v.kind;
            line = "The " + v.kind + " is holy. Not the last of them.";
          }
        }
      } catch (eZ) {}
    } else if (bent === "craven") {
      var scare = false;
      try {
        if (window.siege && siege.of && siege.of().on) scare = true;
      } catch (eS) {}
      try {
        if (window.wane && wane.of && wane.of().on) scare = true;
      } catch (eW) {}
      if (scare || night()) {
        line = "I'm not staying. Not tonight.";
        leave = true;
      }
    } else if (bent === "ambitious" || bent === "arrogant") {
      try {
        if (window.seat && seat.of) {
          var ss = seat.of();
          if (ss && ss.mayor) {
            line = "I want the one the others follow. " + ss.mayor + ".";
          }
        }
      } catch (eA) {}
      if (!line) line = "Not the usual. The one in the window.";
    } else if (bent === "honest") {
      try {
        if (window.pinch && pinch.of) {
          var p = pinch.of();
          if (p && p.who) line = first(p.who) + " took one. I saw it.";
        }
      } catch (eH) {}
    } else if (bent === "deceitful") {
      line = "Just looking. Names, if you have them.";
      leave = Math.random() < 0.45;
    } else if (bent === "gregarious") {
      line = fig.known ? "I brought someone. The usual." : "I'm " + first(fig.n) + ". We come together.";
    } else if (bent === "shy") {
      line = rec.kind === "kid" ? "…" : "The usual.";
    } else if (bent === "temperate" && wet()) {
      line = "The aisle is a mess. Another day.";
      leave = true;
    } else if (bent === "vengeful" && (fig.trust || 0.4) < 0.28) {
      line = "You sold us a miss. I'm here about that.";
      leave = true;
    } else if (bent === "generous") {
      line = "Whatever you have. I'll take it.";
    } else if (bent === "brave") {
      line = "I'm not walking. The usual.";
    }
    if (!line) return false;
    rec.line = line;
    st.line = line;
    st.lineUntil = now() + 3.6;
    if (leave) {
      rec.phase = "leave";
      st.phase = "leave";
      st.bought = false;
    }
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
        stampAll();
        var fig = null;
        try {
          if (window.kin && kin.of) fig = kin.of(st.guestName || rec.name);
        } catch (e) {}
        if (!fig || fig.dead) return rec;
        var bent = stamp(fig);
        if (rec.phase === "look" && !st._bentSaid) {
          st._bentSaid = 1;
          if (applyBent(rec, st, fig, bent) && rec.phase === "leave") {
            var bit = first(fig.n) + " walked. " + bent + ".";
            state().last = bit;
            if (shopDay() >= 1 && Math.random() < 0.22) {
              because(bit);
            }
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
        var all = folk();
        var kind = 0;
        var wrath = 0;
        for (var i = 0; i < all.length; i++) {
          if (!all[i] || all[i].dead) continue;
          if (all[i].bent === "kind" || all[i].bent === "generous") kind++;
          if (all[i].bent === "wrathful" || all[i].bent === "vengeful") wrath++;
        }
        if (kind) w.sweet = Math.min(1, (w.sweet || 0) + Math.min(0.06, kind * 0.015));
        if (wrath) w.sour = Math.min(1, (w.sour || 0) + Math.min(0.08, wrath * 0.02));
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
        return a && a.id === "k_bent";
      }))
        return;
      wiki.push({
        id: "k_bent",
        sec: "You and your people",
        t: "A trait is why they walked",
        tags: "trait personality paranoid kind greedy zealous bent speech",
        w: "<p>Fin's inner lives were a like and a hate. Now the like has a bent: they leave if the aisle is crowded, they bag the wet boards, they want a named line, they tell you who took it. That is not a character sheet. That is why this person walked.</p><p><b>What to do about it:</b> listen. A greedy collector still wants a named one. A kind neighbor will stand in the puddle. Life writes the bent when they walk.</p>",
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
        stampAll();
      }
    } catch (e) {}
  }

  window.bent = {
    whisper: whisper,
    line: line,
    of: state,
    ofName: ofName,
    seed: function (n, t) {
      stampAll();
      var fig = null;
      try {
        if (window.kin && kin.of) fig = kin.of(n) || (kin.folk() || [])[0];
      } catch (e) {}
      if (fig) {
        fig.bent = t || "paranoid";
        state().last = first(fig.n) + " is " + fig.bent + ".";
        gold(state().last, true);
      }
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
