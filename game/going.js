/* going.js — the shop is porous.
   A fish bag is not a deletion. They live on the block. The baker's window
   is a tank. The harbor comes in under the boards at night. The inland
   hold writes; filling a pair is how you answer, and a road can reopen.
   No second HUD. Odds, speech, the gold line, a puddle that is the sea. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var lastSales = -1;
  var tillReady = false;
  var lastSnap = [];
  var lastDeath = "";
  var lastDeathAt = 0;
  var lastFry = "";
  var lastFryAt = 0;
  var lastBagLine = "";
  var lastBagAt = 0;
  var lastTideSaid = 0;
  var lastHour = -1;
  var didBrowse = false;
  var didChoir = false;
  var didFish = false;

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  // True if a stamp from now() is under secs old. now() restarts near 0 on every page load,
  // and some of these stamps are saved, so an age below zero is from an earlier load: old.
  function within(at, secs) {
    var age = now() - at;
    return age >= 0 && age < secs;
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

  function hour() {
    try {
      if (typeof jt === "function") return jt() * 24;
      var g = gs();
      if (g && isFinite(g.t)) return (((g.t % 2400) + 2400) % 2400) / 100;
    } catch (e) {}
    return 12;
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

  function clamp01(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.rumor && rumor.add) rumor.add("block", text, 0.65);
    } catch (e2) {}
    try {
      if (window.desk && desk.think) desk.think("block", text);
    } catch (e3) {}
  }

  function say(msg, kind) {
    try {
      if (typeof k === "function") k(msg, kind || "");
    } catch (e) {}
  }

  function play(name, x) {
    try {
      if (window.feel && feel.play) feel.play(name, x);
    } catch (e) {}
  }

  function egg(id, line) {
    try {
      if (typeof findEgg === "function") findEgg(id, line);
    } catch (e) {}
  }

  function kindOf(f) {
    if (!f) return "fish";
    try {
      var S = typeof O !== "undefined" ? O : typeof SPECIES !== "undefined" ? SPECIES : null;
      if (S && f.sp != null && S[f.sp]) {
        return String(S[f.sp].gname || S[f.sp].name || S[f.sp].vname || "fish").toLowerCase();
      }
    } catch (e) {}
    var sp = String((f && f.sp) || "fish").toLowerCase();
    if (/gold/.test(sp)) return "goldfish";
    if (/betta/.test(sp)) return "betta";
    if (/guppy/.test(sp)) return "guppy";
    if (/tetra/.test(sp)) return "tetra";
    if (/angel/.test(sp)) return "angelfish";
    if (/cichlid/.test(sp)) return "cichlid";
    return sp || "fish";
  }

  function fidOf(f) {
    if (!f) return "";
    if (f.fid != null && f.fid !== "") return "fid:" + f.fid;
    if (f.id != null && String(f.id).length) return "id:" + f.id;
    if (f.nick) return "nick:" + f.nick;
    var sp = f.sp != null ? String(f.sp) : "";
    var born = f.born != null ? String(f.born) : "";
    var px = f.px != null ? Math.round(f.px) : "";
    var py = f.py != null ? Math.round(f.py) : "";
    return "k:" + sp + ":" + born + ":" + px + ":" + py;
  }

  function snapFish() {
    var list = fishList();
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (!f) continue;
      out.push({
        id: fidOf(f),
        nick: f.nick || "",
        sp: kindOf(f),
        sick: !!(f.sick || f.ill || f.risen),
        named: !!f.nick,
        risen: !!f.risen,
      });
    }
    return out;
  }

  function state() {
    var g = gs();
    if (g && g.going && Array.isArray(g.going.homes)) {
      if (!g.going._purged) {
        g.going._purged = 1;
        g.going.homes = g.going.homes.filter(function (h) {
          return h && h.sp && h.sp !== "fish";
        });
      }
      return g.going;
    }
    var st = {
      homes: [],
      letter: { open: false, from: "", want: "", y: 0, day: -1, filled: false },
      lastSaleN: -1,
      notes: [],
    };
    try {
      if (g) g.going = st;
    } catch (e) {}
    return st;
  }

  function note(text) {
    if (!text) return;
    var st = state();
    if (st.notes[st.notes.length - 1] === text) return;
    st.notes.push(text);
    if (st.notes.length > 10) st.notes.shift();
  }

  function moon() {
    return (shopDay() % 28) / 28;
  }

  function springTide() {
    var d = shopDay() % 28;
    return d <= 1 || d >= 27 || (d >= 13 && d <= 15);
  }

  function tide() {
    var h = hour();
    var spring = springTide();
    var base = spring ? 0.62 : 0.22;
    var twice = Math.abs(Math.sin((h / 12) * Math.PI));
    var night = h < 6.4 || h >= 19;
    var lift = night ? 1 : 0.28;
    return clamp01(base * (0.35 + twice * 0.75) * lift);
  }

  function bakerName() {
    try {
      var n = window.desk && desk.neighbor ? desk.neighbor() : null;
      if (n) return n.known && n.name ? n.name : "The baker";
    } catch (e) {}
    return "The baker";
  }

  function whoBought(sp) {
    try {
      var c = window.desk && desk.coming ? desk.coming() : null;
      if (c && c.arrived && within(c.arrived, 28)) {
        return {
          who: c.name || bakerName(),
          whoKind: c.neighbor ? "neighbor" : "lunch",
          neighbor: !!c.neighbor,
          care: c.neighbor ? 0.82 : 0.48,
        };
      }
    } catch (e) {}
    try {
      var br = window.shopLife && shopLife.browse ? shopLife.browse() : null;
      if (br) {
        for (var i = 0; i < br.length; i++) {
          var st = br[i];
          if (st && (st.bought || st.phase === "pay") && now() - (st.payAt || now()) < 8) {
            var kind = st.kind || "lunch";
            var care = 0.5;
            if (kind === "neighbor") care = 0.82;
            else if (kind === "collector") care = 0.7;
            else if (kind === "kid") care = 0.42;
            else if (kind === "lunch") care = 0.44;
            return {
              who: st.guestName || st.name || "Someone on Salem",
              whoKind: kind,
              neighbor: kind === "neighbor",
              care: care,
            };
          }
        }
      }
    } catch (e2) {}
    var baker = /gold/.test(String(sp || ""));
    return {
      who: baker ? bakerName() : "Someone on Salem",
      whoKind: baker ? "neighbor" : "lunch",
      neighbor: baker,
      care: baker ? 0.78 : 0.5,
    };
  }

  function bumpWild(kind, dlt) {
    if (!kind) return;
    try {
      if (window.wild && wild.of) {
        var w = wild.of();
        if (w && w.pop) {
          var cur = w.pop[kind];
          if (cur == null) cur = 0.45;
          w.pop[kind] = clamp01(cur + dlt);
        }
      }
    } catch (e) {}
  }

  function takeHome(gone) {
    if (!gone) return;
    var st = state();
    var buyer = whoBought(gone.sp);
    var home = {
      nick: gone.nick || "",
      sp: gone.sp || "fish",
      who: buyer.who,
      whoKind: buyer.whoKind,
      neighbor: !!buyer.neighbor,
      care: buyer.care,
      health: gone.sick ? 0.32 : 0.72 + buyer.care * 0.12,
      named: !!gone.named,
      sick: !!gone.sick,
      risen: !!gone.risen,
      day: shopDay(),
      y: year(),
      dead: false,
      fry: 0,
      told: false,
    };
    st.homes.push(home);
    if (st.homes.length > 36) st.homes.shift();
    bumpWild(home.sp, 0.04);
    var call = home.nick || "The " + home.sp;
    var line = call + " went home with " + home.who + ". The block keeps them.";
    lastBagLine = line;
    lastBagAt = now();
    note(line);
    because(line);
    egg("blockkeep", line);
    if (home.neighbor) {
      say(home.who + "'s window has a " + home.sp + " now.", "gold");
    }
    fillLetterIf(home.sp);
  }

  function watchBags() {
    try {
      if (sceneName() === "title") return;
      if (!window.shopLife || !shopLife.day) return;
      var day = shopLife.day();
      if (!day || !isFinite(day.sales)) return;
      if (!tillReady) {
        lastSales = day.sales;
        lastSnap = snapFish();
        tillReady = true;
        return;
      }
      if (day.sales === lastSales + 1) {
        lastSales = day.sales;
        var nowSnap = snapFish();
        var have = Object.create(null);
        for (var i = 0; i < nowSnap.length; i++) have[nowSnap[i].id] = 1;
        var taken = null;
        for (var j = 0; j < lastSnap.length; j++) {
          if (!lastSnap[j].id || have[lastSnap[j].id]) continue;
          taken = lastSnap[j];
          if (taken.named) break;
        }
        if (taken && taken.sp) takeHome(taken);
        lastSnap = nowSnap;
      } else {
        lastSnap = snapFish();
        lastSales = day.sales;
      }
    } catch (e) {}
  }

  function tickHomes() {
    var st = state();
    var d = shopDay();
    for (var i = 0; i < st.homes.length; i++) {
      var h = st.homes[i];
      if (h.dead) continue;
      if (h._day === d) continue;
      h._day = d;
      var drift = (h.care - 0.46) * 0.09;
      if (h.sick) drift -= 0.08;
      if (h.risen) drift -= 0.12;
      h.health = clamp01(h.health + drift);
      if (h.health < 0.14) {
        dieOnBlock(h);
        continue;
      }
      if (h.fry === 0 && h.health > 0.62 && d - h.day >= 2) {
        var pair = 0;
        for (var k = 0; k < st.homes.length; k++) {
          var o = st.homes[k];
          if (!o.dead && o.sp === h.sp && o.who === h.who) pair++;
        }
        if (pair >= 2 || (h.neighbor && h.care > 0.7)) {
          h.fry = 1;
          var fryLine = h.who + " has fry. Off the " + (h.nick || h.sp) + " that went home.";
          lastFry = fryLine;
          lastFryAt = now();
          note(fryLine);
          because(fryLine);
          egg("blockfry", fryLine);
        }
      }
    }
  }

  function dieOnBlock(h) {
    h.dead = true;
    h.health = 0;
    bumpWild(h.sp, -0.05);
    var call = h.nick || "The " + h.sp;
    var line = call + " died in " + h.who + "'s window.";
    lastDeath = line;
    lastDeathAt = now();
    note(line);
    because(line);
    say(line, "bad");
    egg("blockdead", line);
    try {
      if (window.saga && saga.book) {
        var b = saga.book();
        if (b && Array.isArray(b.dead)) {
          b.dead.push({ n: h.nick || h.sp, how: "on the block", y: year(), who: h.who, street: 1 });
          if (b.dead.length > 80) b.dead.shift();
        }
      }
    } catch (e) {}
    try {
      if (window.desk && h.neighbor && desk.neighbor) {
        var n = desk.neighbor();
        if (n) n.trust = Math.max(0.08, (n.trust || 0.4) - 0.12);
      }
    } catch (e2) {}
  }

  function fillLetterIf(sp) {
    var st = state();
    var L = st.letter;
    if (!L.open || L.filled) return;
    if (L.want && sp && String(sp).toLowerCase() === String(L.want).toLowerCase()) {
      L.filled = true;
      L.open = false;
      var line = "The town was answered. A pair of " + L.want + " is on the water.";
      note(line);
      because(line);
      say(line, "gold");
      egg("holdsent", line);
      play("chime");
      try {
        if (window.weave && weave.bumpWord) weave.bumpWord(0.08);
      } catch (e) {}
      try {
        if (window.road && road.of) {
          var r = road.of();
          if (r && r.routes) {
            for (var i = 0; i < r.routes.length; i++) {
              if (r.routes[i].cut && (r.routes[i].a === 0 || r.routes[i].b === 0)) {
                r.routes[i].cut = 0;
                r.note = "A hold from " + (L.from || "inland") + " made the harbor.";
                break;
              }
            }
          }
        }
      } catch (e2) {}
    }
  }

  function watchLetter() {
    var st = state();
    var L = st.letter;
    var cut = false;
    var from = "";
    try {
      if (window.road && road.cut) cut = !!road.cut();
      if (window.road && road.of) {
        var r = road.of();
        if (r && r.caravan) from = r.caravan;
      }
    } catch (e) {}
    if (!from) {
      try {
        if (window.realm && realm.traveler) {
          var t = realm.traveler();
          if (t && t.site && t.site.n) from = t.site.n;
        }
      } catch (e2) {}
    }
    if (!from) from = "the inland town";

    var want = "";
    try {
      if (window.wild && wild.of) {
        var w = wild.of();
        for (var k in w.pop) {
          if (w.pop[k] < 0.28) {
            want = k;
            break;
          }
        }
      }
    } catch (e3) {}
    if (!want) {
      try {
        var c = window.desk && desk.coming ? desk.coming() : null;
        if (c && c.want) want = c.want;
      } catch (e4) {}
    }
    if (!want) want = "tetra";

    if (cut && !L.open && !L.filled) {
      L.open = true;
      L.filled = false;
      L.from = from;
      L.want = want;
      L.y = year();
      L.day = shopDay();
      var line = "A letter from " + from + ". They asked for a pair of " + want + ".";
      note(line);
      because(line);
      play("paper");
    }
    if (L.open && !L.filled && shopDay() - (L.day || 0) > 5) {
      L.open = false;
      var late = "The letter went unanswered. The town is still late.";
      note(late);
      because(late);
      try {
        if (window.weave && weave.bumpWord) weave.bumpWord(-0.04);
      } catch (e5) {}
    }
    if (!cut && L.filled) {
      L.filled = false;
    }
  }

  function applyTide() {
    var t = tide();
    if (t < 0.2) return;
    try {
      if (!window.shopSite || !shopSite.of) return;
      var s = shopSite.of();
      if (!s || !s.cells) return;
      var W = s.w || 16;
      for (var i = 0; i < s.cells.length; i++) {
        var c = s.cells[i];
        if (c.kind !== "floor") continue;
        var nearDoor = c.x >= W - 4 && c.y >= 3 && c.y <= 7;
        if (nearDoor) c.wet = Math.max(c.wet || 0, t * 0.72);
      }
      if (s.wetMax < t * 0.72) s.wetMax = t * 0.72;
    } catch (e) {}
    if (t > 0.4 && now() - lastTideSaid > 28) {
      lastTideSaid = now();
      var line = springTide() ? "Spring tide. The harbor's in under the boards." : "The harbor's in under the boards.";
      note(line);
      because(line);
      play("drip");
      egg("tidein", line);
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
        var go = state();
        var L = go.letter;

        if (L.open && !L.filled && rec.phase === "look" && st && !st._goingHold) {
          if ((idx | 0) === 0 || rec.kind === "collector") {
            st._goingHold = 1;
            rec.name = rec.name || "Someone from " + L.from;
            rec.line = "From " + L.from + ". A pair of " + L.want + ". The letter said.";
            rec.want = L.want;
            st.want = L.want;
            st.line = rec.line;
            st.lineUntil = now() + 4;
          }
        }

        if (st && !st._goingSaid && (rec.phase === "look" || rec.phase === "pay")) {
          var hit = null;
          for (var i = 0; i < go.homes.length; i++) {
            var h = go.homes[i];
            if (h.whoKind === rec.kind || (h.neighbor && rec.kind === "neighbor")) {
              hit = h;
              if (h.neighbor) break;
            }
          }
          if (hit) {
            st._goingSaid = 1;
            if (hit.dead && !hit.told) {
              hit.told = true;
              rec.line = (hit.nick || "The " + hit.sp) + " died on me. In the window.";
              st.line = rec.line;
              if (rec.phase === "pay" && Math.random() < 0.55) {
                rec.phase = "leave";
                st.phase = "leave";
                st.bought = false;
              }
            } else if (hit.fry === 1) {
              hit.fry = 2;
              rec.line = "I brought the little one. Off mine.";
              st.line = rec.line;
              lastFry = rec.line;
              lastFryAt = now();
              play("hatch");
              because(hit.who + " brought fry off the " + (hit.nick || hit.sp) + " that went home.");
              try {
                if (typeof addRep === "function") addRep(2);
              } catch (eR) {}
            } else if (!hit.dead && rec.phase === "look") {
              rec.line = rec.line || "The last one is still in the window. Another " + (hit.sp || "fish") + ".";
              st.line = rec.line;
            }
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
        var n = 0;
        var homes = state().homes;
        for (var i = 0; i < homes.length; i++) {
          if (!homes[i].dead && homes[i].named) n++;
        }
        w.echo = n;
        w.tide = tide();
        if (n) w.sweet = Math.min(1, w.sweet + Math.min(0.22, n * 0.05));
        if (lastDeath && now() - lastDeathAt < 24) w.sour = Math.min(1, w.sour + 0.16);
        if (!w.line) {
          if (state().letter.open && !state().letter.filled) {
            w.line = "A letter from " + state().letter.from + ". They asked for a pair of " + state().letter.want + ".";
          } else if (w.tide > 0.42) {
            w.line = "The harbor's in under the boards.";
          } else if (n) {
            w.line = echoLine();
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
        var t = tide();
        if (a && a.fish && a.x != null && t > 0.28 && sceneName() === "tank") {
          a.y += t * 0.9;
          a.x += Math.sin((now() + (a.fish.fid || 0)) * 0.7) * t * 0.6;
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  }

  function echoLine() {
    var homes = state().homes;
    for (var i = 0; i < homes.length; i++) {
      var h = homes[i];
      if (!h.dead && h.named) {
        return (h.nick || "The one you bagged") + " is still in " + h.who + "'s window.";
      }
    }
    for (var j = 0; j < homes.length; j++) {
      if (!homes[j].dead) {
        return "The " + homes[j].sp + " you bagged is still on Salem.";
      }
    }
    return "";
  }

  function whisper() {
    var st = state();
    var L = st.letter;
    if (L && L.open && !L.filled) {
      return "A letter from " + L.from + ". They asked for a pair of " + L.want + ".";
    }
    if (lastDeath && now() - lastDeathAt < 18) return lastDeath;
    if (lastFry && now() - lastFryAt < 14) return lastFry;
    if (lastBagLine && now() - lastBagAt < 10) return lastBagLine;
    var t = tide();
    if (t > 0.42) {
      return springTide() ? "Spring tide. The harbor's in under the boards." : "The harbor's in under the boards.";
    }
    var echo = echoLine();
    if (echo) return echo;
    return "";
  }

  function line() {
    var st = state();
    if (st.notes.length) return st.notes[st.notes.length - 1];
    return whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) { return a && a.id === "k_going"; })) return;
      wiki.push({
        id: "k_going",
        sec: "The shop floor",
        t: "The block keeps them",
        tags: "sold bag street window baker fry die going home block",
        w: "<p>A fish bag is not a deletion. They go home with someone on Salem. The baker's window is a tank. If they live, she will say so. If they breed, she brings the fry. If they die on the block, the name goes in the book from the street, not the glass. The choir can still hear a named one that left — a voice in a window.</p><p><b>What to do about it:</b> do not sell a sick fish to the baker. Read Life. The gold line will name the window.</p>",
      });
      wiki.push({
        id: "k_tide",
        sec: "The shop floor",
        t: "The harbor comes in",
        tags: "tide moon harbor boards night spring sea wet door",
        w: "<p>Rain at the door is weather. The harbor at night is the sea. Spring tide, new moon or full, the water comes in under the boards by the door — not from the filter. Named fish lean with it. The aisle dries. The tide does not care. It will be back at the next high.</p><p><b>What to do about it:</b> mop. Heat if the boards run cold. The gold line will say if it is the harbor, not the filter.</p>",
      });
      wiki.push({
        id: "k_letter",
        sec: "The quarter",
        t: "The letter",
        tags: "letter hold road cut pair inland send answer",
        w: "<p>When a road inland is cut, the inland town writes. A letter on the counter: a place, a pair, a fish. Someone walks in off that road and says the letter's words. Fill the pair. Bag that fish. The town is answered, and a road to the harbor can reopen. Leave it five days and the letter goes unanswered. The gold line stays late.</p><p>{letter}</p><p><b>What to do about it:</b> keep two of what they asked for. The letter is not a tab. It is the unfinished thing. Guide, This shop, names it if it is open.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      wrapFish();
      seedWiki();
      if (now() - lastTick > 0.7) {
        lastTick = now();
        watchBags();
        watchLetter();
        tickHomes();
        applyTide();
        try {
          var el = document.getElementById("hookWhisper");
          var L = state().letter;
          if (el && L && L.open && !L.filled && L.from) {
            var letter = "A letter from " + L.from + ". They asked for a pair of " + L.want + ".";
            var cur = el.textContent || "";
            if (!cur || cur === letter || /in a row|Paper\. Water|The till is a run|Don't miss|waiting on a (fish )?bag|inland town is late/.test(cur)) {
              if (cur !== letter) {
                el.textContent = letter;
                el.classList.add("on", "pop");
              }
            }
          }
        } catch (eW) {}
        var hr = hour();
        if (lastHour >= 0 && ((lastHour > 20 && hr < 8) || (lastHour < 8 && hr >= 8))) {
          tickHomes();
        }
        lastHour = hr;
      }
      if (now() - lastUi > 1.1) lastUi = now();
    } catch (e) {}
  }

  window.going = {
    whisper: whisper,
    line: line,
    homes: function () {
      return state().homes;
    },
    letter: function () {
      return state().letter;
    },
    tide: tide,
    moon: moon,
    echo: function () {
      var n = 0;
      var homes = state().homes;
      for (var i = 0; i < homes.length; i++) if (!homes[i].dead && homes[i].named) n++;
      return n;
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 220);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 220);
    }, 180);
})();
