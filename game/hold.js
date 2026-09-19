/* hold.js — cities still found after you hang the sign.
   Civilization settlers are a unit. Fin's settler walks in off a longer
   road and wants a pair for a shop that is not this one. Fill it and a
   hold is on the map. Miss it and that street bags at Haymarket.
   Loyalty is who still comes. No second HUD. Odds, speech, the till. */
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
      if (window.desk && desk.think) desk.think("hold", text);
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

  function aSite() {
    try {
      var w = window.realm && realm.world && realm.world();
      var skip = letterFrom();
      if (w && w.sites) {
        for (var i = 1; i < w.sites.length; i++) {
          var s = w.sites[i];
          if (!s || s.ruin || !s.n) continue;
          if (skip && s.n === skip) continue;
          if (s.kind === "city" || s.kind === "town" || s.kind === "hamlet" || s.kind === "port") return s;
        }
        return w.sites[2] || w.sites[1] || w.sites[0];
      }
    } catch (e) {}
    return { n: "Pelholm", kind: "town", pop: 80, fish: "river" };
  }

  function kindOf() {
    try {
      if (window.guild && guild.mandate) return String(guild.mandate() || "goldfish");
    } catch (e) {}
    return "goldfish";
  }

  function state() {
    var g = gs();
    if (g && g.hold && typeof g.hold === "object") return g.hold;
    var st = { last: "", site: "", want: "", found: false, seen: false, day: -1, loyal: 0.5, settler: "" };
    try {
      if (g) g.hold = st;
    } catch (e) {}
    return st;
  }

  function arrive(rec, st, force) {
    var hs = state();
    if (hs.seen && hs.day === shopDay() && !force) return false;
    if (shopDay() < 1 && !force) return false;
    var site = aSite();
    var want = kindOf();
    rec.kind = rec.kind === "kid" ? "collector" : rec.kind || "collector";
    rec.phase = "look";
    rec.want = want;
    rec.line = "Raising a shop in " + site.n + ". A pair of " + want + ".";
    rec.name = rec.name || "Someone of " + site.n;
    if (st) {
      st._hold = 1;
      st.want = want;
      st.line = rec.line;
      st.lineUntil = now() + 6;
      st.guestName = rec.name;
      st.until = Math.max(st.until || 0, now() + 8);
    }
    hs.seen = true;
    hs.day = shopDay();
    hs.site = site.n;
    hs.want = want;
    hs.settler = rec.name;
    var line = "They are raising a shop in " + site.n + ".";
    hs.last = line;
    because(line + " A pair of " + want + ".");
    gold(line, true);
    egg("holdfound", line);
    return true;
  }

  function noteBag(kind) {
    var hs = state();
    if (!hs.seen || hs.found) return;
    if (hs.want && kind && String(kind).toLowerCase().indexOf(String(hs.want).toLowerCase()) >= 0) {
      hs.found = true;
      hs.loyal = 0.86;
      var line = "A hold was founded. " + hs.site + " has a shop.";
      hs.last = line;
      because(line);
      gold(line, true);
      egg("holdborn", line);
      try {
        var w = window.realm && realm.world && realm.world();
        if (w && w.sites) {
          for (var i = 0; i < w.sites.length; i++) {
            if (w.sites[i] && w.sites[i].n === hs.site) {
              w.sites[i].pop = (w.sites[i].pop || 40) + 80;
              w.sites[i].ruin = 0;
              break;
            }
          }
        }
      } catch (e) {}
      try {
        if (window.weave && weave.bumpWord) weave.bumpWord(0.06);
      } catch (e2) {}
    }
  }

  function noteMiss() {
    var hs = state();
    if (!hs.seen || hs.found) return;
    if (shopDay() - (hs.day || 0) < 2) return;
    hs.loyal = Math.max(0.08, (hs.loyal || 0.5) - 0.22);
    if (hs.loyal < 0.22 && hs.last && /Haymarket/.test(hs.last)) return;
    if (hs.loyal < 0.22) {
      var line = hs.site + " bags at Haymarket now.";
      hs.last = line;
      because(line);
      gold(line, true);
    }
  }

  function edge() {
    var hs = state();
    if (hs.found) return 0.06;
    if (hs.loyal < 0.22) return -0.07;
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
        var hs = state();
        if (
          !keep &&
          rec.phase === "look" &&
          st &&
          !st._hold &&
          shopDay() >= 1 &&
          !hs.seen &&
          ((idx | 0) === 2 || rec.kind === "collector")
        ) {
          arrive(rec, st);
        }
        if (hs.seen && rec.phase === "pay" && st && st._hold) {
          noteBag(rec.want || st.want || hs.want);
        }
        if (hs.loyal < 0.22 && rec.phase === "look" && st && !st._holdSaid && !keep) {
          st._holdSaid = 1;
          rec.line = rec.kind === "kid" ? "They went to Haymarket." : hs.site + " bags somewhere else now.";
          rec.phase = "leave";
          st.phase = "leave";
          st.bought = false;
          st.line = rec.line;
        } else if (hs.found && rec.phase === "look" && st && !st._holdSaid && !keep && (rec.kind === "neighbor" || rec.kind === "collector")) {
          st._holdSaid = 1;
          rec.line = "The new shop in " + hs.site + " still sends people here.";
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
        if (hs.found) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.07);
          if (!w.line) w.line = hs.site + " has a shop. The water heard.";
        } else if (hs.loyal < 0.22) {
          w.sour = Math.min(1, (w.sour || 0) + 0.08);
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
      if (wiki.some(function (a) { return a && a.id === "k_hold"; })) return;
      wiki.push({
        id: "k_hold",
        sec: "The quarter",
        t: "Someone is raising a shop",
        tags: "settler city founding hold loyalty haymarket civilization",
        w: "<p>Civilization founds a city with a settler. Fin's settler walks in off a longer road and wants a pair for a shop that is not this one. Fill it and a hold is on the map. Miss it and that street bags at Haymarket. Loyalty is who still comes.</p><p><b>What to do about it:</b> keep two of what they asked for. The letter is a cut road. This is a new street.</p>",
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
        noteMiss();
      }
    } catch (e) {}
  }

  window.hold = {
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
