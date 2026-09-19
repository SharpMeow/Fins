/* envoy.js — a city-state is a hamlet that only bags here.
   Civilization envoys and suzerainty. Fin's small hold sends one person.
   Fill the pair and they stop going to Haymarket. Miss three mornings
   and they do. No second HUD. Odds, speech, the till. */
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
      if (window.desk && desk.think) desk.think("envoy", text);
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

  function letterFrom() {
    try {
      var L = window.going && going.letter && going.letter();
      if (L && L.from) return String(L.from);
    } catch (e) {}
    return "";
  }

  function aHamlet() {
    try {
      var w = window.realm && realm.world && realm.world();
      var skip = letterFrom();
      var skipHold = "";
      try {
        if (window.hold && hold.of) skipHold = hold.of().site || "";
      } catch (eH) {}
      if (w && w.sites) {
        for (var i = 1; i < w.sites.length; i++) {
          var s = w.sites[i];
          if (!s || s.ruin || !s.n) continue;
          if (skip && s.n === skip) continue;
          if (skipHold && s.n === skipHold) continue;
          if (s.kind === "hamlet" || s.kind === "town" || s.kind === "abbey") return s;
        }
        return w.sites[3] || w.sites[1];
      }
    } catch (e) {}
    return { n: "Ithwick", kind: "hamlet", pop: 60, fish: "river" };
  }

  function kindOf() {
    try {
      if (window.wild && wild.of) {
        var p = wild.of().pop || {};
        for (var k in p) if (p[k] > 0.4) return k === "gold" ? "goldfish" : k;
      }
    } catch (e) {}
    try {
      if (window.guild && guild.mandate) return String(guild.mandate() || "betta");
    } catch (e2) {}
    return "betta";
  }

  function state() {
    var g = gs();
    if (g && g.envoy && g.envoy.site) return g.envoy;
    var s = aHamlet();
    var st = { site: s.n, want: kindOf(), last: "", seen: false, day: -1, suzerain: false, lost: false, filled: false };
    try {
      if (g) g.envoy = st;
    } catch (e) {}
    return st;
  }

  function arrive(rec, st, force) {
    var es = state();
    if (es.lost) return false;
    if (es.seen && es.day === shopDay() && !force) return false;
    if (shopDay() < 1 && !force) return false;
    var ham = aHamlet();
    if (!es.site || es.site === ham.n || (window.hold && hold.of && hold.of().site === es.site)) {
      es.site = ham.n;
      es.want = es.want || kindOf();
    }
    rec.kind = rec.kind === "kid" ? "neighbor" : rec.kind || "neighbor";
    rec.phase = "look";
    rec.want = es.want;
    rec.line = "From " + es.site + ". We only bag here if you keep " + es.want + ".";
    rec.name = rec.name || "Envoy of " + es.site;
    if (st) {
      st._envoy = 1;
      st.want = es.want;
      st.line = rec.line;
      st.guestName = rec.name;
      st.lineUntil = now() + 6;
    }
    es.seen = true;
    es.day = shopDay();
    var line = "An envoy from " + es.site + ".";
    es.last = line;
    because(line + " They asked for " + es.want + ".");
    gold(line, true);
    egg("envoyin", line);
    return true;
  }

  function noteBag(kind) {
    var es = state();
    if (es.suzerain || es.lost) return;
    if (es.want && kind && String(kind).toLowerCase().indexOf(String(es.want).toLowerCase()) >= 0) {
      es.suzerain = true;
      es.filled = true;
      var line = es.site + " bags here. They said so.";
      es.last = line;
      because(line);
      gold(line, true);
      egg("envoysuz", line);
    }
  }

  function watchLost() {
    var es = state();
    if (!es.seen || es.suzerain || es.lost) return;
    if (shopDay() - (es.day || 0) < 3) return;
    es.lost = true;
    var line = es.site + " went to Haymarket.";
    es.last = line;
    because(line);
    gold(line, true);
    egg("envoylost", line);
  }

  function edge() {
    var es = state();
    if (es.suzerain) return 0.09;
    if (es.lost) return -0.08;
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
        var es = state();
        if (
          !keep &&
          rec.phase === "look" &&
          st &&
          !st._envoy &&
          shopDay() >= 1 &&
          !es.seen &&
          !es.lost &&
          ((idx | 0) === 2 || rec.kind === "neighbor")
        ) {
          arrive(rec, st);
        }
        if (rec.phase === "pay" && st && st._envoy) noteBag(rec.want || st.want);
        if (es.lost && rec.phase === "look" && st && !st._envSaid && !keep) {
          st._envSaid = 1;
          rec.line = rec.kind === "kid" ? "They went up the market." : es.site + " bags at Haymarket now.";
          rec.phase = "leave";
          st.phase = "leave";
          st.bought = false;
          st.line = rec.line;
        } else if (es.suzerain && rec.phase === "look" && st && !st._envSaid && !keep && rec.kind !== "kid") {
          st._envSaid = 1;
          rec.line = "We don't go to Haymarket. " + es.site + " said.";
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
        var es = state();
        if (es.suzerain) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.08);
          if (!w.line) w.line = es.site + " bags here.";
        } else if (es.lost) {
          w.sour = Math.min(1, (w.sour || 0) + 0.07);
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
      if (wiki.some(function (a) { return a && a.id === "k_envoy"; })) return;
      wiki.push({
        id: "k_envoy",
        sec: "The quarter",
        t: "A hamlet that only bags here",
        tags: "envoy city-state suzerain haymarket hamlet civilization",
        w: "<p>Civilization city-states send envoys. Fin's small hold sends one person. Fill the pair and they stop going to Haymarket. Miss three mornings and they do. Suzerainty is who still walks this block.</p><p><b>What to do about it:</b> keep two of what they asked for. The gold line will name the walk, or the loss.</p>",
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
        watchLost();
      }
    } catch (e) {}
  }

  window.envoy = {
    whisper: whisper,
    line: line,
    of: state,
    edge: edge,
    seed: function () {
      var rec = { kind: "neighbor", phase: "look", line: "", name: "" };
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
