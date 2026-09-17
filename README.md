# Fin's

A harbor aquarium shop that keeps going after you look away.

You open in Year 1000. The tanks are already running. People come in off the street for a fish, for change, for a look, or because they always walk this block at six. The till is a run. The floor is wet or it isn't. The record does not close.

```
              ·  ~    ~   ·
         ╔══════════════════════╗
         ║  .  ><>      ><{{{{º ║
         ║ ·   ≈   ><>     ≈  · ║
         ║  ──────────────────  ║
         ║        F I N ' S     ║
         ╚══════════╤═══════════╝
                    │
                 the till

         a shop. a street. a record.
```

This is not a tycoon spreadsheet wearing fish. It is not Dwarf Fortress with a cash register glued on. It is a room: glass, gravel, a counter, a neighbor who remembers the last bag, and a thousand years of people who already lived here before you hung the sign.

Private source. [Business Source License 1.1](LICENSE).

---

## Why this exists

Most shop games sell you a loop. Fin's sells you a morning.

The usual options fall down in different places:

- **An idle aquarium.** Pretty water. Numbers go up. Nobody on the street has a name, and the floor cannot flood.
- **A tycoon.** Staff bars, upgrade trees, a graph of profit. The fish are SKUs. The city is a multiplier.
- **A fortress.** Deep, and the map is the world. There is no till. There is no one person waiting while you scrape algae.
- **A visual novel with a shop skin.** Dialogue. No physics. The wet boards do not change whether they buy.

Fin's is the other object: a shop you can keep, on a street that notices, with water that has a temperature, and a record that is still writing.

| | What you tend | What remembers you | What happens if you look away |
|---|---|---|---|
| Idle tank | a meter | nothing | the number |
| Tycoon | a firm | a ledger | the quarter |
| Fortress | a hold | a civ | the season |
| **Fin's** | this room | the baker, the fish, the year | the next customer |

---

## What is actually different

**The building is a site.** Sixteen by ten cells of heat, standing water, glass, oak, and a filter that clogs. A leak is not a toast. It is a puddle people will not step in, and a sale that will not close.

**People are not traffic.** A regular has a last visit. They wanted a pair and you sold the last adult. They will say so. The baker on the next block trusts you until the aisle is wet.

**The atlas did not stop in Year 1000.** Historical figures still act. Facets inherit. Close blood has a cost. Materials react: salt eats iron, oak rots, glass etches. Present day is a year with a number, not a credits screen.

**The till is a run.** Two bags in a row is a temperature. Miss, and it breaks. The gold line under the name is unfinished work, not a loot table. There is no gacha.

**Cause has a chain.** Weather cools the room. The room stresses the named fish. A stressed fish will not bag. A miss becomes a rumor on the street. The rumor walks back in after lunch.

```
  street ──► door ──► aisle ──► glass ──► till
    ▲          │         │         │        │
    │          │         wet       cold     bag
    └──────────┴─────────┴─────────┴────────┘
                     because
```

---

## For people (and agents) in this repo

Fin's is a game you serve from a folder, not a package you install into something else.

**Use it when** the work is this shop: the water, the street, the daybook, the run. When a change has to show up in play — odds, speech, a wet floor — not in a tab that nobody opens.

**Leave it when** you want a generic tycoon kit, a Store listing, or a public clone under another name. This copy is private on purpose.

If you are an agent:

1. Play it before you patch it. The gold line, the pair rule, the puddle.
2. Do not flatten the shop into a sim you cannot walk.
3. Do not invent a second HUD. The strip at the top is already too willing to wrap.
4. A toast that fires on continue without a bag is a bug. The run starts this session.
5. Keep the name Fin's. The shopkeeper is not the sign.
6. The source is BSL. Do not relicense it as MIT. Do not publish the art as a starter kit.

---

## Three ways to play

**In a tab.** Serve `game/` and open `index.html`. Same shop. The live preview is this.

**As a window.** The desktop shell is Chromium without the browser chrome. No tab sleeping. F11 is fullscreen. Mac, Windows, Linux — one source, three packages.

```bash
git clone https://github.com/SharpMeow/fins-shop.git
cd fins-shop
npm install
npm start
```

**As a download.** GitHub Actions builds the installers. Run the **desktop** workflow, or push a tag `v1.0.0`. Artifacts:

| Machine | What you get |
|---|---|
| Mac | `.dmg` (unsigned — right-click, Open, the first time). The window still says Fin's. |
| Windows | installer `.exe`, or a portable `.exe` |
| Linux | `.AppImage` or `.deb` |

The shop inside is the same `game/` folder the tab uses.

### Does a window draw better?

It can spend more pixels. It will not grow a new renderer.

The tank is still Canvas 2D plus WebGL2 water. A tab throttles when you look away; a window does not. Retina can hold 2.25× the backing store instead of 1.5×. Settings still has Render scale if the machine is loud. There is no native Metal/Vulkan rewrite hiding under this. If the glass looks cheap, that is the art and the shaders, not the shell.

---

## Run it in a tab

Needs a Chromium browser. A local server is kinder to the maps than a file://.

```bash
python3 -m http.server 8080 --directory game
```

Then [http://127.0.0.1:8080/index.html](http://127.0.0.1:8080/index.html).

Click the water to feed. Click the filter when it sours. Keep two of a kind if you mean to sell. The rest of the shop is waiting on that.

| | |
|---|---|
| Tank / Shop / Map | the three rooms |
| Life | the daybook |
| Guide | when you are stuck, bored, or curious |
| `/act` | you did a thing. the street heard it |

---

## License

[Business Source License 1.1](LICENSE).

Play it. Study it. Keep a copy.

Do not sell the source, and do not ship Fin's as a competing shop. On 17 September 2030 this version becomes Apache 2.0.

Built by Chaos.
