/* wed.js — two people come for a pair because they are taking vows.
   Crusader Kings is marriage. Alliances, betrothals, a feast that is
   a wedding. Fin's does not open a character sheet. Two walk-ins, one
   kind, a pair as the gift. Fill it and the houses bind. Miss it and
   both families hear. Kids say they are getting married. No second
   HUD. Odds, speech, the till, a chord that sweetens. */
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
      if (window.desk && desk.think) desk.think("wed", text);
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

  function folk() {
    try {
      if (window.kin && kin.folk) return kin.folk() || [];
    } catch (e) {}
    return [];
  }

  function living() {
    return folk().filter(function (f) {
      return f && !f.dead && f.id !== "keep" && f.kind !== "kid" && f.job !== "still small";
    });
  }

  function state() {
    var g = gs();
    if (g && g.wed && typeof g.wed === "object") return g.wed;
    var st = { last: "", a: "", b: "", want: "", day: -1, bound: false, seen: false };
    try {
      if (g) g.wed = st;
    } catch (e) {}
    return st;
  }

  function kindOf() {
    try {
      if (window.guild && guild.mandate) return String(guild.mandate() || "goldfish");
    } catch (e) {}
    return "goldfish";
  }

  function keepOf(st) {
    return !!(
      st &&
      (st._lateMae || st._goingHold || st._lateKid || st._mask || st._hold || st._lord || st._great || st._envoy)
    );
  }

  function arrive(rec, st, other, force) {
    var ws = state();
    if (ws.seen && !force) return false;
    if (shopDay() < 1 && !force) return false;
    var want = kindOf();
    rec.kind = rec.kind === "kid" ? "collector" : rec.kind || "collector";
    rec.phase = "look";
    rec.want = want;
    rec.line = "We're taking vows. A pair of " + want + ".";
    if (st) {
      st._wed = 1;
      st.want = want;
      st.line = rec.line;
      st.lineUntil = now() + 7;
      st.guestName = rec.name || st.guestName;
      st.until = Math.max(st.until || 0, now() + 9);
    }
    if (other) {
      other._wed = 1;
      other.want = want;
      other.phase = "look";
      other.bought = false;
      other.line = "A pair. For the table.";
      other.lineUntil = now() + 7;
    }
    ws.seen = true;
    ws.day = shopDay();
    ws.a = (st && (st.guestName || rec.name)) || rec.name || "Someone";
    ws.b = (other && (other.guestName || other.name)) || "Someone on Salem";
    ws.want = want;
    ws.bound = false;
    var line = first(ws.a) + " and " + first(ws.b) + " are here for a pair.";
    ws.last = line;
    because(line + " They are taking vows.");
    gold(line, true);
    egg("wedpair", line);
    return true;
  }

  function noteBag(kind) {
    var ws = state();
    if (!ws.seen || ws.bound) return;
    if (ws.want && kind && String(kind).toLowerCase().indexOf(String(ws.want).toLowerCase()) >= 0) {
      ws.bound = true;
      var line = first(ws.a) + " and " + first(ws.b) + " took the pair. The houses bind.";
      ws.last = line;
      because(line);
      gold(line, true);
      egg("wedbound", line);
      try {
        if (window.kin && kin.gift) {
          kin.gift(ws.a, 0.12, "took a wedding pair");
          kin.gift(ws.b, 0.12, "took a wedding pair");
        }
      } catch (e) {}
      try {
        if (window.house && house.bump) {
          house.bump(surn(ws.a), 0.1);
          house.bump(surn(ws.b), 0.1);
        }
      } catch (e2) {}
    }
  }

  function noteMiss() {
    var ws = state();
    if (!ws.seen || ws.bound) return;
    if (shopDay() - (ws.day || 0) < 2) return;
    var line = first(ws.a) + " and " + first(ws.b) + " took their vows without a pair.";
    ws.last = line;
    because(line + " Both families heard.");
    gold(line, true);
    ws.bound = true;
    ws.missed = true;
    try {
      if (window.kin && kin.hurt) {
        kin.hurt(ws.a, 0.08, "no wedding pair");
        kin.hurt(ws.b, 0.08, "no wedding pair");
      }
    } catch (e) {}
  }

  function pickPair() {
    var live = living();
    if (live.length < 2) return null;
    var a = live[0];
    var b = live[1];
    if (surn(a.n) === surn(b.n) && live[2]) b = live[2];
    return { a: a.n, b: b.n };
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
        var ws = state();
        var keep = keepOf(st);
        if (!keep && rec.phase === "look" && st && !st._wed && shopDay() >= 1 && !ws.seen && ((idx | 0) === 2 || rec.kind === "collector")) {
          var other = null;
          try {
            var br = (window.shopLife && shopLife.browse && shopLife.browse()) || [];
            for (var i = 0; i < br.length; i++) {
              if (!br[i] || br[i] === st) continue;
              if (br[i].phase === "leave") continue;
              if (keepOf(br[i])) continue;
              other = br[i];
              break;
            }
          } catch (eB) {}
          arrive(rec, st, other);
        }
        if (ws.seen && rec.phase === "pay" && st && st._wed) noteBag(rec.want || st.want || ws.want);
        if (ws.seen && ws.day === shopDay() && rec.phase === "look" && st && !st._wed && !st._wedSaid && !keep) {
          st._wedSaid = 1;
          rec.line = rec.kind === "kid" ? "They're getting married." : first(ws.a) + " and " + first(ws.b) + " are taking vows.";
          st.line = rec.line;
        }
        if (ws.missed && rec.phase === "look" && st && !st._wedMiss && !keep) {
          st._wedMiss = 1;
          if (st.guestName === ws.a || st.guestName === ws.b || rec.name === ws.a || rec.name === ws.b) {
            rec.line = "We took the vows. You didn't have the pair.";
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
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
        var ws = state();
        if (ws.bound && !ws.missed) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.1);
          if (!w.line) w.line = first(ws.a) + " and " + first(ws.b) + " took the pair.";
        } else if (ws.missed) {
          w.sour = Math.min(1, (w.sour || 0) + 0.08);
        } else if (ws.seen && ws.day === shopDay()) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.05);
          if (!w.line) w.line = first(ws.a) + " and " + first(ws.b) + " are here for a pair.";
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
        return a && a.id === "k_wed";
      }))
        return;
      wiki.push({
        id: "k_wed",
        sec: "You and your people",
        t: "They are taking vows",
        tags: "wedding marriage betrothal alliance pair vows crusader houses bind",
        w: "<p>Crusader Kings is marriage. Alliances, betrothals, a feast that is a wedding. Fin's does not open a character sheet. Two walk-ins, one kind, a pair as the gift. Fill it and the houses bind. Miss it and both families hear. Kids say they are getting married.</p><p><b>What to do about it:</b> keep two of what they asked for. The gold line names the pair. Life writes whether the houses bound.</p>",
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

  window.wed = {
    whisper: whisper,
    line: line,
    of: state,
    seed: function (a, b) {
      var pair = pickPair() || {};
      var rec = { kind: "collector", phase: "look", line: "", name: a || pair.a || "Tomas Russo" };
      var st = { phase: "look", bought: false, guestName: rec.name };
      var other = { phase: "look", bought: false, guestName: b || pair.b || "Nora Chen", name: b || pair.b || "Nora Chen" };
      arrive(rec, st, other, true);
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
