# Tank draw map: how fins.js draws decor, buyable plants and gadgets, and how a layer can detect each one

Measured in September 2026 against game/fins.js hash 471022f5eb, in headless Chromium at 1440x900. Byte offsets are `grep -b` offsets into that fins.js and move whenever it is rebuilt. This is the groundwork for shading decor, plants and gadgets from a layer (see docs/next-steps.md). The screenshots and probe scripts it mentions were in a temporary folder and were not kept.


Test values: DPR 1, `S=window.S=0.96`, `waterTop=128`, `floorY=795`.

**Headline results**
- Decor and buyable plants are the same records, drawn by the same function, and each item has one clean save…restore bracket. Detecting it by position worked in every frame I captured, with zero false matches.
- The heater, air stone and filter are each one `drawImage` of a cached sprite at a predictable rectangle. They can be swapped the same way bed.js swaps the rock texture.
- The thermometer, clams, cave and light hood have no bracket. They can only be recognised by their exact geometry.

### Groups 1 and 2: decor, buyable plants and critters
**Where the records live.**
- **Catalog:** `window.DECOR` (internal `mo`, declared at 106323) has 439 variants in 76 kinds. It is built by `Fe(kind, category, …)` at 128603.
  - **Plants (13):** sword, anubias, javafern, vallis, ludwigia, cabomba, marimo, floating, lotus, kelp, bamboo, planter, spawnmop.
  - **Hardscape (20):** driftwood, spiderwood, dragonstone, seiryu, lava, slatecave, coral, liverock, anemone, seafan, sponge, brain, staghorn, tubeworms, rockstack, arch, crystal, mushroom, fossil, ruins.
  - **Ornaments (43):** your list minus rockstack/arch/mushroom/crystal/fossil/staghorn/brain (those are Hardscape), plus starfish, urchin, lantern, wheel, trap, bottle, boot, buddha, hoop, bubblewall, mailbox, chess, skullpile, windvane, shelf.
  - Each catalog entry is `{id:"kind:variant", k, cat, p:{sc, t:{h,s,l}}, surface?}`. Only `floating` has `surface`.
- **Your group 2 is not separate.** Seafan, sponge, anemone and tubeworms are Hardscape; starfish and urchin are Ornaments; the rest are Plants. All of them are records in the same list and draw the same way. They have nothing to do with `up.plants`, which only controls the built-in scenery plants.
- **Placed items:** `G.decorByTank[G.view]`, also reachable as `window.tankDecor(view)` (internal `wt`, 107914). The array order is the draw order.
  - Record: `{id, x:0..1 fraction of canvas width, s:0.9–1.15, flip:±1, ph:0–6, dye:"none"|dyeId}`.
  - Optional fields: `live:1, m` (live plants; mass does not change the drawing), `dead`, `cv`, and `mp:{sat,alg,wear,fl,bob,anch}` (material state).
  - There is **no y and no z field**.
- **Placement:**
  - Buy decor: `Z5` (108943), random x in .08–.92.
  - Buy a live plant: `$4` (775166).
  - Nudge x: `qB`, clamped .04–.96.
  - Arrange mode: toggle `_x` (1975617) with the A key; hit test `zM` (1975699); drag writes `.x` in `Tce` (1976768), clamped .03–.97.
  - Slot limit: `ks()` = 24 + bonuses.

**Draw function and bracket.** `_5(e,t)` at 110386 draws one item. It handles 32 kinds itself and hands the other 44 to `XB(kind, e, t, ph, x, y, o)` at 141180, which runs inside the same bracket. It is called from the tank render `mB` (2023014) in two passes:
- Non-surface items at 2026918: `for(let S of g)(Vt(S.id)||{}).surface||_5(S,e)`. This is after scenery plants, rocks and the optional cave, and **before the fish**.
- Surface items at 2028756: `…surface&&_5(S,e)`. This is **after the fish**.

The bracket, exactly:
```
o=m*e.s*(n.p&&n.p.sc||1), a=e.x*D, s=(n.surface?G+6*m:W+3)-kb(e), r=VB(n,e), c=i;
r&&nd(KB(c,r)); i.save(); i.translate(a,s); i.scale(e.flip*o,o); …switch… default:XB(…) ; i.restore(); r&&nd(c)
```

**Detection rule (tested).**
- **Start:** `save()`, then immediately `translate(tx,ty)`, then immediately `scale(sx,sy)` with `sy>0` and `|sx|==sy`.
- **Match:** take the next expected item, walking the array's non-surface items in order and then its surface items. Require `tx === item.x*window.W` (exact equality) and `ty === (surface ? waterTop+6*S : floorY+3) - window.matDecorLift(item)`. Also `sy = S*item.s*sc` and `sign(sx) = item.flip`.
- **End:** the `restore()` that brings the save depth back to where it was.
- Re-read the array every frame and reset the expected index each frame. `window.__finsPreFrame` (from tech.js) runs before every animation frame and is a good place for the reset.
- **The position check is required.** The op sequence alone also matches fish sprites (world.js and tech.js both do save/translate/scale(±1,1)). My probe rejected about 6 of those per frame in play and about 30 per frame on the title screen, and accepted none.

**Measured detection results.** Brackets per frame equalled the item count in every frame:
- 76 kinds in 8 batches (10,10,10,10,10,10,10,6): 147 frames.
- A mixed set with a dye, flip −1, s=1.3, a tinted variant, a surface item, a live plant and a dead item: 19 frames at 6/6.
- Arrange mode on: 12 frames at 6/6.
- Title-screen showcase: 34 frames at 3/3.

**Size and bounding box.**
- On screen: device = `DPR × (a + flip·o·lx, y + o·ly)`, with `o = S·s·sc`, `a = x·W`, `y = the translate's ty`.
- `sc` varies by variant from 0.5 to 1.9, so read it from `DECOR[id].p.sc`.
- The table below is the local bbox in pixels `[x0,y0,x1,y1]`, measured at t=0 with flip=+1. I rendered each kind through the exposed `window.drawDecorThumb` into a transformed canvas. Items stand on y=0 and grow upward (negative y). `*` marks kinds drawn in `XB`.

Hardscape:

| kind | bbox | kind | bbox |
|---|---|---|---|
| driftwood | −8,−143,115,8 | seafan* | −84,−130,81,4 |
| spiderwood | −56,−141,110,3 | sponge* | −36,−85,36,0 |
| dragonstone | −60,−70,62,0 | brain* | −52,−46,52,2 |
| seiryu | −50,−95,55,0 | staghorn* | −85,−97,84,7 |
| lava | −48,−32,48,0 | tubeworms* | −51,−78,51,0 |
| slatecave | −50,−46,55,0 | rockstack* | −34,−72,34,8 |
| coral | −61,−91,56,5 | arch* | −58,−116,58,0 |
| liverock | −55,−60,60,0 | crystal* | −64,−102,64,26 |
| anemone | −47,−83,26,4 | mushroom* | −50,−66,50,0 |
| fossil* | −55,−81,62,42 | ruins* | −52,−92,52,−2 |

Ornaments:

| kind | bbox | kind | bbox |
|---|---|---|---|
| ship | −95,−142,84,25 | pot* | −49,−52,37,2 |
| chest | −30,−49,30,0 | pipe* | −49,−44,49,0 |
| castle | −56,−169,56,0 | coconut* | −30,−93,30,0 |
| diver | −26,−(to surface),26,2 | statue* | −26,−114,26,0 |
| sign | −43,−73,43,0 | gnome* | −21,−96,25,0 |
| skull | −34,−74,34,0 | anchor* | −54,−114,54,−1 |
| column | −24,−104,63,11 | barrel* | −32,−67,32,0 |
| volcano | −60,−120,60,0 | cannon* | −78,−51,46,7 |
| pagoda | −40,−122,40,0 | helmet* | −31,−64,31,2 |
| bridge | −72,−55,72,0 | neonsign* | −58,−124,58,0 |
| moai | −26,−110,28,0 | obelisk* | −16,−134,16,0 |
| pineapple | −41,−146,41,23 | lantern* | −52,−114,52,0 |
| lighthouse | −22,−152,22,0 (+ beams) | wheel* | −52,−98,52,6 |
| amphora | −2,−55,89,9 | trap* | −46,−111,53,2 |
| clamshell* | −46,−41,46,1 | bottle* | −70,−57,8,11 |
| starfish* | −32,−33,32,5 | boot* | −18,−56,46,0 |
| urchin* | −35,−44,33,−2 | buddha* | −42,−120,42,0 |
| bonsai* | −55,−111,71,6 | hoop* | −48,−120,48,0 |
| torii* | −66,−104,66,0 | bubblewall* | −64,−11,64,0 |
| mailbox* | −22,−96,32,0 | chess* | −28,−107,28,3 |
| skullpile* | −52,−56,35,4 | windvane* | −31,−94,31,0 |
| shelf* | −58,−88,58,0 | | |

Plants:

| kind | bbox | kind | bbox |
|---|---|---|---|
| sword | −90,−140,88,0 | marimo | −38,−38,39,2 |
| anubias | −67,−62,66,0 | floating (surface, hangs down) | −60,−12,55,57 |
| javafern | −86,−125,80,4 | lotus | −60,−120,60,1 |
| vallis | −31,−183,48,3 | kelp* | −54,−211,50,3 |
| ludwigia | −32,−120,32,0 | bamboo* | −65,−140,66,1 |
| cabomba | −23,−101,23,1 | planter* | −60,−83,62,0 |
| spawnmop* | −45,−84,37,−4 | | |

Several kinds are asymmetric (driftwood, amphora, bottle, boot, cannon), so the bbox mirrors when flip is −1. Things move by a few units from frame to frame as items sway.

The arrange-mode dashed box (drawn at 2030975) is `(x−60R, floorY−150R, 120R, 155R)` with `R=S·s`. It ignores `sc` and is not the real bbox.

**Draw order in the tank frame.**
1. Backdrop (`paintTankLook`), light shafts, floor caustics, gravel.
2. Fish shadows.
3. One combined contact-shadow path for scenery and decor (at 2025819), filled `rgba(6,14,24,.2)`. Each non-surface decor item contributes an ellipse of radius `46·S·s` at `floorY+5S`, flattened to height 0.2× that. So fins.js already draws a decor contact shadow.
4. Pellets, back-row plants, driftwood, rocks, front plants, cave.
5. **Decor (non-surface)**, clams, heater, air stone, feeder, snail, bubbles, eggs.
6. **Fish.**
7. Caustics, **surface decor**, coins, particles, water surface, light glow, hood, filter, glass.
8. Arrange overlay, vignette, tooltip, thermometer and O2 meter.

**Pitfalls, all measured.**
- **Every decor item is drawn through a Proxy.** Every variant carries a tint `p.t` (even h0/s1/l1), so `_5` replaces the internal context with `KB`'s Proxy (126841) for the whole item.
  - It reaches the real context's instance methods through `.bind(realCtx)`, so overrides on the tank context still fire with `this===ctx`. Confirmed at runtime: `window.ctx !== ctx` during items.
  - Every `fillStyle`/`strokeStyle` *string* is recoloured by `mX` (126375) before it reaches your setter. You receive `rgb(…)`; the getter reads back as hex. Gradients bypass the tint.
  - Dyes, dead items, cultivars and material wear/algae (`wb`) all enter through this Proxy.
- **Items float.** Buoyant materials rise unless weighted (`mp.anch`). This includes the plants I placed plus ship, chest and sign.
  - `ty` goes up by `kb(e)` (`window.matDecorLift`, 51315) = `fl·max(0, floorY−waterTop−60·o−8S) + sin(bob)·3S·fl`. In one test items sat at y≈344 instead of 798.
  - Floating items' `x` also drifts (±6e-4 per material tick).
  - A buoyant *surface* item was lifted off-canvas (ty = −322).
  - So read x and y from the live translate every frame. Never cache them.
- **Nested save/restore is common and always balanced inside the bracket.** Counts per item: coral 29, tubeworms 45, planter 9, sword/driftwood/pineapple/windvane 7, anubias/javafern 6. There is also nested rotate/translate/scale inside items: sword and plant leaves, amphora `rotate(1.1)`, diver `translate(0,−bob)`, lighthouse beam `scale(S,1)`.
  - A top-lit gradient built in bracket space will skew under these. Rebuild it at each fill from `getTransform()`: in current user space the gradient direction is ∝ `(m.b, m.d)`.
- **Gradients created inside items:** only marimo (3 radial per frame) and lighthouse (a linear `Zm` and radial `LB`, cached across frames and re-created only when the context identity changes). No `clip()` and no `drawImage` inside any item.
- **globalAlpha changes:** liverock (21 sets) and lighthouse (4, plus `lighter` compositing for the beams).
- **Text:** `fillText` is used by sign ("NO FISHING").
- **Particle side effects:** chest, diver, helmet, hoop, bubblewall and volcano use `Math.random` to push bubbles into lists drawn in other passes.
- **Size of the diver:** its hose runs up to the water surface: `lineTo(0, −(floorY−waterTop)/o − 20)`.
- **Draw counts per item** range from 3 to 165 (cabomba 165 strokes, staghorn 90). A per-fill texture pass costs about that many extra fills. After `fill()` the path is still current, so you can fill it again with a pattern without re-issuing it.
- **One draw per frame per item.** Each item is drawn once per frame in its pass. Only its contact shadow and emitted bubbles are drawn elsewhere.
- **Title-screen showcase:** `Pae` (1241547) swaps `G` for a fresh state with `G.title=1`, 2–3 random non-surface items and `up.plants=3`, drawn by the same `mB`. Detection works there (3/3). Key any per-item cache on the `G` object and the item object, and reset when `G` changes.
- **Thumbnails:** `drawDecorThumb` (`bB`, 2073352) draws `_5` into UI canvases (`canvas[data-decor]`) while temporarily changing `m/D/W/G`. It never touches the tank context, so thumbnails will not be relit unless you patch those canvases separately.
- **Chaining with other layers:**
  - bed.js already overrides `drawImage/save/restore/translate` and the `fillStyle/strokeStyle` accessors on the tank context. world.js also overrides `drawImage` when the Map is first painted.
  - A new layer has to chain onto whatever is on the instance at patch time.
  - Edge case: bed.js's plant signature (`translate` y == floorY+2 ±0.01) could catch a floating decor item for a frame as it passes that height.

### Group 3: gadgets
All gadgets are drawn by fins.js; no layer draws any of them. tech.js only paints the #techfx overlay (caustics, surface line, light rays, bloom, grain, vignette), and world.js `paintTankLook` only paints the backdrop.

| gadget | code (byte offset) | how it's drawn | on-screen rect | measured at 1440×900 |
|---|---|---|---|---|
| heater | `Kce`→`Iz` (1460576), from `window.heater={x, top=waterTop+30S, len=min(240S,(floorY−waterTop)·.55)}` | **one `drawImage`** of a cached sprite `Oz("heater")` (1459643; cached per key and size, bitmap is w·DPR × h·DPR); then an LED `arc` at `(x, top+10S, 2.2S)`, and when heating a radial glow `fillRect` plus a `lighter` save/restore and shimmer strokes | `(x−20.5S, top−12S, 41S, len+30S)` | [96,145,136,404] |
| air stone | `Vce`→`Nz` (1462833); air stone position is not exposed (it is `G.layout[view].air` if moved) | **one `drawImage`** of `Oz("airstone")` | `(airX−19S, floorY−19S, 96S, 26S)` | [900,777,992,802] |
| filter | `Xce`→`zz` (1463975), from `window.filterBox={x, w:120S, h:56S}` | **one `drawImage`** of `Oz("filter")`, drawn **after** the hood; then an outflow gradient in a save/restore, 7 strokes, ripple ellipses, LED and glow; "CLEAN ME" `fillText` when clogged | `(x−10S, waterTop−50S, w+20S, h+min(160S,(floorY−waterTop)·.5)+30S)` | [1091,80,1225,316] |
| thermometer + O2 meter | `Zce` (2041044), drawn at the very end of the frame | vector, **no bracket**: `roundRect` fill; red `fillRect`; bulb `arc`; 6 tick `fillRect`s; temperature `fillText`. The O2 meter adds a `roundRect` (drawn only when `o2Tank(view).worst<.82`) | tube `(13S, waterTop+40S, 10S, 90S)`; O2 meter `(14.5S, waterTop+144S, 7S, 48S)` | [12,166,22,253] |
| light hood | inline in `mB` at 2029890 | `fillRect`s with **no bracket**: `(0,0,W,waterTop−9S)` #0b0f14, `(0,waterTop−14S,W,5S)` #1a222c, a gradient tube strip `(12S,waterTop−13S,W−24S,5S)` coloured by the light type, and `(0,waterTop−9S,W,3S)`. Preceded by `Fz` (`lighter` radial hood glow) and the water surface `uy` | full width, y from 0 to waterTop−6S |: |
| feeder (only if `up.feeder>0`) | `gB` (2038220), from `window.feederBox={x, w:52S, h:30S}` | save…restore bracket starting with `fillRect(x−w/2−3S, waterTop−.62h−6S, w+6S, 7S)` #20272f | as given by `feederBox` | [483,104,538,146], partly under the HUD |
| snail (only if `up.snail>0`) | `Jce` (2040293) | `save; translate(snailX, floorY−2); scale(dir,1)`; the uniform ±1 scale would also pass a decor-style sequence check, so rely on position |: | [671,769,707,803] |
| clams (only if `up.clam>0`) | inline in `mB` at 2026965 | ellipses at `x=W·(.12+.15i), y=floorY−6`, 22S×10S, #b9a6c9 and #e6dced, **no bracket** |: |: |
| cave (only if `up.cave>0`) | `Yce` (2035061) | #3a2a1e mound at `x=.72W`, 105S × 62S, **no bracket** |: | [989,735,1090,818] |

- **Bubbles:** the bubble lists `ym` and `ws` are drawn inline in `mB` as circles.
- **Title screen:** the title showcase draws the same gadgets.
- **Arrange-mode boxes for gadgets:**
  - air stone: `(airX−40S, floorY−40S, 80S, 44S)`
  - heater: `(x−26S, top−10, 52S, len+20)`
  - filter: `(x−10, waterTop−45S, w+20, h+45S)`
