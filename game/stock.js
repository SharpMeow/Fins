/* stock.js — counter hardware, extra curios, a few pieces of gear.
   What a shop actually buys: bottles that empty, pads that clog, food that thaws. */
(function () {
  "use strict";

  var CATALOG = [
    {
      id: "cond",
      cat: "Water",
      name: "Water conditioner",
      pack: 4,
      cost: 48,
      unit: "bottle",
      blurb: "Takes the chlorine out. The next change costs less and the fish notice less.",
      lot: "Revere bottling, lot",
    },
    {
      id: "floss",
      cat: "Water",
      name: "Filter floss",
      pack: 3,
      cost: 22,
      unit: "pad",
      blurb: "Spare pads. When the filter packs, you pull one and the flow comes back.",
      lot: "Chelsea mill, lot",
    },
    {
      id: "almond",
      cat: "Water",
      name: "Catappa leaves",
      pack: 8,
      cost: 16,
      unit: "leaf",
      blurb: "Indian almond. They tan the water, drop the pH a hair, and timid fish sit easier.",
      lot: "dried in Lynn, lot",
    },
    {
      id: "carbon",
      cat: "Water",
      name: "Carbon pouches",
      pack: 2,
      cost: 28,
      unit: "pouch",
      blurb: "Pulls the yellow out of a tank that has been left. Lasts a few days.",
      lot: "activated in Everett, lot",
    },
    {
      id: "starter",
      cat: "Water",
      name: "Bottled bacteria",
      pack: 1,
      cost: 54,
      unit: "vial",
      blurb: "Seed for a tank you just changed. The column settles faster than it has a right to.",
      lot: "kept cold, lot",
    },
    {
      id: "salt",
      cat: "Water",
      name: "Aquarium salt",
      pack: 2,
      cost: 18,
      unit: "tin",
      blurb: "White-spot hates it. The street notices if you treated after a fish bag went out sick.",
      lot: "evaporated in Revere, lot",
    },
    {
      id: "brine",
      cat: "Feed",
      name: "Frozen brine shrimp",
      pack: 3,
      cost: 32,
      unit: "cube",
      blurb: "A treat. They come to the glass. Trust moves a little.",
      lot: "San Francisco bay, lot",
    },
    {
      id: "worms",
      cat: "Feed",
      name: "Bloodworm cubes",
      pack: 3,
      cost: 44,
      unit: "cube",
      blurb: "Richer than brine. Bettas and gouramis act like they remember a river.",
      lot: "vacuum packed, lot",
    },
    {
      id: "wafers",
      cat: "Feed",
      name: "Sinking wafers",
      pack: 6,
      cost: 20,
      unit: "wafer",
      blurb: "For whoever lives on the gravel. The rest ignore them.",
      lot: "baked in Quincy, lot",
    },
    {
      id: "bags",
      cat: "Counter",
      name: "Paper fish bags",
      pack: 25,
      cost: 14,
      unit: "fish bag",
      blurb: "What a fish goes home in. People notice when you still use a grocery sack.",
      lot: "twisted necks, lot",
    },
    {
      id: "glass",
      cat: "Counter",
      name: "Window wash",
      pack: 1,
      cost: 9,
      unit: "bottle",
      blurb: "Vinegar and newsprint. The storefront reads. Walk-ins mention it.",
      lot: "mixed this morning, lot",
    },
    {
      id: "mat",
      cat: "Counter",
      name: "Rubber doormat",
      pack: 1,
      cost: 36,
      unit: "mat",
      unique: 1,
      blurb: "The harbor comes in on people's shoes. This is where it stays.",
      lot: "cut in Somerville, lot",
    },
    {
      id: "chalk",
      cat: "Counter",
      name: "Counter chalk",
      pack: 4,
      cost: 6,
      unit: "stick",
      blurb: "Prices on the board in a hand people can read from the door.",
      lot: "soft white, lot",
    },
  ];

  var EXTRA_CURIOS = [
    { id: "sponge", name: "Spare sponge", desc: "Filter clogs come 15% less often.", rar: 0, eff: { clog: 0.15 } },
    { id: "leafjar", name: "Jar of catappa", desc: "Fish get hungry 8% slower.", rar: 0, eff: { hunger: 0.08 } },
    { id: "cscale", name: "Counter scale", desc: "Selling fish on the open market pays 8% more.", rar: 0, eff: { sell: 0.08 } },
    { id: "apron", name: "Waxed apron", desc: "Customers come 10% more often.", rar: 0, eff: { orderFreq: 0.1 } },
    { id: "twine", name: "Ball of twine", desc: "Wild catches 8% more likely.", rar: 0, eff: { net: 0.08 } },
    { id: "wick", name: "Spare heater wick", desc: "Ich outbreaks come 12% less often.", rar: 0, eff: { outbreak: 0.12 } },
    { id: "bubwand", name: "Bubble wand", desc: "Coins are worth 5% more.", rar: 0, eff: { coinVal: 0.05 } },
    { id: "soap", name: "Pumice soap", desc: "Medication is 12% cheaper.", rar: 0, eff: { dose: 0.12 } },
    { id: "clip", name: "Plant clip tin", desc: "Algae grows 15% faster.", rar: 0, eff: { algae: 0.15 } },
    { id: "bell2", name: "Brass desk bell", desc: "Orders pay 7% more.", rar: 0, eff: { orderPay: 0.07 } },
  ];

  var EXTRA_GEAR = [
    {
      id: "signlamp",
      name: "Window sign lamps",
      max: 3,
      tech: null,
      desc: function (e) {
        return e
          ? "The sign on Salem Street has " + e + " lamp" + (e === 1 ? "" : "s") + " on it. People find you in the rain."
          : "A pair of lamps aimed at the FIN'S sign. Walk-ins in weather.";
      },
      cost: function (e) {
        return { coins: Math.round(220 * Math.pow(2.15, e)) };
      },
    },
    {
      id: "backsink",
      name: "Utility sink",
      max: 2,
      tech: null,
      desc: function (e) {
        return e
          ? "Water changes run " + e * 18 + "% cheaper. The buckets live here, not on the floor."
          : "A deep sink in the back. Conditioner and salt have a place.";
      },
      cost: function (e) {
        return { coins: Math.round(480 * Math.pow(2.4, e)) };
      },
    },
    {
      id: "corkboard",
      name: "Shop corkboard",
      max: 2,
      tech: null,
      desc: function (e) {
        return e
          ? "Prices, hours, and a lost-cat flyer. Regulars read it. Customers come a little more."
          : "A corkboard by the door. The street likes to know what a place is doing.";
      },
      cost: function (e) {
        return { coins: Math.round(160 * Math.pow(2.2, e)) };
      },
    },
  ];

  var seeded = false;
  var lastUi = 0;
  var didBrowse = false;

  function gs() {
    try {
      if (typeof gameState === "function") return gameState();
      if (gameState && typeof gameState === "object" && gameState.coins != null) return gameState;
    } catch (e) {}
    return null;
  }

  function counter() {
    var g = gs();
    if (!g) return { qty: {}, used: {}, lot: {}, wet: 0, glass: 0, bags: 0 };
    if (!g.counter || typeof g.counter !== "object") g.counter = { qty: {}, used: {}, lot: {}, wet: 0, glass: 0, bags: 0 };
    g.counter.qty = g.counter.qty || {};
    g.counter.used = g.counter.used || {};
    return g.counter;
  }

  function say(msg, kind) {
    try {
      if (typeof toastShow === "function") toastShow(msg, kind || "good");
    } catch (e) {}
  }

  function write(kind, text) {
    try {
      var y = worldYear();
      var line = String(text || "");
      if (line && !/^Year\s+\d/.test(line)) line = "Year " + y + ". " + line;
      if (typeof chronicle === "function") chronicle(kind, line, []);
    } catch (e) {}
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

  function lotOf(it) {
    var c = counter();
    if (c.lot[it.id]) return c.lot[it.id];
    var n = 10 + ((it.id.charCodeAt(0) * 17 + (c.used[it.id] || 0) * 3) % 80);
    var line = it.lot + " " + n + " · year " + worldYear();
    c.lot[it.id] = line;
    return line;
  }

  function spend(n) {
    var g = gs();
    n = Math.round(+n || 0);
    if (!g) return false;
    if (n <= 0) return true;
    if ((g.coins || 0) < n) return false;
    g.coins -= n;
    return true;
  }

  function till() {
    var g = gs();
    return g && g.coins != null ? g.coins : 0;
  }

  function byId(id) {
    for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === id) return CATALOG[i];
    return null;
  }

  function rememberFish(text) {
    try {
      if (!window.saga || !saga.remember || typeof allFish !== "function") return;
      var list = allFish() || [];
      for (var i = 0; i < list.length; i++) saga.remember(list[i], "stock", text);
    } catch (e) {}
  }

  function tintWater(kind, dPh) {
    try {
      if (typeof tankWater !== "function") return;
      var w = tankWater(0) || tankWater(1);
      if (!w) return;
      if (kind) w.kind = kind;
      if (dPh && w.ph != null) w.ph = Math.max(5.8, Math.min(8.4, w.ph + dPh));
    } catch (e) {}
  }

  function useItem(id) {
    var it = byId(id);
    var c = counter();
    if (!it) return;
    if ((c.qty[id] || 0) < 1) {
      say("You are out of " + it.name.toLowerCase() + ".", "bad");
      return;
    }
    if (it.unique && (c.used[id] || 0) && id === "mat") {
      say("The mat is already down.", "");
      return;
    }
    c.qty[id] -= 1;
    c.used[id] = (c.used[id] || 0) + 1;

    if (id === "cond") {
      c.wet = (c.wet || 0) + 1;
      say("One bottle in the bucket. The next change will go easier.");
    } else if (id === "floss") {
      try {
        clogged = false;
      } catch (e) {}
      try {
        if (typeof cleanFilter === "function") cleanFilter(true);
      } catch (e2) {}
      say("Pad swapped. The outflow is a column again.");
      write("note", "The filter was packed. A spare pad brought the flow back.");
      rememberFish("the filter running again");
      try {
        if (window.shopSite && shopSite.dry) shopSite.dry(0.55);
      } catch (eDry) {}
    } else if (id === "almond") {
      tintWater("the leaf tea", -0.25);
      rememberFish("the tannin in the water");
      say("Leaves on the surface. The water went the color of tea.");
    } else if (id === "carbon") {
      tintWater("the polished mix", 0);
      say("Pouch in the filter. The yellow is already leaving.");
    } else if (id === "starter") {
      tintWater("the seeded mix", 0);
      rememberFish("new water that did not sting");
      say("The vial went in. Give it a day.");
      write("note", "Bottled bacteria went into a tank that had just been changed.");
      try {
        if (window.fever && fever.treat) fever.treat();
      } catch (eFv) {}
    } else if (id === "salt") {
      rememberFish("the salt in the water");
      say("Salt in the column. White-spot hates it.");
    } else if (id === "brine") {
      treat(0.22, 0.06, "the frozen shrimp");
      say("Cubes thawed. They came up for them.");
    } else if (id === "worms") {
      treat(0.28, 0.08, "the bloodworms");
      say("The water went pink for a second. Nobody stayed on the gravel.");
    } else if (id === "wafers") {
      treatBottom("the sinking wafer");
      say("Wafers on the sand. The ones who live down there found them.");
    } else if (id === "bags") {
      c.bags = (c.bags || 0) + 8;
      say("A stack of fish bags under the counter.");
    } else if (id === "glass") {
      c.glass = Date.now() + 18 * 60 * 1000;
      say("The storefront is a mirror. Give it an hour of street dust.");
    } else if (id === "mat") {
      say("Mat down. The harbor can stay on it.");
    } else if (id === "chalk") {
      say("The board is readable from the door.");
    }
    redraw();
  }

  function treat(hunger, trust, mem) {
    try {
      if (typeof allFish !== "function") return;
      var list = allFish() || [];
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        if (!f) continue;
        f.hunger = Math.min(1, (f.hunger == null ? 0.5 : f.hunger) + hunger);
        if (f.brain) {
          f.brain.trust = Math.min(1, (f.brain.trust || 0) + trust);
          f.brain.stress = Math.max(0, (f.brain.stress || 0) - 0.08);
        }
        try {
          if (window.mind && mind.of) {
            var m = mind.of(f);
            if (m) {
              m.need = m.need || {};
              m.need.food = Math.min(1, (m.need.food || 0.5) + 0.25);
              m.stress = Math.max(0, (m.stress || 0) - 0.1);
            }
          }
        } catch (eM) {}
        if (window.saga && saga.remember) saga.remember(f, "feed", mem);
      }
    } catch (e) {}
  }

  function treatBottom(mem) {
    try {
      var list = typeof allFish === "function" ? allFish() || [] : [];
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        if (!f) continue;
        var low = (f.y || 0) > 0.55 || /cory|loach|pleco|catfish|khuli|otocinclus/i.test(String(f.sp || ""));
        if (!low) continue;
        f.hunger = Math.min(1, (f.hunger == null ? 0.5 : f.hunger) + 0.3);
        if (window.saga && saga.remember) saga.remember(f, "feed", mem);
      }
    } catch (e) {}
  }

  function buyItem(id) {
    var it = byId(id);
    var c = counter();
    if (!it) return;
    if (it.unique && (c.qty[id] || 0) + (c.used[id] || 0) > 0 && id === "mat") {
      say("You already have a mat.", "");
      return;
    }
    if (!spend(it.cost)) {
      say("Not enough in the till for " + it.name.toLowerCase() + ".", "bad");
      return;
    }
    c.qty[id] = (c.qty[id] || 0) + it.pack;
    c.lot[it.id] = it.lot + " " + (14 + ((c.qty[id] * 9) % 70)) + " · year " + worldYear();
    say("Bought " + it.pack + " " + it.unit + (it.pack === 1 ? "" : "s") + " of " + it.name.toLowerCase() + ".");
    write("note", "A case of " + it.name.toLowerCase() + " came in from the harbor mill.");
    if (id === "mat") useItem("mat");
    if ((c.used.cond || 0) + (c.qty.cond || 0) === it.pack && id === "cond") {
      write("note", "The first case of conditioner came in. The tap water stopped being an argument.");
    }
    redraw();
  }

  function esc(s) {
    var map = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;" };
    return String(s || "").replace(/[&<>"]/g, function (ch) {
      return map[ch];
    });
  }

  function rowsHtml() {
    var c = counter();
    var diary = [];
    if (c.wet) diary.push("conditioner waiting on the next change");
    if (c.bags) diary.push(c.bags + " fish bags under the till");
    if (c.glass && Date.now() < c.glass) diary.push("the storefront still catching the light");
    if (c.used.almond) diary.push("tannin in the column");
    if (c.used.starter) diary.push("seeded water");
    if (c.used.floss) diary.push("a fresh pad in the filter");
    var html =
      '<div class="sec">Harbor Supply <span>what the tanks actually use</span></div>' +
      '<div class="note">Packed in Revere, Chelsea, Lynn. Dated to the millennial clock. Bottles empty. Pads pack. Cubes thaw.</div>';
    html += '<div class="note">Year ' + worldYear() + " on the shelf.</div>";
    if (diary.length) {
      html += '<div class="note counter-diary">On the counter: ' + esc(diary.join(" · ")) + ".</div>";
    }
    var cat = "";
    for (var i = 0; i < CATALOG.length; i++) {
      var it = CATALOG[i];
      if (it.cat !== cat) {
        cat = it.cat;
        html += '<div class="sec counter-cat">' + esc(cat) + "</div>";
      }
      var q = c.qty[it.id] || 0;
      var used = c.used[it.id] || 0;
      var can = till() >= it.cost;
      html += '<div class="row counter-row">';
      html += '<div class="counter-mark">' + (q ? q : "·") + "</div>";
      html += "<div><div class=\"n\">" + esc(it.name) + "</div>";
      html += '<div class="d">' + esc(it.blurb) + "</div>";
      html += '<div class="d counter-lot">' + esc(lotOf(it));
      if (q) html += " · <b>" + q + "</b> on the shelf";
      if (used) html += " · " + used + " used";
      html += "</div></div>";
      html += '<div class="qty">';
      html +=
        '<button type="button" class="buy" data-stock-buy="' +
        it.id +
        '"' +
        (can ? "" : " disabled") +
        ">" +
        it.pack +
        " · $" +
        it.cost +
        "</button>";
      html +=
        '<button type="button" class="buy ghost" data-stock-use="' +
        it.id +
        '"' +
        (q ? "" : " disabled") +
        ">Use</button>";
      html += "</div></div>";
    }
    return html;
  }

  function isShopTab() {
    var t = document.getElementById("dtitle");
    var s = ((t && t.textContent) || "").replace(/\s+/g, " ").trim();
    return /^shop\b/i.test(s);
  }

  function enhanceShop() {
    if (!isShopTab()) return;
    var body = document.getElementById("dbody");
    if (!body) return;
    var box = body.querySelector(".counter-stock");
    if (!box) {
      box = document.createElement("div");
      box.className = "counter-stock";
      try {
        body.insertBefore(box, body.firstChild);
      } catch (e) {
        try {
          body.appendChild(box);
        } catch (e2) {}
      }
    }
    var html = rowsHtml();
    if (box.getAttribute("data-h") !== String(html.length) + till()) {
      box.innerHTML = html;
      box.setAttribute("data-h", String(html.length) + till());
    }
  }

  function redraw() {
    lastUi = 0;
    try {
      if (typeof refreshDrawer === "function") refreshDrawer();
    } catch (e) {}
  }

  function seedExtras() {
    if (seeded) return;
    try {
      if (typeof ITEMS !== "undefined" && ITEMS && ITEMS.push) {
        var have = {};
        for (var i = 0; i < ITEMS.length; i++) have[ITEMS[i].id] = 1;
        for (var j = 0; j < EXTRA_CURIOS.length; j++) {
          if (!have[EXTRA_CURIOS[j].id]) ITEMS.push(EXTRA_CURIOS[j]);
        }
      }
    } catch (e) {}
    try {
      if (typeof UPG !== "undefined" && UPG && UPG.push) {
        var uh = {};
        for (var u = 0; u < UPG.length; u++) uh[UPG[u].id] = 1;
        for (var g = 0; g < EXTRA_GEAR.length; g++) {
          if (!uh[EXTRA_GEAR[g].id]) UPG.push(EXTRA_GEAR[g]);
        }
      }
    } catch (e2) {}
    seeded = true;
  }

  function wrapWater() {
    try {
      var desc = Object.getOwnPropertyDescriptor(globalThis, "waterChange");
      if (!desc || !desc.get || desc.get.__stock) return;
      var origGet = desc.get;
      function wrappedGet() {
        var fn = origGet();
        if (fn && !fn.__stock) {
          var inner = function () {
            var c = counter();
            var g = gs();
            var sink = g && g.up ? g.up.backsink || 0 : 0;
            var r = fn.apply(this, arguments);
            try {
              var used = false;
              if (c.wet > 0) {
                c.wet -= 1;
                used = true;
              } else if ((c.qty.cond || 0) > 0) {
                c.qty.cond -= 1;
                used = true;
              }
              if (used) {
                if (g && typeof g.coins === "number") {
                  g.coins += Math.round(10 + sink * 8);
                }
                say("Conditioner in the new water.");
                rememberFish("water that did not bite");
              } else if (sink) {
                rememberFish("a quiet change");
              }
            } catch (e) {}
            return r;
          };
          inner.__stock = 1;
          return inner;
        }
        return fn;
      }
      wrappedGet.__stock = 1;
      Object.defineProperty(globalThis, "waterChange", { configurable: true, get: wrappedGet });
    } catch (e) {}
  }

  function wrapSale() {
    try {
      var desc = Object.getOwnPropertyDescriptor(globalThis, "townSale");
      if (!desc || !desc.get || desc.get.__bags) return;
      var origGet = desc.get;
      function wrappedGet() {
        var fn = origGet();
        if (fn && !fn.__bags) {
          var inner = function () {
            var r = fn.apply(this, arguments);
            var c = counter();
            if (c.bags > 0) {
              c.bags -= 1;
              try {
                if (typeof addRep === "function") addRep(0.15);
              } catch (e) {}
            }
            return r;
          };
          inner.__bags = 1;
          return inner;
        }
        return fn;
      }
      wrappedGet.__bags = 1;
      Object.defineProperty(globalThis, "townSale", { configurable: true, get: wrappedGet });
    } catch (e) {}
  }

  function wrapBrowse() {
    if (didBrowse || !window.shopBrowse) return;
    didBrowse = true;
    var orig = window.shopBrowse;
    window.shopBrowse = function () {
      var rec = orig.apply(this, arguments);
      try {
        if (!rec) return rec;
        var c = counter();
        var g = gs();
        if (c.glass && Date.now() < c.glass && rec.phase === "enter" && Math.random() < 0.3) {
          rec.line = ["You can read the sign from the corner.", "Glass is clean.", "Looked open."][rec.idx % 3];
        }
        if (g && g.up && g.up.signlamp && rec.phase === "enter" && Math.random() < 0.2) {
          rec.line = ["Saw the sign in the rain.", "The lamps.", "Couldn't miss it."][rec.idx % 3];
        }
      } catch (e) {}
      return rec;
    };
  }

  document.addEventListener("click", function (e) {
    var buy = e.target.closest("[data-stock-buy]");
    var use = e.target.closest("[data-stock-use]");
    if (buy) {
      e.preventDefault();
      e.stopPropagation();
      buyItem(buy.getAttribute("data-stock-buy"));
    } else if (use) {
      e.preventDefault();
      e.stopPropagation();
      useItem(use.getAttribute("data-stock-use"));
    }
  });

  function tick() {
    try {
      seedExtras();
      wrapWater();
      wrapSale();
      wrapBrowse();
      if (performance.now() - lastUi > 120) {
        lastUi = performance.now();
        enhanceShop();
      }
    } catch (e) {}
  }
window.stock = { catalog: CATALOG, buy: buyItem, use: useItem, counter: counter };


  if (window.__onBeat) window.__onBeat(tick, 280);
  else setTimeout(function loop() { tick(); setTimeout(loop, 280); }, 280);

})();
