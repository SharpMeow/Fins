/* saga.js — the book that is still writing.
   Names every fish, writes the chronicle, surfaces thoughts, seeds the
   harbor's history. Simulation, pedigrees, grudges and U() stay in fins.js. */
(function () {
  "use strict";

  var lastFids = null;
  var lastStates = Object.create(null);
  var lastPair = Object.create(null);
  var lastHook = 0;
  var lastUi = 0;
  var seeded = false;
  var usedNicks = Object.create(null);
  var didBrowse = false;

  var ONSET = {
    tetra: ["Ne", "Ve", "I", "Ka", "Ri", "Sa", "Li", "To", "Mi", "Ae"],
    betta: ["Si", "Lu", "Ra", "The", "Mo", "Va", "Shi", "Or", "Pe", "Na"],
    cichlid: ["Khar", "Drun", "Gor", "Bal", "Thok", "Ulm", "Zas", "Rith"],
    guppy: ["Pip", "Zel", "Flo", "Nim", "Twi", "Ski", "Peb", "Glim"],
    gold: ["Ori", "Kin", "Sol", "Han", "Mar", "Gin", "Aure", "Com"],
    angel: ["Isa", "Cel", "Ser", "Ael", "Vin", "Pax", "Lir", "Noe"],
    koi: ["Ko", "Sui", "Hana", "Kyo", "Mai", "Ren", "Asa", "Yuki"],
    clown: ["Nemo", "Rif", "Cor", "Anem", "Teg", "Blu", "Cal", "Daz"],
    default: ["Ur", "Tos", "Id", "Kum", "Fes", "Lor", "At", "Mel", "Dok", "Ing"],
  };
  var CODA = ["rist", "id", "el", "a", "en", "or", "um", "eth", "il", "as", "on", "ek", "ia", "us"];

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function fishList() {
    try {
      if (typeof allFish === "function") return allFish() || [];
    } catch (e) {}
    return [];
  }

  function runSeed() {
    try {
      var w = world();
      if (w && w.seed) return w.seed;
      if (typeof runState === "function") {
        var r = runState();
        if (r && r.seed) return r.seed;
      }
    } catch (e) {}
    return 1;
  }

  function shopName() {
    try {
      if (typeof owState === "function") {
        var o = owState();
        if (o && o.shop) return o.shop;
      }
    } catch (e) {}
    var el = document.getElementById("shopname");
    if (el && el.textContent) return el.textContent.replace(/’s.*$/, "'s").trim() || "Fin's";
    return "Fin's";
  }

  function spName(f) {
    try {
      if (typeof pedOf === "function" && f && f.fid) {
        var rec = pedOf(f.fid);
        if (rec && (rec.gname || rec.vname)) return rec.gname || rec.vname;
      }
    } catch (e) {}
    try {
      if (typeof O !== "undefined" && f && O[f.sp]) return O[f.sp].name || O[f.sp].gname || "fish";
    } catch (e2) {}
    return "fish";
  }

  function spKey(f) {
    try {
      if (typeof pedOf === "function" && f && f.fid) {
        var rec = pedOf(f.fid);
        if (rec && (rec.gname || rec.vname)) return String(rec.gname || rec.vname).toLowerCase();
      }
    } catch (e) {}
    return "";
  }

  function family(f) {
    var n = spKey(f);
    if (/tetra|danio|rasbora|minnow|neon|cardinal/.test(n)) return "tetra";
    if (/betta|fighter/.test(n)) return "betta";
    if (/cichlid|oscar|ram|krib/.test(n)) return "cichlid";
    if (/guppy|endler|platy|molly|sword/.test(n)) return "guppy";
    if (/goldfish|comet|oranda/.test(n)) return "gold";
    if (/angel/.test(n)) return "angel";
    if (/\bkoi\b|carp/.test(n)) return "koi";
    if (/clown|damsel|tang|wrasse/.test(n)) return "clown";
    return "default";
  }

  function hash32(s) {
    var h = 2166136261 >>> 0;
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function pick(arr, h) {
    return arr[(h >>> 0) % arr.length];
  }

  function she(f) {
    return f && f.sex === "m" ? "He" : "She";
  }
  function her(f) {
    return f && f.sex === "m" ? "his" : "her";
  }
  function him(f) {
    return f && f.sex === "m" ? "him" : "her";
  }

  function nickFor(f) {
    var fam = family(f);
    var on = ONSET[fam] || ONSET.default;
    var seed = runSeed();
    var h = hash32((f.fid || f.sp || 0) + ":" + seed + ":" + (f.key || "") + ":" + fam);
    var a = pick(on, h);
    var b = pick(CODA, h >>> 8);
    var name = a + b;
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    if (name.length < 3) name = pick(ONSET.default, h) + pick(CODA, h >>> 4);
    var n = 0;
    var tryName = name;
    while (usedNicks[tryName] && n < 9) {
      n++;
      tryName = name + pick(["a", "i", "u", "en", "el"], h + n);
    }
    usedNicks[tryName] = 1;
    return tryName;
  }

  function ensureNamed(f) {
    if (!f) return false;
    try {
      if (typeof initBrain === "function") initBrain(f);
    } catch (e) {}
    if (!f.nick && f.fid) {
      try {
        var rec = typeof pedOf === "function" ? pedOf(f.fid) : null;
        if (rec && rec.nick) f.nick = rec.nick;
      } catch (e) {}
    }
    var fresh = false;
    if (!f.nick) {
      f.nick = nickFor(f);
      fresh = true;
    }
    usedNicks[f.nick] = 1;
    try {
      if (typeof pedNew === "function" && !f.fid) pedNew(f);
      else if (typeof pedRename === "function") pedRename(f);
    } catch (e) {}
    return fresh;
  }

  function write(kind, text, who, opts) {
    try {
      var y = worldYear();
      var line = String(text || "");
      if (line && !/^Year\s+\d/.test(line)) line = "Year " + y + ". " + line;
      if (typeof chronicle === "function") chronicle(kind, line, who || [], opts || { y: y });
    } catch (e) {}
  }

  function worldYear() {
    try {
      if (typeof atlGen === "function") {
        var a = atlGen();
        if (a && a.now) return a.now | 0;
      }
    } catch (e) {}
    return 1000;
  }

  var localBook = { dead: [], sold: [], water: "", wx: "", occ: { known: 0, reads: 0, raised: 0, last: 0 } };

  function book() {
    try {
      var ch = typeof chronState === "function" ? chronState() : null;
      if (ch) {
        if (!ch.book || typeof ch.book !== "object") ch.book = localBook;
        if (!Array.isArray(ch.book.dead)) ch.book.dead = [];
        if (!Array.isArray(ch.book.sold)) ch.book.sold = [];
        return ch.book;
      }
    } catch (e) {}
    return localBook;
  }

  function remember(f, kind, text) {
    if (!f || !text) return;
    f._mem = f._mem || [];
    var last = f._mem[f._mem.length - 1];
    if (last && last.s === text) return;
    f._mem.push({ k: kind, s: text, at: now() });
    if (f._mem.length > 8) f._mem.shift();
    try {
      var rec = f.fid && typeof pedOf === "function" ? pedOf(f.fid) : null;
      if (rec) {
        rec.deeds = rec.deeds || [];
        rec.deeds.push({ t: 0, s: text, k: kind || "" });
        if (rec.deeds.length > 24) rec.deeds.shift();
      }
    } catch (e) {}
  }

  function rememberAll(kind, text) {
    var list = fishList();
    for (var i = 0; i < list.length; i++) remember(list[i], kind, text);
  }

  function latestMem(f) {
    if (f && f._mem && f._mem.length) return f._mem[f._mem.length - 1].s;
    try {
      var rec = f && f.fid && typeof pedOf === "function" ? pedOf(f.fid) : null;
      if (rec && rec.deeds && rec.deeds.length) return rec.deeds[rec.deeds.length - 1].s;
    } catch (e) {}
    return "";
  }

  function motherOf(f) {
    try {
      var rec = f && f.fid && typeof pedOf === "function" ? pedOf(f.fid) : null;
      if (rec && rec.mom) {
        var p = pedOf(rec.mom);
        if (p) return p.nick || p.vname || "";
      }
    } catch (e) {}
    return "";
  }

  function waterNow() {
    try {
      if (typeof tankWater === "function") {
        var w = tankWater(0) || tankWater(1);
        if (w) return w;
      }
    } catch (e) {}
    return null;
  }

  function nameWater(w) {
    if (!w) return "the tap mix";
    if (w.ph != null && w.ph < 6.5) return "the sour column";
    if (w.ph != null && w.ph > 7.8) return "the hard mix";
    if (w.temp != null && w.temp > 27.5) return "the warm tank";
    if (w.temp != null && w.temp < 22) return "the cold tank";
    if (w.kind && w.kind !== "community") return "the " + w.kind + " water";
    return "the standing mix";
  }

  var lastWxKey = "";
  var lastWaterKey = "";
  var lastOwns = Object.create(null);
  var lastClog = false;

  function watchYear() {
    try {
      var y = worldYear();
      var b = book();
      b.year = y;
      if (!watchYear._last) {
        watchYear._last = y;
        return;
      }
      if (y === watchYear._last) return;
      var prev = watchYear._last;
      watchYear._last = y;
      if (!seeded) return;
      var line = "The year turned from " + prev + ". It is " + y + " in the harbor.";
      try {
        var w = world();
        if (w && w.e && w.e.length && typeof atlLine === "function") {
          var ev = w.e[w.e.length - 1];
          if (ev && (ev.y === y || ev.y === prev + 1)) {
            var said = atlLine(w, ev);
            if (said) line = said;
          }
        }
      } catch (e0) {}
      write("era", line);
      rememberAll("year", "the year turning");
    } catch (e) {}
  }

  function watchWeather() {
    try {
      var wx = null;
      try {
        if (typeof wxState === "function") wx = wxState();
      } catch (e0) {}
      if (!wx && window.__wx) wx = window.__wx;
      if (!wx) return;
      var word = "";
      try {
        if (typeof wxWord === "function") word = String(wxWord() || "");
      } catch (e1) {}
      if (!word) {
        try {
          var el = document.getElementById("caldate");
          word = ((el && el.textContent) || "").split("·").pop().trim();
        } catch (e2) {}
      }
      var key =
        (wx.rain > 0.5 ? "r" : "") +
        (wx.fog > 0.4 ? "f" : "") +
        (wx.front > 0.45 ? "F" : "") +
        (wx.wind >= 28 ? "g" : "") +
        (wx.cloud > 0.75 ? "c" : "");
      if (key === lastWxKey) {
        var b0 = book();
        if (word) b0.wx = word;
        return;
      }
      var prev = lastWxKey;
      lastWxKey = key;
      if (!seeded) return;
      var b = book();
      b.wx = word;
      if (key.indexOf("F") >= 0 && prev.indexOf("F") < 0) {
        write("disaster", "A front came through the harbor. " + word + ".");
        rememberAll("weather", "the front at the glass");
      } else if (key.indexOf("g") >= 0 && prev.indexOf("g") < 0) {
        write("disaster", "A gale off the harbor. " + word + ". The street emptied.");
        rememberAll("weather", "the gale");
      } else if (key.indexOf("r") >= 0 && prev.indexOf("r") < 0) {
        write("note", "Rain on Salem Street. The storefront ran with it.");
        rememberAll("weather", "rain on the glass");
      } else if (key.indexOf("f") >= 0 && prev.indexOf("f") < 0) {
        write("note", "Fog off the battery. You could not see the yellow house across.");
        rememberAll("weather", "the fog");
      } else if (!key && prev) {
        write("note", "The weather broke. " + (word || "Clear over the North End") + ".");
      }
    } catch (e) {}
  }

  function watchWater() {
    try {
      var w = waterNow();
      if (!w) return;
      var key = (w.ph != null ? w.ph.toFixed(1) : "") + ":" + (w.temp != null ? Math.round(w.temp) : "");
      var nm = nameWater(w);
      var b = book();
      if (key !== lastWaterKey && lastWaterKey && seeded) {
        write("note", "The water shifted. It is " + nm + " now" + (w.ph != null ? " · pH " + w.ph.toFixed(1) : "") + (w.temp != null ? " · " + Math.round(w.temp) + "°C" : "") + ".");
        rememberAll("water", nm);
      }
      lastWaterKey = key;
      b.water = nm;
      var clog = false;
      try {
        if (typeof clogged === "function") clog = !!clogged();
      } catch (e) {}
      if (clog && !lastClog && seeded) {
        write("illness", "The filter packed. The column went sour.");
        rememberAll("water", "the dirty filter");
      }
      lastClog = clog;
    } catch (e) {}
  }

  function watchTown() {
    try {
      if (typeof townState !== "function") return;
      var t = townState();
      if (!t || !t.people) return;
      for (var id in t.people) {
        var p = t.people[id];
        var n = (p.owns && p.owns.length) || 0;
        var prev = lastOwns[id] || 0;
        if (n > prev && seeded) {
          var who = "";
          try {
            if (typeof folkName === "function") who = folkName(id);
          } catch (e) {}
          if (!who || who === "A customer") {
            try {
              if (typeof sgPerson === "function") {
                var sp = sgPerson(+id);
                if (sp && sp.name) who = sp.name;
              }
            } catch (e2) {}
          }
          var hood = "";
          try {
            if (typeof sgPerson === "function") {
              var per = sgPerson(+id);
              if (per && per.gloss) hood = per.gloss;
            }
          } catch (e3) {}
          var taken = p.owns[p.owns.length - 1];
          var fishNm = "";
          if (typeof taken === "object" && taken && taken.nick) fishNm = taken.nick;
          write(
            "sale",
            (fishNm || "A fish") + " went home with " + (who || "a regular") + (hood ? ", " + hood : "") + ".",
            []
          );
          var b = book();
          b.sold.push({ n: fishNm || "a fish", who: who || "a customer", hood: hood, day: 0 });
          if (b.sold.length > 48) b.sold.shift();
        }
        lastOwns[id] = n;
      }
    } catch (e) {}
  }

  function wrapTownSale() {
    try {
      var desc = Object.getOwnPropertyDescriptor(globalThis, "townSale");
      if (!desc || !desc.get || desc.get.__saga) return;
      var origGet = desc.get;
      function wrappedGet() {
        var fn = origGet();
        if (fn && !fn.__saga) {
          var inner = function (who, sp, spent, bad) {
            var r = fn.apply(this, arguments);
            try {
              if (seeded) {
                var nm = "";
                try {
                  if (typeof folkName === "function") nm = folkName(who);
                } catch (e) {}
                write("sale", (nm && nm !== "A customer" ? nm : "A customer") + " took a fish" + (bad ? " and noticed the water" : "") + ".", []);
              }
            } catch (e) {}
            return r;
          };
          inner.__saga = 1;
          return inner;
        }
        return fn;
      }
      wrappedGet.__saga = 1;
      Object.defineProperty(globalThis, "townSale", { configurable: true, get: wrappedGet });
    } catch (e) {}
  }

  function wrapBrowse() {
    if (didBrowse || !window.shopBrowse) return;
    didBrowse = true;
    var orig = window.shopBrowse;
    window.shopBrowse = function (idx, slot, W, floorY, personS, simT) {
      var rec = orig.apply(this, arguments);
      try {
        if (!rec) return rec;
        var wx = typeof wxState === "function" ? wxState() : null;
        if (wx && rec.phase === "enter" && (!rec.line || Math.random() < 0.22)) {
          if (wx.rain > 0.55) rec.line = pick(["Coming in out of that.", "I'll drip on your floor.", "Wet out."], idx + 3);
          else if (wx.fog > 0.45) rec.line = pick(["Couldn't see the sign.", "Thick out.", "Came by smell."], idx + 5);
          else if (wx.wind >= 28) rec.line = pick(["That wind.", "Hold the door.", "Harbor's up."], idx + 7);
        }
      } catch (e) {}
      return rec;
    };
  }

  function world() {
    try {
      if (typeof civAtlas === "function") {
        var c = civAtlas();
        if (c) return c;
      }
      if (typeof atlGen === "function") return atlGen();
    } catch (e) {}
    return null;
  }

  function seedHistory() {
    if (seeded) return;
    try {
      if (!window.chronicle && typeof chronicle !== "function") return;
      var ch = typeof chronState === "function" ? chronState() : null;
      if (ch && ch.sagaSeed) {
        seeded = true;
        return;
      }
      if (ch && ch.n >= 12) {
        if (ch) ch.sagaSeed = 1;
        seeded = true;
        return;
      }
      var w = world();
      var year = w && w.now ? w.now : 1000;
      var shop = shopName();
      var faiths = [];
      try {
        if (w && typeof sgFaiths === "function") faiths = sgFaiths(w) || [];
      } catch (e) {}
      var faith = faiths[0] && faiths[0].name ? faiths[0].name : "the tide";
      var faith2 = faiths[1] && faiths[1].name ? faiths[1].name : "the drowned";
      var someone = "a North End hand";
      try {
        if (typeof sgPerson === "function") {
          var p = sgPerson(14000) || sgPerson(80);
          if (p && p.name) someone = p.name;
        }
      } catch (e) {}
      write("era", "Fourteen faiths still argue over salt and silence.");
      write("town", "People of " + faith + " keep the North End. " + faith2 + " holds the outer wharves.");
      write("disaster", "A wreck off the battery still marks the charts. Divers bring up its copper.");
      write("feud", someone + " inherited a grudge from a seizure two generations back. It has not gone cold.");
      write("arrival", shop + " opened on Salem Street. The sign was hung before the first tank was filled.");
      write("note", "The first water in the shop came from the tap, then from a barrel, then from a proper mix.");
      write("town", "Word on the block was that a shop that keeps fish would not last a winter here.");
      write("triumph", "It lasted.");
      write("arrival", "The standing order with the wholesaler began: tetras on Tuesday, plants when the boat was in.");
      write("note", "A regular from the market started coming by after the boats, never buying, always looking.");
      write("town", "The quarter decided the shop was part of the street, which is how a place gets a name that sticks.");
      write("era", "This is the age of the shop. Everything after this line happened under that sign.");
      if (ch) ch.sagaSeed = 1;
      seeded = true;
    } catch (e) {}
  }

  function likesOf(f) {
    try {
      if (window.mind && typeof mind.likes === "function") {
        var ml = mind.likes(f);
        if (ml) return ml;
      }
    } catch (e0) {}
    var h = hash32((f.fid || 0) + "like" + runSeed());
    var t = f.traits || {};
    var things = [];
    if ((t.social || 0.5) > 0.6) things.push("the company of " + her(f) + " own kind");
    else if ((t.social || 0.5) < 0.3) things.push("an empty stretch of glass");
    if ((t.curious || 0.5) > 0.65) things.push("new objects dropped in the tank");
    if ((t.greed || 0.5) > 0.7) things.push("the first pellets of the day");
    if ((t.bold || 0.5) < 0.3) things.push("the shadow under the driftwood");
    if ((t.aggro || 0.4) > 0.55) things.push("driving others off a corner");
    var hates = ["sudden taps on the glass", "the heater clicking", "a net in the water", "a dirty filter", "being alone"];
    var like = things.length ? pick(things, h) : pick(["still water", "the morning light", "a planted corner"], h);
    var hate = pick(hates, h >>> 5);
    return she(f) + " likes " + like + ". " + she(f) + " detests " + hate + ".";
  }

  function thoughtOf(f) {
    if (!f) return "";
    var bits = [];
    try {
      if (window.mind && typeof mind.dwell === "function") {
        var dw = mind.dwell(f);
        if (dw) bits.push(dw);
      }
    } catch (e0) {}
    var b = f.brain || {};
    var hunger = f.hunger == null ? 1 : f.hunger;
    var mem = latestMem(f);
    if (f.risen) bits.unshift(she(f) + " had been dead. The water on this side felt thin.");
    if (mem) {
      var already = false;
      for (var bi = 0; bi < bits.length; bi++) if (bits[bi] && bits[bi].indexOf(mem) >= 0) already = true;
      if (!already) bits.push(she(f) + " remembered " + mem + ".");
    }
    if (f.sick || f.ill) bits.push(she(f) + " was suffering" + (f.ill ? " from " + f.ill : "") + ".");
    else if (hunger < 0.22) bits.push(she(f) + " was starving.");
    else if (hunger > 0.78) bits.push(she(f) + " was satisfied after eating.");
    if ((b.stress || 0) > 0.7) bits.push(she(f) + " was under tremendous stress.");
    else if ((b.stress || 0) < 0.18 && hunger > 0.45 && !f.sick) bits.push(she(f) + " was at peace.");
    if (b.state && b.state !== "settling in" && b.state !== "new") {
      bits.push(she(f) + " was " + String(b.state).replace(/_/g, " ") + ".");
    }
    if (f._foe) bits.push(she(f) + " was forced to endure " + f._foe + ".");
    else if ((b.rank || 1) > 2) bits.push(she(f) + " was forced to yield to a more dominant tankmate.");
    if (f._friend) bits.push(she(f) + " was comforted by the presence of " + f._friend + ".");
    var mom = motherOf(f);
    if (mom && bits.length < 3) bits.push(she(f) + " is the child of " + mom + ".");
    if ((b.trust || 0) > 0.62) bits.push(she(f) + " had grown attached to " + her(f) + " keeper.");
    else if ((b.trust || 0) < 0.12) bits.push(she(f) + " still fled from a hand at the glass.");
    if (b.territory) bits.push(she(f) + " claimed a stretch of the tank as " + her(f) + " own.");
    var bk = book();
    if (bk.year && bits.length < 3 && (hash32((f.fid || 0) + "yr") & 3) === 0)
      bits.push(she(f) + " did not know it was year " + bk.year + ".");
    if (bk.water && bits.length < 3) bits.push(she(f) + " was living in " + bk.water + ".");
    try {
      if (window.shopSite && shopSite.temp() < 14 && bits.length < 4)
        bits.push(she(f) + " felt the street's cold through the glass.");
    } catch (eT) {}
    if (f.scar) bits.push(she(f) + " bore an old scar.");
    if (bits.length < 2) bits.push(likesOf(f));
    if (!bits.length) bits.push(she(f) + " was going about " + her(f) + " day.");
    var out = [];
    var seen = Object.create(null);
    for (var i = 0; i < bits.length && out.length < 3; i++) {
      if (seen[bits[i]]) continue;
      seen[bits[i]] = 1;
      out.push(bits[i]);
    }
    return out.join(" ");
  }

  function watchFish() {
    var list = fishList();
    var live = Object.create(null);
    var namedNew = [];
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (!f) continue;
      var fresh = ensureNamed(f);
      var id = f.fid || i;
      live[id] = f;
      if (fresh) namedNew.push(f);
      var st = (f.brain && f.brain.state) || "";
      var prev = lastStates[id];
      if (prev && st && st !== prev && st !== "settling in") {
        if (st === "making for cover" || st === "hiding") {
          write("note", (f.nick || "A fish") + " fled for cover.", [f]);
        } else if (st === "resting" && prev !== "resting") {
          /* quiet */
        }
      }
      lastStates[id] = st;
    }
    if (namedNew.length && lastFids && seeded) {
      for (var n = 0; n < namedNew.length; n++) {
        var nf = namedNew[n];
        var kind = "arrival";
        var line =
          (nf.nick || "A fish") + " the " + spName(nf).toLowerCase() + " came into the shop.";
        try {
          var rec = typeof pedOf === "function" && nf.fid ? pedOf(nf.fid) : null;
          if (rec && rec.mom) {
            kind = "birth";
            var p = typeof pedOf === "function" ? pedOf(rec.mom) : null;
            var mom = p ? p.nick || p.vname || "" : "";
            if (mom)
              line = (nf.nick || "A fry") + " was born of " + mom + ", a " + spName(nf).toLowerCase() + ".";
          }
        } catch (e) {}
        write(kind, line, [nf]);
        remember(nf, kind === "birth" ? "birth" : "arrival", kind === "birth" ? "being born here" : "coming into the shop");
      }
    }
    if (lastFids && seeded) {
      for (var id2 in lastFids) {
        if (live[id2]) continue;
        var gone = lastFids[id2];
        if (!gone || !gone.fid) continue;
        var how = null;
        try {
          var pr = typeof pedOf === "function" && gone.fid ? pedOf(gone.fid) : null;
          if (pr && pr.fate && pr.fate.how) how = pr.fate.how;
        } catch (e) {}
        if (!how) continue;
        var last = thoughtOf(gone);
        var witnesses = [];
        for (var wi in live) {
          if (witnesses.length >= 2) break;
          var wtn = live[wi];
          if (wtn && wtn.nick) witnesses.push(wtn.nick);
        }
        write("death", (gone.nick || spName(gone)) + " " + how + "." + (witnesses.length ? " " + witnesses[0] + " was nearby." : ""), [gone]);
        rememberAll("death", (gone.nick || "a tankmate") + " dying");
        var bd = book();
        bd.dead.push({
          n: gone.nick || spName(gone),
          sp: spName(gone),
          how: how,
          last: last,
          saw: witnesses,
          y: worldYear(),
        });
        if (bd.dead.length > 40) bd.dead.shift();
      }
    }
    lastFids = live;

    /* Rivalries: two aggressive fish close together become a feud in the record. */
    try {
      if (list.length >= 2 && typeof chronicle === "function") {
        for (var a = 0; a < list.length; a++) {
          var A = list[a];
          if (!A || !A.brain || (A.traits && A.traits.aggro < 0.55)) continue;
          for (var b = a + 1; b < list.length; b++) {
            var B = list[b];
            if (!B || B.sp !== A.sp) continue;
            var key = (A.fid || a) + "|" + (B.fid || b);
            if (lastPair[key]) continue;
            var dx = (A.x || 0) - (B.x || 0);
            var dy = (A.y || 0) - (B.y || 0);
            if (dx * dx + dy * dy < 70 * 70) {
              lastPair[key] = 1;
              write(
                "fight",
                (A.nick || "One") + " drove " + (B.nick || "another") + " off a corner of the tank.",
                [A, B]
              );
              remember(A, "fight", "driving " + (B.nick || "another") + " off");
              remember(B, "fight", (A.nick || "a rival") + " in " + her(B) + " corner");
              A._foe = B.nick || A._foe;
              B._foe = A.nick || B._foe;
              if (A.brain) A.brain.stress = Math.min(1, (A.brain.stress || 0) + 0.04);
              if (B.brain) B.brain.stress = Math.min(1, (B.brain.stress || 0) + 0.08);
            }
          }
        }
      }
    } catch (e) {}

    /* Bonds: nearest of the same kind is a comfort. */
    try {
      for (var i2 = 0; i2 < list.length; i2++) {
        var F = list[i2];
        if (!F || !F.nick) continue;
        var best = null,
          bestD = 1e9;
        for (var j2 = 0; j2 < list.length; j2++) {
          if (j2 === i2) continue;
          var G = list[j2];
          if (!G || !G.nick || G.sp !== F.sp) continue;
          var ddx = (F.x || 0) - (G.x || 0);
          var ddy = (F.y || 0) - (G.y || 0);
          var dd = ddx * ddx + ddy * ddy;
          if (dd < bestD) {
            bestD = dd;
            best = G;
          }
        }
        if (best && bestD < 140 * 140) {
          if (F._friend !== best.nick) {
            F._friend = best.nick;
            if (seeded && Math.random() < 0.12) remember(F, "bond", "swimming with " + best.nick);
          }
        }
      }
    } catch (e) {}
  }

  function maybeEra() {
    try {
      var ch = typeof chronState === "function" ? chronState() : null;
      if (!ch) return;
      ch.eras = ch.eras || [];
      if (ch.eras.length > 6) return;
      var list = fishList();
      var counts = Object.create(null);
      var top = "",
        n = 0;
      for (var i = 0; i < list.length; i++) {
        var k = spName(list[i]);
        counts[k] = (counts[k] || 0) + 1;
        if (counts[k] > n) {
          n = counts[k];
          top = k;
        }
      }
      var last = ch.eras[ch.eras.length - 1];
      if (n >= 4 && top && (!last || last.name.indexOf(top) < 0)) {
        var name = "The time of the " + top.toLowerCase() + "s";
        ch.eras.push({
          name: name,
          why: n + " of them in the shop at once.",
          from: typeof _ === "function" ? _() : 0,
        });
        write("era", name + ". " + n + " of that kind were in the tanks together.");
      }
    } catch (e) {}
  }

  function enhanceCards() {
    var body = document.getElementById("dbody");
    if (!body) return;
    var list = fishList();
    if (!list.length) return;
    var rows = body.querySelectorAll(".row[data-fi]");
    if (!rows.length) return;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var idx = +row.getAttribute("data-fi");
      var f = list[idx];
      if (!f) continue;
      ensureNamed(f);
      var host = row.children[1] || row;
      var el = host.querySelector(".saga-thought");
      if (!el) {
        el = document.createElement("div");
        el.className = "d saga-thought";
        host.appendChild(el);
      }
      var line = thoughtOf(f);
      if (el.textContent !== line) el.textContent = line;
      var kin = host.querySelector(".saga-kin");
      var extra = [];
      if (f._friend) extra.push("with " + f._friend);
      var mom = motherOf(f);
      if (mom) extra.push("child of " + mom);
      if (extra.length) {
        if (!kin) {
          kin = document.createElement("div");
          kin.className = "d saga-kin";
          host.appendChild(kin);
        }
        var kt = extra.join(" · ");
        if (kin.textContent !== kt) kin.textContent = kt;
      }
      var nm = host.querySelector(".n");
      if (nm && f.nick && nm.textContent.indexOf(f.nick) < 0) {
        var gold = document.createElement("span");
        gold.style.color = "var(--gold)";
        gold.textContent = f.nick;
        nm.insertBefore(document.createTextNode(" · "), nm.firstChild);
        nm.insertBefore(gold, nm.firstChild);
      }
    }
  }

  function enhanceLife() {
    try {
      var body = document.getElementById("dbody");
      if (!body) return;
      var old = body.querySelector("saga-street");
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (e) {}
  }

  function enhanceChron() {
    var body = document.getElementById("dbody");
    var title = document.getElementById("dtitle");
    if (!body || !title) return;
    if (!/chronicle/i.test(title.textContent || "")) return;
    var list = fishList();
    var b = book();
    var html = '<div class="note">Year ' + worldYear() + (b.wx ? " · " + escapeHtml(b.wx) : "") + ".</div>";
    html += '<div class="sec">What they are thinking</div>';
    var n = 0;
    for (var i = 0; i < list.length && n < 8; i++) {
      var f = list[i];
      if (!f) continue;
      ensureNamed(f);
      var mom = motherOf(f);
      html +=
        '<div class="row"><div></div><div><div class="n">' +
        escapeHtml(f.nick || spName(f)) +
        " · " +
        escapeHtml(spName(f)) +
        (f._friend ? ' · with ' + escapeHtml(f._friend) : "") +
        '</div><div class="d saga-thought">' +
        escapeHtml(thoughtOf(f)) +
        "</div>" +
        (mom ? '<div class="d">Child of ' + escapeHtml(mom) + "</div>" : "") +
        "</div><div></div></div>";
      n++;
    }
    if (b.water) {
      html +=
        '<div class="sec">The water</div><div class="row"><div></div><div><div class="d">' +
        escapeHtml(b.water) +
        (b.wx ? " · outside, " + escapeHtml(b.wx) : "") +
        "</div></div><div></div></div>";
    }
    if (b.dead && b.dead.length) {
      html += '<div class="sec">Those who were here <span>' + b.dead.length + "</span></div>";
      for (var d = b.dead.length - 1; d >= 0 && d >= b.dead.length - 6; d--) {
        var dd = b.dead[d];
        html +=
          '<div class="row"><div></div><div><div class="n">' +
          escapeHtml(dd.n) +
          " · " +
          escapeHtml(dd.sp || "") +
          (dd.y ? " · " + dd.y : "") +
          '</div><div class="d saga-thought">' +
          escapeHtml((dd.how ? dd.how + ". " : "") + (dd.last || "")) +
          (dd.saw && dd.saw[0] ? " " + escapeHtml(dd.saw[0]) + " saw it." : "") +
          "</div></div><div></div></div>";
      }
    }
    if (b.sold && b.sold.length) {
      html += '<div class="sec">Those who left in a bag <span>' + b.sold.length + "</span></div>";
      for (var s = b.sold.length - 1; s >= 0 && s >= b.sold.length - 5; s--) {
        var sl = b.sold[s];
        html +=
          '<div class="row"><div></div><div><div class="d">' +
          escapeHtml(sl.n) +
          " lives with " +
          escapeHtml(sl.who || "someone") +
          (sl.hood ? ", " + escapeHtml(sl.hood) : "") +
          " now.</div></div><div></div></div>";
      }
    }
    if (!n && !b.dead.length && !b.sold.length) return;
    var box = body.querySelector(".saga-minds");
    if (!box) {
      box = document.createElement("div");
      box.className = "saga-minds";
      body.insertBefore(box, body.firstChild);
    }
    if (box.getAttribute("data-h") !== String(html.length) + n) {
      box.innerHTML = html;
      box.setAttribute("data-h", String(html.length) + n);
    }
  }

  function escapeHtml(s) {
    var map = { "&": "&"+"amp;", "<": "&"+"lt;", ">": "&"+"gt;", '"': "&"+"quot;" };
    return String(s || "").replace(/[&<>"]/g, function (c) { return map[c]; });
  }

  function tick() {
    try {
      if (typeof allFish === "function" || typeof chronState === "function") {
        seedHistory();
        if (now() - lastHook > 0.7) {
          lastHook = now();
          wrapTownSale();
          wrapBrowse();
          watchFish();
          watchWeather();
          watchWater();
          watchTown();
          watchYear();
          if (Math.random() < 0.08) maybeEra();
        }
        if (now() - lastUi > 0.45) {
          lastUi = now();
          enhanceCards();
          enhanceLife();
          enhanceChron();
        }
      }
    } catch (e) {}
  }
window.saga = {
    thought: thoughtOf,
    thoughtOf: thoughtOf,
    name: ensureNamed,
    likes: likesOf,
    remember: remember,
    book: book,
    year: worldYear,
  };


  if (window.__onBeat) window.__onBeat(tick, 280);
  else setTimeout(function loop() { tick(); setTimeout(loop, 280); }, 280);

})();
