/* mind.js — the tanks remember.
   Short memory, long memory, core memory that changes who they are.
   Needs. A strange mood. Artifacts with a history. Memorials. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var lastMoodAt = 0;
  var wired = false;

  var LIKE = [
    "shoaling",
    "the planted corner",
    "still water",
    "an empty stretch of glass",
    "the first pellets of the day",
    "the shadow under the driftwood",
    "warmth off the heater",
    "a current they can hold in",
  ];
  var HATE = [
    "a net in the water",
    "taps on the glass",
    "the heater clicking",
    "a packed filter",
    "being alone",
    "a hand at the surface",
    "the shop bell",
    "cold water",
  ];
  var CORE_KIND = { death: 1, rite: 1, birth: 1, year: 1, fight: 1, risen: 1 };
  var VALENCE = {
    death: -2,
    rite: -1,
    fight: -1,
    clog: -1,
    sick: -1,
    year: 1,
    birth: 2,
    arrival: 1,
    bond: 1,
    sale: -1,
  };

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function year() {
    try {
      if (window.saga && typeof saga.year === "function") return saga.year();
    } catch (e) {}
    return 1000;
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
    return arr[(h >>> 0) % arr.length];
  }

  function she(f) {
    if (!f) return "They";
    if (f.sex === "f" || f.fem) return "She";
    if (f.sex === "m") return "He";
    return "They";
  }

  function her(f) {
    if (!f) return "their";
    if (f.sex === "f" || f.fem) return "her";
    if (f.sex === "m") return "his";
    return "their";
  }

  function fishList() {
    try {
      if (typeof allFish === "function") return allFish() || [];
    } catch (e) {}
    return [];
  }

  function gs() {
    try {
      if (typeof gameState === "function") return gameState();
      if (typeof gameState === "object" && gameState) return gameState;
    } catch (e) {}
    return null;
  }

  function book() {
    try {
      if (window.saga && typeof saga.book === "function") return saga.book();
    } catch (e) {}
    var g = gs();
    if (g) {
      g.mindBook = g.mindBook || { arts: [], slabs: [] };
      return g.mindBook;
    }
    return { arts: [], slabs: [] };
  }

  function write(kind, text) {
    try {
      if (typeof chronicle === "function") {
        var y = year();
        var line = String(text || "");
        if (line && !/^Year\s+\d/.test(line)) line = "Year " + y + ". " + line;
        chronicle(kind, line, []);
      }
    } catch (e) {}
  }

  function say(msg, kind) {
    try {
      if (typeof toast === "function") toast(msg, kind || "");
      else if (typeof k === "function") k(msg, kind || "");
    } catch (e) {}
  }

  function markEgg(id, line) {
    try {
      if (typeof findEgg === "function") findEgg(id, line);
    } catch (e) {}
  }

  function mindOf(f) {
    if (!f) return null;
    if (f.mind && f.mind.short) return f.mind;
    var h = hash32((f.fid || f.nick || "") + "mind");
    var t = f.traits || {};
    f.mind = {
      brave: t.bold != null ? t.bold : ((h & 255) / 255),
      tender: t.social != null ? t.social : (((h >>> 8) & 255) / 255),
      restless: t.curious != null ? t.curious : (((h >>> 16) & 255) / 255),
      proud: t.aggro != null ? t.aggro : (((h >>> 20) & 255) / 255),
      like: pick(LIKE, h),
      hate: pick(HATE, h >>> 5),
      need: { school: 0.7, clean: 0.8, food: 0.8, quiet: 0.6 },
      short: [],
      long: [],
      core: [],
      stress: (f.brain && f.brain.stress) || 0.2,
      mood: null,
      changed: "",
    };
    return f.mind;
  }

  function fileMem(f, kind, text) {
    var m = mindOf(f);
    if (!m || !text) return;
    var v = VALENCE[kind] != null ? VALENCE[kind] : 0;
    var rec = { k: kind || "", s: String(text), v: v, y: year(), at: now() };
    if (m.short.length && m.short[m.short.length - 1].s === rec.s) return;
    m.short.push(rec);
    if (m.short.length > 8) m.short.shift();
    m.stress = Math.max(0, Math.min(1, m.stress - v * 0.04));
    if (f.brain) f.brain.stress = Math.max(0, Math.min(1, (f.brain.stress || 0) - v * 0.03));
    maybePromote(m);
  }

  function maybePromote(m) {
    if (m.short.length < 3) return;
    var best = m.short[0];
    for (var i = 1; i < m.short.length; i++) {
      if (Math.abs(m.short[i].v) > Math.abs(best.v)) best = m.short[i];
    }
    if (Math.abs(best.v) < 1) return;
    var hit = false;
    for (var j = 0; j < m.long.length; j++) if (m.long[j].s === best.s) hit = true;
    if (!hit) {
      m.long.push(best);
      if (m.long.length > 8) m.long.shift();
    }
    if (CORE_KIND[best.k] && Math.random() < 0.33) {
      var cHit = false;
      for (var c = 0; c < m.core.length; c++) if (m.core[c].s === best.s) cHit = true;
      if (!cHit) {
        m.core.push(best);
        if (m.core.length > 6) m.core.shift();
        shiftFacet(m, best);
        markEgg("coremem", "A memory settled in and did not leave.");
      }
    }
  }

  function shiftFacet(m, rec) {
    if (rec.k === "death" || rec.k === "rite") {
      m.tender = Math.max(0, m.tender - 0.08);
      m.brave = Math.min(1, m.brave + 0.06);
      m.changed = rec.v < 0 ? "hardened after " + rec.s : m.changed;
    } else if (rec.k === "birth" || rec.k === "bond") {
      m.tender = Math.min(1, m.tender + 0.08);
      m.changed = "softened after " + rec.s;
    } else if (rec.k === "fight") {
      m.proud = Math.min(1, m.proud + 0.07);
      m.changed = "quicker to claim a corner after " + rec.s;
    } else if (rec.k === "year") {
      m.restless = Math.min(1, m.restless + 0.04);
    }
  }

  function dwellLine(f) {
    var m = mindOf(f);
    if (!m) return "";
    if (m.mood) {
      if (m.mood.kind === "fey") return she(f) + " is circling a corner of the tank and will not eat.";
      if (m.mood.kind === "secret") return she(f) + " has gone behind the heater and will not come out.";
      return she(f) + " is looking out of " + her(f) + " own eyes with something else looking too.";
    }
    if (m.core.length && Math.random() < 0.45) {
      var c = m.core[m.core.length - 1];
      return she(f) + " is dwelling on " + c.s + ".";
    }
    if (m.long.length && Math.random() < 0.35) {
      var L = m.long[(hash32(f.fid + String(now() | 0)) >>> 0) % m.long.length];
      return she(f) + " relived " + L.s + ".";
    }
    if (m.need.school < 0.35) return she(f) + " needs the company of " + her(f) + " own kind.";
    if (m.need.clean < 0.35) return she(f) + " cannot stand the water as it is.";
    if (m.need.food < 0.3) return she(f) + " has gone without long enough to feel it.";
    if (m._cold) return she(f) + " is holding still in water that went thin.";
    if (m.changed && Math.random() < 0.2) return she(f) + " " + m.changed + ".";
    return "";
  }

  function likesLine(f) {
    var m = mindOf(f);
    if (!m) return "";
    var line = she(f) + " likes " + m.like + ". " + she(f) + " detests " + m.hate + ".";
    if (m.changed) line += " " + she(f) + " " + m.changed + ".";
    return line;
  }

  function tickNeeds(list) {
    var clog = false;
    try {
      clog = !!window.clogged;
    } catch (e) {}
    var bySp = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (!f) continue;
      var k = String(f.sp);
      bySp[k] = (bySp[k] || 0) + 1;
    }
    for (var j = 0; j < list.length; j++) {
      var F = list[j];
      if (!F) continue;
      if (F.nick && /[<>]/.test(F.nick)) F.nick = String(F.nick).replace(/[<>]/g, "");
      var m = mindOf(F);
      var nSame = bySp[String(F.sp)] || 1;
      var schoolWant = (F.traits && F.traits.social > 0.55) || m.tender > 0.55;
      m.need.school += ((nSame >= 2 ? 0.04 : schoolWant ? -0.05 : 0.01));
      m.need.clean += clog ? -0.06 : 0.03;
      var hunger = F.hunger == null ? 0.7 : F.hunger;
      m.need.food += hunger > 0.55 ? 0.04 : -0.05;
      m.need.quiet += m.mood ? -0.03 : 0.01;
      var temp = 18;
      var wet = 0;
      try {
        if (window.shopSite) {
          temp = shopSite.temp() || 18;
          wet = shopSite.wet() || 0;
        }
      } catch (eT) {}
      if (temp < 14) {
        m.need.quiet = clamp01(m.need.quiet - 0.04);
        m.stress = clamp01(m.stress + 0.018);
        if (!m._cold) {
          m._cold = 1;
          fileMem(F, "clog", "how thin the warmth got");
        }
      } else if (temp >= 16) m._cold = 0;
      if (clog && m.hate && /filter|packed|dirty/.test(m.hate)) m.stress = clamp01(m.stress + 0.012);
      try {
        if (window.saga && saga.book) {
          var water = String(saga.book().water || "");
          if (/clog|foul|packed|stale|off/i.test(water)) m.need.clean = clamp01(m.need.clean - 0.03);
        }
      } catch (eW) {}
      if (wet > 0.4 && m.hate && /bell|tap|hand/.test(m.hate)) m.need.quiet = clamp01(m.need.quiet - 0.03);
      try {
        if (window.desk && desk.coming) {
          var c = desk.coming();
          if (c && c.arrived && now() - c.arrived < 8) m.need.quiet = clamp01(m.need.quiet - 0.02);
        }
      } catch (eC) {}
      m.need.school = clamp01(m.need.school);
      m.need.clean = clamp01(m.need.clean);
      m.need.food = clamp01(m.need.food);
      m.need.quiet = clamp01(m.need.quiet);
      var drain = 0;
      if (m.need.school < 0.4) drain += 0.015 * (1 - m.brave);
      if (m.need.clean < 0.4) drain += 0.02;
      if (m.need.food < 0.35) drain += 0.02;
      m.stress = clamp01(m.stress + drain - 0.008);
      if (F.brain) F.brain.stress = clamp01((F.brain.stress || 0) * 0.85 + m.stress * 0.15);
    }
  }

  function clamp01(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function tickMoods(list) {
    var t = now();
    var busy = false;
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      var m = f && mindOf(f);
      if (m && m.mood) {
        busy = true;
        if (t > m.mood.until) finishMood(f, m);
      }
    }
    if (busy) return;
    if (t - lastMoodAt < 90) return;
    if (list.length < 2) return;
    if (Math.random() > 0.012) return;
    var cand = [];
    for (var j = 0; j < list.length; j++) {
      var F = list[j];
      if (!F || !F.nick) continue;
      var M = mindOf(F);
      if (M.restless > 0.45 || M.proud > 0.5) cand.push(F);
    }
    if (!cand.length) return;
    var pickF = cand[(Math.random() * cand.length) | 0];
    startMood(pickF);
  }

  function startMood(f) {
    var m = mindOf(f);
    var kinds = ["fey", "secret", "possessed"];
    var kind = pick(kinds, hash32(f.fid + "mood" + year()));
    m.mood = { kind: kind, until: now() + 18 + Math.random() * 14, from: now() };
    lastMoodAt = now();
    var line =
      (f.nick || "A fish") +
      (kind === "fey"
        ? " has taken a strange mood. Circling. Will not eat."
        : kind === "secret"
          ? " has gone behind the heater. A secretive mood."
          : " is not looking out of " + her(f) + " own eyes.");
    write("era", line);
    say(line, "gold");
    markEgg("strmood", line);
    try {
      if (window.feel && feel.play) feel.play("whoosh");
    } catch (e) {}
  }

  function finishMood(f, m) {
    m.mood = null;
    lastMoodAt = now();
    var b = book();
    b.arts = b.arts || [];
    var mats = ["bogwood", "mica", "driftglass", "shell", "riverstone", "brass"];
    var mat = pick(mats, hash32((f.fid || "") + "art"));
    var mat2 = pick(mats, hash32((f.fid || "") + "art2"));
    var rx = "";
    try {
      if (window.liveAtlas && liveAtlas.react && liveAtlas.mats) {
        var A = null, B = null;
        for (var mi = 0; mi < liveAtlas.mats.length; mi++) {
          if (liveAtlas.mats[mi].id === mat) A = liveAtlas.mats[mi];
          if (liveAtlas.mats[mi].id === mat2) B = liveAtlas.mats[mi];
        }
        if (A && B) rx = liveAtlas.react(A, B);
        if (A && B && A.id !== B.id) mat = A.id + " and " + B.id;
      }
    } catch (eMat) {}
    var titles = ["Wake", "Filigree", "Year-Turn", "Quiet", "Claim", "Salt-Mark"];
    var title = (f.nick || "Unnamed") + "'s " + pick(titles, hash32(f.fid + "t"));
    var art = {
      n: title,
      mat: mat,
      who: f.nick || "a fish",
      y: year(),
      img: m.long.length ? m.long[m.long.length - 1].s : m.short.length ? m.short[m.short.length - 1].s : "the shop as it stood",
      rx: rx,
    };
    b.arts.push(art);
    if (b.arts.length > 24) b.arts.shift();
    var desc =
      title +
      ", " +
      mat +
      (rx ? ". " + rx : ". Salt in the grain") +
      ". Engraved is " +
      art.img +
      ".";
    write("triumph", desc);
    say(desc, "gold");
    markEgg("artifact", desc);
    fileMem(f, "birth", "making " + title);
    m.proud = Math.min(1, m.proud + 0.1);
    m.stress = Math.max(0, m.stress - 0.2);
    try {
      if (typeof addRep === "function") addRep(2);
    } catch (e) {}
  }

  function memorials() {
    var b = book();
    b.slabs = b.slabs || [];
    var dead = b.dead || [];
    for (var i = 0; i < dead.length; i++) {
      var d = dead[i];
      if (!d || !d.n) continue;
      var hit = false;
      for (var s = 0; s < b.slabs.length; s++) if (b.slabs[s].n === d.n && b.slabs[s].y === d.y) hit = true;
      if (hit) continue;
      b.slabs.push({
        n: d.n,
        sp: d.sp || "fish",
        how: d.how || "died",
        y: d.y || year(),
        last: d.last || "",
      });
    }
    if (b.slabs.length > 20) b.slabs.splice(0, b.slabs.length - 20);
    return b.slabs;
  }

  function drainSaga(f) {
    if (!f || !f._mem || !f._mem.length) return;
    var m = mindOf(f);
    var last = m._saw || 0;
    for (var i = 0; i < f._mem.length; i++) {
      var rec = f._mem[i];
      if (!rec || rec.at <= last) continue;
      fileMem(f, rec.k, rec.s);
    }
    m._saw = f._mem[f._mem.length - 1].at || last;
  }

  function wrapSaga() {
    if (!window.saga || wired) return;
    if (typeof saga.remember === "function" && !saga.remember.__mind) {
      var origR = saga.remember;
      saga.remember = function (f, kind, text) {
        var r = origR.apply(this, arguments);
        try {
          fileMem(f, kind, text);
        } catch (e) {}
        return r;
      };
      saga.remember.__mind = 1;
    }
    if (typeof saga.thoughtOf === "function" && !saga.thoughtOf.__mind) {
      var origT = saga.thoughtOf;
      saga.thoughtOf = function (f) {
        try {
          mindOf(f);
        } catch (e) {}
        var extra = "";
        try {
          extra = dwellLine(f);
        } catch (e2) {}
        var base = origT.apply(this, arguments) || "";
        if (extra && base.indexOf(extra.slice(0, 12)) < 0) return extra + " " + base;
        return base;
      };
      saga.thoughtOf.__mind = 1;
      saga.thought = saga.thoughtOf;
    }
    if (typeof saga.likes === "function" && !saga.likes.__mind) {
      var origL = saga.likes;
      saga.likes = function (f) {
        try {
          var line = likesLine(f);
          if (line) return line;
        } catch (e) {}
        return origL.apply(this, arguments);
      };
      saga.likes.__mind = 1;
    }
    wired = true;
  }

  function esc(s) {
    var map = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;" };
    return String(s || "").replace(/[&<>"]/g, function (c) {
      return map[c];
    });
  }

  function enhanceLife() {
    try {
      var body = document.getElementById("dbody");
      if (!body) return;
      var old = body.querySelector("mind-life");
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (e) {}
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : WIKI;
      if (!w || !w.push) return;
      var extra = [
        {
          id: "k_mem",
          sec: "The animals",
          t: "Memory",
          tags: "memory short long core dwell thought stress",
          w: "<p>A fish keeps eight short memories and a handful of long ones. The strongest of those, if they are of a death, a birth, a year turning, a fight, or a return from the pages, can settle as core memory. Core memory changes who they are: they harden, or they soften, or they claim a corner faster.</p><p>They relive the long ones. That is not flavor. It is why a fish who watched a tankmate die is still not right a week later. <b>What to do about it:</b> read Life. What they dwell on is the list. A strange mood is a memory with nowhere to go but out.</p>",
        },
        {
          id: "k_need",
          sec: "The animals",
          t: "Needs",
          tags: "need school clean food focus stress company",
          w: "<p>Company, clean water, food, quiet. Not every fish wants the same mix. A social one left alone loses focus. A packed filter is a need failing in public. Unmet needs become stress, and stress is the same number the rest of the sim already uses, so they hide, nip, or go off their food for a reason you can name.</p><p><b>What to do about it:</b> keep pairs of the ones that want company. Click the clog. Feed. Life will say who is going without.</p>",
        },
        {
          id: "k_mood",
          sec: "The animals",
          t: "Strange moods",
          tags: "mood fey secretive possessed artifact engraving legendary",
          w: "<p>Once in a while a named fish is taken. Fey: circling, will not eat. Secretive: behind the heater. Possessed: something else looking out. When it breaks, they leave an artifact in the shop — bogwood, mica, drift glass — with the memory that was in them cut into it. The Chronicle writes the object. The case keeps it.</p><p>If you sell them in the middle of it, the mood dies with the sale. <b>What to do about it:</b> leave them. Watch Life. The artifact is the point, not a multiplier.</p>",
        },
        {
          id: "k_slab",
          sec: "The chronicle",
          t: "Memorials",
          tags: "slab memorial dead memory in memory death",
          w: "<p>A named fish who dies gets a slab. Not a gravestone you place. A line that stays: who, how, the year. People on the floor will still ask after a tetra that is not in the water. The Book of the Dead is the occult copy. The slabs are the shop's.</p><p><b>What to do about it:</b> Life, In memory. Do not expect the street to forget a name you gave.</p>",
        },
      ];
      for (var i = 0; i < extra.length; i++) {
        var hit = false;
        for (var j = 0; j < w.length; j++) if (w[j] && w[j].id === extra[i].id) hit = true;
        if (!hit) w.push(extra[i]);
      }
    } catch (e) {}
  }

  function tick() {
    try {
      wrapSaga();
      seedWiki();
      if (now() - lastTick > 1.1) {
        lastTick = now();
        var list = fishList();
        for (var i = 0; i < list.length; i++) {
          mindOf(list[i]);
          drainSaga(list[i]);
        }
        tickNeeds(list);
        tickMoods(list);
        memorials();
      }
      if (now() - lastUi > 0.7) {
        lastUi = now();
        enhanceLife();
      }
    } catch (e) {}
  }
window.mind = {
    of: mindOf,
    book: book,
    dwell: dwellLine,
    likes: likesLine,
  };


  if (window.__onBeat) window.__onBeat(tick, 280);
  else setTimeout(function loop() { tick(); setTimeout(loop, 280); }, 280);

})();
