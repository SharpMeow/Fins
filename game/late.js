/* late.js — you are late.
   Someone kept this shop before you. The street still uses their names.
   And the first line of the README is a promise: the shop keeps going
   after you look away. Idle games pay you for that. Fin's writes what
   you missed. No second HUD. Odds, speech, the gold line, a daybook. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var awayAt = 0;
  var wiredVis = false;
  var lastGold = "";
  var lastGoldAt = 0;
  var stillSp = Object.create(null);
  var didBrowse = false;
  var didFish = false;
  var KEEP = [
    { n: "Rook Hale", note: "He left the keys on the blotter." },
    { n: "Nedda Quill", note: "She wrote the lots in a smaller hand." },
    { n: "Asa Marr", note: "He owed the hall a week when he walked." },
    { n: "Wren Pell", note: "She named every fish. The street still uses those names." },
    { n: "Pim Voss", note: "He sold the last of a pair the winter he left." },
    { n: "Lila Costa", note: "Mae's aunt. The ovens knew this counter." },
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
      if (document.body.classList.contains("work")) return "work";
      if (typeof sceneNow === "function") return String(sceneNow() || "");
    } catch (e) {}
    return "tank";
  }

  function fishList() {
    try {
      if (typeof allFish === "function") return allFish() || [];
    } catch (e) {}
    return [];
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
      if (window.desk && desk.think) desk.think("late", text);
    } catch (e2) {}
  }

  function say(msg, kind) {
    try {
      if (typeof k === "function") k(msg, kind || "");
    } catch (e) {}
  }

  function egg(id, line) {
    try {
      if (typeof findEgg === "function") findEgg(id, line);
    } catch (e) {}
  }

  function play(name) {
    try {
      if (window.feel && feel.play) feel.play(name);
    } catch (e) {}
  }

  function runSeed() {
    try {
      if (typeof runState === "function") {
        var r = runState();
        if (r && r.seed) return r.seed;
      }
    } catch (e) {}
    try {
      if (window.realm && realm.world) {
        var w = realm.world();
        if (w && w.seed) return w.seed;
      }
    } catch (e2) {}
    return 1;
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
    if (/cichlid/.test(sp)) return "cichlid";
    if (!sp || /^\d+$/.test(sp)) return "fish";
    return sp.toLowerCase();
  }

  function state() {
    var g = gs();
    if (g && g.late && g.late.keeper && g.late.keeper.n) return g.late;
    var h = hash32("late:" + runSeed() + ":" + year());
    var pick = KEEP[h % KEEP.length];
    var st = {
      keeper: {
        n: pick.n,
        note: pick.note,
        leftY: Math.max(990, year() - 1 - (h % 3)),
        kin: /Costa/.test(pick.n),
      },
      fid: "",
      nick: "",
      sp: "",
      greeted: false,
      soldKept: false,
      missed: [],
      missedAt: 0,
      awayMin: 0,
    };
    try {
      if (g) g.late = st;
    } catch (e) {}
    return st;
  }

  function markKept() {
    var st = state();
    if (st.fid || st.nick) return;
    var list = fishList();
    var named = [];
    var gold = [];
    for (var i = 0; i < list.length; i++) {
      if (!list[i]) continue;
      if (list[i].nick) named.push(list[i]);
      if (/gold/.test(kindOf(list[i]))) gold.push(list[i]);
    }
    var f = named[0] || gold[0] || list[0];
    if (!f) return;
    st.fid = f.fid != null ? String(f.fid) : "";
    st.nick = f.nick || "";
    st.sp = kindOf(f);
    if (f.nick) {
      because(st.keeper.n + " named " + f.nick + ". The street still says it.");
    }
  }

  function keptFish() {
    var st = state();
    var list = fishList();
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (!f) continue;
      if (st.fid && String(f.fid) === st.fid) return f;
      if (st.nick && f.nick === st.nick) return f;
    }
    return null;
  }

  function seedOpen() {
    var st = state();
    if (st._seeded) return;
    st._seeded = 1;
    markKept();
    var k = st.keeper;
    var line =
      k.n +
      " kept this shop through Year " +
      k.leftY +
      ". " +
      k.note +
      " You hung the sign in Year " +
      year() +
      ".";
    because(line);
    try {
      if (window.saga && typeof chronicle === "function") {
        chronicle("era", "Year " + k.leftY + ". " + k.n + " locked the door and did not come back.");
      }
    } catch (e) {}
    egg("latekeep", line);
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

  function wetBoards(amt) {
    try {
      if (!window.shopSite || !shopSite.of) return;
      var s = shopSite.of();
      if (!s || !s.cells) return;
      var W = s.w || 16;
      for (var i = 0; i < s.cells.length; i++) {
        var c = s.cells[i];
        if (c.kind === "floor" && c.x >= W - 6) {
          c.wet = Math.min(1, (c.wet || 0) + amt);
        }
        if (c.kind === "filter") {
          c.water = Math.min(1, (c.water || 0) + amt);
          c.press = Math.min(2, (c.press || 0) + amt);
        }
      }
      s.wetMax = Math.min(1, Math.max(s.wetMax || 0, amt));
      s.leak = Math.min(1, (s.leak || 0) + amt * 0.6);
    } catch (e) {}
  }

  function catchUp() {
    if (!awayAt) return;
    var min = (Date.now() - awayAt) / 60000;
    awayAt = 0;
    if (min < 0.4) return;
    if (sceneName() === "title") return;
    var st = state();
    st.awayMin = min;
    var hours = Math.min(14, Math.max(1, Math.floor(min * 0.45)));
    var h = hash32("away:" + runSeed() + ":" + shopDay() + ":" + Math.floor(min));
    var missed = [];

    if ((h % 10) < 5 || hours >= 4) {
      wetBoards(0.42);
      try {
        var g0 = gs();
        if (g0) g0.filterClog = true;
      } catch (eC) {}
      missed.push("The filter packed while you were gone.");
    }

    try {
      var n = window.desk && desk.neighbor ? desk.neighbor() : null;
      var have = window.shopLife && shopLife.stock ? shopLife.stock() : [];
      var wet = window.shopSite && shopSite.wet ? shopSite.wet() : 0;
      if (n && hours >= 2) {
        var call = n.known && n.name ? n.name : "The baker";
        var ok = have && have.indexOf(n.want || "goldfish") >= 0 && wet < 0.36;
        if (ok && missed[0] !== "The filter packed while you were gone.") {
          missed.push(call + " came for " + (n.want || "goldfish") + ". The fish bag landed. You weren't at the counter.");
          n.bags = (n.bags || 0) + 1;
          n.known = true;
          n.trust = Math.min(1, (n.trust || 0.4) + 0.08);
          n.last = "took the " + (n.want || "goldfish");
          try {
            var g = gs();
            if (g) g.coins = (g.coins || 0) + 12;
          } catch (eG) {}
          try {
            if (window.going && going.homes) {
              going.homes().push({
                nick: "",
                sp: n.want || "goldfish",
                who: n.known ? n.name : "The baker",
                whoKind: "neighbor",
                neighbor: true,
                care: 0.82,
                health: 0.78,
                named: false,
                sick: false,
                risen: false,
                day: shopDay(),
                y: year(),
                dead: false,
                fry: 0,
                told: false,
              });
            }
          } catch (eH) {}
        } else {
          var why = wet > 0.34 ? "The aisle was wet. She walked." : "No " + (n.want || "goldfish") + ". She walked.";
          missed.push(call + " came. " + why);
          n.trust = Math.max(0.08, (n.trust || 0.4) - 0.08);
          n.last = "walked";
        }
      }
    } catch (eB) {}

    if (hours >= 6) {
      missed.push("The harbor came in under the boards.");
      wetBoards(0.28);
    }

    var kept = keptFish();
    if (kept && (hours >= 3 || missed.length)) {
      try {
        kept.mind = kept.mind || {};
        kept.mind.stress = Math.min(1, (kept.mind.stress || 0.2) + 0.22);
      } catch (eS) {}
      var kn = kept.nick || "The one " + st.keeper.n.split(" ")[0] + " kept";
      missed.push(kn + " is holding still. You weren't at the glass.");
    }

    try {
      if (window.going && going.homes) {
        var hs = going.homes();
        for (var i = 0; i < hs.length; i++) {
          if (!hs[i] || hs[i].dead) continue;
          hs[i].health = Math.max(0, (hs[i].health || 0.7) - hours * 0.02 * (1.1 - (hs[i].care || 0.5)));
          if (hs[i].health < 0.14 && !hs[i].dead) {
            hs[i].dead = true;
            missed.push((hs[i].nick || "The " + hs[i].sp) + " died in " + hs[i].who + "'s window while you were gone.");
          }
        }
      }
    } catch (eD) {}

    if (!missed.length) {
      missed.push("The shop ran. Nobody bagged. The water held.");
    }

    st.missed = missed.slice(0, 6);
    st.missedAt = now();
    for (var m = 0; m < st.missed.length; m++) {
      because(st.missed[m]);
    }
    gold(st.missed[0], true);
    say(st.missed[0], hours >= 4 ? "bad" : "");
    play("drip");
    egg("away", st.missed[0]);
  }

  function bindAway() {
    if (wiredVis) return;
    wiredVis = true;
    var hide = function () {
      awayAt = Date.now();
    };
    var show = function () {
      try {
        catchUp();
      } catch (e) {}
    };
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) hide();
      else show();
    });
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);
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
        var L = state();
        var first = L.keeper.n.split(" ")[0];
        var kept = keptFish();

        if (rec.kind === "neighbor" && rec.phase === "look" && st && !st._lateMae && !L.greeted) {
          st._lateMae = 1;
          L.greeted = true;
          rec.line = L.keeper.kin
            ? "You're not " + first + ". She was my aunt."
            : "You're not " + first + ".";
          st.line = rec.line;
          st.lineUntil = now() + 4;
          because(rec.line);
          gold(rec.line, true);
        } else if (rec.kind === "kid" && rec.phase === "look" && st && !st._lateKid && kept && L.nick) {
          st._lateKid = 1;
          rec.line = "Is " + L.nick + " still in there? " + first + "'s " + (L.sp || "fish") + ".";
          st.line = rec.line;
        } else if (L.soldKept && rec.phase === "look" && st && !st._lateGone) {
          st._lateGone = 1;
          rec.line = "Where's the one " + first + " kept?";
          st.line = rec.line;
          if (rec.kind !== "kid" && Math.random() < 0.35) {
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
          }
        } else if (kept && rec.phase === "look" && st && !st._lateLook && rec.kind === "collector") {
          st._lateLook = 1;
          rec.line = rec.line || first + " used to keep that " + (L.sp || "one") + ". Don't round it.";
          st.line = rec.line;
        }
      } catch (e) {}
      return rec;
    };
  }

  function refreshStill() {
    stillSp = Object.create(null);
    try {
      if (!window.going || !going.homes) return;
      var hs = going.homes();
      var gone = Object.create(null);
      for (var j = 0; j < hs.length; j++) {
        if (hs[j] && !hs[j].dead && hs[j].sp) gone[hs[j].sp] = 1;
      }
      var list = fishList();
      var counts = Object.create(null);
      for (var i = 0; i < list.length; i++) {
        if (!list[i] || !list[i].nick) continue;
        var k = kindOf(list[i]);
        counts[k] = (counts[k] || 0) + 1;
      }
      for (var sp in counts) {
        if (counts[sp] === 1 && gone[sp]) stillSp[sp] = 1;
      }
    } catch (e) {}
  }

  function wrapFish() {
    if (didFish || typeof window.drawFishSprite !== "function") return;
    didFish = true;
    var orig = window.drawFishSprite;
    window.drawFishSprite = function (a) {
      try {
        var L = state();
        if (a && a.fish) {
          var isKept =
            (L.fid && String(a.fish.fid) === L.fid) || (L.nick && a.fish.nick === L.nick);
          if (isKept && a.fish.mind && a.fish.mind.stress > 0.55) {
            a.fish._holdStill = 1;
          }
          if (a.fish.nick && stillSp[kindOf(a.fish)]) a.fish._holdStill = 1;
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  }

  function watchKept() {
    var st = state();
    if (st.soldKept) return;
    if (!st.fid && !st.nick) return;
    if (sceneName() === "title") return;
    if (!keptFish() && fishList().length) {
      st.soldKept = true;
      var first = st.keeper.n.split(" ")[0];
      var line = (st.nick || "The one " + first + " kept") + " went in a fish bag. The street will say so.";
      because(line);
      gold(line, true);
      say(line, "bad");
      egg("latesold", line);
      try {
        if (window.desk && desk.neighbor) {
          var n = desk.neighbor();
          if (n) n.trust = Math.max(0.08, (n.trust || 0.4) - 0.1);
        }
      } catch (e) {}
    }
  }

  function whisper() {
    var st = state();
    if (st.missed && st.missed.length && now() - (st.missedAt || 0) < 22) return st.missed[0];
    if (lastGold && now() - lastGoldAt < 12) return lastGold;
    if (st.soldKept) {
      return "Where's the one " + st.keeper.n.split(" ")[0] + " kept?";
    }
    return "";
  }

  function line() {
    var st = state();
    if (st.missed && st.missed.length) return st.missed[st.missed.length - 1];
    if (st.keeper) return st.keeper.n + " kept this shop through Year " + st.keeper.leftY + ". " + st.keeper.note;
    return whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) { return a && a.id === "k_late"; })) return;
      wiki.push({
        id: "k_late",
        sec: "You and your people",
        t: "You are late",
        tags: "previous keeper rook inherited sign year late keys",
        w: "<p>You hung the sign in Year 1000. Someone kept this shop before you. The street still uses their names. A fish in the tank is theirs. The baker will say you're not them. Sell that fish and the street will ask where it went.</p><p><b>What to do about it:</b> read Life. The first page is their handwriting, not yours. Do not bag the one they named unless you mean it.</p>",
      });
      wiki.push({
        id: "k_away",
        sec: "The shop floor",
        t: "While you were gone",
        tags: "away hidden tab idle missed baker filter tide daybook",
        w: "<p>Idle games pay you for looking away. Fin's writes what you missed. The baker came, or she walked. The filter packed. The harbor came in. A named fish held still. A window on Salem went dark. The gold line is the first thing that happened without you. Life has the rest.</p><p><b>What to do about it:</b> read the line. Mop. Keep the pair. You were not at the counter. The shop was.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      bindAway();
      wrapBrowse();
      wrapFish();
      seedWiki();
      if (sceneName() === "title") return;
      seedOpen();
      markKept();
      if (now() - lastTick > 0.8) {
        lastTick = now();
        watchKept();
        refreshStill();
      }
      if (now() - lastUi > 1.2) lastUi = now();
    } catch (e) {}
  }

  window.late = {
    whisper: whisper,
    line: line,
    keeper: function () {
      return state().keeper;
    },
    missed: function () {
      return state().missed || [];
    },
    kept: keptFish,
  };

  if (window.__onBeat) window.__onBeat(tick, 260);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 260);
    }, 200);
})();
