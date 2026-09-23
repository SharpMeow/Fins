/* seat.js — a governor walks in, and the tank has a mayor.
   Fin's inland sends
   an edict: a kind, a last-of-a-pair they will not hear of. The tank
   already had minds. One named fish is the one the others follow.
   Collectors ask for that one. The others hold still when it does.
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
      if (window.desk && desk.think) desk.think("seat", text);
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

  function aFig() {
    try {
      var w = window.realm && realm.world && realm.world();
      if (w && w.figs) {
        for (var i = 0; i < w.figs.length; i++) {
          if (w.figs[i] && (w.figs[i].job === "judge" || w.figs[i].job === "scribe" || w.figs[i].job === "captain"))
            return w.figs[i];
        }
        if (w.figs[2]) return w.figs[2];
      }
    } catch (e) {}
    return { n: "Selum Ithen", job: "judge" };
  }

  function kindOf() {
    try {
      if (window.guild && guild.mandate) return String(guild.mandate() || "cichlid");
    } catch (e) {}
    return "cichlid";
  }

  function fishList() {
    try {
      if (typeof allFish === "function") return allFish() || [];
    } catch (e) {}
    return [];
  }

  function pickMayor() {
    var list = fishList();
    var best = null;
    var score = -1;
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (!f || !f.nick) continue;
      var s = 0;
      try {
        if (f.mind && typeof f.mind.mood === "number") s += f.mind.mood;
      } catch (e) {}
      s += (f.stage || 0) * 0.2;
      s += (f.stress || 0) * -0.1;
      if (f._foe || f.proud) s += 0.3;
      if (s > score) {
        score = s;
        best = f;
      }
    }
    return best;
  }

  function state() {
    var g = gs();
    if (g && g.seat && typeof g.seat === "object") return g.seat;
    var fig = aFig();
    var st = {
      gov: fig.n,
      edict: kindOf(),
      last: "",
      seen: false,
      day: -1,
      mayor: "",
      mayorId: 0,
    };
    try {
      if (g) g.seat = st;
    } catch (e) {}
    return st;
  }

  function first(n) {
    return String(n || "Someone").split(" ")[0];
  }

  function seatMayor(force) {
    var st = state();
    var m = pickMayor();
    if (!m || !m.nick) return;
    if (st.mayor === m.nick && !force) return;
    var was = st.mayor;
    st.mayor = m.nick;
    st.mayorId = m.fid || 0;
    m._mayor = 1;
    if (shopDay() < 1 && !force) return;
    if (was && was === m.nick) return;
    var line = m.nick + " is the one the others follow.";
    st.last = line;
    because(line);
    gold(line, true);
    egg("seatmayor", line);
  }

  function arrive(rec, st, force) {
    var ss = state();
    if (ss.seen && ss.day === shopDay() && !force) return false;
    if (shopDay() < 1 && !force) return false;
    rec.kind = "collector";
    rec.name = ss.gov;
    rec.phase = "look";
    rec.want = ss.edict;
    rec.line = "The hall voted. A pair of " + ss.edict + ". Not the last of that fish.";
    if (st) {
      st._seat = 1;
      st.name = ss.gov;
      st.guestName = ss.gov;
      st.want = ss.edict;
      st.line = rec.line;
      st.lineUntil = now() + 6;
    }
    ss.seen = true;
    ss.day = shopDay();
    var line = first(ss.gov) + " brought an edict.";
    ss.last = line;
    because(line + " " + rec.line);
    gold(line, true);
    egg("seatedict", line);
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
        var ss = state();
        if (
          !keep &&
          rec.phase === "look" &&
          st &&
          !st._seat &&
          shopDay() >= 1 &&
          !ss.seen &&
          ((idx | 0) === 1 || rec.kind === "collector")
        ) {
          arrive(rec, st);
        }
        if (ss.mayor && rec.phase === "look" && st && !st._seatSaid && !keep && (rec.kind === "collector" || rec.kind === "kid")) {
          st._seatSaid = 1;
          rec.line =
            rec.kind === "kid"
              ? ss.mayor + " is the boss of the tank."
              : "That's the one the others follow. " + ss.mayor + ".";
          st.line = rec.line;
        }
        if (ss.seen && rec.phase === "look" && st && st._seat) {
          rec.want = ss.edict;
          st.want = ss.edict;
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
        var ss = state();
        if (ss.mayor) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.05);
          if (!w.line) w.line = ss.mayor + " is the one the others follow.";
        }
        if (ss.seen && ss.day === shopDay() && !w.line) {
          w.line = first(ss.gov) + " brought an edict.";
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
        var ss = state();
        if (ss.mayor && a && a.fish) {
          if (a.fish.nick === ss.mayor) {
            a.fish._holdStill = 1;
            a.fish._gaze = now();
            a.fish._mayor = 1;
          } else if (a.fish.nick && Math.sin(now() + (a.fish.fid || 0)) > 0.65) {
            a.fish._holdStill = 1;
          }
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
      if (wiki.some(function (a) { return a && a.id === "k_seat"; })) return;
      wiki.push({
        id: "k_seat",
        sec: "The chronicle",
        t: "A governor, and a mayor in the water",
        tags: "governor edict mayor tank leader hall",
        w: "<p>Fin's inland sends an edict: a kind, a last-of-a-pair they will not hear of. The tank already had minds. One named fish is the one the others follow. Collectors ask for that one. The others hold still when it does.</p><p><b>What to do about it:</b> do not bag the mayor if you can help it. Fill the edict pair. Life will name both walks.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      wrapFish();
      seedWiki();
      if (now() - lastTick > 1.4) {
        lastTick = now();
        seatMayor();
      }
    } catch (e) {}
  }

  function edge() {
    var ss = state();
    var n = 0;
    if (ss.mayor) n += 0.04;
    if (ss.seen && ss.day === shopDay()) n += 0.03;
    return n;
  }

  window.seat = {
    whisper: whisper,
    line: line,
    of: state,
    edge: edge,
    seed: function () {
      var rec = { kind: "collector", phase: "look", line: "", name: "" };
      var st = { phase: "look", bought: false };
      arrive(rec, st, true);
      seatMayor(true);
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
