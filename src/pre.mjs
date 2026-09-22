/* Layers that load before fins.js.

   The order below is the load order. The layers wrap each other's window functions and read
   each other's state, so a layer has to come after the ones it builds on. This list is the only
   record of what is in the build: tools/check-wiring.mjs fails on a layer file that is not
   imported here, or one imported twice. tools/build.mjs bundles it into game/layers-pre.js. */
import "./layers/sound.js";
import "./layers/glass.js";
import "./layers/world.js";
import "./layers/folk.js";
