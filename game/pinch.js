/* pinch.js — theft and justice.
   Dwarf Fortress does not delete a missing sock. Someone took it.
   A kid on a wet aisle. A lunch when you are in the tank. A named
   one gone, no sale, no bag. The family hears. They come to make it
   right, or they never bag here again. No second HUD. Odds, speech,
   the choir, a window that was not a sale. */
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
      if (window.desk && desk.think) desk.think("pinch", text);
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

  function kindOf(f) {
    if (!f) return "fish";
    try {
      var S = typeof O !== "undefined" ? O : typeof SPECIES !== "undefined" ? SPECIES : null;
      if (S && f.sp != null && S[f.sp]) {
        var nm = S[f.sp].gname || S[f.sp].name || S[f.sp].vname;
        if (nm) return String(nm).toLowerCase();
      }
    } catch (e) {}
    var sp = String((f && f.sp) || "");
    if (/gold/.test(sp)) return "goldfish";
    if (/betta/.test(sp)) return "betta";
    if (/guppy/.test(sp)) return "guppy";
    if (/tetra/.test(sp)) return "tetra";
    if (/angel/.test(sp)) return "angelfish";
    if (!sp || /^\d+$/.test(sp)) return "fish";
    return sp.toLowerCase();
  }

  function fishList() {
    try {
      if (typeof allFish === "function") return allFish() || [];
    } catch (e) {}
    return [];
  }

  function state() {
    var g = gs();
    if (g && g.pinch && typeof g.pinch === "object") return g.pinch;
    var st = { open: null, cold: [], last: "" };
    try {
      if (g) g.pinch = st;
    } catch (e) {}
    return st;
  }

  function hurtKin(n, amt, why) {
    try {
      if (window.kin && kin.hurt) kin.hurt(n, amt, why);
    } catch (e) {}
  }

  function giftKin(n, amt, why) {
    try {
      if (window.kin && kin.gift) kin.gift(n, amt, why);
    } catch (e) {}
  }

  function takeFish(prefer, allowNamed) {
    var list = fishList();
    var counts = Object.create(null);
    var i;
    for (i = 0; i < list.length; i++) {
      if (!list[i] || list[i].dead || list[i].stolen) continue;
      var k = kindOf(list[i]);
      counts[k] = (counts[k] || 0) + 1;
    }
    var pick = null;
    for (i = 0; i < list.length; i++) {
      var f = list[i];
      if (!f || f.dead || f.stolen) continue;
      var kk = kindOf(f);
      if (prefer && kk !== prefer && pick) continue;
      if (f.nick && !allowNamed) continue;
      if ((counts[kk] || 0) < 2 && pick) continue;
      pick = f;
      if (prefer && kk === prefer && !f.nick) break;
    }
    if (!pick) {
      for (i = 0; i < list.length; i++) {
        if (list[i] && !list[i].dead && !list[i].stolen) {
          pick = list[i];
          break;
        }
      }
    }
    if (!pick) return null;
    pick.stolen = 1;
    var arrays = [list];
    try {
      var g = gs();
      if (g && Array.isArray(g.fish) && g.fish !== list) arrays.push(g.fish);
    } catch (e) {}
    for (i = 0; i < arrays.length; i++) {
      var ix = arrays[i].indexOf(pick);
      if (ix >= 0) arrays[i].splice(ix, 1);
    }
    return {
      nick: pick.nick || "",
      sp: kindOf(pick),
      named: !!pick.nick,
    };
  }

  function putHome(gone, who) {
    try {
      if (!window.going || !going.homes || !gone) return;
      var hs = going.homes();
      hs.push({
        nick: gone.nick || "",
        sp: gone.sp,
        who: who,
        neighbor: false,
        care: 0.28,
        health: 0.55,
        named: !!gone.named,
        sick: false,
        stolen: true,
        day: shopDay(),
        y: year(),
        dead: false,
        fry: 0,
        told: false,
      });
    } catch (e) {}
  }

  function chance(fig, rec, st) {
    if (shopDay() < 1) return 0;
    if (state().open) return 0;
    if (!fig || fig.dead || fig.id === "mae" || fig.id === "keep") return 0;
    if (rec.kind === "neighbor" || rec.kind === "collector") return 0;
    var keep = !!(st && (st._lateMae || st._goingHold || st._lateKid));
    if (keep) return 0;
    var c = 0.03;
    var sc = sceneName();
    if (sc === "tank" || sc === "street" || sc === "map") c += 0.16;
    try {
      if (window.shopSite && shopSite.wet && shopSite.wet() > 0.36) c += 0.12;
    } catch (e) {}
    try {
      var g = gs();
      if (g && g.clog) c += 0.08;
    } catch (e2) {}
    if (fig.kind === "kid") c += 0.1;
    if ((fig.trust || 0.4) < 0.22) c += 0.1;
    return c;
  }

  function steal(fig, rec, st) {
    var gone = takeFish(fig.want || rec.want, fig.kind === "kid");
    if (!gone) return false;
    var call = gone.nick || "the " + gone.sp;
    var who = fig.n;
    var open = {
      who: who,
      kinId: fig.id,
      nick: gone.nick || "",
      sp: gone.sp,
      named: !!gone.named,
      day: shopDay(),
      y: year(),
      paid: false,
    };
    state().open = open;
    state().last = who.split(" ")[0] + " took " + call + ".";
    putHome(gone, who);
    fig.last = "took " + call;
    fig.known = true;
    hurtKin(who, 0.12, "took " + call);
    because(who + " took " + call + ". No bag. No sale.");
    gold(who.split(" ")[0] + " took " + call + ". No bag.", true);
    egg("pinch", state().last);
    rec.line = fig.kind === "kid" ? "I didn't." : "I was just looking.";
    rec.phase = "leave";
    if (st) {
      st.phase = "leave";
      st.bought = false;
      st.line = rec.line;
      st._pinch = 1;
    }
    return true;
  }

  function closeCase(why) {
    var st = state();
    if (!st.open) return;
    st.open.paid = true;
    st.open.why = why || "made right";
    st.cold.push(st.open);
    if (st.cold.length > 8) st.cold.shift();
    var who = st.open.who;
    giftKin(who, 0.1, why || "made it right");
    because(who.split(" ")[0] + " made it right. " + (st.open.nick || st.open.sp) + " is off the books.");
    gold(who.split(" ")[0] + " made it right.", true);
    st.open = null;
    st.last = why || "made right";
  }

  function goCold() {
    var st = state();
    if (!st.open) return;
    if (shopDay() - st.open.day < 3) return;
    var who = st.open.who;
    hurtKin(who, 0.08, "never made it right");
    because(who + " never brought " + (st.open.nick || "the " + st.open.sp) + " back. The street kept the story.");
    gold("The " + (st.open.nick || st.open.sp) + " is still gone.", true);
    st.cold.push(st.open);
    if (st.cold.length > 8) st.cold.shift();
    st.last = "went cold";
    st.open = null;
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
        var fig = null;
        try {
          if (window.kin && kin.of && rec.name) fig = kin.of(rec.name);
        } catch (e) {}
        var open = state().open;

        if (open && rec.phase === "look" && st && !st._pinchSaid) {
          st._pinchSaid = 1;
          var thief = fig && (fig.n === open.who || fig.id === open.kinId);
          var kinOfThief = false;
          try {
            if (fig && window.kin && kin.folk) {
              var all = kin.folk();
              for (var i = 0; i < all.length; i++) {
                if (all[i] && all[i].id === open.kinId && fig.kinOf === all[i].id) kinOfThief = true;
                if (all[i] && fig && fig.id === all[i].id && all[i].kinOf === open.kinId) kinOfThief = true;
              }
            }
          } catch (eK) {}
          var call = open.nick || "the " + open.sp;
          if (thief) {
            rec.line = "I didn't take " + call + ".";
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
          } else if (kinOfThief) {
            rec.line = "I'll make it right. A " + open.sp + ".";
            st.want = open.sp;
            rec.want = open.sp;
            st._pinchPay = 1;
          } else if (rec.kind === "collector" || rec.kind === "neighbor") {
            rec.line = call + " walked out without a bag. I'm looking.";
            if (Math.random() < 0.4) {
              rec.phase = "leave";
              st.phase = "leave";
              st.bought = false;
            }
          }
          if (rec.line) {
            st.line = rec.line;
            st.lineUntil = now() + 3.8;
          }
        }

        if (open && rec.phase === "pay" && st && st._pinchPay && fig && !st._pinchClosed) {
          st._pinchClosed = 1;
          closeCase("brought a " + open.sp);
          rec.line = rec.line || "For what " + open.who.split(" ")[0] + " took.";
          st.line = rec.line;
        }

        if (rec.phase === "leave" && st && !st.bought && !st._pinch && fig) {
          var ch = chance(fig, rec, st);
          var hh = hash32(fig.id + ":" + shopDay() + ":" + idx);
          if (ch > 0 && (hh % 1000) / 1000 < ch) {
            steal(fig, rec, st);
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
        if (state().open) {
          w.sour = Math.min(1, (w.sour || 0) + 0.16);
          if (!w.line) w.line = (state().open.nick || "One") + " walked out without a bag.";
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
    if (st.open) {
      return (
        (st.open.nick || "A " + st.open.sp) +
        " walked out with " +
        st.open.who.split(" ")[0] +
        ". No bag. Day " +
        (shopDay() - st.open.day) +
        " of it."
      );
    }
    if (st.last) return st.last;
    return whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) {
        return a && a.id === "k_pinch";
      }))
        return;
      wiki.push({
        id: "k_pinch",
        sec: "The shop floor",
        t: "Someone took it",
        tags: "theft steal pinch justice aisle kid bag missing dwarf",
        w: "<p>Dwarf Fortress does not delete a missing sock. Someone took it. A kid on a wet aisle. A lunch when you are in the tank. A named one gone, no sale, no bag. It is in their window. The family hears. They come to make it right — a pair of that kind, paid — or they never bag here again. Three days and the story goes cold, and the choir keeps it.</p><p><b>What to do about it:</b> stay on the aisle when the boards are wet. Keep a pair of what walked. Life names who took it. The gold line does not cheer you.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      seedWiki();
      if (sceneName() === "title") return;
      if (now() - lastTick > 1.1) {
        lastTick = now();
        goCold();
      }
    } catch (e) {}
  }

  window.pinch = {
    whisper: whisper,
    line: line,
    of: function () {
      return state().open;
    },
    seed: function () {
      var fig = null;
      try {
        if (window.kin && kin.folk) {
          var all = kin.folk();
          for (var i = 0; i < all.length; i++) {
            if (all[i] && !all[i].dead && all[i].id !== "mae" && all[i].id !== "keep") {
              fig = all[i];
              break;
            }
          }
        }
      } catch (e) {}
      if (!fig) return null;
      steal(fig, { kind: fig.kind || "kid", phase: "leave", line: "" }, { bought: false });
      return state().open;
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 260);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 260);
    }, 220);
})();
