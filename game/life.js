/* life.js — depth on systems that already exist: shop crowd, town jobs,
   walk-ins, fish temperament, and act fallout. Simulation stays in fins.js. */
(function () {
  "use strict";

  var browse = Object.create(null);
  var lastWalkins = -1;
  var lastBought = -1;
  var lastStirAt = 0;
  var lastToastAt = 0;
  var lastWhoBuy = -1;
  var repeats = Object.create(null);
  var regulars = [];
  var placeBusy = Object.create(null);
  var crowd = [];
  var boughtAt = Object.create(null);
  var reduced = false;
  try {
    reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) {}

  var LOOK = ["Pretty.", "How much?", "That one.", "Look at the tail.", "Is it healthy?", "For the window.", "The gold one.", "Does it stay small?"];
  var NICE = ["Nice shop.", "I'll take one.", "My kid would love that.", "You've done this up.", "Wrap that one.", "This is the one."];
  var CLOG = ["The water's off.", "Smells like the filter.", "I'd wait.", "Maybe after you clean it."];
  var WET = ["The floor's wet.", "I'm not standing in that.", "You ought to mop.", "I'll come back dry."];
  var PANIC = ["What was that?", "I'm leaving.", "Did you hear that?", "Out. Now."];
  var POOR = ["Just looking.", "Not today.", "Maybe later.", "After payday."];
  var WORK = ["On my lunch.", "After the boats.", "Between jobs.", "Quick look."];
  var PAY = ["I'll take it.", "Keep the change.", "And a bag?", "For the front tank."];
  var CHEER = ["You're good people.", "Come by the market.", "That was kind."];
  var DANCE = ["Alright!", "This place.", "Ha!"];
  var SICK = ["That one looks off.", "Is it sick?", "I'd skip that tank."];
  var KID = ["Can we get one?", "The little one!", "Look, look."];
  var LEAVE = ["Thanks.", "See you.", "I'll be back."];
  var YEAR = ["Thousand years of this harbor.", "Year of the shop.", "Same street as always.", "Harbor's older than the sign."];
  var HOPED = ["betta", "guppy", "tetra", "goldfish", "angelfish", "cory"];
  var ASK_HAVE = ["That $.", "The $.", "I'll take the $.", "How much for the $?"];
  var ASK_MISS = ["Got a $?", "You don't keep $?", "I wanted a $.", "Maybe a $."];
  var misses = [];
  var dayBook = { y: 1000, sales: 0, misses: 0, opened: 0, closed: 0, lastHour: -1, lastLock: -1, dayN: -1 };

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function markEgg(id, line) {
    try {
      if (typeof findEgg === "function") findEgg(id, line);
    } catch (e) {}
  }

  function bumpStat(k, n) {
    try {
      var g = gs();
      if (g) {
        g.stats = g.stats || {};
        g.stats[k] = (g.stats[k] || 0) + (n == null ? 1 : n);
      }
    } catch (e) {}
  }

  function watchEggs() {
    try {
      if (worldYear() > 1000) markEgg("yearturn", "The harbor went past the thousand.");
    } catch (e) {}
    try {
      var wx = "";
      if (typeof wxWord === "function") wx = String(wxWord() || "").toLowerCase();
      else if (window.wxState) wx = String((wxState.word || wxState.key || "")).toLowerCase();
      var sc = "";
      try {
        if (typeof sceneNow === "function") sc = sceneNow() || "";
        if (!sc && typeof gameState === "object" && gameState && gameState.scene) sc = String(gameState.scene);
        if (!sc) {
          var on = document.querySelector("#scenes .sc.on");
          if (on && on.dataset.scene) sc = on.dataset.scene;
        }
      } catch (e2) {}
      if ((/rain|storm|snow|sleet/.test(wx) || (window.wxState && (wxState.rain > 0.2 || wxState.snow > 0.2))) && (sc === "shop" || sc === "front")) {
        markEgg("glasswx", "Weather on the glass. The street looked in.");
      }
    } catch (e3) {}
  }

  function pick(arr, seed) {
    if (!arr || !arr.length) return "";
    return arr[(seed >>> 0) % arr.length];
  }

  function gs() {
    try {
      if (typeof gameState === "function") return gameState();
      if (typeof gameState === "object" && gameState && gameState.stats) return gameState;
    } catch (e) {}
    return null;
  }

  function fishAll() {
    try {
      if (typeof allFish === "function") return allFish() || [];
    } catch (e) {}
    try {
      var g = gs();
      if (g && Array.isArray(g.fish)) return g.fish;
    } catch (e2) {}
    return [];
  }

  function worldYear() {
    try {
      if (window.saga && typeof saga.year === "function") return saga.year();
      if (typeof atlGen === "function") {
        var a = atlGen();
        if (a && a.now) return a.now | 0;
      }
    } catch (e) {}
    return 1000;
  }

  function kindName(f) {
    try {
      if (typeof O !== "undefined" && f && O[f.sp]) return String(O[f.sp].name || O[f.sp].gname || "").toLowerCase();
    } catch (e) {}
    try {
      if (typeof SPECIES !== "undefined" && f && SPECIES[f.sp]) return String(SPECIES[f.sp].name || SPECIES[f.sp].gname || "").toLowerCase();
    } catch (e2) {}
    return "";
  }

  function sellable(f) {
    if (!f) return false;
    if (f.stage != null && f.stage !== 2) return false;
    if (f.sick || f.ill) return false;
    if (f.risen) return false;
    try {
      if (f.mind && f.mind.mood) return false;
      if (f.mind && f.mind.stress > 0.72) return false;
    } catch (e) {}
    return true;
  }

  function stockDupes() {
    var counts = Object.create(null);
    try {
      var list = typeof allFish === "function" ? allFish() || [] : [];
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        if (!sellable(f)) continue;
        var k = kindName(f);
        if (!k) continue;
        counts[k] = (counts[k] || 0) + 1;
      }
    } catch (e) {}
    var have = [];
    for (var k in counts) if (counts[k] >= 2) have.push(k);
    return have;
  }

  function wantFor(idx, st) {
    if (st.want) return st.want;
    var have = stockDupes();
    var T = town();
    var seed = ((T && T.who && T.who[idx]) || idx) >>> 0;
    if (have.length) {
      st.want = have[seed % have.length];
      st.haveWant = true;
    } else {
      st.want = HOPED[seed % HOPED.length];
      st.haveWant = false;
    }
    return st.want;
  }

  function recordMiss(idx, st, why) {
    var nm = whoName(idx) || "Someone";
    var want = (st && st.want) || "fish";
    misses.push({ name: nm, want: want, why: why || "left", y: worldYear() });
    if (misses.length > 16) misses.shift();
    dayBook.misses += 1;
    try {
      bumpStat("walked", 1);
      if (why === "stock") markEgg("tillwalk", (nm || "Someone") + " came for a " + want + " we did not have.");
    } catch (eStat) {}
    if (Math.random() > 0.4) return;
    try {
      var line =
        nm +
        " came for a " +
        want +
        ". " +
        (why === "clog" ? "The water put them off." : why === "stock" ? "We didn't have one." : "They left without a bag.");
      if (window.saga && typeof chronicle === "function") chronicle("town", "Year " + worldYear() + ". " + line, []);
      else if (typeof chronicle === "function") chronicle("town", "Year " + worldYear() + ". " + line, []);
    } catch (e) {}
  }

  function watchDay() {
    var h = hour();
    var d = 0;
    try {
      if (typeof _ === "function") d = _() | 0;
    } catch (e) {}
    if (d !== dayBook.dayN) {
      dayBook.dayN = d;
      dayBook.sales = 0;
      dayBook.misses = 0;
      dayBook.y = worldYear();
    }
    if (dayBook.lastHour >= 0) {
      if (dayBook.lastHour < 8 && h >= 8 && h < 10) {
        dayBook.opened += 1;
        sayKeep("Sign's over.", 2.4, 10);
      }
      if (dayBook.lastHour < 19.35 && h >= 19.4) {
        if (now() - (dayBook.lastLock || 0) > 50) {
          dayBook.lastLock = now();
          dayBook.closed += 1;
          var line =
            "Locked up. " +
            dayBook.sales +
            " sale" +
            (dayBook.sales === 1 ? "" : "s") +
            (dayBook.misses ? ", " + dayBook.misses + " walked." : ".");
          sayKeep("That's us.", 2.8, 12);
          markEgg("lockup", line);
          try {
            if (typeof k === "function") k(line, "prog");
          } catch (e2) {}
          try {
            if (typeof chronicle === "function") chronicle("note", "Year " + worldYear() + ". " + line, []);
          } catch (e3) {}
        }
      }
    }
    dayBook.lastHour = h;
  }

  function hour() {
    try {
      if (typeof jt === "function") return jt() * 24;
      var g = gs();
      if (g && isFinite(g.t)) return (((g.t % 2400) + 2400) % 2400) / 100;
    } catch (e) {}
    return 12;
  }

  function isLunch() {
    var h = hour();
    return h > 11.4 && h < 13.8;
  }

  function isOpen() {
    var h = hour();
    return h >= 8 && h < 19.5;
  }

  function town() {
    try {
      if (typeof townSim === "function") return townSim();
      if (typeof townSim === "object" && townSim && townSim.who) return townSim;
    } catch (e) {}
    return null;
  }

  function jobsOf() {
    try {
      if (typeof JOBS === "function") return JOBS();
      if (Array.isArray(JOBS)) return JOBS;
    } catch (e) {}
    return null;
  }

  function whoName(i) {
    try {
      var T = town();
      if (!T || !T.who || i < 0 || i >= (T.n || 0)) return "";
      return nameOfWho(T.who[i]);
    } catch (e) {}
    return "";
  }

  function nameOfWho(who) {
    try {
      if (typeof sgPerson === "function") {
        var p = sgPerson(who);
        if (p && p.name && p.name !== "A customer") return p.name;
      }
    } catch (e) {}
    try {
      if (typeof personName === "function") {
        var n = personName(who);
        if (n && n !== "A customer") return n;
      }
    } catch (e2) {}
    return "";
  }

  function jobId(i) {
    try {
      var T = town();
      var jobs = jobsOf();
      if (!T || !T.job || !jobs) return "";
      var j = jobs[T.job[i]];
      return (j && (j.id || j.n)) || "";
    } catch (e) {}
    return "";
  }

  function payOdds(idx, st) {
    var p = 0.16;
    try {
      var T = town();
      if (T && T.mood) {
        if (T.mood[idx] > 0.55) p += 0.12;
        if (T.mood[idx] < 0.34) p -= 0.1;
      }
    } catch (e) {}
    try {
      if (typeof townState === "function") p += (townState().word || 0) * 0.05;
    } catch (e2) {}
    try {
      if (window.weave && weave.of) {
        var w = weave.of();
        p += (w.craft || 0) * 0.18;
        var rum = w.rumors || [];
        for (var r = 0; r < rum.length; r++) if (rum[r].k === "risen" && rum[r].heat > 0.7) p -= 0.18;
        if (/war|embargo|plague/i.test(w.lastAtlas || "")) p -= 0.08;
      }
    } catch (e3) {}
    try {
      if (window.hookRun) p += Math.min(0.12, (hookRun().combo || 0) * 0.03);
    } catch (e4) {}
    try {
      if (window.realm && typeof realm.pressure === "function") p -= realm.pressure();
    } catch (e5) {}
    try {
      if (window.wild && st && st.want && typeof wild.scarce === "function" && wild.scarce(st.want)) p -= 0.12;
    } catch (e6) {}
    try {
      if (window.road && typeof road.cut === "function" && road.cut()) p -= 0.08;
    } catch (e7) {}
    try {
      if (window.beast && typeof beast.near === "function") p -= beast.near();
    } catch (e8) {}
    try {
      if (window.faith && typeof faith.bless === "function") p += faith.bless();
    } catch (e9) {}
    try {
      if (window.rumor && typeof rumor.heat === "function") p -= Math.min(0.05, rumor.heat() * 0.06);
    } catch (e10) {}
    if (clogged()) p -= 0.16;
    if (aisleWet() && !(st && st.coming)) return 0;
    if (st && st.coming) p = Math.max(p, 0.85);
    if (p < 0.03) p = 0.03;
    if (p > 0.7) p = 0.7;
    return p;
  }

  function aisleWet() {
    try {
      if (window.shopSite && shopSite.wet() > 0.36) return true;
    } catch (e) {}
    return false;
  }

  function clogged() {
    try {
      return !!window.clogged;
    } catch (e) {}
    return false;
  }

  function anySick() {
    try {
      return fishAll().some(function (f) { return f && (f.sick || f.cond); });
    } catch (e) {}
    return false;
  }

  function panicking() {
    try {
      if (window.__gunFlash > 0.08 || window.__gunSiren) return true;
      if (window.__shopMood && window.__shopMood.kind === "flee" && now() < window.__shopMood.until) return true;
      var g = gs();
      return !!(window.__shopPanic && g && (g.t || 0) < window.__shopPanic);
    } catch (e) {}
    return false;
  }

  function shopMood() {
    var m = window.__shopMood;
    if (m && now() < m.until) return m.kind;
    return "";
  }

  function didBuy(i) {
    if (boughtAt[i]) return true;
    try {
      var T = town();
      if (T && T.didBuy && T.didBuy[i]) return true;
    } catch (e) {}
    return false;
  }

  function lineFor(i, phase, st) {
    var T = town();
    var seed = ((T && T.who && T.who[i]) || i) >>> 0;
    var mood = T && T.mood ? T.mood[i] : 0.5;
    var kit = "";
    try {
      kit = (T && T.who && ((T.who[i] >>> 0) % 11 === 0)) ? "kid" : "";
    } catch (e) {}
    if (panicking() || phase === "flee") return pick(PANIC, seed + 3);
    var sm = shopMood();
    if (sm === "cheer") return pick(CHEER, seed);
    if (sm === "dance") return pick(DANCE, seed + 2);
    if (aisleWet()) return pick(WET, seed + 7);
    if (clogged()) return pick(CLOG, seed + 5);
    if (anySick() && (phase === "look" || phase === "walk") && seed % 3 === 0) return pick(SICK, seed);
    var want = (st && st.want) || (browse[i] && browse[i].want) || "";
    if (phase === "pay" || phase === "buy") {
      if (want) return pick(ASK_HAVE, seed + 9).replace("$", want);
      return pick(PAY, seed + 9);
    }
    if (phase === "leave") return pick(LEAVE, seed + 4);
    if (kit === "kid") return pick(KID, seed);
    if (phase === "look") {
      if (want) {
        var tpl = (st && st.haveWant) || (browse[i] && browse[i].haveWant) ? ASK_HAVE : ASK_MISS;
        return pick(tpl, seed + 2).replace("$", want);
      }
      if (mood < 0.34) return pick(POOR, seed);
      if (seed % 8 === 0) return pick(YEAR, seed + 11);
      if (/fisher|hand|netter|ship|cooper|diver/.test(jobId(i))) return pick(WORK, seed);
      return pick(LOOK, seed + 1);
    }
    if (mood < 0.36) return pick(POOR, seed);
    return pick(NICE, seed);
  }

  function flavorLine(line, seed) {
    line = String(line || "");
    try {
      if (panicking()) return line;
      if (window.beast && beast.near && beast.near() > 0.12 && seed % 4 === 0) {
        var bl = beast.line && beast.line();
        if (bl) return bl;
      }
      if (window.faith && faith.line && seed % 6 === 0) {
        var fl = faith.line();
        if (fl) return fl;
      }
      if (window.rumor && rumor.whisper && seed % 8 === 0) {
        var rl = rumor.whisper();
        if (rl) return rl;
      }
      if (window.tongue && tongue.say) return tongue.say(seed, line);
    } catch (e) {}
    return line;
  }

  var _lineForRaw = lineFor;
  lineFor = function (i, phase, st) {
    var T = town();
    var seed = ((T && T.who && T.who[i]) || i) >>> 0;
    return flavorLine(_lineForRaw(i, phase, st), seed);
  };

  function tankSpot(tanks, which, W, floorY, personS, slot) {
    if (!tanks || !tanks.length) {
      return { x: W * (0.34 + (slot % 3) * 0.05), y: floorY + personS * 0.012, face: 1 };
    }
    var tk = tanks[which % tanks.length];
    // Stand in the aisle looking at the glass — never planted on the tank itself.
    var x = Math.max(W * 0.28, Math.min(W * 0.50, (tk[0] || W * 0.62) - W * 0.18 - (slot % 3) * W * 0.025));
    var y = floorY + personS * (0.01 + (slot % 2) * 0.008);
    var face = tk[0] + tk[2] * 0.5 > x ? 1 : -1;
    return { x: x, y: y, face: face };
  }

  function doorSpot(W, floorY, personS, slot) {
    return {
      x: W * (0.11 + (slot % 3) * 0.018),
      y: floorY + personS * 0.012,
      face: -1,
    };
  }

  function registerSpot(W, floorY, personS, slot) {
    return {
      x: W * (0.22 + (slot % 3) * 0.028),
      y: floorY + personS * (0.01 + (slot % 2) * 0.008),
      face: -1,
    };
  }

  function aisleSpot(W, floorY, personS, slot, simT, idx) {
    var x = W * (0.32 + (slot % 4) * 0.06 + 0.01 * Math.sin((simT || 0) * 0.28 + idx));
    try {
      if (window.shopSite && shopSite.wet() > 0.22) {
        var pud = shopSite.puddle();
        var px = (pud && pud.nx ? pud.nx : 0.48) * W;
        if (Math.abs(x - px) < W * 0.1) x = px < W * 0.5 ? px + W * 0.12 : px - W * 0.12;
      }
    } catch (e) {}
    return {
      x: x,
      y: floorY + personS * 0.012 + personS * 0.004 * (slot % 2),
      face: 1,
    };
  }

  /* A person already in the shop: door → aisle → tank → register → leave. */
  window.shopBrowse = function (idx, slot, W, floorY, personS, simT) {
    var tanks = window.__shopTanks || [];
    if (tanks.length < 3 && W) {
      var spots = [
        [0.62, 0.3],
        [0.76, 0.29],
        [0.84, 0.42],
        [0.68, 0.46],
        [0.8, 0.56],
      ];
      tanks = spots.map(function (sp, i) {
        var live = (window.__shopTanks || [])[i];
        if (live) return live;
        return [W * sp[0], 0, W * 0.11, personS * 0.4];
      });
    }
    var t = now();
    if (slot === 0) crowd = [];
    var st = browse[idx];
    var pair = slot > 0 && slot % 2 === 1 ? browse[idx - 1] : null;
    if (!st) {
      st = browse[idx] = {
        tank: (idx + slot) % Math.max(1, tanks.length || 1),
        until: t + 0.7 + (idx % 4) * 0.25,
        phase: "enter",
        line: "",
        lineUntil: 0,
        bought: !!didBuy(idx),
      };
      wantFor(idx, st);
    }
    if (didBuy(idx)) st.bought = true;
    if (tanks.length) st.tank = st.tank % tanks.length;

    var sm = shopMood();
    if (panicking() || sm === "flee") {
      st.phase = "flee";
      if (!st.line || t > st.lineUntil) {
        st.line = lineFor(idx, "flee");
        st.lineUntil = t + 2.2;
      }
    } else if (sm === "cheer" && st.phase !== "leave") {
      st.phase = "cheer";
      st.until = Math.max(st.until, t + 1.6);
    } else if (sm === "dance" && st.phase !== "leave" && st.phase !== "pay") {
      st.phase = "dance";
      st.until = Math.max(st.until, t + 1.2);
    } else if (t > st.until) {
      var prevPhase = st.phase;
      var next = st.phase;
      if (st.phase === "enter") next = "walk";
      else if (st.phase === "walk") next = "look";
      else if (st.phase === "look") {
        if (aisleWet() && !st.coming) next = "leave";
        else if (st.bought || Math.random() < payOdds(idx, st)) next = "pay";
        else if (Math.random() < (clogged() ? 0.5 : 0.22)) next = "leave";
        else next = slot % 2 ? "walk" : "look";
      } else if (st.phase === "pay") next = "leave";
      else if (st.phase === "cheer" || st.phase === "dance") next = "look";
      else if (st.phase === "leave") next = "leave";
      st.phase = next;
      st.tank = (st.tank + 1 + (idx % 2)) % Math.max(1, tanks.length || 1);
      if (prevPhase === "look" && next === "leave" && !st.bought) {
        recordMiss(idx, st, aisleWet() ? "wet" : clogged() ? "clog" : st.haveWant ? "pass" : "stock");
      }
      var dwell =
        next === "look"
          ? 3.4 + Math.random() * 4.2 + (isLunch() ? 1.4 : 0)
          : next === "pay"
            ? 2.2 + Math.random() * 1.6
            : next === "leave"
              ? 2.8
              : 1.3 + Math.random() * 1.6;
      if (clogged() && next === "look") dwell *= 0.55;
      st.until = t + dwell;
      if ((next === "look" || next === "pay" || next === "flee" || next === "cheer") && Math.random() < 0.78) {
        st.line = lineFor(idx, next, st);
        st.lineUntil = t + (next === "look" ? 3.1 : 2.2);
        try {
          if (window.feel && feel.play && Math.random() < 0.4) feel.play("murmur");
        } catch (e) {}
      } else if (next !== "look" && next !== "pay") {
        st.line = "";
      }
    }

    var pos;
    if (st.phase === "enter" || st.phase === "flee" || st.phase === "leave") pos = doorSpot(W, floorY, personS, slot);
    else if (st.phase === "pay" || st.phase === "cheer") pos = registerSpot(W, floorY, personS, slot);
    else if (st.phase === "look" || st.phase === "dance") {
      if (pair && pair.tank != null) st.tank = pair.tank;
      pos = tankSpot(tanks, st.tank, W, floorY, personS, slot);
    } else pos = aisleSpot(W, floorY, personS, slot, simT, idx);

    if (st.phase === "dance") {
      pos.x += Math.sin(t * 6 + idx) * personS * 0.04;
      pos.y += Math.abs(Math.sin(t * 8 + idx)) * personS * 0.012;
    }

    var face = pos.face;
    if (st.phase === "look" && tanks.length) {
      var tk = tanks[st.tank % tanks.length];
      face = tk[0] > pos.x ? 1 : -1;
    }
    if (st.phase === "pay" || st.phase === "cheer") face = -1;
    if (st.phase === "flee" || st.phase === "leave") face = -1;
    if (st.phase === "enter") face = 1;

    var rec = {
      x: pos.x,
      y: pos.y,
      face: face,
      line: t < st.lineUntil ? st.line : "",
      name: st.guestName || whoName(idx) || "",
      job: jobId(idx),
      looking: st.phase === "look" || st.phase === "pay" || st.phase === "cheer",
      flee: st.phase === "flee",
      pay: st.phase === "pay",
      pace: st.phase === "flee" ? 0.92 : st.phase === "enter" || st.phase === "leave" ? 0.5 : st.phase === "look" || st.phase === "pay" ? 0.3 : 0.4,
      phase: st.phase,
      idx: idx,
      slot: slot,
      want: st.want || "",
    };
    crowd[slot] = rec;
    crowd.length = Math.max(crowd.length, slot + 1);
    window.__shopCrowd = crowd;
    return rec;
  };

  window.shopHelp = function (role, idx, W, floorY, personS, simT) {
    var y = floorY + personS * 0.012;
    if (panicking()) return { x: W * 0.16, y: y, face: -1 };
    var people = window.__shopCrowd || [];
    var looking = [];
    for (var i = 0; i < people.length; i++) {
      if (people[i] && (people[i].looking || people[i].pay)) looking.push(people[i]);
    }
    if (role === "counter") {
      var payer = looking.filter(function (c) { return c.pay; })[0];
      if (payer) return { x: W * 0.2, y: y, face: payer.x > W * 0.22 ? 1 : -1 };
      return { x: W * 0.205, y: y, face: 1 };
    }
    if (looking.length) {
      var c = looking[idx % looking.length];
      var hx = Math.max(W * 0.26, Math.min(W * 0.48, c.x - personS * 0.38));
      try {
        if (window.shopSite && shopSite.wet() > 0.22) {
          var pud = shopSite.puddle();
          var px = (pud && pud.nx ? pud.nx : 0.48) * W;
          if (Math.abs(hx - px) < W * 0.1) hx = px < W * 0.5 ? px + W * 0.12 : px - W * 0.12;
        }
      } catch (eL) {}
      return { x: hx, y: c.y, face: c.x > hx ? 1 : -1 };
    }
    var h = hour();
    var sway = Math.sin((simT || tNow()) * 0.13 + idx) * W * 0.02;
    var pos;
    if (role === "feeder") pos = { x: W * 0.46 + sway, y: y, face: 1 };
    else if (role === "cleaner") pos = { x: W * (clogged() ? 0.44 : 0.38) + sway, y: y, face: 1 };
    else pos = { x: Math.max(W * 0.28, Math.min(W * 0.48, W * 0.34 + idx * W * 0.05 + sway)), y: y, face: 1 };
    try {
      if (window.shopSite && shopSite.wet() > 0.22) {
        var pud = shopSite.puddle();
        var px = (pud && pud.nx ? pud.nx : 0.48) * W;
        if (Math.abs(pos.x - px) < W * 0.11) pos.x = px < W * 0.5 ? px + W * 0.13 : px - W * 0.13;
      }
    } catch (eW) {}
    return pos;
  };

  var keepLine = "";
  var keepUntil = 0;
  var keepQuiet = 0;

  function wxNow() {
    try {
      if (typeof wxWord === "function") return String(wxWord() || "").toLowerCase();
    } catch (e) {}
    try {
      var el = document.getElementById("caldate");
      var tx = ((el && el.textContent) || "").toLowerCase();
      if (/rain/.test(tx)) return "rain";
      if (/snow/.test(tx)) return "snow";
      if (/storm|gale/.test(tx)) return "storm";
      if (/fog/.test(tx)) return "fog";
      if (/clear/.test(tx)) return "clear";
    } catch (e2) {}
    return "";
  }

  function anyReallySick() {
    try {
      return fishAll().some(function (f) {
        return f && (f.sick || f.ill);
      });
    } catch (e) {}
    return false;
  }

  function sayKeep(line, hold, quiet) {
    var t = now();
    keepLine = line;
    keepUntil = t + (hold || 2.6);
    keepQuiet = t + (quiet || 8);
    return line;
  }

  function keeperTalk() {
    var t = now();
    if (t < keepUntil) return keepLine;
    var crowd = window.__shopCrowd || [];
    var payer = false,
      nLook = 0;
    for (var i = 0; i < crowd.length; i++) {
      if (!crowd[i]) continue;
      if (crowd[i].pay) payer = true;
      if (crowd[i].looking) nLook++;
    }
    if (payer) {
      var want = "";
      for (var c = 0; c < crowd.length; c++) if (crowd[c] && crowd[c].pay && crowd[c].want) want = crowd[c].want;
      if (want) return sayKeep("The " + want + ".", 2.4, 6);
      return sayKeep(pick(["I'll bag it.", "He's a good one.", "Paper or water?", "Come back."], (t * 11) | 0), 2.4, 6);
    }
    if (t < keepQuiet) return "";
    if (anyReallySick()) return "";
    if (panicking()) return sayKeep("Out. Now.", 2.2, 9);
    var wx = wxNow();
    var h = hour();
    var line = "";
    if (clogged()) line = pick(["Filter's packing.", "Give me a minute on the filter."], (t * 7) | 0);
    else if (nLook) line = pick(["They're healthy.", "Take your time.", "That one at the front.", "Need anything?"], (t * 9) | 0);
    else if (wx === "rain") line = pick(["Wet out.", "Mats by the door."], t | 0);
    else if (wx === "snow") line = "Boots off the gravel.";
    else if (wx === "storm") line = "Stay as long as you like.";
    else if (h < 9) line = pick(["Morning.", "Lights on."], t | 0);
    else if (h > 18) line = pick(["Closing soon.", "Last hour."], t | 0);
    else line = pick(["Water's holding.", "The tetras are up.", "Need anything?"], (t * 3) | 0);
    return sayKeep(line, 2.6, 7 + ((t * 13) | 0) % 8);
  }

  function drawSay(ctx, x, y, line) {
    if (!ctx || !line) return;
    ctx.save();
    ctx.font = "600 12px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var w = Math.min(186, ctx.measureText(line).width + 16);
    var h = 22;
    var bx = x - w / 2,
      by = y - h - 8;
    ctx.fillStyle = "rgba(250,246,236,.95)";
    ctx.strokeStyle = "rgba(20,16,10,.18)";
    ctx.lineWidth = 1;
    var r = 8;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.arcTo(bx + w, by, bx + w, by + h, r);
    ctx.arcTo(bx + w, by + h, bx, by + h, r);
    ctx.arcTo(bx, by + h, bx, by, r);
    ctx.arcTo(bx, by, bx + w, by, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5, by + h);
    ctx.lineTo(x + 5, by + h);
    ctx.lineTo(x, by + h + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.fillText(line, x, by + h / 2 + 0.5);
    ctx.restore();
  }

  function wrapFolk() {
    if (!window.folkDraw || window.folkDraw.__lifeSay) return;
    var orig = window.folkDraw;
    window.folkDraw = function (ctx, x, y, size, colorHex, walk, showFace, face, moving, look) {
      try {
        if (look && look.id) {
          var id = String(look.id);
          if (id.indexOf("fin:") === 0 || id === "fin") {
            var crowd = window.__shopCrowd || [];
            var payer = null,
              looking = 0;
            for (var i = 0; i < crowd.length; i++) {
              if (!crowd[i]) continue;
              if (crowd[i].pay) payer = crowd[i];
              if (crowd[i].looking) looking++;
            }
            if (payer) {
              look.greet = 1;
              arguments[7] = payer.x > x ? 1 : -1;
            } else if (looking) look.greet = 1;
            else if ((hour() * 10) % 10 > 6) look.work = 1;
          }
        }
      } catch (e) {}
      var r = orig.apply(this, arguments);
      try {
        if (look && look.id && String(look.id).indexOf("fin:") === 0) {
          var line = keeperTalk();
          if (line) drawSay(ctx, arguments[1], arguments[2] - (size || 40) * 0.92, line);
        }
      } catch (e2) {}
      return r;
    };
    window.folkDraw.__lifeSay = 1;
  }

  function tNow() {
    return now();
  }

  /* Fish temperament on top of the atlas sprite. */
  function schoolCenter(fish, name) {
    try {
      var list = fishAll();
      if (!list.length) return null;
      var cx = 0,
        cy = 0,
        n = 0;
      for (var i = 0; i < list.length; i++) {
        var o = list[i];
        if (!o || o === fish) continue;
        var sp = o.sp || o._sp || {};
        var nm = String((sp.name || sp.n || "")).toLowerCase();
        if (!nm || nm.indexOf(name.slice(0, 4)) < 0) continue;
        if (o.x == null) continue;
        cx += o.x;
        cy += o.y || 0;
        n++;
        if (n >= 8) break;
      }
      if (n < 1) return null;
      return { x: cx / n, y: cy / n, n: n };
    } catch (e) {
      return null;
    }
  }

  function deepenFish(orig, ctx, args) {
    if (!args || !args.fish) return orig(args);
    var f = args.fish;
    var sp = args.sp || {};
    var name = String((sp.name || sp.n || "")).toLowerCase();
    var size = args.size || 12;
    var fearBoost = 0;
    try {
      if (window.__shopMood && window.__shopMood.kind === "flee" && now() < window.__shopMood.until) fearBoost = 0.18;
      else if (window.__gunFlash > 0.04) fearBoost = 0.22;
    } catch (e) {}

    if (/tetra|danio|rasbora|minnow|neon|cardinal/.test(name)) {
      f.phase = (f.phase || 0) + 0.045 + fearBoost;
      var sch = schoolCenter(f, name);
      if (sch && args.x != null) {
        args = Object.assign({}, args, {
          x: args.x * 0.82 + sch.x * 0.18,
          y: args.y * 0.9 + sch.y * 0.1,
        });
      }
    } else if (/betta|fighter/.test(name)) {
      f.phase = (f.phase || 0) - 0.008;
      var flare = 1;
      try {
        if (fishAll().length > 1) flare = 1.08 + 0.06 * Math.sin((f.phase || 0) * 0.7);
      } catch (e) {}
      args = Object.assign({}, args, { size: size * flare });
    } else if (/cory|loach|pleco|sucker|oto/.test(name) && args.y != null) {
      args = Object.assign({}, args, { y: args.y + Math.abs(size) * 0.16, size: size * 0.92 });
      f.phase = (f.phase || 0) + 0.012;
    } else if (/angel|discus/.test(name)) {
      args = Object.assign({}, args, { size: size * 1.1 });
    } else if (/\bkoi\b|carp|goldfish|oranda|comet/.test(name)) {
      f.phase = (f.phase || 0) + 0.018;
      if (args.y != null) args = Object.assign({}, args, { y: args.y + Math.sin((f.phase || 0) * 0.5) * size * 0.04 });
    } else if (/cichlid|oscar|ram|krib|jack/.test(name)) {
      if (f._homeX == null && args.x != null) f._homeX = args.x;
      if (f._homeX != null && args.x != null) {
        args = Object.assign({}, args, { x: args.x * 0.88 + f._homeX * 0.12, size: size * 1.04 });
      }
    } else if (/guppy|endler|platy|molly|sword/.test(name)) {
      f.phase = (f.phase || 0) + 0.05 + fearBoost;
    } else if (/clown|damsel|tang|wrasse|marine/.test(name)) {
      f.phase = (f.phase || 0) + 0.03;
    }

    try {
      var nn = f.nn || f._g;
      var o = nn && nn.o;
      var hunger = f.hunger == null ? 1 : f.hunger;
      if (o && o.length) {
        var fear = o[3] || 0;
        if (fear > 0.5 || fearBoost) f.phase = (f.phase || 0) + 0.14 + fearBoost;
        if (hunger < 0.38) f.gulp = Math.max(f.gulp || 0, 0.1);
      } else if (hunger < 0.32) {
        f.gulp = Math.max(f.gulp || 0, 0.08);
      }
      if (fearBoost) f.gulp = Math.max(f.gulp || 0, 0.16);
    } catch (e) {}
    return orig(args);
  }

  function wrapFish() {
    if (typeof window.drawFishSprite !== "function" || window.drawFishSprite.__life) return;
    var orig = window.drawFishSprite;
    window.drawFishSprite = function (args) {
      try {
        return deepenFish(orig, args && args.ctx, args);
      } catch (e) {
        return orig(args);
      }
    };
    window.drawFishSprite.__life = 1;
  }

  function afterStir(opts, r) {
    opts = opts || {};
    r = r || {};
    var t = now();
    if (t - lastStirAt < 0.12) return;
    lastStirAt = t;
    var kind = opts.kind || "loud";
    try {
      if (window.feel && feel.play) {
        if (kind === "kind") feel.play("cheer");
        else if (kind === "gun") feel.play("shot");
        else if (kind === "harm") feel.play("thud");
        else if (kind === "dance") feel.play("whistle");
        else feel.play("whoosh");
      }
    } catch (e) {}
    try {
      var list = fishAll();
      for (var i = 0; i < list.length; i++) {
          var f = list[i];
          if (!f) continue;
          if (kind === "kind") f.gulp = 0.12;
          else f.gulp = 0.22 + Math.random() * 0.22;
          f.phase = (f.phase || 0) + (kind === "gun" ? 0.4 : 0.12);
        }
    } catch (e) {}
    try {
      if ((kind === "harm" || kind === "gun") && typeof Ne === "function") {
        var staff = Ne().h || [];
        for (var s = 0; s < staff.length; s++) if (staff[s] && staff[s].on) staff[s].loy = (staff[s].loy || 0) - (kind === "gun" ? 1 : 0.4);
      }
      if (kind === "kind" && typeof Ne === "function") {
        var stf = Ne().h || [];
        for (var u = 0; u < stf.length; u++) if (stf[u] && stf[u].on) stf[u].loy = Math.min(10, (stf[u].loy || 0) + 0.15);
      }
    } catch (e) {}
    try {
      var until = t + (kind === "gun" ? 9 : kind === "kind" ? 8 : 5);
      if (kind === "gun" || kind === "harm") window.__shopMood = { kind: "flee", until: until };
      else if (kind === "kind") window.__shopMood = { kind: "cheer", until: until };
      else if (kind === "dance") window.__shopMood = { kind: "dance", until: t + 6 };
      else window.__shopMood = { kind: "look", until: t + 3 };
      for (var b in browse) {
        if (!browse[b]) continue;
        if (kind === "gun" || kind === "harm") {
          browse[b].phase = "flee";
          browse[b].until = t + 2;
          browse[b].line = pick(PANIC, (b | 0) + 7);
          browse[b].lineUntil = t + 2.4;
        } else if (kind === "kind") {
          browse[b].phase = "cheer";
          browse[b].until = t + 3;
        } else if (kind === "dance") {
          browse[b].phase = "dance";
          browse[b].until = t + 2.5;
        }
      }
    } catch (e) {}
    if (kind === "kind" && r.heard) {
      try {
        if (typeof k === "function") k((r.names && r.names[0] ? r.names[0] + " smiled. " : "") + r.heard + " people on the block noticed.", "good");
      } catch (e) {}
    }
  }

  function wrapStir() {
    var orig = window.__qeStir;
    if (!orig || orig.__life) return;
    window.__qeStir = function (opts) {
      var r = orig.apply(this, arguments);
      try {
        afterStir(opts, r);
      } catch (e) {}
      return r;
    };
    window.__qeStir.__life = 1;
  }

  function wrapGun() {
    var orig = window.__qeGun;
    if (!orig || orig.__life) return;
    window.__qeGun = function () {
      var r = orig.apply(this, arguments);
      try {
        afterStir({ kind: "gun", flee: true }, typeof r === "object" && r ? r : {});
      } catch (e) {}
      return r;
    };
    window.__qeGun.__life = 1;
  }

  function watchGun() {
    if (!(window.__gunFlash > 0.12 || window.__gunSiren)) return;
    var t = now();
    var m = window.__shopMood;
    if (m && m.kind === "flee" && m.until > t + 1) return;
    window.__shopMood = { kind: "flee", until: t + 8 };
    for (var b in browse) {
      if (!browse[b]) continue;
      browse[b].phase = "flee";
      browse[b].until = t + 2.4;
      browse[b].line = pick(PANIC, (b | 0) + 7);
      browse[b].lineUntil = t + 2.6;
    }
  }

  function watchWalkins() {
    try {
      var T = town();
      if (!T || !T.stat) return;
      var w = T.stat.walkins || 0;
      var b = T.stat.bought || 0;
      if (lastWalkins < 0) {
        lastWalkins = w;
        lastBought = b;
        return;
      }
      if (w > lastWalkins) {
        lastWalkins = w;
        try {
          if (window.feel && feel.play) feel.play("door");
        } catch (e) {}
        try {
          if (clogged() && typeof k === "function" && now() - lastToastAt > 14) {
            lastToastAt = now();
            k("Someone stepped in, looked at the water, and thought twice.", "");
          }
        } catch (e) {}
      } else lastWalkins = w;
      if (b > lastBought) {
        var nBuy = b - lastBought;
        lastBought = b;
        dayBook.sales += nBuy;
        try {
          if (window.feel && feel.play) feel.play("register");
          if (window.feel && feel.pulseHud) feel.pulseHud("r-coins");
        } catch (e) {}
        try {
          var wi = window.__walkIn;
          if (wi && wi.i != null) {
            boughtAt[wi.i] = now();
            if (browse[wi.i]) {
              browse[wi.i].bought = true;
              browse[wi.i].phase = "pay";
              browse[wi.i].until = now() + 2.4;
              browse[wi.i].line = lineFor(wi.i, "pay");
              browse[wi.i].lineUntil = now() + 2.2;
            }
            var who = wi.who;
            if (who >= 0) {
              repeats[who] = (repeats[who] || 0) + 1;
              recordRegular(who, wi.spent);
              if (repeats[who] > 1 && now() - lastToastAt > 10 && typeof k === "function" && wi.spent >= 8) {
                lastToastAt = now();
                var nm = nameOfWho(who);
                k((nm && nm !== "A customer" ? nm : "A regular") + " came back.", "good");
              }
              lastWhoBuy = who;
              if (wi.spent && (browse[wi.i] && browse[wi.i].want)) markEgg("wantpay", "They asked for the " + browse[wi.i].want + ".");
            }
          }
          if (nBuy > 1 && window.feel && feel.play) feel.play("chime");
          sayKeep(pick(["I'll bag it.", "He's a good one.", "Come back."], (now() * 5) | 0), 2.4, 6);
        } catch (e) {}
      } else lastBought = b;
    } catch (e) {}
  }

  function wrapMap() {
    if (typeof window.paintTownMap !== "function" || window.paintTownMap.__life) return;
    var orig = window.paintTownMap;
    window.paintTownMap = function (ctx, w, h, H, shop, places, selected, colors, jobs) {
      var r = orig.apply(this, arguments);
      try {
        paintBusy(ctx, w, h, H, shop, places, jobs);
      } catch (e) {}
      return r;
    };
    window.paintTownMap.__life = 1;
  }

  function paintBusy(ctx, w, h, H, shop, places, jobs) {
    if (!ctx || !H || !H.n || !window.townCam) return;
    var cam = window.townCam;
    function toV(x, y) {
      return [((x - cam.left) / cam.span) * w, ((y - cam.top) / cam.span) * h];
    }
    var counts = Object.create(null);
    var sea = 0;
    var inShop = 0;
    var toShop = 0;
    var commute = 0;
    var n = H.n;
    var step = n > 900 ? 3 : 1;
    for (var i = 0; i < n; i += step) {
      var st = H.st[i];
      if (st === 8) {
        sea++;
        continue;
      }
      if (st === 6) {
        inShop++;
        continue;
      }
      if (st === 5) {
        toShop++;
        continue;
      }
      if (st === 1 || st === 3) commute++;
      if (st === 2 && jobs && jobs[H.job[i]] && jobs[H.job[i]].work) {
        var id = jobs[H.job[i]].work;
        counts[id] = (counts[id] || 0) + 1;
      } else if (st === 4) counts.haymarket = (counts.haymarket || 0) + 1;
    }
    placeBusy = counts;
    placeBusy._shop = inShop * step;
    placeBusy._to = toShop * step;
    placeBusy._sea = sea * step;
    ctx.save();
    ctx.font = "600 " + Math.max(8, Math.round(w * 0.016)) + "px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    if (places) {
      for (var p = 0; p < places.length; p++) {
        var pl = places[p];
        if (!pl || !counts[pl.id]) continue;
        var xy = toV(pl.x, pl.y);
        if (xy[0] < 12 || xy[0] > w - 12 || xy[1] < 18 || xy[1] > h - 36) continue;
        var label = counts[pl.id] + (pl.id === "haymarket" ? " at market" : " at work");
        ctx.fillStyle = "rgba(8,14,22,.55)";
        var tw = ctx.measureText(label).width + 8;
        ctx.fillRect(xy[0] - tw / 2, xy[1] + 4, tw, 11);
        ctx.fillStyle = "rgba(220,230,236,.88)";
        ctx.fillText(label, xy[0], xy[1] + 5);
      }
    }
    if (shop) {
      var sv = toV(shop.x, shop.y);
      var shopN = inShop * step;
      var toN = toShop * step;
      if (shopN > 0 || toN > 0) {
        var slab = shopN > 0 ? shopN + " in Fin's" : toN + " heading in";
        if (shopN > 0 && toN > 0) slab = shopN + " in · " + toN + " on the way";
        ctx.fillStyle = "rgba(8,14,22,.6)";
        var sw = ctx.measureText(slab).width + 10;
        ctx.fillRect(sv[0] - sw / 2, sv[1] + 10, sw, 12);
        ctx.fillStyle = "#f4c453";
        ctx.fillText(slab, sv[0], sv[1] + 11);
      }
    }
    if (sea > 8) {
      var wharf = null;
      if (places) {
        for (var q = 0; q < places.length; q++) if (places[q] && places[q].id === "battery") wharf = places[q];
      }
      if (wharf) {
        var wv = toV(wharf.x, wharf.y);
        ctx.fillStyle = "rgba(8,14,22,.55)";
        var lab = Math.round(sea * step) + " at sea";
        var ww = ctx.measureText(lab).width + 8;
        ctx.fillRect(wv[0] - ww / 2, wv[1] + 4, ww, 11);
        ctx.fillStyle = "#9ec4e8";
        ctx.fillText(lab, wv[0], wv[1] + 5);
      }
    }
    ctx.restore();
  }

  function recordRegular(who, spent) {
    var nm = nameOfWho(who);
    var job = "";
    try {
      var T = town();
      var jobs = jobsOf();
      if (T && T.job && T.who && jobs) {
        for (var i = 0; i < T.n; i++) {
          if (T.who[i] === who) {
            job = (jobs[T.job[i]] && (jobs[T.job[i]].id || jobs[T.job[i]].n)) || "";
            break;
          }
        }
      }
    } catch (e2) {}
    if (!nm || nm === "A customer") nm = "A regular from the street";
    var hit = null;
    for (var r = 0; r < regulars.length; r++) if (regulars[r].who === who) hit = regulars[r];
    if (!hit) {
      hit = { who: who, name: nm, job: job, visits: 0, spent: 0, note: job ? "works as a " + job : "comes in off Salem Street" };
      regulars.push(hit);
    }
    hit.visits += 1;
    hit.spent += +spent || 0;
    hit.name = nm;
    if (!hit.since) hit.since = worldYear();
    if (hit.visits > 2) hit.note = "a regular since year " + hit.since + ". Knows the tanks.";
    if (hit.visits > 1) markEgg("regular", nm + " came back.");
    if (regulars.length > 12) regulars.shift();
    window.__regulars = regulars;
    try {
      var g = gs();
      if (g) {
        g.stats = g.stats || {};
        var nReg = 0;
        for (var rr = 0; rr < regulars.length; rr++) if (regulars[rr].visits > 1) nReg++;
        g.stats.regulars = Math.max(g.stats.regulars || 0, nReg);
      }
    } catch (e4) {}
  }

  function seedStreetPeople() {
    if (regulars.length >= 3) {
      window.__regulars = regulars;
      return;
    }
    var T = town();
    if (T && T.n) {
      var n = Math.min(T.n, 600);
      var step = Math.max(1, (n / 10) | 0);
      var jobs = jobsOf();
      for (var i = 0; i < n && regulars.length < 5; i += step) {
        var who = T.who && T.who[i];
        if (who == null) continue;
        var nm = nameOfWho(who);
        var job = "";
        try {
          if (jobs && T.job && jobs[T.job[i]]) {
            job = jobs[T.job[i]].id || jobs[T.job[i]].n || "";
          }
        } catch (e3) {}
        if (!nm || nm === "A customer") {
          if (job) nm = "A " + job + " off the street";
          else continue;
        }
        var exists = false;
        for (var r = 0; r < regulars.length; r++) if (regulars[r].name === nm) exists = true;
        if (exists) continue;
        regulars.push({
          who: who,
          name: nm,
          job: job,
          visits: 0,
          spent: 0,
          since: worldYear() - (2 + (who % 9)),
          note: job ? "lives nearby · " + job : "lives in the North End",
        });
      }
    }
    if (!regulars.length) {
      regulars.push({ name: "The baker on Salem", job: "baker", visits: 0, spent: 0, note: "walks past the window at six" });
      regulars.push({ name: "A longshoreman", job: "wharf", visits: 0, spent: 0, note: "comes in with salt on his coat" });
      regulars.push({ name: "Mrs. from the yellow house", job: "neighbor", visits: 0, spent: 0, note: "asks after the tetras" });
    }
    window.__regulars = regulars;
  }

  var lastHook = 0;
  function tick() {
    try { wrapFolk(); } catch (e) {}
    try { wrapFish(); } catch (e) {}
    try { wrapStir(); } catch (e) {}
    try { wrapGun(); } catch (e) {}
    try { wrapMap(); } catch (e) {}
    try { watchGun(); } catch (e) {}
    try { seedStreetPeople(); } catch (e) {}
    try { watchDay(); } catch (e) {}
    try { watchEggs(); } catch (e) {}
    if (now() - lastHook > 0.55) {
      lastHook = now();
      try { watchWalkins(); } catch (e) {}
    }
  }

  window.shopLife = {
    browse: function () {
      return browse;
    },
    busy: function () {
      return placeBusy;
    },
    crowd: function () {
      return crowd;
    },
    regulars: function () {
      return regulars;
    },
    year: worldYear,
    day: function () {
      return dayBook;
    },
    misses: function () {
      return misses;
    },
    stock: stockDupes,
    hoped: function () {
      return HOPED;
    },
    coming: function () {
      try {
        if (window.desk && typeof desk.coming === "function") return desk.coming();
      } catch (e) {}
      return null;
    },
  };


  if (window.__onBeat) window.__onBeat(tick, 280);
  else setTimeout(function loop() { tick(); setTimeout(loop, 280); }, 280);

})();
