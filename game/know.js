/* know.js — the book. A live knowledge base on the Guide tab:
   what is happening, what to do if you are stuck or bored, and the wiki. */
(function () {
  "use strict";

  var lastUi = 0;
  var mode = "now";
  var query = "";
  var seeded = false;
  var painting = false;

  var EXTRA = [
    {
      id: "k_hour",
      sec: "When you are stuck",
      t: "The first hour",
      tags: "start stuck beginner first hour pellets filter tank shop",
      w: "<p>You open in Year 1000, after a thousand years of record. The tanks are already running. Click the water to feed. If the filter pill goes sour, click it. That is the whole first hour, and the rest of the shop is waiting on it.</p><p>People come in off Salem Street. They will look. They will ask for a fish by name. They only buy if you keep two adults of the same kind. <b>What to do about it:</b> feed, watch the water, and do not sell the last of a pair.</p>",
    },
    {
      id: "k_nobuy",
      sec: "When you are stuck",
      t: "Nobody is buying",
      tags: "stuck walkins till stock pair HA sales customers want",
      w: "<p>Walk-ins are not sales. Someone comes in because they have need and a bit of cash. They buy if the shop has two grown fish of one kind and the water is not off. Otherwise they look and leave, and Life writes it on the till: walked, not sold.</p><p>If they asked for a betta and you do not keep two, that is the lesson. <b>What to do about it:</b> buy or breed a pair, clean the filter, and be open at lunch. Reputation and ads pull from further down the street. A shop nobody has heard of is a neighborhood shop.</p>",
    },
    {
      id: "k_water",
      sec: "When you are stuck",
      t: "The water is going off",
      tags: "stuck filter clog sick ich cycle heater",
      w: "<p>A clogged filter is the shop turning people around at the door. Sick fish make the ones who stay talk. Ich is an outbreak, not a mood. The nitrogen cycle does not care that you were in the Atlas.</p><p><b>What to do about it:</b> click the clog pill on the HUD. Feed less if ammonia is up. Heat if the room is following a cold street. The Calendar tells you the season; winter will punish an unheated tank.</p>",
    },
    {
      id: "k_broke",
      sec: "When you are stuck",
      t: "The till is thin",
      tags: "stuck coins money orders sell exchange levy bills",
      w: "<p>Coins come from sales, orders, and the odd curiosity. Bills do not wait. Selling the last of a pair to make rent is how the till stays quiet tomorrow.</p><p><b>What to do about it:</b> fill an order if one is on the book. Check the Exchange before you dump a group. Standing orders pay slowly and do not empty the rack. The Money tab is where the levy lives, not a surprise.</p>",
    },
    {
      id: "k_bored",
      sec: "When you are stuck",
      t: "When the shop is running itself",
      tags: "bored curious atlas chronicle name secrets map boat book",
      w: "<p>If the water is holding and people are still looking, the game is not empty. It is waiting for you to read it. Fish have names and thoughts. The street has regulars. The Atlas has a thousand years. The back room has a book that should not be there.</p><p><b>What to do about it:</b> name a fish. Open Life and read the till. Walk the Map. Open the Chronicle. If you have been here an hour and have not opened the Atlas, that is the hole.</p>",
    },
    {
      id: "k_till",
      sec: "The shop floor",
      t: "The till today",
      tags: "till sales walked want regulars life lockup",
      w: "<p>Life keeps a till for the day: sold, walked, and who asked for what. A walk-out with a name is the shop teaching you. Lock the door after last hour and the chronicle writes the tally. Year of the millennial clock goes on the line with it.</p><p>Regulars come back. The second sale is the one that puts them on the book. <b>What to do about it:</b> read Life when the floor is quiet. If walked is beating sold, you are short a pair or the water is off.</p>",
    },
    {
      id: "k_site",
      sec: "The shop floor",
      t: "The site",
      tags: "site physics tiles heat water leak filter oak boards aisle gravity daybook",
      w: "<p>The shop is a place. Oak boards, glass, iron, standing water. Heat moves. A packed filter leaks downhill. Rain at the door wets the aisle. Life shows the site as a little map because the building is not a menu.</p><p><b>What to do about it:</b> clean the filter before the boards go dark. The gold line will say it. The daybook will keep it.</p>",
    },
    {
      id: "k_want",
      sec: "The shop floor",
      t: "What they came for",
      tags: "want betta guppy tetra stock pair floor speech",
      w: "<p>People on the floor ask for a fish by name. If you have two of that kind they will say they will take it. If you do not, they ask whether you keep it, and then they leave.</p><p><b>What to do about it:</b> keep pairs of what the street is asking for. A unique fish is a display. A pair is stock.</p>",
    },
    {
      id: "k_clock",
      sec: "The world before you",
      t: "Present day",
      tags: "year 1000 millennial clock calendar atlas history indefinite",
      w: "<p>Present day is Year 1000. A thousand years of the harbor already ran, and the clock does not stop. Seasons are twenty-eight days. A play day is twenty minutes unless you follow the real clock. HUD, Chronicle, lots, Life and the Atlas all use the same year.</p><p>The year does not run out. <b>What to do about it:</b> the Calendar is the desk for this. The Atlas is the history. Watching a year turn is a secret.</p>",
    },
    {
      id: "k_necro",
      sec: "The world before you",
      t: "The Necronomicon",
      tags: "occult book dead raise back room necronomicon pages",
      w: "<p>There is a book in the back room. It is not a ledger. Names in it are dead fish the harbor still remembers. Calling a name back puts them in the tank with something wrong about the eyes. The street does not hear a splash. People still cross themselves.</p><p>Opening it is a secret. Raising is another. <b>What to do about it:</b> go Back, click the book. Do not do it because you are short on stock. A risen fish is not stock.</p>",
    },
    {
      id: "k_wx",
      sec: "The shop floor",
      t: "Weather on the glass",
      tags: "weather rain snow fog gale window shop",
      w: "<p>The shop window is the street. Rain runs on it. Fog takes the yellow house. A gale empties Salem Street. The room the tank sits in follows the outside with a lag, so a cold snap is a heater, and a heatwave is a tank you cannot cool.</p><p><b>What to do about it:</b> stand in the Shop and watch. Calendar has the numbers. A secret unlocks if you are in the shop while weather is on the glass.</p>",
    },
    {
      id: "k_secrets",
      sec: "You and your people",
      t: "Secrets and records",
      tags: "secrets eggs achievements records legendary tillwalk necro year",
      w: "<p>Secrets are hidden things: Konami, a name, midnight, the other book, a walk-out for a fish you did not have. Each one pays reputation and a pearl. Records on Level climb forever on numbers the shop already keeps: sales, years past the thousand, people who left without a fish bag, names called back.</p><p>Legendaries are six late things that survive a restart. None of them multiply income, because that would just make the game shorter. <b>What to do about it:</b> Secrets tab to see what you have. Level for the records. Do not hunt them with a list in another window. The shop tells you.</p>",
    },
    {
      id: "k_supply",
      sec: "Money",
      t: "Harbor Supply",
      tags: "stock conditioner bags gravel lots year shop tab",
      w: "<p>Harbor Supply is the shop tab's top: lots dated to the millennial year. Conditioner, fish bags, pads, cubes. They empty. They pack. They thaw. Buying them writes the year into the chronicle.</p><p>Customers do not come in for conditioner. That is you. <b>What to do about it:</b> open Shop, read the lots, buy before a tank goes sour rather than after.</p>",
    },
    {
      id: "k_name",
      sec: "The animals",
      t: "Names and thoughts",
      tags: "name nick thoughts chronicle saga fish curious",
      w: "<p>Every fish gets a name. They think about the water, the weather, the year, who they swim with, and whether someone came back from the pages. Click a fish for its card. Life lists what they are thinking. The Chronicle is the chain of why.</p><p><b>What to do about it:</b> name twenty and you have a secret. Read a thought, then open the Chronicle and see the line that put it there.</p>",
    },
    {
      id: "k_map",
      sec: "The quarter",
      t: "The street outside",
      tags: "map salem north end jobs crowd walkins bored",
      w: "<p>The Map is the North End, not a circle of ants. People have homes, trades, faiths, and a reason to be on a block. Some of them walk to your door. Some go to Haymarket. Some are at sea.</p><p><b>What to do about it:</b> open Map when the shop is quiet. Click a person if the card will take it. Life lists who has been in. A campaign is a bigger circle, not just a multiplier.</p>",
    },
    {
      id: "k_act",
      sec: "You and your people",
      t: "The console and /act",
      tags: "console act command gun street crowd",
      w: "<p>Slash opens the console. <kbd>/act</kbd> is you doing a thing in the world: the street notices, the floor notices, the water notices. A loud thing on Salem Street empties the shop. Kindness is cheaper and still shows.</p><p><b>What to do about it:</b> try a quiet act before a loud one. The Guide is not a list of acts. The street is the list.</p>",
    },
    {
      id: "k_guild",
      sec: "The shop floor",
      t: "The hall",
      tags: "guild dues standing mandate boycott till hall",
      w: "<p>There is a hall for people who sell living water. Dues, standing, a mandate pair. Fill it and they speak well. Miss the week and they put the word out. A boycott is an empty aisle.</p><p><b>What to do about it:</b> keep the pair they asked for. Pay the week. Life will say if they have turned.</p>",
    },
    {
      id: "k_fever",
      sec: "The shop floor",
      t: "Fever",
      tags: "fever ich sick street heat treat clog beast",
      w: "<p>A sickness that walks the road. Heat, sometimes a name. People look from the door. The glass can catch it. A clogged filter feeds it. A beast off the harbor feeds it.</p><p><b>What to do about it:</b> treat the water. Clean the filter. The gold line will say the name if it has one.</p>",
    },
    {
      id: "k_craft",
      sec: "The shop floor",
      t: "The hands",
      tags: "craft quality bag masterwork plaque combo till",
      w: "<p>A fish bag has quality. A tank has a plaque in a tongue spoken inland. String sales and the hands remember. A masterwork is someone who pays and tells the hall.</p><p><b>What to do about it:</b> do not break the run. The gold line says when a fish bag was good.</p>",
    },
  ];

  function esc(s) {
    var map = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;" };
    return String(s || "").replace(/[&<>"]/g, function (c) { return map[c]; });
  }

  function gs() {
    try {
      if (typeof gameState === "function") return gameState();
      if (typeof gameState === "object" && gameState) return gameState;
    } catch (e) {}
    return null;
  }

  function wikiList() {
    try {
      if (typeof WIKI === "function") return WIKI() || [];
      if (Array.isArray(WIKI)) return WIKI;
    } catch (e) {}
    return [];
  }

  function seedWiki() {
    if (seeded) return;
    var w = wikiList();
    if (!w || !w.push) return;
    for (var i = 0; i < EXTRA.length; i++) {
      var a = EXTRA[i];
      var hit = false;
      for (var j = 0; j < w.length; j++) if (w[j] && w[j].id === a.id) hit = true;
      if (!hit) w.push(a);
    }
    seeded = true;
  }

  function year() {
    try {
      if (window.saga && typeof saga.year === "function") return saga.year();
      if (typeof atlGen === "function") {
        var a = atlGen();
        if (a && a.now) return a.now | 0;
      }
    } catch (e) {}
    return 1000;
  }

  function fishAll() {
    try {
      if (typeof allFish === "function") return allFish() || [];
    } catch (e) {}
    var g = gs();
    return (g && g.fish) || [];
  }

  function havePair() {
    var c = Object.create(null);
    var list = fishAll();
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (!f || (f.stage != null && f.stage !== 2)) continue;
      var k = String(f.sp);
      c[k] = (c[k] || 0) + 1;
      if (c[k] >= 2) return true;
    }
    return false;
  }

  function clogged() {
    try {
      return !!window.clogged;
    } catch (e) {}
    return false;
  }

  function tokens(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter(function (w) {
        return w.length > 1;
      });
  }

  function matchArt(a, q) {
    if (!q) return true;
    var t = tokens(q);
    if (!t.length) return true;
    var hay = (a.t + " " + a.sec + " " + (a.tags || "") + " " + String(a.w || "").replace(/<[^>]+>/g, " ")).toLowerCase();
    for (var i = 0; i < t.length; i++) if (hay.indexOf(t[i]) < 0) return false;
    return true;
  }

  function diagnose() {
    var g = gs() || {};
    var st = g.stats || {};
    var list = fishAll();
    var day = window.shopLife && shopLife.day ? shopLife.day() : { sales: 0, misses: 0 };
    var sick = 0;
    var named = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && (list[i].sick || list[i].cond || list[i].ill)) sick++;
      if (list[i] && list[i].nick) named++;
    }
    var pellets = Math.floor(g.pellets || 0);
    var coins = g.coins || 0;
    var out = [];

    if (clogged()) out.push({ id: "clog", title: "The filter is packed", body: "People are turning around at the door. Click the clog pill on the HUD.", go: "tank", golabel: "The tank", art: "k_water" });
    if (sick) out.push({ id: "sick", title: sick + " in the water need you", body: "A sick fish is not a mood. Open the tank, click them, and get to the vet if a bottle will not do it.", go: "tank", golabel: "The tank", art: "The water column" });
    if (list.length && pellets <= 0) out.push({ id: "feed", title: "The tin is empty", body: "Click the water once you have pellets. Shop tab sells the tin.", go: "shop", golabel: "Shop", art: "k_hour" });
    if (!havePair() && (day.misses > 0 || (st.walked || 0) > 0)) out.push({ id: "pair", title: "They came for a fish you did not have", body: "Walk-ins look. They buy a pair. A unique fish is a display. Life has the till.", go: "life", golabel: "Your life", art: "k_nobuy" });
    if (coins < 80 && (st.sold || 0) === 0) out.push({ id: "thin", title: "The till is thin", body: "Do not sell the last of a kind. Fill an order or wait for lunch. Money tab is the levy, not a surprise.", go: "bank", golabel: "Money", art: "k_broke" });
    if ((day.sales || 0) === 0 && (day.misses || 0) >= 2) out.push({ id: "walk", title: "The till is all walked", body: day.misses + " left without a fish bag. Water, stock, or both.", go: "life", golabel: "The till", art: "k_till" });
    if (!out.length && named < 1 && list.length) out.push({ id: "name", title: "Nobody in the water has a name you gave them", body: "Click a fish. They already have a name. Read what they are thinking in Life.", go: "life", golabel: "Your life", art: "k_name" });
    if (!out.length) out.push({ id: "hold", title: "The water is holding", body: "Year " + year() + ". If you are bored, that is a different page. If you are curious, open the book.", go: "", golabel: "", art: "k_bored" });
    return out.slice(0, 3);
  }

  function bored() {
    var g = gs() || {};
    var list = fishAll();
    var items = [
      { title: "Name someone in the water", body: "Click a fish. Life lists what they think. Twenty names is a secret.", go: "tank", golabel: "The tank" },
      { title: "Read the till", body: "Sold against walked. Who asked for what. Regulars since which year.", go: "life", golabel: "Your life" },
      { title: "Walk the North End", body: "The Map is jobs and homes, not a circle around you.", go: "street", golabel: "Map" },
      { title: "The Atlas", body: "A thousand years already ran. Present is Year " + year() + ".", go: "atlas", golabel: "Atlas" },
      { title: "The Chronicle", body: "Cause chains. Weather. The year turning. Who came back from the pages.", go: "chron", golabel: "Chronicle" },
      { title: "The book in the back", body: "Not the wiki. The other one. Names that should stay in it.", go: "back", golabel: "Back" },
      { title: "Secrets", body: (Object.keys((g.eggs || {})).length || 0) + " found. The rest are in the shop, not in a list.", go: "eggs", golabel: "Secrets" },
      { title: "Harbor Supply", body: "Lots dated to Year " + year() + ". Conditioner, fish bags, pads.", go: "shop", golabel: "Shop" },
      { title: "The Calendar", body: "Season, holidays, millennial clock. It does not stop.", go: "cal", golabel: "Calendar" },
    ];
    if (list.length < 2) items.unshift({ title: "Stock a pair", body: "One of a kind is a display. Two is a shop.", go: "shop", golabel: "Shop" });
    return items.slice(0, 6);
  }

  function curious() {
    var w = wikiList();
    var picks = [];
    var want = ["What a fish learns", "The record", "What a fish is worth", "The crowd", "Present day", "The Necronomicon", "How things connect", "The nitrogen cycle"];
    for (var i = 0; i < want.length; i++) {
      for (var j = 0; j < w.length; j++) if (w[j] && w[j].t === want[i]) picks.push(w[j]);
    }
    if (picks.length < 4) {
      for (var k = 0; k < EXTRA.length && picks.length < 8; k++) picks.push(EXTRA[k]);
    }
    return picks.slice(0, 8);
  }

  function articlesForQuery() {
    var w = wikiList().concat(EXTRA);
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < w.length; i++) {
      var a = w[i];
      if (!a || !a.id || seen[a.id]) continue;
      seen[a.id] = 1;
      if (matchArt(a, query)) out.push(a);
    }
    return out;
  }

  function btn(go, label) {
    if (!go) return "";
    return '<button type="button" class="buy ghost" data-know-go="' + esc(go) + '">' + esc(label || "Open") + "</button>";
  }

  function artRow(a) {
    return (
      '<div class="row know-art"><div></div><div><div class="n">' +
      esc(a.t) +
      '</div><div class="d">' +
      a.w +
      "</div></div><div>" +
      (a.go ? btn(a.go, a.golabel) : "") +
      "</div></div>"
    );
  }

  function card(c) {
    return (
      '<div class="row know-card"><div></div><div><div class="n">' +
      esc(c.title) +
      '</div><div class="d">' +
      esc(c.body) +
      "</div></div><div>" +
      btn(c.go, c.golabel) +
      "</div></div>"
    );
  }

  function renderDesk() {
    var html = '<div class="know-desk" id="knowDesk">';
    html += '<div class="sec">The book</div>';
    html +=
      '<div class="note">Year ' +
      year() +
      ". A knowledge base for the shop: what is happening, what to do if you are stuck or bored, and the entries behind the systems. " +
      wikiList().length +
      " entries in the book.</div>";
    html +=
      '<div class="row"><div></div><div class="qty know-lanes">' +
      '<button type="button" class="buy ' +
      (mode === "now" ? "" : "ghost") +
      '" data-know-mode="now">I\'m stuck</button>' +
      '<button type="button" class="buy ' +
      (mode === "bored" ? "" : "ghost") +
      '" data-know-mode="bored">I\'m bored</button>' +
      '<button type="button" class="buy ' +
      (mode === "curious" ? "" : "ghost") +
      '" data-know-mode="curious">I\'m curious</button>' +
      '<button type="button" class="buy ' +
      (mode === "book" ? "" : "ghost") +
      '" data-know-mode="book">The whole book</button>' +
      "</div><div></div></div>";
    html +=
      '<div class="row"><div style="text-align:center;color:var(--muted);font-size:11px">find</div><div><input id="knowSearch" type="search" value="' +
      esc(query) +
      '" placeholder="oxygen, till, necronomicon, year, stuck…" autocomplete="off" spellcheck="false"></div><div>' +
      (query ? '<button type="button" class="buy ghost" data-know-mode="book" data-know-clear="1">Clear</button>' : "") +
      "</div></div>";

    if (query) {
      var found = articlesForQuery();
      html += '<div class="note">' + found.length + " entries match.</div>";
      for (var f = 0; f < found.length && f < 12; f++) html += artRow(found[f]);
      html += "</div>";
      return html;
    }

    if (mode === "now") {
      html += '<div class="sec">Right now</div>';
      var d = diagnose();
      for (var i = 0; i < d.length; i++) html += card(d[i]);
    } else if (mode === "bored") {
      html += '<div class="sec">If the shop is running itself</div>';
      var b = bored();
      for (var j = 0; j < b.length; j++) html += card(b[j]);
    } else if (mode === "curious") {
      html += '<div class="sec">If you just want to know</div>';
      var c = curious();
      for (var k = 0; k < c.length; k++) html += artRow(c[k]);
    } else {
      html += '<div class="note">Same book as Settings. Search, or pick a lane.</div>';
      var all = articlesForQuery();
      var sec = "";
      var n = 0;
      for (var a = 0; a < all.length && n < 20; a++) {
        if (all[a].sec !== sec) {
          sec = all[a].sec;
          html += '<div class="sec">' + esc(sec) + "</div>";
        }
        html +=
          '<div class="row"><div></div><div><div class="n">' +
          esc(all[a].t) +
          '</div><div class="d">' +
          all[a].w +
          "</div></div><div></div></div>";
        n++;
      }
    }
    html += "</div>";
    return html;
  }

  function isGuide() {
    var t = document.getElementById("dtitle");
    return !!(t && /guide|the book/i.test(t.textContent || ""));
  }

  function enhance(force) {
    if (!isGuide()) return;
    seedWiki();
    var body = document.getElementById("dbody");
    if (!body) return;
    var existing = document.getElementById("knowDesk");
    if (existing && !force) return;
    painting = true;
    var html = renderDesk();
    if (existing) existing.outerHTML = html;
    else body.insertAdjacentHTML("afterbegin", html);
    painting = false;
  }

  function go(id) {
    if (id === "map") id = "street";
    if (id === "front") id = "shop";
    var scenes = { tank: 1, shop: 1, street: 1, back: 1, cell: 1 };
    if (scenes[id]) {
      var b = document.querySelector('#scenes [data-scene="' + id + '"]');
      if (b) b.click();
      else if (typeof sceneGo === "function") try { sceneGo(id); } catch (e) {}
      return;
    }
    try {
      if (typeof openTab === "function") openTab(id);
    } catch (e2) {}
  }

  function bind() {
    var body = document.getElementById("dbody");
    if (!body || body.__know) return;
    body.__know = 1;
    body.addEventListener("click", function (e) {
      var t = e.target.closest("[data-know-mode],[data-know-go],[data-know-clear]");
      if (!t || !isGuide()) return;
      if (t.getAttribute("data-know-clear")) query = "";
      var m = t.getAttribute("data-know-mode");
      if (m) {
        mode = m;
        if (m !== "book") query = "";
      }
      var g = t.getAttribute("data-know-go");
      if (g) {
        go(g);
        return;
      }
      lastUi = 0;
      enhance(true);
      var input = document.getElementById("knowSearch");
      if (input && m === "book") input.focus();
    });
    body.addEventListener("input", function (e) {
      if (!e.target || e.target.id !== "knowSearch") return;
      query = e.target.value;
      mode = "book";
      enhance(true);
      var input = document.getElementById("knowSearch");
      if (input) {
        input.focus();
        try {
          input.setSelectionRange(query.length, query.length);
        } catch (err) {}
      }
    });
  }

  function tick() {
    try {
      bind();
      seedWiki();
      if (now() - lastUi > 0.6) {
        lastUi = now();
        if (isGuide() && !document.getElementById("knowDesk")) enhance();
      }
    } catch (e) {}
  }

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }
window.know = {
    diagnose: diagnose,
    year: year,
  };

  seedWiki();

  if (window.__onBeat) window.__onBeat(tick, 280);
  else setTimeout(function loop() { tick(); setTimeout(loop, 280); }, 280);

})();
