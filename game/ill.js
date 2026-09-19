/* ill.js — the bag carries the water.
   Dwarf Fortress's syndrome, for the aisle. A named sickness. A vector.
   You sold a slightly off tetra. Mae's window went white. Her child came
   in flashing. The fry she brought back put it in your glass. Salt, the
   leaf, carbon, the vial: each one hates a different name. No second HUD.
   Odds, speech, the choir, a family that notices. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var lastDay = -1;
  var didBrowse = false;
  var didChoir = false;
  var didStock = false;
  var namedOnce = false;

  var KINDS = [
    { id: "spot", n: "white-spot", looks: "went white", treat: { salt: 1, almond: 1 }, spread: 0.38 },
    { id: "gold", n: "gold-dust", looks: "dusted gold", treat: { salt: 1, carbon: 1 }, spread: 0.3 },
    { id: "rot", n: "fin-rot", looks: "the fins went", treat: { almond: 1, starter: 1 }, spread: 0.24 },
    { id: "still", n: "the still", looks: "holding too still", treat: { starter: 1, cond: 1 }, spread: 0.2 },
    { id: "itch", n: "salt-itch", looks: "flashing on the glass", treat: { carbon: 1, almond: 1 }, spread: 0.42 },
  ];

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

  function clamp01(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.desk && desk.think) desk.think("ill", text);
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

  function runSeed() {
    try {
      if (typeof runState === "function") {
        var r = runState();
        if (r && r.seed) return r.seed;
      }
    } catch (e) {}
    return 1;
  }

  function fishList() {
    try {
      if (typeof allFish === "function") return allFish() || [];
    } catch (e) {}
    return [];
  }

  function kindOf(id) {
    for (var i = 0; i < KINDS.length; i++) if (KINDS[i].id === id) return KINDS[i];
    return KINDS[0];
  }

  function pickKind() {
    var hh = hash32("ill:" + runSeed() + ":" + year());
    try {
      if (window.beast && beast.near && beast.near() > 0.45) {
        return {
          id: "beast",
          n: (window.tongue && tongue.word ? tongue.word(9, 2) : "harbor") + " rot",
          looks: "went strange",
          treat: { starter: 1, salt: 1 },
          spread: 0.5,
        };
      }
    } catch (e) {}
    return KINDS[hh % KINDS.length];
  }

  function state() {
    var g = gs();
    if (g && g.ill && typeof g.ill === "object") return g.ill;
    var st = { id: "", name: "", tank: 0, last: "", homes: 0, treated: 0 };
    try {
      if (g) g.ill = st;
    } catch (e) {}
    return st;
  }

  function syn() {
    var st = state();
    if (st.id) {
      var k = kindOf(st.id);
      if (st.id === "beast") {
        return {
          id: "beast",
          n: st.name || "harbor rot",
          looks: "went strange",
          treat: { starter: 1, salt: 1 },
          spread: 0.5,
        };
      }
      return k;
    }
    return null;
  }

  function nameOutbreak(why) {
    var st = state();
    if (st.name) return syn();
    var k = pickKind();
    st.id = k.id;
    st.name = k.n;
    st.last = k.n + (why ? " — " + why : " in the water.");
    because(st.name + " has a name now. " + (why || "The glass caught it."));
    egg("illname", st.name);
    if (!namedOnce) {
      namedOnce = true;
      gold("There's " + st.name + " in the water.", true);
    }
    return k;
  }

  function infectTank(amt, why) {
    var st = state();
    var k = nameOutbreak(why);
    st.tank = clamp01((st.tank || 0) + amt);
    var list = fishList();
    var n = 0;
    for (var i = 0; i < list.length && n < 3; i++) {
      var f = list[i];
      if (!f || f.dead) continue;
      if ((f.sick || 0) > 0.4) continue;
      if (Math.random() < st.tank * 0.55 + 0.2) {
        f.sick = Math.max(f.sick || 0, 0.28 + st.tank * 0.4);
        f.ill = st.name || true;
        n++;
      }
    }
    if (n) st.last = n + " in the glass caught " + (st.name || "it") + ".";
    return k;
  }

  function clearFish() {
    var list = fishList();
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (!f) continue;
      f.sick = Math.max(0, (f.sick || 0) * 0.15);
      if (f.sick < 0.08) {
        f.sick = 0;
        f.ill = 0;
      }
    }
  }

  function watchTank() {
    var list = fishList();
    var sick = 0;
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      if (!list[i] || list[i].dead) continue;
      n++;
      if (list[i].sick || list[i].ill) sick++;
    }
    if (!n) return;
    var st = state();
    if (sick && !st.name) nameOutbreak("it was already in the glass");
    if (sick) st.tank = clamp01(Math.max(st.tank || 0, sick / n));
    else st.tank = clamp01((st.tank || 0) * 0.96);
    try {
      if (window.fever && fever.heat && fever.heat() > 0.62 && !st.name) {
        infectTank(0.22, "the street fever walked in");
      }
    } catch (e) {}
  }

  function homes() {
    try {
      if (window.going && going.homes) return going.homes() || [];
    } catch (e) {}
    return [];
  }

  function watchHomes() {
    var hs = homes();
    var st = state();
    var k = syn();
    var hit = 0;
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      if (!h || h.dead) continue;
      if (h.sick && !h._ill) {
        if (!k) k = nameOutbreak("a bag went out carrying it");
        h._ill = k.id;
        h.syn = k.n;
        st.homes = (st.homes || 0) + 1;
        var call = h.nick || "The " + h.sp;
        var line = call + " went home with " + k.n + ". " + h.who + "'s window.";
        st.last = line;
        because(line);
        gold(h.who.split(" ")[0] + "'s window has " + k.n + ".", true);
        egg("illbag", line);
        hurtWho(h.who, 0.08, "sold a sick one");
      }
      if (h._ill) hit++;
      if (h.fry === 2 && h._ill && !h._illFry) {
        h._illFry = 1;
        infectTank(0.4, "the fry came back with it");
        gold("The fry came back with " + (st.name || "it") + ".", true);
        because("The fry from " + h.who + " put " + (st.name || "it") + " back in the glass.");
      }
    }
    if (!hit && st.tank < 0.08) {
      /* outbreak can fade once the block and the glass are clean */
      if (st.treated && st.tank < 0.04) {
        st.name = "";
        st.id = "";
      }
    }
  }

  function spreadDay() {
    var d = shopDay();
    if (d === lastDay) return;
    lastDay = d;
    var k = syn();
    if (!k) return;
    var hs = homes();
    var carriers = [];
    var clean = [];
    for (var i = 0; i < hs.length; i++) {
      if (!hs[i] || hs[i].dead) continue;
      if (hs[i]._ill || hs[i].sick) carriers.push(hs[i]);
      else clean.push(hs[i]);
    }
    if (!carriers.length || !clean.length) return;
    var hh = hash32("spread:" + runSeed() + ":" + d);
    if ((hh % 100) / 100 > k.spread) return;
    var src = carriers[hh % carriers.length];
    var dst = null;
    for (var j = 0; j < clean.length; j++) {
      if (clean[j].who === src.who) {
        dst = clean[j];
        break;
      }
    }
    if (!dst) dst = clean[(hh >>> 8) % clean.length];
    dst.sick = true;
    dst._ill = k.id;
    dst.syn = k.n;
    dst.health = Math.min(dst.health || 0.5, 0.34);
    state().homes = (state().homes || 0) + 1;
    var line = k.n + " walked from " + src.who.split(" ")[0] + " to " + dst.who.split(" ")[0] + ".";
    because(line);
    gold(line, true);
    hurtWho(dst.who, 0.05, k.n);
  }

  function hurtWho(who, amt, why) {
    try {
      if (window.kin && kin.of) {
        var fig = kin.of(who);
        if (fig && !fig.dead) {
          fig.trust = Math.max(0.04, (fig.trust || 0.4) - amt);
          fig.last = why || "sold a sick one";
        }
      }
    } catch (e) {}
    try {
      if (window.desk && desk.neighbor) {
        var n = desk.neighbor();
        if (n && who && (n.name === who || /mae|baker/i.test(who))) {
          n.trust = Math.max(0.08, (n.trust || 0.4) - amt);
          n.last = why || n.last;
        }
      }
    } catch (e2) {}
  }

  function treat(id) {
    var k = syn();
    var st = state();
    if (!k && !st.tank) return false;
    var helped = !k || !!(k.treat && k.treat[id]);
    if (!helped && id !== "salt" && id !== "starter") return false;
    var drop = helped ? 0.55 : 0.18;
    st.tank = clamp01((st.tank || 0) - drop);
    st.treated = (st.treated || 0) + 1;
    clearFish();
    var hs = homes();
    for (var i = 0; i < hs.length; i++) {
      if (!hs[i] || !hs[i]._ill) continue;
      if (helped) {
        hs[i].sick = false;
        hs[i].health = Math.min(1, (hs[i].health || 0.4) + 0.22);
        if (id === "salt" || id === "starter") {
          hs[i]._ill = 0;
          hs[i].syn = "";
        }
      }
    }
    var line = helped
      ? (st.name || "The water") + " hates the " + id + ". The column is easier."
      : "It took some of it. Not the name.";
    st.last = line;
    because(line);
    if (helped) gold(line, true);
    if (st.tank < 0.06) {
      st.tank = 0;
      if (st.name) because(st.name + " broke. The glass is holding.");
      st.name = "";
      st.id = "";
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
        var keep = !!(st && (st._lateMae || st._goingHold || st._lateKid));
        var k = syn();
        if (!k && !(state().tank > 0.2)) return rec;
        var who = (rec && rec.name) || (st && st.guestName) || "";
        var hs = homes();
        var theirs = null;
        for (var i = 0; i < hs.length; i++) {
          if (hs[i] && !hs[i].dead && hs[i]._ill && (hs[i].who === who || (rec.kind === "neighbor" && hs[i].neighbor))) {
            theirs = hs[i];
            break;
          }
        }
        if (rec.phase === "look" && st && !st._illSaid && !keep) {
          st._illSaid = 1;
          var line = "";
          if (theirs) {
            line =
              (theirs.nick || "The last one") +
              " " +
              (k ? k.looks : "went off") +
              ". I came for the line, not the spots.";
            because(who + " came because of " + (k ? k.n : "the spots") + ".");
            gold(line, true);
            if (Math.random() < 0.55) {
              rec.phase = "leave";
              st.phase = "leave";
              st.bought = false;
              hurtWho(who, 0.05, "walked. sick bag");
            }
          } else if (state().tank > 0.34 && rec.kind === "collector") {
            line = "That's " + (k ? k.n : "off") + " in the glass. I'm not bagging it.";
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
          } else if (state().tank > 0.5 && rec.kind !== "kid") {
            line = "I'll look from the door. Something's going around.";
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
          }
          if (line) {
            rec.line = line;
            st.line = line;
            st.lineUntil = now() + 3.8;
          }
        }
        if (rec.phase === "pay" && st && !st._illPay && state().tank > 0.42 && rec.kind !== "neighbor") {
          st._illPay = 1;
          rec.phase = "leave";
          st.phase = "leave";
          st.bought = false;
          rec.line = "Not from a tank that's off.";
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
        var st = state();
        if (st.tank > 0.12 || st.homes) {
          w.sour = Math.min(1, (w.sour || 0) + Math.min(0.28, (st.tank || 0) * 0.4 + (st.homes || 0) * 0.04));
          if (!w.line && st.name) w.line = st.name + " is in the water.";
        }
      } catch (e) {}
      return w;
    };
  }

  function wrapStock() {
    if (didStock || !window.stock || !stock.use) return;
    didStock = true;
    var orig = stock.use;
    stock.use = function (id) {
      var r = orig.apply(this, arguments);
      try {
        if (id === "salt" || id === "almond" || id === "carbon" || id === "starter" || id === "cond") {
          treat(id);
        }
      } catch (e) {}
      return r;
    };
  }

  function whisper() {
    if (lastGold && now() - lastGoldAt < 12) return lastGold;
    return "";
  }

  function line() {
    var st = state();
    if (st.name && (st.tank > 0.08 || st.homes)) {
      return (
        st.name +
        (st.tank > 0.08 ? " in the glass" : "") +
        (st.homes ? (st.tank > 0.08 ? ", " : " ") + st.homes + " window" + (st.homes === 1 ? "" : "s") + " on the block" : "") +
        "."
      );
    }
    return st.last || "";
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) { return a && a.id === "k_ill"; })) return;
      wiki.push({
        id: "k_ill",
        sec: "The shop floor",
        t: "The bag carries the water",
        tags: "ill sick syndrome white-spot bag window fry salt vector dwarf",
        w: "<p>A bag is a vector. Dwarf Fortress lets dust walk a fortress. Fin's lets a named sickness walk a block. You sold a slightly off tetra. Mae's window went white. Her child came in flashing. The fry she brought back put it in your glass. White-spot, gold-dust, fin-rot, the still, salt-itch — each one hates a different bottle.</p><p><b>What to do about it:</b> do not bag a sick one. Salt, the leaf, carbon, the vial. Life will name the window. The choir sours until the name breaks.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      wrapStock();
      seedWiki();
      if (sceneName() === "title") return;
      if (now() - lastTick > 0.9) {
        lastTick = now();
        watchTank();
        watchHomes();
        spreadDay();
      }
      if (now() - lastUi > 1.2) lastUi = now();
    } catch (e) {}
  }

  window.ill = {
    whisper: whisper,
    line: line,
    of: function () {
      return state();
    },
    treat: treat,
    seed: function () {
      infectTank(0.55, "it was already in the glass");
      return state();
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 280);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 280);
    }, 220);
})();
