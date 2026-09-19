/* blood.js — the little one comes home.
   Dwarf Fortress names a child of a line. Fin's fry was speech. Mae said
   she brought the little one. Nothing entered the water. The bag that
   went home can send a child back: same kind, a mother already in the
   book, a collector who can tell. No second HUD. Odds, speech, the till,
   a name that is of someone. */
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
      if (window.desk && desk.think) desk.think("blood", text);
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

  function homes() {
    try {
      if (window.going && going.homes) return going.homes() || [];
    } catch (e) {}
    return [];
  }

  function state() {
    var g = gs();
    if (g && g.blood && typeof g.blood === "object") return g.blood;
    var st = { last: "", kids: [] };
    try {
      if (g) g.blood = st;
    } catch (e) {}
    return st;
  }

  function spIndex(name) {
    var S = null;
    try {
      S = typeof SPECIES !== "undefined" ? SPECIES : typeof O !== "undefined" ? O : null;
    } catch (e) {}
    if (!S || !S.length) return 0;
    var q = String(name || "").toLowerCase();
    var i, n;
    for (i = 0; i < S.length; i++) {
      n = String((S[i] && (S[i].name || S[i].gname || S[i].vname)) || "").toLowerCase();
      if (n === q) return i;
    }
    for (i = 0; i < S.length; i++) {
      n = String((S[i] && (S[i].name || S[i].gname || S[i].key || S[i].vname)) || "").toLowerCase();
      if (n && (n.indexOf(q) >= 0 || q.indexOf(n) >= 0)) return i;
    }
    return 0;
  }

  function fidByNick(n) {
    if (!n) return "";
    try {
      var list = fishList();
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].nick === n && list[i].fid) return list[i].fid;
      }
    } catch (e) {}
    try {
      if (typeof pedState === "function") {
        var ps = pedState();
        for (var k in ps) {
          if (ps[k] && ps[k].nick === n) return ps[k].id || k;
        }
      }
    } catch (e2) {}
    return "";
  }

  function takeIn(home) {
    if (!home || home._blood) return null;
    if (typeof addFish !== "function") return null;
    var f = addFish(spIndex(home.sp), 1);
    if (!f) {
      home._bloodTry = (home._bloodTry || 0) + 1;
      return null;
    }
    home._blood = 1;
    f.stage = 1;
    f._bloodMom = home.nick || home.sp;
    f._bloodWho = home.who || "";
    try {
      if (typeof initBrain === "function") initBrain(f);
    } catch (e) {}
    var momFid = fidByNick(home.nick);
    try {
      if (typeof pedNew === "function" && !f.fid) pedNew(f);
    } catch (eP) {}
    try {
      if (typeof pedOf === "function" && f.fid) {
        var rec = pedOf(f.fid);
        if (rec) {
          if (momFid) rec.mom = momFid;
          rec.born = rec.born || year();
        }
      }
    } catch (e2) {}
    try {
      if (typeof pedRename === "function") pedRename(f);
    } catch (e3) {}
    try {
      if (window.saga && saga.remember) saga.remember(f, "birth", "being born of " + (home.nick || home.sp));
    } catch (e4) {}
    var call = f.nick || "The little one";
    var of = home.nick || home.sp;
    var line = call + " is in the water. Off " + of + ".";
    var st = state();
    st.last = line;
    st.kids.push({ n: call, of: of, who: home.who || "", y: year(), day: shopDay() });
    if (st.kids.length > 10) st.kids.shift();
    because((home.who || "Someone") + " brought fry off " + of + ". " + call + " is in the tank.");
    gold("The little one is in the water. Off " + of + ".", true);
    egg("bloodfry", line);
    try {
      if (typeof addRep === "function") addRep(1);
    } catch (eR) {}
    return f;
  }

  function watchHomes() {
    var hs = homes();
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      if (!h || h.dead || h._blood) continue;
      if (h.fry !== 2) continue;
      if ((h._bloodTry || 0) > 4) continue;
      takeIn(h);
      return;
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
        watchHomes();
        var st = window.shopLife && shopLife.browse ? shopLife.browse()[idx] : null;
        var keep = typeof keepGuest === "function" ? keepGuest(st) : !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
        if (keep) return rec;
        var kids = state().kids;
        if (!kids.length) return rec;
        var last = kids[kids.length - 1];
        if (rec.phase === "look" && st && !st._bloodSaid && last && last.of) {
          if (rec.kind === "collector" || rec.kind === "neighbor" || Math.random() < 0.2) {
            st._bloodSaid = 1;
            rec.line =
              rec.kind === "kid"
                ? "The little one. Off " + last.of + "?"
                : "Is that one of " + last.of + "'s?";
            st.line = rec.line;
            st.lineUntil = now() + 3.8;
            because((rec.name || "Someone") + " asked if it was of " + last.of + ".");
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
        var kids = state().kids;
        if (kids.length && kids[kids.length - 1].day === shopDay()) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.06);
          if (!w.line) w.line = "A little one of " + kids[kids.length - 1].of + " is in the water.";
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
        if (a && a.fish && a.fish._bloodMom) {
          a.fish._gaze = a.fish._gaze || now();
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
        return a && a.id === "k_blood";
      }))
        return;
      wiki.push({
        id: "k_blood",
        sec: "The shop floor",
        t: "The little one comes home",
        tags: "fry blood line pedigree child bag window mae collector dwarf",
        w: "<p>Dwarf Fortress names a child of a line. Fin's fry was speech. Mae said she brought the little one. Nothing entered the water. The bag that went home can send a child back: same kind, a mother already in the book, a collector who can tell. They will ask if that one is of Glimia's. It is.</p><p><b>What to do about it:</b> keep a space in the tank. Do not sell the last of a line and expect the child to mean nothing. Life names who came back. The gold line does not cheer you — it tells you the water took them.</p>",
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
      if (now() - lastTick > 1.2) {
        lastTick = now();
        watchHomes();
      }
    } catch (e) {}
  }

  window.blood = {
    whisper: whisper,
    line: line,
    of: function () {
      return state();
    },
    seed: function () {
      var hs = homes();
      var hit = null;
      var i;
      for (i = 0; i < hs.length; i++) {
        if (hs[i] && !hs[i].dead) {
          hit = hs[i];
          break;
        }
      }
      if (!hit) {
        var list = fishList();
        var src = null;
        for (i = 0; i < list.length; i++) {
          if (list[i] && list[i].nick) {
            src = list[i];
            break;
          }
        }
        if (!src && list[0]) src = list[0];
        if (!src) return null;
        var sp = "goldfish";
        try {
          var S = typeof O !== "undefined" ? O : null;
          if (S && src.sp != null && S[src.sp]) sp = String(S[src.sp].gname || S[src.sp].name || "goldfish").toLowerCase();
        } catch (e) {}
        hit = {
          nick: src.nick || "",
          sp: sp,
          who: "Mae Costa",
          fry: 2,
          dead: false,
        };
        try {
          if (window.going && going.homes) going.homes().push(hit);
        } catch (eH) {}
      }
      hit.fry = 2;
      hit._blood = 0;
      hit._bloodTry = 0;
      return takeIn(hit);
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 260);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 260);
    }, 220);
})();
