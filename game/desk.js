/* desk.js — the shopkeeper's inner life, and the sale as a conversation.
   Recettear's lesson: one line that is mood, want, and money. DF's lesson:
   the person behind the counter also remembers. */
(function () {
  "use strict";

  var lastUi = 0;
  var lastTick = 0;
  var lastHour = -1;
  var lastMissKey = "";
  var lastSaleN = -1;
  var tillReady = false;
  var wired = false;
  var keep = null;

  var floor = [];
  var coming = null;

  function neighbor() {
    var g = gs();
    if (g && g.neighbor && g.neighbor.name) return g.neighbor;
    var n = {
      name: "Mae Costa",
      call: "The baker",
      job: "bakes on Salem Street",
      want: "goldfish",
      money: 34,
      visits: 0,
      bags: 0,
      last: "",
      nextD: 0,
      reason: "walks past when the ovens cool",
      known: false,
      trust: 0.4,
    };
    try {
      if (g) g.neighbor = n;
    } catch (e) {}
    return n;
  }

  function neighborName() {
    var n = neighbor();
    return n.known ? n.name : "The baker on Salem";
  }

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function year() {
    try {
      if (window.saga && typeof saga.year === "function") return saga.year();
    } catch (e) {}
    return 1000;
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

  function hour() {
    try {
      if (typeof gameState === "object" && gameState && isFinite(gameState.t))
        return (((gameState.t % 2400) + 2400) % 2400) / 100;
    } catch (e) {}
    return 12;
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
    if (!arr || !arr.length) return "";
    return arr[(h >>> 0) % arr.length];
  }

  function desk() {
    var g = gs();
    if (g && g.desk && g.desk.short) {
      keep = g.desk;
      return keep;
    }
    if (keep && keep.short) {
      try {
        if (g) g.desk = keep;
      } catch (e) {}
      return keep;
    }
    keep = {
      short: [],
      long: [],
      core: [],
      fatigue: 0.2,
      pride: 0.4,
      worry: 0.2,
      last: "",
      coming: null,
    };
    try {
      if (g) g.desk = keep;
    } catch (e2) {}
    return keep;
  }

  function think(kind, text) {
    if (!text) return;
    var d = desk();
    for (var i = d.short.length - 1; i >= 0 && i >= d.short.length - 3; i--) {
      if (d.short[i] && d.short[i].s === text) return;
    }
    d.last = text;
    var rec = { k: kind || "", s: String(text), y: year(), at: now() };
    d.short.push(rec);
    if (d.short.length > 8) {
      var old = d.short.shift();
      if (old && (old.k === "miss" || old.k === "close" || old.k === "pair")) {
        d.long.push(old);
        if (d.long.length > 8) d.long.shift();
      }
    }
    if ((kind === "pair" || kind === "close" || kind === "year") && d.long.length && Math.random() < 0.3) {
      var hit = false;
      for (var i = 0; i < d.core.length; i++) if (d.core[i].s === text) hit = true;
      if (!hit) {
        d.core.push(rec);
        if (d.core.length > 5) d.core.shift();
      }
    }
  }

  function say(msg, kind) {
    try {
      if (typeof k === "function") k(msg, kind || "");
      else if (typeof toast === "function") toast(msg, kind || "");
    } catch (e) {}
  }

  function write(kind, text) {
    try {
      if (typeof chronicle === "function") {
        var line = String(text || "");
        if (line && !/^Year\s+\d/.test(line)) line = "Year " + year() + ". " + line;
        chronicle(kind, line, []);
      }
    } catch (e) {}
  }

  function namedFront() {
    try {
      var list = typeof allFish === "function" ? allFish() : [];
      var n = [];
      for (var i = 0; i < list.length; i++) if (list[i] && list[i].nick) n.push(list[i].nick);
      return n;
    } catch (e) {}
    return [];
  }

  function kindFor(idx, rec) {
    if (rec && rec.kind) return rec.kind;
    var seed = (idx * 9973 + 17) >>> 0;
    try {
      if (window.shopLife && shopLife.regulars) {
        var regs = shopLife.regulars();
        if (regs && regs.length && rec && rec.idx != null) {
          for (var r = 0; r < regs.length; r++) if (regs[r] && regs[r].visits > 1 && seed % 5 === 0) return "neighbor";
        }
      }
    } catch (e) {}
    if (namedFront().length && seed % 6 === 0) return "collector";
    return KIND[seed % KIND.length];
  }

  function lineForKind(kind, rec) {
    var want = (rec && rec.want) || "fish";
    var have = !!(rec && rec.haveWant);
    var h = hash32(kind + want + (rec && rec.idx));
    if (kind === "kid") {
      return have
        ? pick(["Can we get the " + want + "?", "The little one. How much?", "Look, look — that " + want + "."], h)
        : pick(["Do you have a " + want + "?", "I wanted a " + want + ".", "Mum said maybe a " + want + "."], h);
    }
    if (kind === "collector") {
      return have
        ? pick(["I know a " + want + " when I see one.", "That's the one. Name?", "How much for the " + want + ". Don't round it."], h)
        : pick(["You don't keep " + want + "?", "I came for a " + want + ". The window promised otherwise.", "I'll wait for stock."], h);
    }
    if (kind === "lunch") {
      return have
        ? pick(["The " + want + ". I have twelve minutes.", "How much. Lunch.", "Bag it."], h)
        : pick(["Got a " + want + "? I'm on lunch.", "Not today then.", "After the boats."], h);
    }
    if (kind === "neighbor") {
      return have
        ? pick(["The usual.", "You still keep " + want + ".", "Wrap it, I know the way."], h)
        : pick(["Where's the " + want + " gone?", "I'll come back when you have them.", "Tell me when the pair's in."], h);
    }
    if (kind === "seller") {
      return pick(["I've got a " + want + " in a bucket.", "You buy, or I walk it down the street.", "Off the boats. Cheap."], h);
    }
    return "";
  }

  function wrapBrowse() {
    if (!window.shopBrowse || window.shopBrowse.__desk) return;
    var orig = window.shopBrowse;
    window.shopBrowse = function (idx, slot, W, floorY, personS, simT) {
      var rec = orig.apply(this, arguments);
      try {
        if (!rec) return rec;
        var st = window.shopLife && shopLife.browse ? shopLife.browse()[idx] : null;
        var kind = kindFor(idx, st || rec);
        rec.kind = kind;
        if (st) st.kind = kind;
        if ((rec.phase === "look" || rec.phase === "pay") && Math.random() < 0.62) {
          var line = lineForKind(kind, st || rec);
          if (line) rec.line = line;
        }
        if (rec.line && (rec.phase === "look" || rec.phase === "pay" || rec.phase === "enter")) {
          hear(rec.name || rec.kind || "Someone", rec.line, kind);
        }
        if (kind === "seller" && rec.phase === "look" && st && !st.offered) {
          st.offered = 1;
          onSeller(st, rec);
        }
        if (rec.phase === "leave" && st && !st.bought && !st._deskMiss) {
          st._deskMiss = 1;
          if (!st.coming && st.want && !st.haveWant) think("pair", "A unique fish is a display. A pair is stock.");
        }
      } catch (e) {}
      return rec;
    };
    window.shopBrowse.__desk = 1;
    wired = true;
  }

  function onSeller(st, rec) {
    var d = desk();
    var want = (st && st.want) || "fish";
    var coins = 0;
    try {
      var g = gs();
      coins = g && g.coins;
    } catch (e) {}
    var short = true;
    try {
      if (st.haveWant) short = false;
    } catch (e2) {}
    if (short && coins > 40) {
      d.worry = Math.min(1, d.worry + 0.04);
      think("buy", "A bucket on the counter. I took the " + want + ". We didn't have a pair.");
      write("sale", "A " + want + " came in off the street in a bucket. The shop was short a pair.");
      try {
        if (typeof addRep === "function") addRep(1);
      } catch (e3) {}
    } else {
      think("pass", "A bucket on the counter. I didn't take it.");
    }
  }

  function watchTill() {
    try {
      if (!window.shopLife || !shopLife.day) return;
      var day = shopLife.day();
      var miss = shopLife.misses ? shopLife.misses() : [];
      if (!tillReady) {
        if (!day || !isFinite(day.sales)) return;
        lastSaleN = day.sales;
        if (miss && miss.length) {
          var m0 = miss[miss.length - 1];
          lastMissKey = (m0.name || "") + "|" + (m0.want || "") + "|" + (m0.why || "") + "|" + (m0.y || "");
        }
        tillReady = true;
        return;
      }
      if (day && day.sales === lastSaleN + 1) {
        lastSaleN = day.sales;
        var d = desk();
        d.pride = Math.min(1, d.pride + 0.05);
        d.fatigue = Math.min(1, d.fatigue + 0.03);
        think("sale", "Paper. Water. The bell.");
      } else if (day) lastSaleN = day.sales;
      if (miss && miss.length) {
        var ms = miss[miss.length - 1];
        var key = (ms.name || "") + "|" + (ms.want || "") + "|" + (ms.why || "") + "|" + (ms.y || "");
        if (key !== lastMissKey) {
          lastMissKey = key;
          var d3 = desk();
          d3.worry = Math.min(1, d3.worry + 0.06);
          if (ms.why === "stock") {
            think("miss", (ms.name || "Someone") + " came for a " + (ms.want || "fish") + " I did not have.");
            think("pair", "A unique fish is a display. A pair is stock.");
          } else if (ms.why === "clog") {
            think("miss", "They looked at the water and thought twice. I would have too.");
          } else {
            think("miss", (ms.name || "Someone") + " left without a bag.");
          }
        }
      }
    } catch (e) {}
  }

  function watchHours() {
    var h = hour();
    var d = desk();
    if (lastHour < 0) {
      lastHour = h;
      return;
    }
    if (lastHour < 8 && h >= 8) {
      think("open", "Lights on. Year " + year() + ".");
      d.fatigue = Math.max(0.1, d.fatigue * 0.5);
    }
    if (lastHour < 19.4 && h >= 19.4) {
      var day = window.shopLife && shopLife.day ? shopLife.day() : null;
      var line =
        "Sign over." +
        (day
          ? " " + (day.sales || 0) + " sold, " + (day.misses || 0) + " walked."
          : "");
      think("close", line);
      write("note", line);
      say(line, "");
      d.fatigue = Math.min(1, d.fatigue + 0.15);
      if (day && day.misses > day.sales) {
        think("close", "Walked beat sold. That is the lesson.");
        d.core.push({ k: "close", s: "Walked beat sold.", y: year(), at: now() });
      }
    }
    lastHour = h;
    d.fatigue = Math.max(0, d.fatigue - 0.002);
  }

  function currentThought() {
    var d = desk();
    if (d.core.length && Math.random() < 0.25) return d.core[d.core.length - 1].s;
    if (d.short.length) return d.short[d.short.length - 1].s;
    if (d.worry > 0.55) return "The filter is going to pack and I can hear it from here.";
    if (d.fatigue > 0.7) return "Last hour always lasts.";
    if (d.pride > 0.6) return "The tetras are up. That is enough for a morning.";
    return "Year " + year() + " and I still look at the door when it opens.";
  }

  function esc(s) {
    var map = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;" };
    return String(s || "").replace(/[&<>"]/g, function (c) {
      return map[c];
    });
  }

  function hear(who, line, kind) {
    if (!line) return;
    if (floor.length && floor[floor.length - 1].s === line) return;
    floor.push({ who: who || "Someone", s: String(line), k: kind || "", at: now() });
    if (floor.length > 8) floor.shift();
  }

  function clockWord(h) {
    var hr = Math.floor(h);
    var m = Math.round((h - hr) * 60);
    if (m >= 60) {
      hr++;
      m = 0;
    }
    var h12 = hr % 12;
    if (!h12) h12 = 12;
    if (m === 0) return h12 + (hr >= 12 ? " this afternoon" : " this morning");
    if (m === 30) return "half past " + h12;
    return h12 + ":" + (m < 10 ? "0" : "") + m;
  }

  function hoped() {
    try {
      if (window.shopLife && typeof shopLife.hoped === "function") return shopLife.hoped() || ["guppy"];
    } catch (e) {}
    return ["betta", "guppy", "tetra", "goldfish", "angelfish", "cory"];
  }

  function stockHave() {
    try {
      if (window.shopLife && typeof shopLife.stock === "function") return shopLife.stock() || [];
    } catch (e) {}
    return [];
  }

  function seedComing() {
    var d = desk();
    var n = neighbor();
    if (d.coming && d.coming.d === shopDay()) {
      coming = d.coming;
      return coming;
    }
    var h = hour();
    if (h > 17.5) return coming;
    var due = n.nextD === shopDay() || n.nextD === 0;
    var who = due ? neighborName() : "";
    if (!due) {
      try {
        var regs = window.shopLife && shopLife.regulars ? shopLife.regulars() : [];
        for (var r = 0; r < (regs || []).length; r++) if (regs[r] && regs[r].name && regs[r].name !== n.name) {
          who = regs[r].name;
          break;
        }
      } catch (e) {}
      if (!who) who = "Someone off the boats";
    }
    var have = stockHave();
    var want = due ? (n.bags ? n.want || "goldfish" : "goldfish") : hoped()[(hash32(year() + "w") >>> 0) % hoped().length];
    if (due && n.bags && have.indexOf("goldfish") >= 0 && Math.random() < 0.4) {
      want = n.want && n.want !== "goldfish" ? n.want : "tetra";
    }
    var when = due ? (n.bags ? 11.2 : 16.9) : Math.max(h + 0.8, 10.5 + ((hash32(year() + "h") >>> 0) % 70) / 10);
    if (when > 17.2) when = 16.5;
    coming = {
      name: who,
      want: want,
      hour: when,
      done: false,
      y: year(),
      d: shopDay(),
      had: have.indexOf(want) >= 0,
      neighbor: due ? 1 : 0,
    };
    d.coming = coming;
    think("open", coming.name + " at " + clockWord(coming.hour) + ", for " + coming.want + ".");
    return coming;
  }

  function watchComing() {
    seedComing();
    if (!coming || coming.done) return;
    var h = hour();
    if (h < coming.hour) return;
    coming.done = true;
    coming.arrived = now();
    var d = desk();
    d.coming = coming;
    var n = neighbor();
    var have = stockHave();
    var wet = false;
    try {
      var wetCut = coming.neighbor && n.trust > 0.55 ? 0.62 : 0.42;
      wet = !!(window.shopSite && shopSite.wet() > wetCut);
    } catch (eW) {}
    var broke = coming.neighbor && n.money < 12;
    var ok = have.indexOf(coming.want) >= 0 && !wet && !broke;
    coming.had = ok;
    var line;
    if (wet && coming.neighbor) {
      line = n.known ? "I bake. I don't stand in water." : "The floor's wet. I'll come back.";
    } else if (broke && coming.neighbor) {
      line = "After the flour bill. Not today.";
    } else if (coming.neighbor && n.last && /walked/.test(n.last) && ok) {
      line = "You kept the " + coming.want + ". I knew you would.";
    } else if (coming.neighbor && n.last && /walked/.test(n.last) && !ok) {
      line = "Still no " + coming.want + ". I asked.";
    } else if (coming.neighbor && n.bags && ok) {
      line = "The last one is still in the bakery window. Another " + coming.want + ".";
    } else if (coming.neighbor && n.bags && !ok) {
      line = "I thought you'd keep " + coming.want + " after last time.";
    } else if (ok) {
      line = "The " + coming.want + ". I said I'd come.";
    } else {
      line = "You don't keep " + coming.want + "?";
    }
    try {
      if (window.faith && faith.line && coming.want && faith.taboo && faith.taboo() === coming.want) {
        var fl = faith.line();
        if (fl) line = fl;
      } else if (window.beast && beast.near && beast.near() > 0.14) {
        var bl = beast.line && beast.line();
        if (bl) line = bl;
      } else if (window.tongue && tongue.say) {
        line = tongue.say(coming.name, line);
      }
    } catch (eF) {}
    hear(coming.name, line, "neighbor");
    try {
      var browse = window.shopLife && shopLife.browse ? shopLife.browse() : null;
      if (browse) {
        var t = now();
        browse[2] = {
          tank: 0,
          until: t + 5.5,
          phase: ok ? "pay" : "look",
          line: line,
          lineUntil: t + 5.5,
          bought: !!ok,
          want: coming.want,
          haveWant: ok,
          coming: 1,
          guestName: coming.name,
        };
      }
    } catch (eB) {}
    if (ok) {
      think("sale", coming.name + " came for the " + coming.want + ". I had a pair.");
      try {
        var day = window.shopLife && shopLife.day ? shopLife.day() : null;
        if (day) day.sales = (day.sales || 0) + 1;
      } catch (eD) {}
      if (coming.neighbor) {
        n.bags = (n.bags || 0) + 1;
        n.visits = (n.visits || 0) + 1;
        n.known = true;
        n.last = "took the " + coming.want;
        n.money = Math.max(0, (n.money || 0) - 12);
        n.trust = Math.min(1, (n.trust || 0.4) + 0.2);
        n.nextD = shopDay() + 1;
        n.want = coming.want;
        think("close", n.name + " will be back. She has a name now.");
      }
      try {
        var regs = window.shopLife && shopLife.regulars ? shopLife.regulars() : [];
        for (var r = 0; r < (regs || []).length; r++) {
          if (regs[r] && regs[r].name === coming.name) {
            regs[r].visits = (regs[r].visits || 0) + 1;
            regs[r].spent = (regs[r].spent || 0) + 12;
          }
        }
      } catch (eR) {}
      try {
        var g = gs();
        if (g) g.coins = (g.coins || 0) + 12;
      } catch (eC) {}
      try {
        if (window.weave && weave.because) weave.because(coming.name + " bought because we kept a pair of " + coming.want + ".");
      } catch (e) {}
      try {
        if (window.faith && faith.onSale) faith.onSale(coming.want);
      } catch (eF2) {}
      try {
        if (window.guild && guild.noteSale) guild.noteSale(coming.want);
      } catch (eG) {}
      try {
        if (window.craft && craft.noteBag) craft.noteBag(true);
      } catch (eK) {}
      try {
        if (typeof k === "function") k(coming.name + " came for the " + coming.want + ".", "gold");
      } catch (e2) {}
      try {
        if (window.feel && feel.play) feel.play("chime");
      } catch (e3) {}
    } else {
      think(
        "miss",
        wet
          ? coming.name + " turned around. The aisle was wet."
          : broke
            ? coming.name + " had no money today."
            : coming.name + " came for a " + coming.want + " I did not have."
      );
      try {
        var day2 = window.shopLife && shopLife.day ? shopLife.day() : null;
        if (day2) day2.misses = (day2.misses || 0) + 1;
        var miss = window.shopLife && shopLife.misses ? shopLife.misses() : null;
        if (miss) {
          miss.push({
            name: coming.name,
            want: coming.want,
            why: wet ? "wet" : broke ? "broke" : "stock",
            y: year(),
          });
          if (miss.length > 16) miss.shift();
        }
      } catch (eM) {}
      try {
        if (window.weave && weave.because)
          weave.because(
            coming.name +
              (wet
                ? " walked because the aisle was wet"
                : broke
                  ? " walked because the flour bill came first"
                  : " walked because we had no pair of " + coming.want)
          );
      } catch (e4) {}
      try {
        if (window.guild && guild.noteMiss) guild.noteMiss(coming.want);
      } catch (eGm) {}
      try {
        if (window.craft && craft.noteBag) craft.noteBag(false);
      } catch (eKm) {}
      try {
        if (typeof k === "function")
          k(
            wet
              ? coming.name + " saw the wet boards and left."
              : coming.name + " came. We didn't have the " + coming.want + ".",
            "bad"
          );
      } catch (e5) {}
      if (coming.neighbor) {
        n.visits = (n.visits || 0) + 1;
        if (wet) n.last = "turned. the aisle was wet";
        else if (broke) n.last = "couldn't pay. flour bill";
        else n.last = "walked. no " + coming.want;
        n.nextD = shopDay() + 1;
        n.want = coming.want;
        n.trust = Math.max(0, (n.trust || 0.4) - 0.12);
        think("close", wet ? n.call + " turned around. The boards were wet." : n.call + " will try again tomorrow.");
      }
    }
  }

  function watchFish() {
    try {
      if (typeof allFish !== "function") return;
      var list = allFish() || [];
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        if (f && f.nick && f.mind && f.mind.stress > 0.7 && !f.mind._kept) {
          f.mind._kept = 1;
          think("water", (f.nick || "One of them") + " is holding too still. I would not bag that.");
          return;
        }
      }
    } catch (e) {}
  }

  function watchWalk() {
    var n = neighbor();
    if (!coming || !coming.neighbor || coming.done) return;
    if (hour() < 9 || hour() >= coming.hour - 0.1) return;
    if (n._walked === shopDay()) return;
    n._walked = shopDay();
    hear(neighborName(), n.last && /wet/.test(n.last) ? "Still wet?" : n.bags ? "Just looking. The last one is fine." : "Just looking. Ovens are cooling.", "neighbor");
  }

  function enhanceLife() {
    var body = document.getElementById("dbody");
    var title = document.getElementById("dtitle");
    if (!body || !title) return;
    if (!/Your life|Life/i.test(title.textContent || "")) return;

    ["hook-life", "weave-life", "mind-life", "saga-street", "saga-life", "live-life", "life-so-far-fill"].forEach(function (cls) {
      var n = body.querySelectorAll("." + cls);
      for (var i = 0; i < n.length; i++) n[i].style.display = "none";
    });

    var d = desk();
    var html = '<div class="sec">Today</div>';
    var wxLine = "";
    try {
      if (window.saga && saga.book) {
        var b = saga.book();
        if (b && b.wx) wxLine = b.wx;
        if (b && b.water) wxLine = (wxLine ? wxLine + " · " : "") + b.water;
      }
    } catch (eW) {}
    html +=
      '<div class="note">Year ' +
      year() +
      " · " +
      clockWord(hour()) +
      (wxLine ? " · " + esc(wxLine) : "") +
      ".</div>";

    try {
      var nb = neighbor();
      html +=
        '<div class="row"><div></div><div><div class="n">' +
        esc(nb.known ? nb.name : nb.call) +
        '</div><div class="d">' +
        esc(nb.job) +
        " · " +
        esc(nb.reason) +
        (nb.last ? " · last: " + esc(nb.last) : " · wants " + esc(nb.want)) +
        (nb.nextD === shopDay() ? " · due today" : "") +
        ".</div></div><div></div></div>";
    } catch (eN) {}

    try {
      if (window.shopSite && shopSite.grid) {
        html += '<div class="sec">The site</div>' + shopSite.grid();
        html +=
          '<div class="row"><div></div><div><div class="d">' +
          esc(shopSite.line()) +
          "</div></div><div></div></div>";
      }
    } catch (eS) {}

    var entries = [];
    function add(kind, text, who) {
      if (!text) return;
      for (var i = 0; i < entries.length; i++) if (entries[i].s === text) return;
      entries.push({ k: kind || "", s: String(text), who: who || "" });
    }
    if (coming && !coming.done) {
      add(
        "due",
        coming.name +
          " at " +
          clockWord(coming.hour) +
          ", for " +
          coming.want +
          ". " +
          (stockHave().indexOf(coming.want) >= 0 ? "We have a pair." : "We do not have a pair.")
      );
    } else if (coming && coming.done) {
      add("came", coming.name + (coming.had ? " took the " + coming.want + "." : " walked. No " + coming.want + "."));
    }
    for (var si = 0; si < d.short.length; si++) {
      if (d.short[si].k === "sale" && /Paper/.test(d.short[si].s || "")) continue;
      add(d.short[si].k, d.short[si].s);
    }
    for (var f = 0; f < floor.length; f++) add("glass", floor[f].s, floor[f].who);
    try {
      if (window.shopSite && shopSite.log) {
        var sl = shopSite.log();
        for (var L = 0; L < sl.length; L++) add("site", sl[L].s);
      }
    } catch (eL) {}
    try {
      var bags = window.__bagsThisOpen || 0;
      add("run", bags ? bags + (bags === 1 ? " bag since the door opened." : " bags since the door opened.") : "The till is quiet.");
    } catch (eH) {}
    try {
      if (window.weave && weave.of) {
        var bec = weave.of().because || [];
        if (bec.length) add("because", bec[bec.length - 1].s);
      }
    } catch (eB) {}
    try {
      if (window.choir && choir.line) {
        var cl = choir.line();
        if (cl) add("glass", cl);
      }
    } catch (eCh) {}
    try {
      if (window.going && going.line) {
        var gl = going.line();
        if (gl) add("block", gl);
      }
      if (window.going && going.homes) {
        var hs = going.homes();
        var shown = 0;
        for (var hi = 0; hi < hs.length && shown < 2; hi++) {
          if (!hs[hi] || hs[hi].dead) continue;
          var call = hs[hi].nick || ("the " + hs[hi].sp);
          add("block", call + " is in " + hs[hi].who + "'s window.");
          shown++;
        }
      }
      if (window.going && going.letter) {
        var lt = going.letter();
        if (lt && lt.open && !lt.filled) {
          add("hold", "A letter from " + lt.from + ". They asked for a pair of " + lt.want + ".");
        }
      }
    } catch (eGo) {}
    try {
      if (window.mind && mind.dwell && typeof allFish === "function") {
        var fish = allFish() || [];
        for (var fi = 0; fi < fish.length; fi++) {
          if (fish[fi] && fish[fi].nick) {
            var dw = mind.dwell(fish[fi]);
            if (dw) {
              add("tank", dw, fish[fi].nick);
              break;
            }
          }
        }
      }
    } catch (eM) {}
    try {
      if (window.liveAtlas && liveAtlas.log) {
        var yl = liveAtlas.log();
        if (yl.length && yl[yl.length - 1].s) add("out", yl[yl.length - 1].s);
      }
    } catch (eO) {}

    html += '<div class="sec">The daybook</div>';
    var start = Math.max(0, entries.length - 12);
    for (var e = start; e < entries.length; e++) {
      html +=
        '<div class="row book-line"><div>' +
        esc(entries[e].who || entries[e].k || "") +
        "</div><div><div class=\"d\">" +
        esc(entries[e].s) +
        "</div></div><div></div></div>";
    }
    if (entries.length <= 1) {
      html +=
        '<div class="row"><div></div><div><div class="d">The book is still the first page. The street will write the rest.</div></div><div></div></div>';
    }

    var wrap = body.querySelector(".desk-life");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "desk-life";
      body.insertBefore(wrap, body.firstChild);
    }
    if (wrap.getAttribute("data-h") !== String(html.length)) {
      wrap.innerHTML = html;
      wrap.setAttribute("data-h", String(html.length));
    }
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : WIKI;
      if (!w || !w.push) return;
      var extra = [
        {
          id: "k_desk",
          sec: "The shop floor",
          t: "Behind the counter",
          tags: "keeper thoughts desk fatigue pride sale miss closing",
          w: "<p>Life is a daybook. One page for the day: who is due, what the keeper thought, what the water did, what the street said, and the site under the boards. Heat moves. Standing water runs downhill. A packed filter leaks onto oak. The little map is the shop as a place, not a menu.</p><p><b>What to do about it:</b> read Life when the floor is quiet. The gold line is the unfinished thing. The daybook is why.</p>",
        },
        {
          id: "k_talk",
          sec: "The shop floor",
          t: "The sale is a conversation",
          tags: "haggle kid collector lunch neighbor seller counter recettear want",
          w: "<p>People do not all come in the same. A kid asks if they can get the little one. A collector knows a tetra from a tetra and does not want you to round it. Lunch has twelve minutes. A neighbor wants the usual. Once in a while someone puts a bucket on the counter.</p><p>Someone is always coming. Life says who, and for what. Keep a pair before they walk in. That is the next hour. <b>What to do about it:</b> the gold line. Life, Coming. At the glass is what they actually said.</p>",
        },
      ];
      for (var i = 0; i < extra.length; i++) {
        var hit = false;
        for (var j = 0; j < w.length; j++) if (w[j] && w[j].id === extra[i].id) hit = true;
        if (!hit) w.push(extra[i]);
      }
    } catch (e) {}
  }

  var opened = false;

  function tick() {
    try {
      wrapBrowse();
      seedWiki();
      if (!opened) {
        opened = true;
        think("open", "Year " + year() + " and I still look at the door when it opens.");
      }
      if (now() - lastTick > 0.9) {
        lastTick = now();
        watchTill();
        watchHours();
        watchComing();
        watchWalk();
        watchFish();
      }
      if (now() - lastUi > 0.7) {
        lastUi = now();
        enhanceLife();
      }
    } catch (e) {}
  }
window.desk = {
    think: think,
    of: desk,
    thought: currentThought,
    coming: function () {
      return coming || (desk() && desk().coming);
    },
    neighbor: neighbor,
    floor: function () {
      return floor;
    },
  };


  if (window.__onBeat) window.__onBeat(tick, 280);
  else setTimeout(function loop() { tick(); setTimeout(loop, 280); }, 280);

})();
