/* kin.js — the street is a civ.
   Dwarf Fortress's missing object, for the aisle. Walk-ins are not kinds.
   They are people: a name, a job, kin, a god, a preference, a memory of
   a bag. A miss walks to the cousin. A dead fish in a window is a grudge.
   No second HUD. Odds, speech, the gold line, a family that notices. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var lastSales = -1;
  var tillReady = false;
  var didBrowse = false;
  var didChoir = false;
  var seeded = false;

  var GIVEN = ["Tomas", "Rita", "Ev", "Cal", "Nora", "Gio", "Bess", "Ned", "Pia", "Walt", "Inez", "Sal"];
  var SURN = ["Russo", "Chen", "Ward", "DiPietro", "Kelley", "Sousa", "Pell", "Hale", "Quill", "Marr", "Voss", "Costa"];
  var JOBS = [
    { job: "off the boats", kind: "lunch", want: "tetra" },
    { job: "keeps a list", kind: "collector", want: "betta" },
    { job: "still in school", kind: "kid", want: "guppy" },
    { job: "hauls at Commercial", kind: "lunch", want: "cory" },
    { job: "teaches at Copp's", kind: "neighbor", want: "angelfish" },
    { job: "mends nets", kind: "lunch", want: "clown" },
    { job: "keeps the hall", kind: "collector", want: "goldfish" },
    { job: "cuts fish at Haymarket", kind: "lunch", want: "tetra" },
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

  function pick(arr, h) {
    if (!arr || !arr.length) return arr;
    return arr[(h >>> 0) % arr.length];
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

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.desk && desk.think) desk.think("kin", text);
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

  function stockHave() {
    try {
      if (window.shopLife && shopLife.stock) return shopLife.stock() || [];
    } catch (e) {}
    return [];
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

  function namedOf(want) {
    try {
      var list = typeof allFish === "function" ? allFish() || [] : [];
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].nick && (!want || kindOf(list[i]) === want)) return list[i];
      }
    } catch (e) {}
    return null;
  }

  function gods() {
    return [
      "the Salt Mother",
      "the Dry Eye",
      "the Wheel",
      "the First Net",
      "the Quiet Oak",
      "the Red Vein",
      "the Night Ledger",
    ];
  }

  function sgName(i) {
    try {
      if (typeof sgPerson === "function") {
        var p = sgPerson(14000 + i * 17) || sgPerson(80 + i);
        if (p && p.name && p.name !== "A customer") return p.name;
      }
    } catch (e) {}
    return "";
  }

  function keeper() {
    try {
      if (window.late && late.keeper) return late.keeper();
    } catch (e) {}
    return null;
  }

  function mae() {
    try {
      if (window.desk && desk.neighbor) return desk.neighbor();
    } catch (e) {}
    return null;
  }

  function state() {
    var g = gs();
    if (g && g.kin && Array.isArray(g.kin.folk) && g.kin.folk.length) return g.kin;
    var st = { folk: [], due: "", last: "" };
    try {
      if (g) g.kin = st;
    } catch (e) {}
    return st;
  }

  function byId(id) {
    var folk = state().folk;
    for (var i = 0; i < folk.length; i++) if (folk[i] && folk[i].id === id) return folk[i];
    return null;
  }

  function byName(n) {
    var folk = state().folk;
    for (var i = 0; i < folk.length; i++) if (folk[i] && folk[i].n === n) return folk[i];
    return null;
  }

  function living() {
    return state().folk.filter(function (f) {
      return f && !f.dead;
    });
  }

  function seedFolk() {
    var st = state();
    if (st.folk.length) {
      seeded = true;
      return;
    }
    var h = hash32("kin:" + runSeed() + ":" + year());
    var kpr = keeper();
    var baker = mae();
    var folk = [];

    var keepId = "keep";
    if (kpr && kpr.n) {
      folk.push({
        id: keepId,
        n: kpr.n,
        job: "kept this shop",
        kind: "neighbor",
        want: "goldfish",
        god: pick(gods(), h),
        kinOf: "",
        how: "",
        trust: 0.5,
        visits: 0,
        bags: 0,
        last: kpr.note || "left the keys",
        nextD: -1,
        dead: true,
        known: true,
      });
    }

    var maeId = "mae";
    folk.push({
      id: maeId,
      n: (baker && baker.name) || "Mae Costa",
      job: "bakes on Salem",
      kind: "neighbor",
      want: (baker && baker.want) || "goldfish",
      god: "the Wheel",
      kinOf: kpr && kpr.kin ? keepId : "",
      how: kpr && kpr.kin ? "aunt" : "",
      trust: baker && baker.trust != null ? baker.trust : 0.4,
      visits: (baker && baker.visits) || 0,
      bags: (baker && baker.bags) || 0,
      last: (baker && baker.last) || "",
      nextD: baker && baker.nextD != null ? baker.nextD : 0,
      dead: false,
      known: !!(baker && baker.known),
    });

    var used = Object.create(null);
    used[(baker && baker.name) || "Mae Costa"] = 1;
    if (kpr && kpr.n) used[kpr.n] = 1;

    var parentId = maeId;
    for (var i = 0; i < 7; i++) {
      var hh = hash32("f:" + h + ":" + i);
      var nm = sgName(i);
      if (!nm || used[nm]) {
        nm = pick(GIVEN, hh) + " " + pick(SURN, hh >>> 8);
      }
      if (used[nm]) nm = pick(GIVEN, hh + 3) + " " + pick(SURN, hh >>> 4);
      used[nm] = 1;
      var spec = JOBS[i % JOBS.length];
      var how = i === 0 ? "child" : i === 1 ? "cousin" : i === 2 ? "sibling" : "";
      var kinOf = "";
      if (i === 0) kinOf = parentId;
      else if (i === 1) kinOf = keepId;
      else if (i === 2) kinOf = "f0";
      folk.push({
        id: "f" + i,
        n: nm,
        job: spec.job,
        kind: spec.kind,
        want: spec.want,
        god: pick(gods(), hh >>> 3),
        kinOf: kinOf,
        how: how,
        trust: 0.32 + ((hh >>> 12) % 28) / 100,
        visits: 0,
        bags: 0,
        last: "",
        nextD: (hh % 4) - 1,
        dead: false,
        known: false,
      });
    }

    st.folk = folk;
    seeded = true;
    var kid = byId("f0");
    var bakerN = (baker && baker.name) || "Mae";
    if (kid) {
      because(kid.n + " is " + bakerN.split(" ")[0] + "'s. The street already knows.");
    }
    egg("kinfolk", folk.length + " people on this block. They have names.");
  }

  function growKids(d) {
    var folk = state().folk;
    for (var i = 0; i < folk.length; i++) {
      var f = folk[i];
      if (!f || f.dead) continue;
      if (f.job === "still small" && d - (f.bornD || 0) >= 3) {
        f.job = "still in school";
        f.kind = "kid";
        f.nextD = d;
        f.last = "old enough to come in";
        because(f.n.split(" ")[0] + " is old enough to come to the glass.");
      }
    }
  }

  function birthChild(d, hh) {
    var live = living().filter(function (f) {
      return f.id !== "keep" && f.job !== "still small";
    });
    if (!live.length || living().length >= 14) return;
    var parent = live[hh % live.length];
    var kid0 = byId("f0");
    if (parent.id === "mae" && kid0 && !kid0.dead) {
      parent = live[(hh + 3) % live.length] || parent;
    }
    var surn = (parent.n && parent.n.split(" ")[1]) || pick(SURN, hh >>> 8);
    var nm = pick(GIVEN, hh >>> 4) + " " + surn;
    if (byName(nm)) nm = pick(GIVEN, hh >>> 2) + " " + pick(SURN, hh >>> 6);
    state().folk.push({
      id: "b" + d + (hh % 97),
      n: nm,
      job: "still small",
      kind: "kid",
      want: parent.want || "guppy",
      god: parent.god || pick(gods(), hh),
      kinOf: parent.id,
      how: "child",
      trust: parent.trust || 0.4,
      visits: 0,
      bags: 0,
      last: "born on the block",
      nextD: d + 3,
      dead: false,
      known: true,
      bornD: d,
    });
    because(nm.split(" ")[0] + " was born to " + parent.n.split(" ")[0] + " on this block.");
    egg("kinborn", nm + " was born on Salem.");
  }

  function dieFig(d, hh) {
    var cands = living().filter(function (f) {
      return f.id !== "mae" && f.id !== "keep" && f.job !== "still small" && (f.visits || 0) === 0;
    });
    if (!cands.length) return;
    var f = cands[hh % cands.length];
    f.dead = true;
    f.last = "died on the block";
    var k = kinOf(f);
    because(f.n + " died. " + (k && !k.dead ? k.n.split(" ")[0] + " will keep the name." : "The street keeps the name."));
    try {
      if (window.mark && mark.want) mark.want(f.n, "on the street", "kin", year(), false);
    } catch (e) {}
    if (k && !k.dead) {
      k.last = f.n.split(" ")[0] + " died";
      k.trust = Math.max(0.08, (k.trust || 0.4) - 0.06);
    }
  }

  function ageStreet() {
    var st = state();
    var d = shopDay();
    if (st.aged === d) return;
    st.aged = d;
    if (d < 2) return;
    var hh = hash32("age:" + runSeed() + ":" + d);
    growKids(d);
    if ((hh % 100) < 20) birthChild(d, hh);
    if (d >= 6 && (hh % 100) > 90) dieFig(d, hh);
  }

  function syncMae() {
    var baker = mae();
    var fig = byId("mae");
    if (!baker || !fig) return;
    fig.trust = baker.trust;
    fig.bags = baker.bags || 0;
    fig.visits = baker.visits || 0;
    fig.last = baker.last || fig.last;
    fig.known = baker.known;
    fig.want = baker.want || fig.want;
  }

  function kinOf(fig) {
    if (!fig || !fig.kinOf) return null;
    return byId(fig.kinOf);
  }

  function familyTrust(fig) {
    var t = fig.trust || 0.4;
    var k = kinOf(fig);
    if (k && !k.dead) t = Math.min(t, (t + (k.trust || 0.4)) / 2);
    return t;
  }

  function deadHome(fig) {
    try {
      if (!window.going || !going.homes) return null;
      var hs = going.homes();
      for (var i = 0; i < hs.length; i++) {
        if (hs[i] && hs[i].dead && (hs[i].who === fig.n || (fig.id === "mae" && hs[i].neighbor))) return hs[i];
      }
    } catch (e) {}
    return null;
  }

  function liveHome(fig) {
    try {
      if (!window.going || !going.homes) return null;
      var hs = going.homes();
      for (var i = 0; i < hs.length; i++) {
        if (hs[i] && !hs[i].dead && (hs[i].who === fig.n || (fig.id === "mae" && hs[i].neighbor))) return hs[i];
      }
    } catch (e) {}
    return null;
  }

  function attach(idx, rec, st) {
    if (st && st._kinId) return byId(st._kinId);
    var fig = null;
    if (rec && rec.kind === "neighbor") fig = byId("mae");
    if (!fig && rec && rec.name) fig = byName(rec.name);
    if (!fig) {
      var live = living();
      if (!live.length) return null;
      fig = live[(idx + shopDay()) % live.length];
      if (fig.id === "mae" && rec && rec.kind !== "neighbor") {
        fig = live[(idx + shopDay() + 1) % live.length] || fig;
      }
    }
    if (st && fig) st._kinId = fig.id;
    return fig;
  }

  function hurt(fig, amt, why) {
    if (!fig || fig.dead) return;
    fig.trust = Math.max(0.04, (fig.trust || 0.4) - amt);
    fig.last = why || "walked";
    var k = kinOf(fig);
    if (k && !k.dead) {
      k.trust = Math.max(0.04, (k.trust || 0.4) - amt * 0.4);
      k.last = k.last || (fig.n.split(" ")[0] + " walked");
    }
    if (fig.id === "mae") {
      try {
        var n = mae();
        if (n) {
          n.trust = fig.trust;
          n.last = fig.last;
        }
      } catch (e) {}
    }
  }

  function gift(fig, amt, why) {
    if (!fig || fig.dead) return;
    fig.trust = Math.min(1, (fig.trust || 0.4) + amt);
    fig.bags = (fig.bags || 0) + 1;
    fig.visits = (fig.visits || 0) + 1;
    fig.known = true;
    fig.last = why || "took a bag";
    fig.nextD = shopDay() + 1 + ((hash32(fig.id + shopDay()) % 3) | 0);
    if (fig.id === "mae") {
      try {
        var n = mae();
        if (n) {
          n.trust = fig.trust;
          n.bags = fig.bags;
          n.visits = fig.visits;
          n.known = true;
          n.last = fig.last;
        }
      } catch (e) {}
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
        var fig = attach(idx, rec, st);
        if (!fig || fig.dead) return rec;
        rec.name = fig.n;
        rec.kind = rec.kind || fig.kind;
        if (st) {
          st.guestName = fig.n;
          st.kind = rec.kind;
          if (!st.want) st.want = fig.want;
        }

        var keep = !!(st && (st._lateMae || st._goingHold || st._lateKid));
        var k = kinOf(fig);
        var died = deadHome(fig);
        var kept = liveHome(fig);
        var named = namedOf(fig.want);
        var ft = familyTrust(fig);

        if (rec.phase === "look" && st && !st._kinSaid && !keep) {
          st._kinSaid = 1;
          var line = "";
          if (died && !died.told) {
            died.told = true;
            line =
              (died.nick || "The " + died.sp) +
              " died on me. I came for the line.";
            because(fig.n + " came because the one that went home died.");
            gold(line, true);
          } else if (k && k.dead && !fig._lateKin) {
            fig._lateKin = 1;
            line = k.n.split(" ")[0] + " taught me the names. You're not them.";
          } else if (k && !k.dead && k.trust < 0.22) {
            line = k.n.split(" ")[0] + " said you sold a sick one. I'm looking.";
            if (Math.random() < 0.45) {
              rec.phase = "leave";
              st.phase = "leave";
              st.bought = false;
              hurt(fig, 0.04, "walked for " + k.n.split(" ")[0]);
            }
          } else if (kept && rec.kind !== "kid") {
            line = (kept.nick || "The last one") + " is still in my window. Another " + (fig.want || "fish") + ".";
          } else if (named && fig.kind === "collector") {
            line = "That's " + named.nick + ". I know the line. Don't round it.";
            st.want = kindOf(named);
            rec.want = st.want;
          } else if (fig.kind === "kid" && named) {
            line = "Is " + named.nick + " the little one?";
          } else if (ft < 0.18) {
            line = "Just looking. Word's off.";
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
          } else if (!rec.line) {
            line =
              rec.kind === "kid"
                ? "Can we get a " + (fig.want || "fish") + "?"
                : fig.known
                  ? "The usual. " + (fig.want || "A fish") + "."
                  : "I'm " + fig.n.split(" ")[0] + ". " + fig.job + ".";
          }
          if (line) {
            rec.line = line;
            st.line = line;
            st.lineUntil = now() + 3.6;
          }
        }

        if (rec.phase === "pay" && st && !st._kinPay) {
          st._kinPay = 1;
          if (ft < 0.16 && rec.kind !== "neighbor") {
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
            rec.line = "Not from this counter.";
            st.line = rec.line;
            hurt(fig, 0.03, "turned at the till");
          } else if (fig.kind === "collector" && !namedOf(st.want || fig.want) && Math.random() < 0.4) {
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
            rec.line = "I wanted a named one. The line.";
            st.line = rec.line;
            hurt(fig, 0.05, "wanted a named " + (fig.want || "fish"));
            because(fig.n + " walked. A unique fish is a display.");
          } else {
            gift(fig, 0.08, "took the " + (st.want || fig.want || "fish"));
            because(fig.n + " took a bag. " + (k && !k.dead ? k.n.split(" ")[0] + " will hear." : "The block will hear."));
          }
        }

        if (rec.phase === "leave" && st && !st.bought && !st._kinMiss && st._kinSaid) {
          st._kinMiss = 1;
          hurt(fig, 0.06, "walked");
          var k2 = kinOf(fig);
          if (k2 && !k2.dead && fig.trust < 0.28) {
            gold(k2.n.split(" ")[0] + " will hear that " + fig.n.split(" ")[0] + " walked.", true);
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
        var live = living();
        var low = 0;
        var known = 0;
        for (var i = 0; i < live.length; i++) {
          if (live[i].known) known++;
          if (live[i].trust < 0.22) low++;
        }
        if (known) w.sweet = Math.min(1, (w.sweet || 0) + Math.min(0.12, known * 0.02));
        if (low) w.sour = Math.min(1, (w.sour || 0) + Math.min(0.18, low * 0.05));
        if (!w.line && low >= 2) w.line = "Word on the block is off. A family is talking.";
      } catch (e) {}
      return w;
    };
  }

  function steerComing() {
    try {
      if (!window.desk || !desk.coming) return;
      var c = desk.coming();
      if (!c || c.done || c.neighbor || c._kin) return;
      if (c.name && byName(c.name) && c.name !== "Someone off the boats") {
        c._kin = byName(c.name).id;
        return;
      }
      var live = living();
      var d = shopDay();
      var pickF = null;
      for (var i = 0; i < live.length; i++) {
        if (live[i].id === "mae") continue;
        if (live[i].nextD === d || (live[i].trust < 0.24 && live[i].visits > 0)) {
          pickF = live[i];
          break;
        }
      }
      if (!pickF) return;
      c.name = pickF.n;
      c.want = pickF.want;
      c._kin = pickF.id;
      c.had = stockHave().indexOf(pickF.want) >= 0;
      c.hour = Math.max(c.hour || 11, 10.5);
    } catch (e) {}
  }

  function watchTill() {
    try {
      if (!window.shopLife || !shopLife.day) return;
      var day = shopLife.day();
      if (!day || !isFinite(day.sales)) return;
      if (!tillReady) {
        lastSales = day.sales;
        tillReady = true;
        return;
      }
      lastSales = day.sales;
    } catch (e) {}
  }

  function dueLine() {
    var live = living();
    var d = shopDay();
    for (var i = 0; i < live.length; i++) {
      if (live[i].nextD === d && live[i].id !== "mae") {
        return live[i].n.split(" ")[0] + " is coming, for " + live[i].want + ".";
      }
    }
    return "";
  }

  function whisper() {
    if (lastGold && now() - lastGoldAt < 12) return lastGold;
    var due = dueLine();
    if (due) return due;
    var live = living();
    for (var i = 0; i < live.length; i++) {
      if (live[i].trust < 0.18 && live[i].visits) {
        var k = kinOf(live[i]);
        if (k && !k.dead) return k.n.split(" ")[0] + " still talks about the miss.";
        return live[i].n.split(" ")[0] + " will not bag. Word's off.";
      }
    }
    return "";
  }

  function line() {
    var live = living();
    var bits = [];
    for (var i = 0; i < live.length && bits.length < 3; i++) {
      var f = live[i];
      var k = kinOf(f);
      var who = f.n + ", " + f.job;
      if (k) who += " · " + (f.how || "kin") + " of " + k.n.split(" ")[0];
      if (f.last) who += " · " + f.last;
      bits.push(who);
    }
    return bits.join(" / ") || whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) { return a && a.id === "k_kin"; })) return;
      wiki.push({
        id: "k_kin",
        sec: "You and your people",
        t: "The street is a civ",
        tags: "kin family regular cousin grudge name baker mae people dwarf",
        w: "<p>Walk-ins are not kinds. They are people. A name, a job, kin, a god, a preference, a memory of a bag. Mae has a child on this block. The previous keeper left cousins. A miss walks to the family. A dead fish in a window is a grudge. A collector wants a named line, not a SKU.</p><p><b>What to do about it:</b> read Life. The names repeat. Keep the pair the cousin asked for. Do not sell a sick one to a family that talks.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      seedWiki();
      if (sceneName() === "title") return;
      seedFolk();
      syncMae();
      if (now() - lastTick > 0.9) {
        lastTick = now();
        ageStreet();
        steerComing();
        watchTill();
      }
      if (now() - lastUi > 1.2) lastUi = now();
    } catch (e) {}
  }

  window.kin = {
    whisper: whisper,
    line: line,
    folk: function () {
      return state().folk;
    },
    of: byName,
  };

  if (window.__onBeat) window.__onBeat(tick, 240);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 240);
    }, 200);
})();
