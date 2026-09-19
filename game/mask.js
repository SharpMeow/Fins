/* mask.js — someone on the aisle is not who they said.
   Dwarf Fortress hides a vampire in a fortress. A name, a job, a lie
   that holds until the slab is read. Fin's previous keeper left. The
   street still uses their name. Once, they walk in. They look at the
   one they kept. They do not bag. The fish knows. A kid does not.
   Sell that fish and they walk, and the street hears it from a mouth
   that used to own the keys. No second HUD. Odds, speech, the till. */
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
      if (window.desk && desk.think) desk.think("mask", text);
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

  function keeper() {
    try {
      if (window.late && late.keeper) return late.keeper();
    } catch (e) {}
    return null;
  }

  function keptFish() {
    try {
      if (window.late && late.kept) return late.kept() || null;
    } catch (e) {}
    return null;
  }

  function soldKept() {
    try {
      var g = gs();
      if (g && g.late && g.late.soldKept) return true;
    } catch (e) {}
    return false;
  }

  function state() {
    var g = gs();
    if (g && g.mask && typeof g.mask === "object") return g.mask;
    var st = { seen: false, day: -1, last: "", knew: false };
    try {
      if (g) g.mask = st;
    } catch (e) {}
    return st;
  }

  function first(n) {
    return String(n || "Someone").split(" ")[0];
  }

  function arrive(rec, st) {
    var k = keeper();
    if (!k || !k.n) return false;
    var ms = state();
    if (ms.seen && ms.day === shopDay() && !arguments[2]) return false;
    var kept = keptFish();
    rec.name = k.n;
    rec.kind = rec.kind === "kid" ? "collector" : rec.kind || "collector";
    rec.phase = "look";
    if (soldKept()) {
      rec.line = "You bagged the one I kept.";
      rec.phase = "leave";
      if (st) {
        st.phase = "leave";
        st.bought = false;
      }
      ms.knew = true;
    } else if (kept) {
      rec.line = "I named that one. " + (kept.nick || "That fish") + ".";
      rec.phase = "look";
      if (st) {
        st.bought = false;
        st.until = Math.max(st.until || 0, now() + 8);
      }
      kept._holdStill = 1;
      kept._gaze = now();
    } else {
      rec.line = "I used to keep this counter.";
      rec.phase = "look";
      if (st) {
        st.bought = false;
        st.until = Math.max(st.until || 0, now() + 6);
      }
    }
    if (st) {
      st._mask = 1;
      st.guestName = k.n;
      st.name = k.n;
      st.kind = rec.kind;
      st.line = rec.line;
      st.lineUntil = now() + 5;
      st._goingHold = st._goingHold || 0;
    }
    ms.seen = true;
    ms.day = shopDay();
    var line = first(k.n) + " is on the aisle." + (soldKept() ? " They saw the empty water." : "");
    ms.last = line;
    because(line + " " + rec.line);
    gold(line, true);
    egg("maskkeep", line);
    if (soldKept()) {
      try {
        if (window.kin && kin.hurt) kin.hurt("Mae Costa", 0.06, first(k.n) + " came back. The fish was gone.");
      } catch (eH) {}
    }
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
        var ms = state();
        var k = keeper();

        if (
          !keep &&
          rec.phase === "look" &&
          st &&
          !st._mask &&
          shopDay() >= 1 &&
          !ms.seen &&
          k &&
          ((idx | 0) === 1 || rec.kind === "collector")
        ) {
          arrive(rec, st);
        }

        if (ms.seen && ms.day === shopDay() && rec.phase === "look" && st && !st._mask && !st._maskSaid && !keep) {
          st._maskSaid = 1;
          if (rec.kind === "kid") {
            rec.line = "That's not a customer.";
            st.line = rec.line;
          } else if (rec.kind === "neighbor" && k && k.kin) {
            rec.line = first(k.n) + " came back. Don't say you didn't see.";
            st.line = rec.line;
            st.until = Math.max(st.until || 0, now() + 5);
          } else if (rec.kind === "collector") {
            rec.line = "I know that walk. They used to keep this counter.";
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
        var ms = state();
        if (ms.seen && ms.day === shopDay()) {
          w.sour = Math.min(1, (w.sour || 0) + 0.06);
          if (!w.line) {
            var k = keeper();
            w.line = (k ? first(k.n) : "Someone") + " is on the aisle. The water knows.";
          }
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
        var ms = state();
        if (ms.seen && ms.day === shopDay() && a && a.fish) {
          var kpt = keptFish();
          if (kpt && a.fish === kpt) {
            a.fish._holdStill = 1;
            a.fish._gaze = now();
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
    var ms = state();
    if (ms.last) return ms.last;
    var k = keeper();
    if (ms.seen && k) return first(k.n) + " walked the aisle. They did not bag.";
    return whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) {
        return a && a.id === "k_mask";
      }))
        return;
      wiki.push({
        id: "k_mask",
        sec: "The chronicle",
        t: "Someone on the aisle is not who they said",
        tags: "keeper identity vampire mask nedda secret return aisle dwarf",
        w: "<p>Dwarf Fortress hides a vampire in a fortress. A name, a job, a lie that holds until the slab is read. Fin's previous keeper left. Once, they walk in. They look at the one they kept. They do not bag. The fish knows. A kid says that's not a customer. Sell that fish and they walk, and the street hears it from a mouth that used to own the keys.</p><p><b>What to do about it:</b> do not bag the one they kept. Life will name the walk. The gold line does not introduce them.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      wrapFish();
      seedWiki();
      if (sceneName() === "title") return;
      if (now() - lastTick > 1) lastTick = now();
    } catch (e) {}
  }

  window.mask = {
    whisper: whisper,
    line: line,
    of: function () {
      return state();
    },
    seed: function () {
      var rec = { kind: "collector", phase: "look", line: "", name: "" };
      var st = { phase: "look", bought: false };
      arrive(rec, st, true);
      return state();
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 220);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 220);
    }, 200);
})();
