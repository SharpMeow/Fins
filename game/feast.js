/* feast.js — a house is laying a table.
   Crusader Kings activities: a feast, a hunt, a funeral, a pilgrimage.
   Fin's does not open a calendar. A collector walks in. The Costas
   are laying a table. A pair as the centerpiece. Fill it and the
   house stays, the choir sweetens, they pay. Miss it and they go
   to Haymarket. A funeral wants the kind the dead one liked.
   No second HUD. Odds, speech, the till. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var didBrowse = false;
  var didChoir = false;

  var KINDS = ["feast", "hunt", "funeral", "pilgrimage"];

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

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.desk && desk.think) desk.think("feast", text);
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

  function surn(n) {
    var p = String(n || "").trim().split(/\s+/);
    return p.length > 1 ? p[p.length - 1] : p[0] || "Someone";
  }

  function folk() {
    try {
      if (window.kin && kin.folk) return kin.folk() || [];
    } catch (e) {}
    return [];
  }

  function living() {
    return folk().filter(function (f) {
      return f && !f.dead && f.id !== "keep";
    });
  }

  function state() {
    var g = gs();
    if (g && g.feast && typeof g.feast === "object") return g.feast;
    var st = { last: "", who: "", house: "", kind: "", want: "", day: -1, seen: false, filled: false };
    try {
      if (g) g.feast = st;
    } catch (e) {}
    return st;
  }

  function keepOf(st) {
    try {
      if (typeof keepGuest === "function") return keepGuest(st);
    } catch (e) {}
    return !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
  }

  function pickWant(kind, who) {
    if (kind === "funeral") {
      var all = folk();
      for (var i = 0; i < all.length; i++) {
        if (all[i] && all[i].dead && all[i].want) return all[i].want;
      }
    }
    try {
      if (window.house && house.ofName) {
        var h = house.ofName(who);
        if (h && h.want) return h.want;
      }
    } catch (e) {}
    return "goldfish";
  }

  function askLine(kind, house, want) {
    if (kind === "hunt") return "The " + house + "s are going out. A pair of " + want + " for the boat.";
    if (kind === "funeral") return "The " + house + "s are laying someone down. A pair of " + want + ".";
    if (kind === "pilgrimage") return "The " + house + "s are walking inland. A pair of " + want + " for the road.";
    return "The " + house + "s are laying a table. A pair of " + want + ".";
  }

  function start(rec, st, force) {
    var fs = state();
    if (fs.seen && !force) return false;
    if (shopDay() < 1 && !force) return false;
    var live = living();
    var who = (st && st.guestName) || rec.name || (live[0] && live[0].n) || "Mae Costa";
    var h = hash32("feast:" + shopDay() + who);
    var kind = KINDS[h % KINDS.length];
    var houseN = surn(who);
    var want = pickWant(kind, who);
    rec.kind = "collector";
    rec.phase = "look";
    rec.want = want;
    rec.name = who;
    rec.line = askLine(kind, houseN, want);
    if (st) {
      st._feast = 1;
      st.want = want;
      st.guestName = who;
      st.line = rec.line;
      st.lineUntil = now() + 7;
      st.until = Math.max(st.until || 0, now() + 9);
    }
    fs.seen = true;
    fs.day = shopDay();
    fs.who = who;
    fs.house = houseN;
    fs.kind = kind;
    fs.want = want;
    fs.filled = false;
    var line =
      kind === "feast"
        ? "The " + houseN + "s are laying a table."
        : kind === "hunt"
          ? "The " + houseN + "s are going out."
          : kind === "funeral"
            ? "The " + houseN + "s are laying someone down."
            : "The " + houseN + "s are walking inland.";
    fs.last = line;
    because(line + " A pair of " + want + ".");
    gold(line, true);
    egg("feast" + kind, line);
    return true;
  }

  function noteBag(kind) {
    var fs = state();
    if (!fs.seen || fs.filled) return;
    if (fs.want && kind && String(kind).toLowerCase().indexOf(String(fs.want).toLowerCase()) >= 0) {
      fs.filled = true;
      var line = "The " + fs.house + "s took the pair. The table is laid.";
      if (fs.kind === "funeral") line = "The " + fs.house + "s took the pair. They laid someone down.";
      if (fs.kind === "hunt") line = "The " + fs.house + "s took the pair. The boat went out.";
      if (fs.kind === "pilgrimage") line = "The " + fs.house + "s took the pair. They walked inland.";
      fs.last = line;
      because(line);
      gold(line, true);
      egg("feastfill", line);
      try {
        if (window.house && house.bump) house.bump(fs.house, 0.1);
      } catch (e) {}
      try {
        if (window.kin && kin.gift) kin.gift(fs.who, 0.1, "laid the table");
      } catch (e2) {}
    }
  }

  function noteMiss() {
    var fs = state();
    if (!fs.seen || fs.filled) return;
    if (shopDay() - (fs.day || 0) < 2) return;
    fs.filled = true;
    fs.missed = true;
    var line = "The " + fs.house + "s laid the table at Haymarket.";
    fs.last = line;
    because(line);
    gold(line, true);
    try {
      if (window.house && house.bump) house.bump(fs.house, -0.12);
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
        var fs = state();
        var keep = keepOf(st);
        if (!keep && rec.phase === "look" && st && !st._feast && shopDay() >= 1 && !fs.seen && ((idx | 0) === 1 || rec.kind === "collector")) {
          start(rec, st);
        }
        if (fs.seen && rec.phase === "pay" && st && st._feast) noteBag(rec.want || st.want || fs.want);
        if (fs.seen && rec.phase === "look" && st && !st._feast && !st._feastSaid && !keep) {
          st._feastSaid = 1;
          rec.line =
            rec.kind === "kid"
              ? "They're having a " + (fs.kind === "funeral" ? "funeral" : "table") + "."
              : "The " + fs.house + "s are " + (fs.kind === "feast" ? "laying a table" : fs.kind === "hunt" ? "going out" : fs.kind === "funeral" ? "laying someone down" : "walking inland") + ".";
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
        var fs = state();
        if (fs.filled && !fs.missed) {
          w.sweet = Math.min(1, (w.sweet || 0) + (fs.kind === "funeral" ? 0.04 : 0.1));
          if (!w.line) w.line = fs.last;
        } else if (fs.missed) {
          w.sour = Math.min(1, (w.sour || 0) + 0.07);
        } else if (fs.seen && fs.day === shopDay()) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.05);
          if (!w.line) w.line = fs.last;
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
        return a && a.id === "k_feast";
      }))
        return;
      wiki.push({
        id: "k_feast",
        sec: "The quarter",
        t: "A house is laying a table",
        tags: "feast hunt funeral pilgrimage activity crusader pair centerpiece house",
        w: "<p>Crusader Kings activities: a feast, a hunt, a funeral, a pilgrimage. Fin's does not open a calendar. A collector walks in. The Costas are laying a table. A pair as the centerpiece. Fill it and the house stays, the choir sweetens, they pay. Miss it and they go to Haymarket. A funeral wants the kind the dead one liked.</p><p><b>What to do about it:</b> keep two of what they asked for. The gold line names the table. Life writes whether it was laid here.</p>",
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

  function edge() {
    var fs = state();
    if (fs.missed) return -0.07;
    if (fs.filled) return 0.06;
    if (fs.seen && fs.day === shopDay()) return 0.03;
    return 0;
  }

  window.feast = {
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
