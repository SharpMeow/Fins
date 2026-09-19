/* fief.js — the harbor is a liege, and tyranny is who still bags.
   Crusader Kings: vassals, opinion, factions, a contract. Fin's hall
   already collected dues. Now the harbor master is a mouth. People
   pay a liege. If the hall is cruel they bag here as refuge, or they
   stop because the faction said so. Tyranny is an empty aisle with
   a reason. No second HUD. Odds, speech, the till. */
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
      if (window.desk && desk.think) desk.think("fief", text);
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

  function state() {
    var g = gs();
    if (g && g.fief && typeof g.fief === "object") return g.fief;
    var st = { last: "", liege: "the harbor", opinion: 0.5, tyrant: false, faction: false, day: -1 };
    try {
      if (g) g.fief = st;
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

  function hallStanding() {
    try {
      if (window.guild && guild.standing) return guild.standing();
    } catch (e) {}
    try {
      if (window.guild && guild.of) {
        var g = guild.of();
        if (g && isFinite(g.stand)) return g.stand;
        if (g && isFinite(g.standing)) return g.standing;
      }
    } catch (e2) {}
    return 0.5;
  }

  function tickOpinion() {
    var st = state();
    var stand = hallStanding();
    st.opinion = Math.max(0.04, Math.min(1, stand));
    var wasTyrant = st.tyrant;
    st.tyrant = st.opinion < 0.22;
    st.faction = st.opinion < 0.18;
    if (st.tyrant && !wasTyrant && shopDay() >= 1) {
      st.day = shopDay();
      st.last = "The harbor is cruel. They bag here as refuge.";
      because(st.last);
      gold(st.last, true);
      egg("fieftyrant", st.last);
    } else if (!st.tyrant && wasTyrant && shopDay() >= 1) {
      st.last = "The harbor eased. They pay the hall again.";
      because(st.last);
    }
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
        var fs = state();
        if (rec.phase === "look" && !st._fiefSaid) {
          st._fiefSaid = 1;
          if (fs.faction && rec.kind !== "kid" && rec.kind !== "neighbor") {
            rec.line = "The faction said stay away. The harbor is the liege.";
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
            st.line = rec.line;
            if (shopDay() >= 1 && !fs.last) {
              fs.last = "A faction emptied the aisle.";
              gold(fs.last, true);
            }
          } else if (fs.tyrant && rec.kind === "neighbor") {
            rec.line = "The harbor is cruel. I still come here.";
            st.line = rec.line;
          } else if (fs.tyrant && rec.kind === "lunch") {
            rec.line = "Dues at the hall. I bag here instead.";
            st.line = rec.line;
          } else if (!fs.tyrant && rec.kind === "collector" && !rec.line) {
            rec.line = "The harbor still has us. The usual.";
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
        var fs = state();
        if (fs.faction) {
          w.sour = Math.min(1, (w.sour || 0) + 0.1);
          if (!w.line) w.line = "A faction emptied the aisle.";
        } else if (fs.tyrant) {
          w.sour = Math.min(1, (w.sour || 0) + 0.05);
          w.sweet = Math.min(1, (w.sweet || 0) + 0.04);
          if (!w.line) w.line = "The harbor is cruel. They bag here as refuge.";
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
        return a && a.id === "k_fief";
      }))
        return;
      wiki.push({
        id: "k_fief",
        sec: "The quarter",
        t: "The harbor is a liege",
        tags: "vassal liege tyranny faction opinion dues crusader harbor hall",
        w: "<p>Crusader Kings: vassals, opinion, factions, a contract. Fin's hall already collected dues. Now the harbor master is a mouth. People pay a liege. If the hall is cruel they bag here as refuge, or they stop because the faction said so. Tyranny is an empty aisle with a reason.</p><p><b>What to do about it:</b> the hall's standing is the liege's opinion. A boycott was empty. A faction is empty and they say why. Life names the harbor.</p>",
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
        tickOpinion();
      }
    } catch (e) {}
  }

  window.fief = {
    whisper: whisper,
    line: line,
    of: state,
    seed: function () {
      var st = state();
      st.opinion = 0.12;
      st.tyrant = true;
      st.faction = true;
      st.day = shopDay();
      st.last = "The harbor is cruel. They bag here as refuge.";
      gold(st.last, true);
      because(st.last);
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
