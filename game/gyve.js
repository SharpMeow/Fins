/* gyve.js — they held me under the keel.
   Crusader Kings: prisoners, ransom, a person who cannot speak.
   Fin's war already put a keel on the glass. Someone walks in with
   a mark. They were promised a fish. Bag a pair and they let a name
   walk. Miss it and that name does not come back. A guard may speak
   for them. No second HUD. Odds, speech, the till, a chord that
   sours until they walk. */
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
      if (window.desk && desk.think) desk.think("gyve", text);
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
      return f && !f.dead && f.id !== "keep" && f.id !== "mae";
    });
  }

  function kindOf() {
    try {
      if (window.guild && guild.mandate) return String(guild.mandate() || "goldfish");
    } catch (e) {}
    return "goldfish";
  }

  function state() {
    var g = gs();
    if (g && g.gyve && typeof g.gyve === "object") return g.gyve;
    var st = { last: "", who: "", held: "", want: "", day: -1, seen: false, freed: false };
    try {
      if (g) g.gyve = st;
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
        st._feast)
    );
  }

  function siegeOn() {
    try {
      if (window.siege && siege.of) {
        var s = siege.of();
        if (s && (s.on || s.last)) return true;
      }
    } catch (e) {}
    return false;
  }

  function start(rec, st, force) {
    var gs_ = state();
    if (gs_.seen && !force) return false;
    if (shopDay() < 1 && !force) return false;
    var live = living();
    var who = (st && st.guestName) || rec.name || (live[0] && live[0].n) || "Walt Hale";
    var held = (live[1] && live[1].n) || "Pia Voss";
    if (held === who && live[2]) held = live[2].n;
    var want = kindOf();
    rec.kind = "collector";
    rec.phase = "look";
    rec.want = want;
    rec.name = who;
    rec.line = siegeOn()
      ? "They held " + first(held) + " under the keel. A pair of " + want + " and they walk."
      : "They held me. I was promised a " + want + ".";
    if (st) {
      st._gyve = 1;
      st.want = want;
      st.guestName = who;
      st.line = rec.line;
      st.lineUntil = now() + 7;
      st.until = Math.max(st.until || 0, now() + 9);
    }
    gs_.seen = true;
    gs_.day = shopDay();
    gs_.who = who;
    gs_.held = held;
    gs_.want = want;
    gs_.freed = false;
    var line = "They held " + first(held) + ". A pair would let them walk.";
    gs_.last = line;
    because(line);
    gold(line, true);
    egg("gyveheld", line);
    try {
      var fig = null;
      if (window.kin && kin.of) fig = kin.of(held);
      if (fig) fig.last = "held under the keel";
    } catch (e) {}
    return true;
  }

  function noteBag(kind) {
    var gs_ = state();
    if (!gs_.seen || gs_.freed) return;
    if (gs_.want && kind && String(kind).toLowerCase().indexOf(String(gs_.want).toLowerCase()) >= 0) {
      gs_.freed = true;
      var line = first(gs_.held) + " walks. The pair let them.";
      gs_.last = line;
      because(line);
      gold(line, true);
      egg("gyvefree", line);
      try {
        if (window.kin && kin.gift) {
          kin.gift(gs_.who, 0.1, "a ransom pair");
          kin.gift(gs_.held, 0.12, "walked free");
        }
      } catch (e) {}
    }
  }

  function noteMiss() {
    var gs_ = state();
    if (!gs_.seen || gs_.freed) return;
    if (shopDay() - (gs_.day || 0) < 3) return;
    gs_.freed = true;
    gs_.lost = true;
    var line = first(gs_.held) + " did not come back.";
    gs_.last = line;
    because(line);
    gold(line, true);
    try {
      if (window.kin && kin.hurt) kin.hurt(gs_.held, 0.16, "did not come back");
    } catch (e) {}
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
        var gs_ = state();
        var keep = keepOf(st);
        var due = siegeOn() || shopDay() >= 3;
        if (!keep && rec.phase === "look" && st && !st._gyve && shopDay() >= 1 && !gs_.seen && due && rec.kind !== "kid") {
          start(rec, st);
        }
        if (gs_.seen && rec.phase === "pay" && st && st._gyve) noteBag(rec.want || st.want || gs_.want);
        if (gs_.seen && rec.phase === "look" && st && !st._gyve && !st._gyveSaid && !keep) {
          st._gyveSaid = 1;
          rec.line = rec.kind === "kid" ? first(gs_.held) + " isn't here." : "They held " + first(gs_.held) + " under the keel.";
          st.line = rec.line;
        }
        if (gs_.lost && rec.phase === "look" && st && (st.guestName === gs_.held || rec.name === gs_.held)) {
          rec.phase = "leave";
          st.phase = "leave";
          st.bought = false;
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
        var gs_ = state();
        if (gs_.lost) {
          w.sour = Math.min(1, (w.sour || 0) + 0.12);
          if (!w.line) w.line = first(gs_.held) + " did not come back.";
        } else if (gs_.freed) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.07);
        } else if (gs_.seen && !gs_.freed) {
          w.sour = Math.min(1, (w.sour || 0) + 0.08);
          if (!w.line) w.line = "They held " + first(gs_.held) + ".";
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
        return a && a.id === "k_gyve";
      }))
        return;
      wiki.push({
        id: "k_gyve",
        sec: "The quarter",
        t: "They held me under the keel",
        tags: "prisoner ransom hostage keel war crusader pair walk free",
        w: "<p>Crusader Kings: prisoners, ransom, a person who cannot speak. Fin's war already put a keel on the glass. Someone walks in with a mark. They were promised a fish. Bag a pair and they let a name walk. Miss it and that name does not come back. A guard may speak for them.</p><p><b>What to do about it:</b> keep two of what they asked for. The gold line names who is held. Life writes whether they walked.</p>",
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

  window.gyve = {
    whisper: whisper,
    line: line,
    of: state,
    seed: function (a, b) {
      var rec = { kind: "collector", phase: "look", line: "", name: a || "" };
      var st = { phase: "look", bought: false };
      start(rec, st, true);
      if (b) state().held = b;
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
