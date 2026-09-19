/* row.js — a fight on the aisle.
   Dwarf Fortress taverns do not queue. Two dwarves, a grudge, a mug,
   a workshop in pieces. Fin's aisle is the tavern. A thief and a cousin.
   A wet board and two people who already named a morning. They shove.
   The puddle spreads. Everyone else walks. A tank takes the hit.
   No second HUD. Odds, speech, the till, boards that remember. */
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

  function sceneName() {
    try {
      if (document.body.classList.contains("titling")) return "title";
      if (typeof sceneNow === "function") return String(sceneNow() || "");
    } catch (e) {}
    return "shop";
  }

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.desk && desk.think) desk.think("row", text);
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
    if (g && g.row && typeof g.row === "object") return g.row;
    var st = { last: "", a: "", b: "", day: -1, hit: "" };
    try {
      if (g) g.row = st;
    } catch (e) {}
    return st;
  }

  function first(n) {
    return String(n || "Someone").split(" ")[0];
  }

  function spill() {
    try {
      if (!window.shopSite || !shopSite.of) return;
      var s = shopSite.of();
      if (!s || !s.cells) return;
      for (var i = 0; i < s.cells.length; i++) {
        var c = s.cells[i];
        if (c.kind === "floor") c.wet = Math.max(c.wet || 0, 0.58);
      }
      s.wetMax = Math.max(s.wetMax || 0, 0.58);
    } catch (e) {}
  }

  function bumpFish() {
    try {
      var list = typeof allFish === "function" ? allFish() || [] : [];
      var pick = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i] && !list[i].dead && list[i].nick) {
          pick = list[i];
          break;
        }
      }
      if (!pick) {
        for (var j = 0; j < list.length; j++) {
          if (list[j] && !list[j].dead) {
            pick = list[j];
            break;
          }
        }
      }
      if (!pick) return "";
      pick._holdStill = 1;
      if (pick.brain) pick.brain.stress = Math.min(1, (pick.brain.stress || 0) + 0.18);
      if (pick.mind) pick.mind.stress = Math.min(1, (pick.mind.stress || 0) + 0.18);
      return pick.nick || "A fish";
    } catch (e) {}
    return "";
  }

  function start(a, b) {
    if (!a || !b || a === b) return false;
    var st = state();
    if (st.day === shopDay() && shopDay() >= 0 && !arguments[2]) return false;
    st.a = a;
    st.b = b;
    st.day = shopDay();
    st.hit = bumpFish();
    spill();
    var line =
      first(a) +
      " and " +
      first(b) +
      " had a row." +
      (st.hit ? " " + st.hit + " hit the glass." : " The aisle is wet.");
    st.last = line;
    because(line);
    gold(line, true);
    egg("aislerow", line);
    try {
      if (window.kin && kin.hurt) {
        kin.hurt(a, 0.08, "a row on the aisle");
        kin.hurt(b, 0.08, "a row on the aisle");
      }
    } catch (e) {}
    try {
      if (window.feel && feel.play) feel.play("warn");
    } catch (e2) {}
    return true;
  }

  function figOf(name) {
    try {
      if (window.kin && kin.of && name) return kin.of(name);
    } catch (e) {}
    return null;
  }

  function keepOf(st) {
    try {
      if (typeof keepGuest === "function") return keepGuest(st);
    } catch (e) {}
    return !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
  }

  function maybeRow() {
    if (shopDay() < 1) return;
    var st = state();
    if (st.day === shopDay()) return;
    var br = [];
    try {
      br = (window.shopLife && shopLife.browse && shopLife.browse()) || [];
    } catch (e) {}
    if (br.length < 2) return;
    var open = null;
    try {
      if (window.pinch && pinch.of) open = pinch.of();
    } catch (eP) {}
    var looking = [];
    for (var i = 0; i < br.length; i++) {
      var s = br[i];
      if (!s || s.phase === "leave" || keepOf(s)) continue;
      if (s.phase !== "look" && s.phase !== "pay") continue;
      var fig = figOf(s.guestName || s.name);
      looking.push({ st: s, fig: fig, name: (fig && fig.n) || s.guestName || s.name || "" });
    }
    if (looking.length < 2) return;
    var A = null;
    var B = null;
    if (open && open.who) {
      for (var t = 0; t < looking.length; t++) {
        if (looking[t].name === open.who || (looking[t].fig && looking[t].fig.n === open.who))
          A = looking[t];
      }
      for (var k = 0; k < looking.length; k++) {
        if (looking[k] === A) continue;
        if (looking[k].fig && looking[k].fig.kind === "neighbor") B = looking[k];
        else if (!B) B = looking[k];
      }
    }
    if (!A || !B) {
      for (var x = 0; x < looking.length; x++) {
        for (var y = x + 1; y < looking.length; y++) {
          var fa = looking[x].fig;
          var fb = looking[y].fig;
          var grudge =
            (fa && (fa.trust || 0.4) < 0.28) ||
            (fb && (fb.trust || 0.4) < 0.28) ||
            (fa && fa.last && /took |row|died|hurt/.test(fa.last)) ||
            (fb && fb.last && /took |row|died|hurt/.test(fb.last));
          var wet = false;
          try {
            wet = window.shopSite && shopSite.wet && shopSite.wet() > 0.36;
          } catch (eW) {}
          if (grudge || wet) {
            A = looking[x];
            B = looking[y];
            break;
          }
        }
        if (A && B) break;
      }
    }
    if (!A || !B || !A.name || !B.name) return;
    var chance = 0.08;
    try {
      if (window.shopSite && shopSite.wet && shopSite.wet() > 0.36) chance += 0.14;
    } catch (eC) {}
    if (open) chance += 0.22;
    if (Math.random() > chance) return;
    if (!start(A.name, B.name)) return;
    A.st.phase = "leave";
    A.st.bought = false;
    A.st.line = "I didn't start it.";
    B.st.phase = "leave";
    B.st.bought = false;
    B.st.line = "They shoved me.";
    for (var z = 0; z < br.length; z++) {
      if (!br[z] || keepOf(br[z])) continue;
      if (br[z] === A.st || br[z] === B.st) continue;
      if (br[z].phase === "look" || br[z].phase === "pay") {
        br[z].phase = "leave";
        br[z].bought = false;
      }
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
        maybeRow();
        var row = state();
        if (row.last && row.day === shopDay() && rec.phase === "look" && st && !st._rowSaid) {
          st._rowSaid = 1;
          var keep = keepOf(st);
          if (!keep) {
            rec.line = rec.kind === "kid" ? "They were yelling." : "I'm not standing in that.";
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
            st.line = rec.line;
            st.lineUntil = now() + 3.6;
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
        var st = state();
        if (st.last && st.day === shopDay()) {
          w.sour = Math.min(1, (w.sour || 0) + 0.14);
          if (!w.line) w.line = first(st.a) + " and " + first(st.b) + " had a row.";
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
    var st = state();
    if (st.last && st.day === shopDay()) return st.last;
    if (st.last) return st.last;
    return whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) {
        return a && a.id === "k_row";
      }))
        return;
      wiki.push({
        id: "k_row",
        sec: "The shop floor",
        t: "A row on the aisle",
        tags: "brawl fight aisle grudge tavern shove wet dwarf row",
        w: "<p>Dwarf Fortress taverns do not queue. Two dwarves, a grudge, a mug. Fin's aisle is the tavern. A thief and a cousin. A wet board and two people who already named a morning. They shove. The puddle spreads. Everyone else walks. A named one hits the glass and holds still.</p><p><b>What to do about it:</b> keep the boards dry. Stay on the aisle when a theft is open. Life names who shoved. The gold line does not cheer you.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      seedWiki();
      if (sceneName() === "title") return;
      if (now() - lastTick > 1.1) lastTick = now();
    } catch (e) {}
  }

  window.row = {
    whisper: whisper,
    line: line,
    of: function () {
      return state();
    },
    seed: function (a, b) {
      var na = a;
      var nb = b;
      try {
        if ((!na || !nb) && window.kin && kin.folk) {
          var all = kin.folk() || [];
          var live = [];
          for (var i = 0; i < all.length; i++) {
            if (all[i] && !all[i].dead && all[i].id !== "keep") live.push(all[i].n);
          }
          if (!na && live[0]) na = live[0];
          if (!nb && live[1]) nb = live[1];
          if (!nb && live[0]) nb = live[0] === na ? "Someone on Salem" : live[0];
        }
      } catch (e) {}
      start(na || "Vabal Chen", nb || "Rita Russo", true);
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
