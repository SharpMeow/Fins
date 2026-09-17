/* occult.js — the Necronomicon, and calling names back from the pages.
   Harbor occult. No temples, no other trade. The book is in the back room. */
(function () {
  "use strict";

  var lastScene = "";
  var open = false;
  var seededDead = false;

  function say(msg, kind) {
    try {
      if (typeof toast === "function") toast(msg, kind || "bad");
      else if (typeof k === "function") k(msg, kind || "bad");
    } catch (e) {}
  }

  function gs() {
    try {
      if (typeof gameState === "function") return gameState();
      if (typeof gameState === "object" && gameState && gameState.stats) return gameState;
    } catch (e) {}
    return null;
  }

  function write(kind, text, who) {
    try {
      var y = worldYear();
      var line = String(text || "");
      if (line && !/^Year\s+\d/.test(line)) line = "Year " + y + ". " + line;
      if (typeof chronicle === "function") chronicle(kind, line, who || []);
    } catch (e) {}
  }

  var localBook = { dead: [], sold: [], water: "", wx: "", occ: { known: 0, reads: 0, raised: 0, last: 0 } };

  function book() {
    try {
      if (window.saga && typeof saga.book === "function") {
        var b = saga.book();
        if (b && typeof b === "object") {
          if (!Array.isArray(b.dead)) b.dead = [];
          return b;
        }
      }
    } catch (e) {}
    return localBook;
  }

  function occ() {
    var b = book();
    b.occ = b.occ || { known: 0, reads: 0, raised: 0, last: 0 };
    return b.occ;
  }

  function esc(s) {
    var map = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;" };
    return String(s || "").replace(/[&<>"]/g, function (c) { return map[c]; });
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

  function seedDead() {
    if (seededDead) return;
    var b = book();
    if (!b.dead) b.dead = [];
    if (b.dead.length) {
      seededDead = true;
      return;
    }
    b.dead.push({
      n: "Ingum",
      sp: "Goldfish",
      how: "went still the winter the heater failed",
      last: "She was cold.",
      saw: ["the empty tank"],
      old: 1,
      y: 412,
    });
    b.dead.push({
      n: "Thokel",
      sp: "Betta",
      how: "was found on the gravel after a fight that nobody admitted",
      last: "He was forced to endure a rival.",
      saw: [],
      old: 1,
      y: 781,
    });
    b.dead.push({
      n: "Melas",
      sp: "Neon tetra",
      how: "came up in a net off the wreck and did not survive the walk to Salem Street",
      last: "She remembered the salt.",
      saw: ["the harbor"],
      old: 1,
      y: 996,
    });
    seededDead = true;
  }

  function spIndex(name) {
    var S = null;
    try {
      S = typeof SPECIES !== "undefined" ? SPECIES : null;
    } catch (e) {}
    if (!S || !S.length) return 0;
    var q = String(name || "").toLowerCase();
    var i, n;
    for (i = 0; i < S.length; i++) {
      n = String((S[i] && (S[i].name || S[i].gname)) || "").toLowerCase();
      if (n === q) return i;
    }
    for (i = 0; i < S.length; i++) {
      n = String((S[i] && (S[i].name || S[i].gname || S[i].key)) || "").toLowerCase();
      if (n.indexOf(q) >= 0 || q.indexOf(n) >= 0) return i;
    }
    return 0;
  }

  function echo(line) {
    try {
      if (window.__actEcho != null) window.__actEcho = line;
      var body = document.getElementById("conBody");
      if (body) {
        var d = document.createElement("div");
        d.className = "cline street";
        d.textContent = line;
        body.appendChild(d);
        body.scrollTop = body.scrollHeight;
      }
    } catch (e) {}
  }

  function raiseAt(i) {
    seedDead();
    var b = book();
    var rec = b.dead[i];
    if (!rec) {
      say("That page is blank.", "bad");
      return false;
    }
    if (rec.raised) {
      say(rec.n + " already came back. The name will not take a second time.", "bad");
      return false;
    }
    if (typeof addFish !== "function") {
      say("The water would not hold them.", "bad");
      return false;
    }
    var f = addFish(spIndex(rec.sp), 2);
    if (!f) {
      say("The tank could not hold another. Empty a space first.", "bad");
      return false;
    }
    f.nick = rec.n;
    f.risen = 1;
    f.scar = 1;
    f.ill = "the returning";
    f.hunger = 0.4;
    try {
      if (typeof initBrain === "function") initBrain(f);
    } catch (e) {}
    f.brain = f.brain || {};
    f.brain.stress = 0.82;
    f.brain.trust = 0.05;
    f.brain.state = "remembering the other side";
    try {
      if (typeof pedRename === "function") pedRename(f);
    } catch (e2) {}
    rec.raised = 1;
    rec.raisedY = worldYear();
    var o = occ();
    o.raised = (o.raised || 0) + 1;
    o.last = Date.now();
    o.known = 1;
    try {
      var g = gs();
      if (g) {
        g.stats = g.stats || {};
        g.stats.raised = (g.stats.raised || 0) + 1;
      }
    } catch (eSt) {}
    try {
      if (typeof findEgg === "function") findEgg("raised", rec.n + " is in the tank. Something about the eyes is wrong.");
    } catch (eEgg) {}
    try {
      if (typeof addRep === "function") addRep(-5);
    } catch (e3) {}
    try {
      if (window.saga && saga.remember) {
        saga.remember(f, "rite", "the other side");
        var list = typeof allFish === "function" ? allFish() : [];
        for (var n = 0; n < list.length; n++) {
          if (list[n] && list[n] !== f) saga.remember(list[n], "rite", rec.n + " walking the water again");
        }
      }
    } catch (e4) {}
    write(
      "disaster",
      rec.n + " the " + String(rec.sp || "fish").toLowerCase() + " was called back from the pages. The water accepted them, then thought better of it.",
      [f]
    );
    say(rec.n + " is in the tank. Something about the eyes is wrong.", "bad");
    echo("The street did not hear a splash. People still crossed themselves.");
    try {
      window.__shopMood = { kind: "flee", until: (typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000) + 12 };
    } catch (eM) {}
    try {
      if (window.feel && feel.play) feel.play("warn");
    } catch (eF) {}
    try {
      if (window.weave && weave.rumor) weave.rumor("risen", rec.n + " came back", 2.2);
    } catch (eR) {}
    try {
      if (typeof townState === "function") {
        var t = townState();
        if (t && typeof t.word === "number") t.word = Math.min(3, (t.word || 0) + 0.4);
      }
    } catch (e5) {}
    paintPages();
    return true;
  }

  function pagesHtml() {
    seedDead();
    var b = book();
    var o = occ();
    var html =
      '<p class="necro-lead">The leather is wet. The name on the board is not English. Names written here do not stay on the far side if you read them aloud.</p>';
    html +=
      '<p class="necro-meta">Read ' +
      (o.reads || 0) +
      " time" +
      ((o.reads || 0) === 1 ? "" : "s") +
      " · " +
      (o.raised || 0) +
      " called back</p>";
    var list = b.dead || [];
    if (!list.length) {
      html += '<p class="necro-empty">The pages are still blank. Nothing of yours has died, and the old names have not found you yet.</p>';
      return html;
    }
    for (var i = list.length - 1; i >= 0; i--) {
      var d = list[i];
      html += '<div class="necro-entry' + (d.raised ? " risen" : "") + '">';
      html += '<div class="necro-name">' + esc(d.n) + " · " + esc(d.sp || "fish") + (d.y ? " · " + d.y : "") + "</div>";
      html +=
        '<div class="necro-how">' +
        esc(d.how || "died") +
        (d.last ? " · last: “" + esc(d.last) + "”" : "") +
        "</div>";
      if (d.raised) html += '<div class="necro-back">Already walking.</div>';
      else
        html +=
          '<button type="button" class="buy danger necro-raise" data-raise="' +
          i +
          '">Read the name aloud</button>';
      html += "</div>";
    }
    return html;
  }

  function paintPages() {
    var el = document.getElementById("necroPages");
    if (el) el.innerHTML = pagesHtml();
  }

  function openBook() {
    seedDead();
    var o = occ();
    o.known = 1;
    o.reads = (o.reads || 0) + 1;
    try {
      if (typeof findEgg === "function") findEgg("necro", "The salt in the binding is older than the shop.");
    } catch (eEgg) {}
    if (o.reads === 1) {
      write("era", "The Necronomicon was opened in the back room. The salt in the binding is older than the shop.");
    }
    var wrap = document.getElementById("necro");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "necro";
      wrap.innerHTML =
        '<div class="necro-card" role="dialog" aria-label="Necronomicon">' +
        '<button type="button" class="necro-x" id="necroX" aria-label="Close">Close</button>' +
        '<div class="necro-cover"><img src="art/necronomicon.jpg" alt="The Necronomicon"></div>' +
        '<div class="necro-body"><h2>Necronomicon</h2><div id="necroPages"></div></div>' +
        "</div>";
      document.body.appendChild(wrap);
      wrap.addEventListener("click", function (e) {
        if (e.target === wrap) closeBook();
      });
      wrap.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-raise]");
        if (!btn) return;
        raiseAt(+btn.getAttribute("data-raise"));
      });
      var x = document.getElementById("necroX");
      if (x) x.onclick = closeBook;
    }
    paintPages();
    wrap.classList.add("show");
    open = true;
  }

  function closeBook() {
    var wrap = document.getElementById("necro");
    if (wrap) wrap.classList.remove("show");
    open = false;
  }

  function syncHot() {
    var s = lastScene;
    try {
      if (typeof sceneNow === "function") s = sceneNow() || s;
      else if (typeof gameState === "object" && gameState && gameState.scene) s = String(gameState.scene);
      else if (window.G && G.scene) s = String(G.scene);
    } catch (e) {}
    var hot = document.getElementById("necroHot");
    if (!hot) {
      hot = document.createElement("button");
      hot.id = "necroHot";
      hot.type = "button";
      hot.textContent = "A bound book";
      hot.title = "The Necronomicon";
      hot.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        openBook();
      };
      document.body.appendChild(hot);
    }
    var show = s === "back" && !document.body.classList.contains("titling");
    hot.classList.toggle("show", !!show);
  }

  function wrapGo() {
    if (!window.__finsGo || window.__finsGo.__occ) return;
    var orig = window.__finsGo;
    window.__finsGo = function (e) {
      lastScene = String(e || "");
      var r = orig.apply(this, arguments);
      syncHot();
      return r;
    };
    window.__finsGo.__occ = 1;
  }

  function wrapBrowse() {
    if (!window.shopBrowse || window.shopBrowse.__occ) return;
    var orig = window.shopBrowse;
    window.shopBrowse = function () {
      var rec = orig.apply(this, arguments);
      try {
        var o = occ();
        if (rec && o.raised && Date.now() - (o.last || 0) < 8 * 60 * 1000 && rec.phase === "look" && Math.random() < 0.28) {
          rec.line = ["That tank.", "Did that one die?", "I'm not buying anything that came back.", "The water smells like a church."][
            rec.idx % 4
          ];
        }
      } catch (e) {}
      return rec;
    };
    window.shopBrowse.__occ = 1;
  }

  function isCmd(t) {
    t = String(t || "").replace(/^\/?act\s+/i, "");
    return /necronomicon|raise the dead|raise .*dead|read the book|open the book|the occult|call .* back/i.test(t);
  }

  function runCmd(raw) {
    var t = String(raw || "").replace(/^\/?act\s+/i, "").trim();
    try {
      var body = document.getElementById("conBody");
      if (body) {
        var you = document.createElement("div");
        you.className = "cline you";
        you.textContent = "> " + raw;
        body.appendChild(you);
      }
    } catch (e) {}
    if (/raise/.test(t)) {
      seedDead();
      var b = book();
      var idx = -1;
      for (var i = b.dead.length - 1; i >= 0; i--) {
        if (!b.dead[i].raised) {
          idx = i;
          break;
        }
      }
      if (idx < 0) {
        echo("Every name in the book is already walking, or the pages are blank.");
        say("No name left to call.", "bad");
        return;
      }
      openBook();
      raiseAt(idx);
      return;
    }
    occ().known = 1;
    openBook();
    echo("You open the book. The leather is wet.");
  }

  function enhanceChron() {
    var body = document.getElementById("dbody");
    var title = document.getElementById("dtitle");
    if (!body || !title) return;
    if (!/chronicle/i.test(title.textContent || "")) return;
    if (body.querySelector(".saga-necro")) return;
    var box = document.createElement("div");
    box.className = "saga-necro";
    var o = occ();
    box.innerHTML =
      '<div class="sec">The Necronomicon</div>' +
      '<div class="row"><div></div><div><div class="n">A bound book from the wreck</div><div class="d">' +
      (o.known
        ? "Opened in the back room. Names in it can be read aloud."
        : "It was in a crate that came off the battery. The leather is wet. It does not belong on a shop shelf.") +
      '</div></div><div><button type="button" class="buy danger" id="openNecro">Open it</button></div></div>';
    body.insertBefore(box, body.firstChild);
    var btn = document.getElementById("openNecro");
    if (btn) btn.onclick = openBook;
  }

  document.addEventListener(
    "keydown",
    function (e) {
      if (e.key === "Escape" && open) {
        closeBook();
        e.stopPropagation();
        return;
      }
      if (e.key !== "Enter") return;
      var a = e.target;
      if (!a || a.id !== "conIn") return;
      var r = a.value.trim();
      if (!isCmd(r)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      a.value = "";
      runCmd(r);
    },
    true
  );

  function tick() {
    try {
      seedDead();
      wrapGo();
      wrapBrowse();
      syncHot();
      enhanceChron();
    } catch (e) {}
  }

  window.occult = { open: openBook, raise: raiseAt, close: closeBook };


  if (window.__onBeat) window.__onBeat(tick, 280);
  else setTimeout(function loop() { tick(); setTimeout(loop, 280); }, 280);

})();
