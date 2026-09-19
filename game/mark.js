/* mark.js — the dead want a plate.
   Dwarf Fortress will not let a name stay in the book. A slab, or a ghost.
   Ingum has been dead since Year 412. Nobody put her on the wall. The choir
   keeps a wrong note until you write the name in chalk. The glass etches it
   anyway. You inherited the unburied. No second HUD. Odds, speech, the chord. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var lastDeadN = 0;
  var overlay = null;
  var octx = null;
  var didBrowse = false;
  var didChoir = false;
  var didStock = false;
  var seeded = false;

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

  function sceneName() {
    try {
      if (document.body.classList.contains("titling")) return "title";
      if (document.body.classList.contains("work")) return "work";
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
      if (window.desk && desk.think) desk.think("mark", text);
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

  function book() {
    try {
      if (window.saga && saga.book) return saga.book();
    } catch (e) {}
    try {
      if (window.mind && mind.book) return mind.book();
    } catch (e2) {}
    return { dead: [], slabs: [] };
  }

  function state() {
    var g = gs();
    if (g && g.mark && Array.isArray(g.mark.due)) return g.mark;
    var st = { due: [], plates: [], last: "" };
    try {
      if (g) g.mark = st;
    } catch (e) {}
    return st;
  }

  function plated(n, y) {
    var st = state();
    for (var i = 0; i < st.plates.length; i++) {
      if (st.plates[i].n === n && (y == null || st.plates[i].y === y)) return true;
    }
    return false;
  }

  function alreadyDue(n, y) {
    var st = state();
    for (var i = 0; i < st.due.length; i++) {
      if (st.due[i].n === n && (y == null || st.due[i].y === y)) return true;
    }
    return false;
  }

  function want(n, how, where, y, quiet) {
    if (!n) return;
    y = y == null ? year() : y;
    if (plated(n, y) || alreadyDue(n, y)) return;
    var rec = { n: n, how: how || "died", where: where || "the shop", y: y };
    state().due.push(rec);
    if (state().due.length > 16) state().due.shift();
    if (!quiet) {
      var line = n + " has no plate.";
      because(line);
      gold(line, true);
      egg("markdue", line);
    }
  }

  function seedDue() {
    if (seeded) return;
    var b = book();
    var dead = (b && b.dead) || [];
    for (var i = 0; i < dead.length; i++) {
      var d = dead[i];
      if (!d || !d.n) continue;
      want(d.n, d.how || "died", d.street ? "the block" : "the shop", d.y, true);
    }
    seeded = true;
    if (state().due.length) {
      because(state().due[0].n + " has been in the book. Nobody put them on the wall.");
      egg("markinherit", state().due[0].n + " has no plate.");
    }
  }

  function watchDead() {
    var b = book();
    var dead = (b && b.dead) || [];
    if (dead.length <= lastDeadN) {
      if (!lastDeadN) lastDeadN = dead.length;
      return;
    }
    for (var i = lastDeadN; i < dead.length; i++) {
      var d = dead[i];
      if (!d || !d.n) continue;
      want(d.n, d.how || "died", d.street ? "the block" : "the shop", d.y, false);
    }
    lastDeadN = dead.length;
  }

  function plateOne() {
    var st = state();
    if (!st.due.length) return null;
    var rec = st.due.shift();
    st.plates.push({ n: rec.n, y: rec.y, how: rec.how, at: year() });
    if (st.plates.length > 14) st.plates.shift();
    var line = rec.n + " is on the board.";
    st.last = line;
    because(line);
    gold(line, true);
    egg("markplate", line);
    try {
      if (window.mind && mind.book) {
        var b = mind.book();
        b.slabs = b.slabs || [];
        b.slabs.push({ n: rec.n, how: rec.how, y: rec.y, wall: 1 });
      }
    } catch (e) {}
    return rec;
  }

  function haunt() {
    return state().due.length;
  }

  function ensureOverlay() {
    if (overlay && overlay.parentNode) return;
    overlay = document.getElementById("markVeil");
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.id = "markVeil";
      overlay.setAttribute("aria-hidden", "true");
      document.body.appendChild(overlay);
    }
    octx = overlay.getContext("2d");
  }

  function resize() {
    ensureOverlay();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (overlay.width !== ((w * dpr) | 0) || overlay.height !== ((h * dpr) | 0)) {
      overlay.width = (w * dpr) | 0;
      overlay.height = (h * dpr) | 0;
      overlay.style.cssText =
        "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3";
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function drawPlates() {
    var sc = sceneName();
    if (sc === "title" || sc === "work" || (sc !== "shop" && sc !== "front")) {
      if (octx && overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }
    resize();
    var w = window.innerWidth;
    var h = window.innerHeight;
    octx.clearRect(0, 0, w, h);
    var st = state();
    var x = w * 0.84;
    var y = h * 0.28;
    var show = st.plates.slice(-3);
    for (var i = 0; i < show.length; i++) {
      var py = y + i * 28;
      octx.fillStyle = "rgba(18,12,8,.7)";
      octx.fillRect(x - 34, py - 10, 68, 20);
      octx.strokeStyle = "rgba(196,160,88,.8)";
      octx.lineWidth = 1.1;
      octx.strokeRect(x - 34, py - 10, 68, 20);
      octx.font = "600 10px Nunito, sans-serif";
      octx.fillStyle = "rgba(232,214,170,.88)";
      octx.textAlign = "center";
      octx.fillText(show[i].n, x, py + 4);
    }
    if (st.due.length) {
      var ny = y + show.length * 28;
      octx.fillStyle = "rgba(40,28,18,.55)";
      octx.beginPath();
      octx.arc(x, ny, 3.2, 0, 7);
      octx.fill();
      octx.font = "600 10px Nunito, sans-serif";
      octx.fillStyle = "rgba(180,150,110,.55)";
      octx.textAlign = "center";
      octx.fillText(st.due[0].n, x, ny + 16);
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
        var due = state().due;
        if (!due.length) return rec;
        if (rec.phase === "look" && st && !st._markSaid && !keep) {
          st._markSaid = 1;
          if (rec.kind === "neighbor" || rec.kind === "collector" || Math.random() < 0.22) {
            var n = due[0].n;
            rec.line =
              rec.kind === "kid"
                ? "Who is " + n + "?"
                : "You never put " + n + " up. The water knows.";
            st.line = rec.line;
            st.lineUntil = now() + 3.8;
            because((rec.name || "Someone") + " asked after " + n + ".");
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
        var n = haunt();
        if (n) {
          w.sour = Math.min(1, (w.sour || 0) + Math.min(0.22, n * 0.06));
          if (!w.line) w.line = state().due[0].n + " has no plate.";
        } else if (state().plates.length && !w.line) {
          w.sweet = Math.min(1, (w.sweet || 0) + 0.05);
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
        if (id === "chalk") plateOne();
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
    if (st.due.length) {
      var bits = [];
      for (var i = 0; i < st.due.length && bits.length < 3; i++) {
        bits.push(st.due[i].n + " has no plate");
      }
      return bits.join(". ") + ".";
    }
    if (st.plates.length) {
      return st.plates[st.plates.length - 1].n + " is on the board.";
    }
    return st.last || "";
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) { return a && a.id === "k_mark"; })) return;
      wiki.push({
        id: "k_mark",
        sec: "The chronicle",
        t: "The dead want a plate",
        tags: "slab memorial plate chalk ghost unburied ingum dead dwarf",
        w: "<p>Dwarf Fortress will not let a name stay in the book. A slab, or a ghost. Ingum has been dead since Year 412. The previous keeper never put her on the wall. The choir keeps a wrong note. Walk-ins ask who she is. Chalk writes the name. The water goes quiet.</p><p><b>What to do about it:</b> Harbor Supply, counter chalk. Write the oldest name. Life lists who is still waiting. Do not raise them instead. That is a different wrong note.</p>",
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
      seedDue();
      if (now() - lastTick > 0.9) {
        lastTick = now();
        watchDead();
      }
      if (now() - lastUi > 0.12) {
        lastUi = now();
        drawPlates();
      }
    } catch (e) {}
  }

  window.mark = {
    whisper: whisper,
    line: line,
    want: want,
    plate: plateOne,
    due: function () {
      return state().due;
    },
    of: function () {
      return state();
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 160);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 160);
    }, 200);
})();
