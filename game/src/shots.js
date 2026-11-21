// Midnight Courier — staged screenshot scenes.
// Each shot plays the real rules forward from a fresh world for a fixed
// number of steps, then places the courier and the guards by hand, so the
// frame is what the game really looks like and the same query always gives
// the same frame. The game freezes after staging: no input, no updates,
// only the renderer (lamps flicker on the clock).
import { TILE } from './config.js';
import { GUARD_ALERTED, GUARD_SUSPICIOUS } from './guards.js';

const STEP = 1 / 60;

function simulate(game, seconds) {
  const previousScreen = game.screen;
  game.screen = 'play';
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) game.update(STEP);
  game.screen = previousScreen;
}

function tilePixel(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function collectSeal(game, index) {
  const seal = game.manor.seals[index];
  if (seal && !seal.taken) {
    seal.taken = true;
    game.player.seals += 1;
  }
}

/**
 * Set the game to the named scene (start, play, alert or win) and return
 * the screen to draw over it.
 */
export function stageShot(name, game) {
  game.reset();
  game.silent = true;
  if (name === 'play') {
    simulate(game, 4);
    // Mid-level: the courier sneaks along the gallery rug toward the
    // middle seal while the watchman patrols up behind, half suspicious.
    const spot = tilePixel(12.5, 9.5);
    game.player.x = spot.x;
    game.player.y = spot.y;
    game.player.facing = 0;
    game.player.sneaking = true;
    collectSeal(game, 0);
    const watchman = game.guards[2];
    watchman.detection = 0.45;
    watchman.state = GUARD_SUSPICIOUS;
    watchman.investigate = { x: spot.x + 60, y: spot.y };
    game.screen = 'play';
    return;
  }
  if (name === 'alert') {
    simulate(game, 4);
    // Near miss: the watchman has spotted the courier in the gallery and
    // is closing in, cone red, exclamation up, two seals already taken.
    const courier = tilePixel(24.5, 9.5);
    game.player.x = courier.x;
    game.player.y = courier.y;
    game.player.facing = Math.PI;
    collectSeal(game, 0);
    collectSeal(game, 1);
    const watchman = game.guards[2];
    const guardSpot = tilePixel(21.5, 9.5);
    watchman.x = guardSpot.x;
    watchman.y = guardSpot.y;
    watchman.facing = 0;
    watchman.detection = 1;
    watchman.state = GUARD_ALERTED;
    watchman.lastSeen = { x: courier.x, y: courier.y };
    watchman.alertTimer = 6;
    game.screen = 'play';
    return;
  }
  if (name === 'win') {
    simulate(game, 3);
    // The finish: all three seals gathered, the courier at the open study
    // door, the win screen up with the time and the stealth rating.
    collectSeal(game, 0);
    collectSeal(game, 1);
    collectSeal(game, 2);
    const exit = tilePixel(29.5, 14.5);
    game.player.x = exit.x;
    game.player.y = exit.y;
    game.player.facing = 0;
    game.elapsed = 222;
    game.caughtCount = 0;
    game.alertsRaised = 0;
    game.screen = 'win';
    return;
  }
  // start: the title screen over a manor already alive with patrols.
  simulate(game, 6);
  game.screen = 'title';
}
