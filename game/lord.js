/* lord.js — a civilization has a mouth, and it walks in.
   Civilization leaders have agendas. Fin's inland kingdom does not
   send a diplomacy screen. A person of that civ comes to the glass
   with a like, a hate, a kind they will not skip. Unique is how they
   bag, not a unit card. No second HUD. Odds, speech, the till. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var didBrowse = false;
  var didChoir = false;
  var AGENDAS = ["named", "dry", "pair", "mandate", "relic", "kind"];

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
      if (window.desk && desk.think) desk.think("lord", text);
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

  function aCiv() {
    try {
      var w = window.realm && realm.world && realm.world();
      if (w && w.civs && w.civs.length) {
        for (var i = 0; i < w.civs.length; i++) {
          if (w.civs[i] && w.civs[i].alive !== 0 && w.civs[i].n) return w.civs[i];
        }
        return w.civs[0];
      }
    } catch (e) {}
    return { n: "the harbor league", kind: "harbor league", ethic: "trade", faith: "the Salt Mother" };
  }

  function aFig(civ) {
    try {
      var w = window.realm && realm.world && realm.world();
      if (w && w.figs) {
        for (var i = 0; i < w.figs.length; i++) {
          if (w.figs[i] && (civ == null || w.figs[i].civ === civ.i) && w.figs[i].n) return w.figs[i];
        }
        if (w.figs[0]) return w.figs[0];
      }
    } catch (e) {}
    return { n: "Calen Maros", job: "captain" };
  }

  function mandate() {
    try {
      if (window.guild && guild.mandate) return String(guild.mandate() || "goldfish");
    } catch (e) {}
    return "goldfish";
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

  function state() {
    var g = gs();
    if (g && g.lord && g.lord.n) return g.lord;
    var civ = aCiv();
    var fig = aFig(civ);
    var ag = AGENDAS[hash32(civ.n + "|" + fig.n) % AGENDAS.length];
    var st = {
      n: fig.n,
      civ: civ.n,
      kind: civ.kind,
      ethic: civ.ethic || "trade",
      agenda: ag,
      want: mandate(),
      last: "",
      seen: false,
      day: -1,
    };
    try {
      if (g) g.lord = st;
    } catch (e) {}
    return st;
  }

  function first(n) {
    return String(n || "Someone").split(" ")[0];
  }

  function agendaLine(st, rec) {
    if (st.agenda === "named") return "The " + st.civ + " want a named line. Not a SKU.";
    if (st.agenda === "dry") return "We don't bag on a wet board. The " + st.civ + " said.";
    if (st.agenda === "pair") return "Two. The " + st.civ + " do not take a unique.";
    if (st.agenda === "mandate") return "The " + st.civ + " asked for " + st.want + ". Same as the hall.";
    if (st.agenda === "relic") return "We came for what is in the window, not the water.";
    return "The " + st.civ + " bag " + st.want + " and nothing else this year.";
  }

  function arrive(rec, st, force) {
    var ls = state();
    if (ls.seen && ls.day === shopDay() && !force) return false;
    if (shopDay() < 1 && !force) return false;
    rec.kind = "collector";
    rec.name = ls.n;
    rec.phase = "look";
    rec.want = rec.want || ls.want;
    rec.line = first(ls.n) + " of " + ls.civ + ". " + agendaLine(ls, rec);
    if (st) {
      st._lord = 1;
      st.name = ls.n;
      st.guestName = ls.n;
      st.want = rec.want;
      st.line = rec.line;
      st.lineUntil = now() + 6;
      st.bought = false;
      st.until = Math.max(st.until || 0, now() + 7);
    }
    ls.seen = true;
    ls.day = shopDay();
    var line = first(ls.n) + " of " + ls.civ + " is on the aisle.";
    ls.last = line;
    because(line + " " + rec.line);
    gold(line, true);
    egg("lordin", line);
    return true;
  }

  function wet() {
    try {
      return !!(window.shopSite && shopSite.wet && shopSite.wet() > 0.28);
    } catch (e) {}
    return false;
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
        if (
          !keep &&
          rec.phase === "look" &&
          st &&
          !st._lord &&
          shopDay() >= 1 &&
          !ls.seen &&
          ((idx | 0) === 1 || rec.kind === "collector")
        ) {
          arrive(rec, st);
        }
        if (ls.seen && ls.day === shopDay() && rec.phase === "look" && st && !st._lord && !st._lordSaid && !keep) {
          st._lordSaid = 1;
          rec.line = rec.kind === "kid" ? "That's not from Salem." : "The " + ls.civ + " sent someone.";
          st.line = rec.line;
        }
        if (st && st._lord && rec.phase === "look") {
          if (ls.agenda === "dry" && wet()) {
            rec.line = "Wet boards. The " + ls.civ + " walk.";
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
            st.line = rec.line;
          } else if (ls.agenda === "kind" || ls.agenda === "mandate") {
            rec.want = ls.want;
            st.want = ls.want;
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
        var ls = state();
        if (ls.seen && ls.day === shopDay()) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.05);
          if (!w.line) w.line = first(ls.n) + " of " + ls.civ + " is on the aisle.";
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
    var ls = state();
    if (ls.last) return ls.last;
    return whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) { return a && a.id === "k_lord"; })) return;
      wiki.push({
        id: "k_lord",
        sec: "The chronicle",
        t: "A civilization has a mouth",
        tags: "leader agenda civ unique civilization inland kingdom",
        w: "<p>Civilization leaders have agendas. Fin's inland kingdom does not send a diplomacy screen. A person of that civ comes to the glass with a like, a hate, a kind they will not skip. Unique is how they bag, not a unit card.</p><p><b>What to do about it:</b> listen. A wet aisle will lose the ones who hate wet. A named line will keep the ones who came for names.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      seedWiki();
      if (now() - lastTick > 1.2) lastTick = now();
    } catch (e) {}
  }

  function edge() {
    var ls = state();
    return ls.seen && ls.day === shopDay() ? 0.04 : 0;
  }

  window.lord = {
    whisper: whisper,
    line: line,
    of: state,
    edge: edge,
    seed: function () {
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
