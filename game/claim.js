/* claim.js — that one is of my house.
   A title that was someone's. Fin's
   named fish already had a line. Someone walks in and will not pay.
   They say the one in the water is theirs by blood. Bag it as a gift
   and the house stays. Refuse and they walk, and the street hears
   it as a slight. Once, someone claims the counter. No second HUD.
   Odds, speech, the till, a fish that holds still. */
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
      if (window.desk && desk.think) desk.think("claim", text);
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

  function namedFish() {
    try {
      var list = typeof allFish === "function" ? allFish() || [] : [];
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].nick && !list[i].dead) return list[i];
      }
    } catch (e) {}
    return null;
  }

  function state() {
    var g = gs();
    if (g && g.claim && typeof g.claim === "object") return g.claim;
    var st = { last: "", who: "", nick: "", day: -1, seen: false, given: false, shop: false };
    try {
      if (g) g.claim = st;
    } catch (e) {}
    return st;
  }

  function keepOf(st) {
    try {
      if (typeof keepGuest === "function") return keepGuest(st);
    } catch (e) {}
    return !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
  }

  function start(rec, st, force) {
    var cs = state();
    if (cs.seen && !force) return false;
    if (shopDay() < 1 && !force) return false;
    var fish = namedFish();
    var who = (st && st.guestName) || rec.name || "Tomas Russo";
    rec.kind = "collector";
    rec.phase = "look";
    rec.name = who;
    if (fish) {
      rec.line = "That one is of my house. " + fish.nick + ". I'm not paying.";
      cs.nick = fish.nick;
    } else {
      rec.line = "Nedda said this counter would be mine.";
      cs.shop = true;
    }
    if (st) {
      st._claim = 1;
      st.guestName = who;
      st.line = rec.line;
      st.lineUntil = now() + 7;
      st.bought = false;
    }
    cs.seen = true;
    cs.day = shopDay();
    cs.who = who;
    cs.given = false;
    var line = fish ? first(who) + " claims " + fish.nick + "." : first(who) + " claims this counter.";
    cs.last = line;
    because(line);
    gold(line, true);
    egg("claimask", line);
    return true;
  }

  function give() {
    var cs = state();
    if (!cs.seen || cs.given) return;
    cs.given = true;
    var line = cs.nick
      ? first(cs.who) + " took " + cs.nick + ". No coin. A claim."
      : first(cs.who) + " was told the counter is not theirs.";
    cs.last = line;
    because(line);
    gold(line, true);
    try {
      if (window.house && house.bump) house.bump(surn(cs.who), 0.08);
    } catch (e) {}
    try {
      if (window.kin && kin.gift) kin.gift(cs.who, 0.06, "a claim honored");
    } catch (e2) {}
  }

  function refuse() {
    var cs = state();
    if (!cs.seen || cs.given || cs.refused) return;
    cs.refused = true;
    var line = first(cs.who) + " walked. A slight.";
    cs.last = line;
    because(line);
    gold(line, true);
    try {
      if (window.kin && kin.hurt) kin.hurt(cs.who, 0.1, "a claim refused");
    } catch (e) {}
    try {
      if (window.house && house.bump) house.bump(surn(cs.who), -0.1);
    } catch (e2) {}
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
        var cs = state();
        var keep = keepOf(st);
        if (!keep && rec.phase === "look" && st && !st._claim && shopDay() >= 1 && !cs.seen && rec.kind === "collector") {
          start(rec, st);
        }
        if (cs.seen && st && st._claim) {
          if (rec.phase === "pay") {
            give();
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = true;
          } else if (rec.phase === "leave" && !st.bought) {
            refuse();
          } else if (rec.phase === "look") {
            rec.line = st.line || rec.line;
            rec.phase = "look";
          }
        }
        if (cs.seen && rec.phase === "look" && st && !st._claim && !st._claimSaid && !keep) {
          st._claimSaid = 1;
          rec.line = rec.kind === "kid" ? "They said that one is theirs." : first(cs.who) + " claims " + (cs.nick || "the counter") + ".";
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
        var cs = state();
        if (cs.refused) w.sour = Math.min(1, (w.sour || 0) + 0.08);
        else if (cs.given) w.sweet = Math.min(1, (w.sweet || 0) + 0.05);
        if (cs.last && cs.day === shopDay() && !w.line) w.line = cs.last;
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
        var cs = state();
        if (cs.nick && a && a.fish && a.fish.nick === cs.nick) {
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
        return a && a.id === "k_claim";
      }))
        return;
      wiki.push({
        id: "k_claim",
        sec: "The shop floor",
        t: "That one is of my house",
        tags: "claim pressed title named fish house counter slight",
        w: "<p>The named fish already had a line. Someone walks in and will not pay. They say the one in the water is theirs by blood. Bag it as a gift and the house stays. Refuse and they walk, and the street hears it as a slight. Once, someone claims the counter.</p><p><b>What to do about it:</b> the named one holds still. Life names the claim. A slight is a family that will not bag.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      wrapFish();
      seedWiki();
      if (now() - lastTick > 1.5) lastTick = now();
    } catch (e) {}
  }

  function edge() {
    var cs = state();
    if (cs.refused) return -0.07;
    if (cs.given) return 0.03;
    return 0;
  }

  window.claim = {
    whisper: whisper,
    line: line,
    of: state,
    edge: edge,
    seed: function (n) {
      var rec = { kind: "collector", phase: "look", line: "", name: n || "" };
      var st = { phase: "look", bought: false };
      start(rec, st, true);
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
