/* spiral.js — a fight can kill.
   Fin's fights wrote the book and raised the pulse. They did not empty
   a slot. Two of a kind, proud, a foe, the pulse over the line: one
   dies on the gravel. The name goes in the book. The remaining holds
   still. No second HUD. Odds, speech, the choir, a plate due. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var didBrowse = false;
  var didChoir = false;
  var didFish = false;
  var lastPair = Object.create(null);

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
    return "tank";
  }

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.desk && desk.think) desk.think("spiral", text);
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

  function fishList() {
    try {
      if (typeof allFish === "function") return allFish() || [];
    } catch (e) {}
    return [];
  }

  function stressOf(f) {
    if (!f) return 0;
    if (f.mind && isFinite(f.mind.stress)) return f.mind.stress;
    if (f.brain && isFinite(f.brain.stress)) return f.brain.stress;
    return 0;
  }

  function proudOf(f) {
    if (!f) return 0;
    var t = f.traits || {};
    return Math.max(t.proud || 0, t.aggro || 0, t.violent || 0, t.anger || 0);
  }

  function callOf(f) {
    return (f && (f.nick || "")) || "One";
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
    return "fish";
  }

  function state() {
    var g = gs();
    if (g && g.spiral && typeof g.spiral === "object") return g.spiral;
    var st = { last: "", lastDay: -1, dead: [] };
    try {
      if (g) g.spiral = st;
    } catch (e) {}
    return st;
  }

  function takeOut(pick) {
    if (!pick) return false;
    pick.dead = 1;
    var list = fishList();
    var arrays = [list];
    try {
      var g = gs();
      if (g && Array.isArray(g.fish) && g.fish !== list) arrays.push(g.fish);
    } catch (e) {}
    for (var i = 0; i < arrays.length; i++) {
      var ix = arrays[i].indexOf(pick);
      if (ix >= 0) arrays[i].splice(ix, 1);
    }
    return true;
  }

  function stillMate(sp, killer) {
    var list = fishList();
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (!f || f === killer || f.dead) continue;
      if (f.sp !== sp) continue;
      f._holdStill = 1;
      f._foe = (killer && killer.nick) || f._foe || "a rival";
      try {
        if (typeof initBrain === "function") initBrain(f);
      } catch (e) {}
      if (f.brain) f.brain.stress = Math.min(1, Math.max(f.brain.stress || 0, 0.78));
      if (f.mind) f.mind.stress = Math.min(1, Math.max(f.mind.stress || 0, 0.78));
    }
  }

  function kill(victim, killer, how) {
    if (!victim) return null;
    var nick = callOf(victim);
    var sp = kindOf(victim);
    var who = killer ? callOf(killer) : "a rival";
    how = how || "died in a fight";
    takeOut(victim);
    stillMate(victim.sp, killer);
    var rec = {
      n: nick,
      sp: sp,
      how: how,
      by: who,
      y: year(),
      day: shopDay(),
    };
    var st = state();
    st.last = nick + " died in the tank. " + who + " is still.";
    st.lastDay = shopDay();
    st.dead.push(rec);
    if (st.dead.length > 12) st.dead.shift();
    try {
      if (window.saga && saga.book) {
        var b = saga.book();
        if (b && Array.isArray(b.dead)) {
          b.dead.push({ n: nick, sp: sp, how: how, y: year(), saw: who !== "One" ? [who] : [] });
          if (b.dead.length > 80) b.dead.shift();
        }
      }
    } catch (eB) {}
    try {
      if (window.saga && saga.remember && killer) saga.remember(killer, "fight", nick + " dying");
    } catch (eR) {}
    try {
      if (window.mark && mark.want) mark.want(nick, how, "the tank", year(), true);
    } catch (eM) {}
    because(nick + " " + how + ". " + who + " is holding still.");
    gold(nick + " died in the tank. " + who + " is still.", true);
    egg("spiralkill", nick + " died in a fight.");
    try {
      if (window.feel && feel.play) feel.play("warn");
    } catch (eF) {}
    try {
      if (typeof chronicle === "function") {
        chronicle("death", "Year " + year() + ". " + nick + " " + how + ". " + who + " was nearby.", killer ? [killer] : []);
      }
    } catch (eC) {}
    return rec;
  }

  function ready(f) {
    if (!f || f.dead || f.stolen || f.risen) return false;
    if (f.stage != null && f.stage < 2) return false;
    var s = stressOf(f);
    if (s <= 0.72) return false;
    if (f._foe) return true;
    if (proudOf(f) > 0.62) return true;
    return false;
  }

  function watchFights() {
    if (shopDay() < 1) return;
    var st = state();
    if (st.lastDay === shopDay()) return;
    var list = fishList();
    if (list.length < 2) return;
    var i, j, A, B, key, dx, dy;
    for (i = 0; i < list.length; i++) {
      A = list[i];
      if (!ready(A)) continue;
      for (j = 0; j < list.length; j++) {
        if (j === i) continue;
        B = list[j];
        if (!B || B.dead || B.sp !== A.sp) continue;
        if (B.stage != null && B.stage < 2) continue;
        key = (A.fid || A.nick || i) + "|" + (B.fid || B.nick || j);
        if (lastPair[key]) continue;
        dx = (A.x || 0) - (B.x || 0);
        dy = (A.y || 0) - (B.y || 0);
        if (dx * dx + dy * dy > 90 * 90 && !A._foe) continue;
        lastPair[key] = 1;
        var victim = stressOf(B) >= stressOf(A) ? B : A;
        var killer = victim === A ? B : A;
        if (A._foe && B.nick && A._foe === B.nick) {
          victim = A;
          killer = B;
        }
        kill(victim, killer, "died in a fight");
        return;
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
        var keep = typeof keepGuest === "function" ? keepGuest(st) : !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
        var last = state().last;
        if (!last || keep) return rec;
        if (rec.phase === "look" && st && !st._spiralSaid && shopDay() - (state().lastDay || 0) <= 1) {
          st._spiralSaid = 1;
          rec.line =
            rec.kind === "kid"
              ? "One of them is gone."
              : rec.kind === "collector"
                ? "The line just broke. I can see it."
                : "Something died in there. I'm looking.";
          st.line = rec.line;
          st.lineUntil = now() + 3.8;
          if (rec.kind !== "collector" && Math.random() < 0.4) {
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
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
        if (state().lastDay === shopDay() && state().last) {
          w.sour = Math.min(1, (w.sour || 0) + 0.18);
          w.still = (w.still || 0) + 1;
          if (!w.line) w.line = state().last;
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
        if (a && a.fish && a.fish._holdStill && state().lastDay === shopDay()) {
          a.fish._holdStill = 1;
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
    if (state().last) return state().last;
    return whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) {
        return a && a.id === "k_spiral";
      }))
        return;
      wiki.push({
        id: "k_spiral",
        sec: "The tanks",
        t: "A fight can kill",
        tags: "tantrum spiral fight stress proud foe death gravel",
        w: "<p>Fin's fights wrote the book and raised the pulse. They did not empty a slot. Two of a kind, proud, a foe already named, the pulse over the line: one dies on the gravel. The name goes in the book. The remaining holds still. Walk-ins see it. The choir drops a voice.</p><p><b>What to do about it:</b> split a pair that is already fighting. Feed. Do not leave two proud ones in a corner overnight. Life names who died. Chalk is due. The gold line does not cheer you.</p>",
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
      if (now() - lastTick > 1.1) {
        lastTick = now();
        watchFights();
      }
    } catch (e) {}
  }

  window.spiral = {
    whisper: whisper,
    line: line,
    of: function () {
      return state();
    },
    seed: function () {
      var list = fishList();
      var a = null,
        b = null;
      var i;
      for (i = 0; i < list.length; i++) {
        if (!list[i] || list[i].dead) continue;
        if (!a) {
          a = list[i];
          continue;
        }
        if (list[i].sp === a.sp) {
          b = list[i];
          break;
        }
      }
      if (!a) return null;
      if (!b) {
        for (i = 0; i < list.length; i++) {
          if (list[i] && list[i] !== a && !list[i].dead) {
            b = list[i];
            break;
          }
        }
      }
      if (!b) return null;
      if (a.stage != null && a.stage < 2) a.stage = 2;
      if (b.stage != null && b.stage < 2) b.stage = 2;
      try {
        if (typeof initBrain === "function") {
          initBrain(a);
          initBrain(b);
        }
      } catch (e) {}
      a._foe = b.nick || "a rival";
      b._foe = a.nick || "a rival";
      if (a.brain) a.brain.stress = 0.88;
      if (b.brain) b.brain.stress = 0.8;
      if (a.mind) a.mind.stress = 0.88;
      if (b.mind) b.mind.stress = 0.8;
      state().lastDay = -1;
      return kill(a, b, "died in a fight");
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 240);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 240);
    }, 220);
})();
