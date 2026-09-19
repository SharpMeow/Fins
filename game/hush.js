/* hush.js — a secret is a hook at the till.
   Fin's already had a
   theft, a keeper who walked back in, a child who inherited a window.
   Someone knows. They use it. Bag me that one or the block hears.
   Refuse and they tell. Bag it and they have a hook on the shop.
   No second HUD. Odds, speech, the till. */
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
      if (window.desk && desk.think) desk.think("hush", text);
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
      return f && !f.dead && f.id !== "keep";
    });
  }

  function state() {
    var g = gs();
    if (g && g.hush && typeof g.hush === "object") return g.hush;
    var st = { last: "", who: "", secret: "", want: "", day: -1, seen: false, told: false, hooked: false };
    try {
      if (g) g.hush = st;
    } catch (e) {}
    return st;
  }

  function keepOf(st) {
    try {
      if (typeof keepGuest === "function") return keepGuest(st);
    } catch (e) {}
    return !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
  }

  function findSecret() {
    try {
      if (window.pinch && pinch.of) {
        var p = pinch.of();
        if (p && p.who) return { secret: first(p.who) + " took one. No bag.", want: p.sp || "goldfish" };
      }
    } catch (e) {}
    try {
      if (window.heir && heir.of) {
        var h = heir.of();
        if (h && h.dispute) return { secret: first(h.child) + " is not the only " + (h.parent || "heir") + ".", want: "goldfish" };
      }
    } catch (e2) {}
    try {
      if (window.late && late.keeper) {
        var k = late.keeper();
        if (k && k.n) return { secret: "You're not " + first(k.n) + ".", want: "goldfish" };
      }
    } catch (e3) {}
    try {
      if (window.bond && bond.of) {
        var b = bond.of();
        if (b && b.kind === "lover" && b.a) return { secret: first(b.a) + " and " + first(b.b) + " are not just kin.", want: "guppy" };
      }
    } catch (e4) {}
    return { secret: "the one that went missing", want: "goldfish" };
  }

  function start(rec, st, force) {
    var hs = state();
    if (hs.seen && !force) return false;
    if (shopDay() < 1 && !force) return false;
    var live = living();
    var who = (st && st.guestName) || rec.name || (live[1] && live[1].n) || "Vabal Chen";
    var sec = findSecret();
    rec.kind = rec.kind === "kid" ? "collector" : rec.kind || "collector";
    rec.phase = "look";
    rec.want = sec.want;
    rec.line = "Bag me that " + sec.want + " or the block hears.";
    rec.name = who;
    if (st) {
      st._hush = 1;
      st.want = sec.want;
      st.guestName = who;
      st.line = rec.line;
      st.lineUntil = now() + 7;
      st.until = Math.max(st.until || 0, now() + 9);
    }
    hs.seen = true;
    hs.day = shopDay();
    hs.who = who;
    hs.secret = sec.secret;
    hs.want = sec.want;
    hs.told = false;
    hs.hooked = false;
    var line = first(who) + " has a hook. " + sec.secret;
    hs.last = first(who) + " has a hook at the till.";
    because(line);
    gold(hs.last, true);
    egg("hushhook", hs.last);
    return true;
  }

  function tell() {
    var hs = state();
    if (!hs.seen || hs.told || hs.hooked) return;
    hs.told = true;
    var line = "The block heard. " + hs.secret;
    hs.last = line;
    because(line);
    gold(line, true);
    egg("hushtold", line);
    try {
      if (window.kin && kin.hurt) kin.hurt(hs.who, 0.04, "told a secret");
    } catch (e) {}
  }

  function hookShop() {
    var hs = state();
    if (!hs.seen || hs.hooked) return;
    hs.hooked = true;
    var line = first(hs.who) + " has a hook on this counter.";
    hs.last = line;
    because(line);
    gold(line, true);
    egg("hushpaid", line);
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
        var hs = state();
        var keep = keepOf(st);
        if (!keep && rec.phase === "look" && st && !st._hush && shopDay() >= 1 && !hs.seen && rec.kind !== "kid" && ((idx | 0) === 4 || rec.kind === "lunch")) {
          start(rec, st);
        }
        if (hs.seen && rec.phase === "pay" && st && st._hush) hookShop();
        if (hs.seen && rec.phase === "leave" && st && st._hush && !st.bought && !hs.hooked) tell();
        if (hs.told && rec.phase === "look" && st && !st._hushHeard && !keep) {
          st._hushHeard = 1;
          rec.line = rec.kind === "kid" ? "They said a secret." : hs.secret;
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
        if (hs.told) {
          w.sour = Math.min(1, (w.sour || 0) + 0.1);
          if (!w.line) w.line = "The block heard.";
        } else if (hs.hooked) {
          w.sour = Math.min(1, (w.sour || 0) + 0.05);
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
        return a && a.id === "k_hush";
      }))
        return;
      wiki.push({
        id: "k_hush",
        sec: "The shop floor",
        t: "A secret is a hook",
        tags: "secret hook blackmail hush intrigue till tell",
        w: "<p>Fin's already had a theft, a keeper who walked back in, a child who inherited a window. Someone knows. They use it. Bag me that one or the block hears. Refuse and they tell. Bag it and they have a hook on the shop.</p><p><b>What to do about it:</b> a collector who talks like that is not browsing. Fill it or the gold line names the secret. Life writes which.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      seedWiki();
      if (now() - lastTick > 1.5) lastTick = now();
    } catch (e) {}
  }

  function edge() {
    var hs = state();
    if (hs.told) return -0.08;
    if (hs.hooked) return -0.04;
    return 0;
  }

  window.hush = {
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
