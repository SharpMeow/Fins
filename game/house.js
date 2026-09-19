/* house.js — a surname is a house, not a label.
   Fin's street already had names. A
   Costa is a house. A head. Prestige. A kind they bag. A rival they
   will not stand next to. Fill the pair the head asked for and the
   house stays. Miss it and they bag at Haymarket. A cadet says they
   are of the name, not the head. No second HUD. Odds, speech, the till. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var didBrowse = false;
  var didChoir = false;

  var WANTS = ["goldfish", "betta", "guppy", "tetra", "angelfish", "cory", "clown"];

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
      if (window.desk && desk.think) desk.think("house", text);
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
    if (g && g.house && typeof g.house === "object") return g.house;
    var st = { last: "", houses: [], asked: "", day: -1, filled: false };
    try {
      if (g) g.house = st;
    } catch (e) {}
    return st;
  }

  function ensure() {
    var st = state();
    var live = living();
    var by = Object.create(null);
    for (var i = 0; i < live.length; i++) {
      var s = surn(live[i].n);
      if (!s) continue;
      if (!by[s]) by[s] = [];
      by[s].push(live[i]);
    }
    var names = Object.keys(by);
    if (!st.houses.length) {
      for (var j = 0; j < names.length; j++) {
        var hh = hash32("house:" + names[j]);
        var rival = names[(j + 1) % names.length];
        if (rival === names[j]) rival = "";
        st.houses.push({
          n: names[j],
          want: WANTS[hh % WANTS.length],
          prestige: 0.4 + ((hh >>> 8) % 30) / 100,
          rival: rival,
        });
      }
    }
    for (var k = 0; k < st.houses.length; k++) {
      var hs = st.houses[k];
      var members = by[hs.n] || [];
      hs.head = members[0] ? members[0].n : "";
      hs.cadet = members[1] ? members[1].n : "";
      hs.nfolk = members.length;
    }
    return st;
  }

  function ofSurn(s) {
    var st = ensure();
    s = String(s || "");
    for (var i = 0; i < st.houses.length; i++) if (st.houses[i].n === s) return st.houses[i];
    return null;
  }

  function ofName(n) {
    return ofSurn(surn(n));
  }

  function bump(s, amt) {
    var h = ofSurn(s);
    if (!h) return;
    h.prestige = Math.max(0.04, Math.min(1, (h.prestige || 0.4) + amt));
  }

  function keepOf(st) {
    try {
      if (typeof keepGuest === "function") return keepGuest(st);
    } catch (e) {}
    return !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
  }

  function askHead(rec, st, fig, h, force) {
    var hs = state();
    if (shopDay() < 1 && !force) return false;
    if (hs.asked && hs.day === shopDay() && !force) return false;
    rec.phase = "look";
    rec.want = h.want;
    rec.line = "The " + h.n + "s. A pair of " + h.want + ".";
    rec.kind = rec.kind === "kid" ? "collector" : rec.kind || "collector";
    if (st) {
      st._houseAsk = 1;
      st.want = h.want;
      st.line = rec.line;
      st.lineUntil = now() + 6;
      st.guestName = fig.n;
    }
    hs.asked = fig.n;
    hs.day = shopDay();
    hs.want = h.want;
    hs.which = h.n;
    hs.filled = false;
    var line = "The " + h.n + "s asked for a pair of " + h.want + ".";
    hs.last = line;
    because(line);
    gold(line, true);
    egg("houseask", line);
    return true;
  }

  function noteBag(kind) {
    var hs = state();
    if (!hs.asked || hs.filled) return;
    if (hs.want && kind && String(kind).toLowerCase().indexOf(String(hs.want).toLowerCase()) >= 0) {
      hs.filled = true;
      bump(hs.which, 0.12);
      var line = "The " + hs.which + "s took the pair. The house stays.";
      hs.last = line;
      because(line);
      gold(line, true);
      egg("housepair", line);
    }
  }

  function noteMiss() {
    var hs = state();
    if (!hs.asked || hs.filled) return;
    if (shopDay() - (hs.day || 0) < 2) return;
    bump(hs.which, -0.16);
    var h = ofSurn(hs.which);
    if (h && (h.prestige || 0) < 0.22) {
      var line = "The " + hs.which + "s bag at Haymarket now.";
      hs.last = line;
      because(line);
      gold(line, true);
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
        if (keepOf(st)) return rec;
        ensure();
        var fig = null;
        try {
          if (window.kin && kin.of) fig = kin.of(st && (st.guestName || rec.name));
        } catch (e) {}
        if (!fig) return rec;
        var h = ofName(fig.n);
        if (!h) return rec;
        if (rec.phase === "look" && st && !st._houseSaid) {
          st._houseSaid = 1;
          if (h.head === fig.n && shopDay() >= 1 && !state().asked && ((idx | 0) === 3 || rec.kind === "collector")) {
            askHead(rec, st, fig, h);
          } else if (h.cadet === fig.n) {
            rec.line = "I'm of the " + h.n + "s. Not the head.";
            st.line = rec.line;
            st.lineUntil = now() + 3.6;
          } else if (h.prestige < 0.2 && rec.kind !== "kid") {
            rec.line = "The " + h.n + "s don't bag here.";
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
            st.line = rec.line;
          } else if (rec.kind !== "kid" && !rec.line) {
            rec.line = "The " + h.n + "s. " + (fig.want || h.want) + ".";
            st.line = rec.line;
          }
        }
        if (rec.phase === "pay" && st && st._houseAsk) noteBag(rec.want || st.want);
        if (rec.phase === "look" && st && h.rival) {
          try {
            var br = (window.shopLife && shopLife.browse && shopLife.browse()) || [];
            for (var i = 0; i < br.length; i++) {
              if (!br[i] || br[i] === st) continue;
              var other = br[i].guestName || br[i].name || "";
              if (surn(other) === h.rival && (br[i].phase === "look" || br[i].phase === "pay")) {
                rec.line = "A " + h.rival + " is on the aisle. I'm not standing with them.";
                rec.phase = "leave";
                st.phase = "leave";
                st.bought = false;
                st.line = rec.line;
                break;
              }
            }
          } catch (eR) {}
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
        var st = ensure();
        var high = 0;
        var low = 0;
        for (var i = 0; i < st.houses.length; i++) {
          if ((st.houses[i].prestige || 0) > 0.7) high++;
          if ((st.houses[i].prestige || 0) < 0.2) low++;
        }
        if (high) w.sweet = Math.min(1, (w.sweet || 0) + Math.min(0.1, high * 0.03));
        if (low) w.sour = Math.min(1, (w.sour || 0) + Math.min(0.12, low * 0.04));
        if (!w.line && st.last && st.day === shopDay()) w.line = st.last;
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
        return a && a.id === "k_house";
      }))
        return;
      wiki.push({
        id: "k_house",
        sec: "You and your people",
        t: "A surname is a house",
        tags: "dynasty house prestige cadet rival surname head pair",
        w: "<p>Fin's street already had names. A Costa is a house. A head. Prestige. A fish they bag. A rival they will not stand next to. Fill the pair the head asked for and the house stays. Miss it and they bag at Haymarket. Someone of the name, not the head, says they are of the name.</p><p><b>What to do about it:</b> keep two of what the head asked for. Do not put rivals on the aisle together. Life names the house.</p>",
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
        ensure();
        noteMiss();
      }
    } catch (e) {}
  }

  function edge() {
    var st = ensure();
    if (st.filled) return 0.05;
    var n = 0, p = 0;
    for (var i = 0; i < st.houses.length; i++) {
      p += st.houses[i].prestige || 0.4;
      n++;
    }
    if (!n) return 0;
    var avg = p / n;
    if (avg < 0.22) return -0.06;
    if (avg > 0.7) return 0.05;
    return 0;
  }

  window.house = {
    whisper: whisper,
    line: line,
    of: state,
    edge: edge,
    ofName: ofName,
    bump: bump,
    seed: function (n) {
      ensure();
      var live = living();
      var fig = null;
      if (n && window.kin && kin.of) fig = kin.of(n);
      if (!fig) fig = live[0];
      if (!fig) return state();
      var h = ofName(fig.n) || { n: surn(fig.n), want: "goldfish", head: fig.n };
      var rec = { kind: "collector", phase: "look", line: "", name: fig.n };
      var st = { phase: "look", bought: false, guestName: fig.n };
      askHead(rec, st, fig, h, true);
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
