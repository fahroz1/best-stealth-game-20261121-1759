// Midnight Courier — the game itself: state, loop and rules glue.
// Screens: title, play, paused, caught, gameover, win. The world is one
// manor, four patrolling guards and a courier with three lives. Getting
// caught costs a life and sends the courier back to the entrance with the
// guards reset; the seals already gathered stay gathered. Gathering all
// three seals unseals the study door, and reaching it wins the run.
// A ?shot=start|play|alert|win query stages a frozen scene for screenshots.
import { LIVES_START, TILE, VIEW_H, VIEW_W } from './config.js';
import { Manor } from './level.js';
import { Guard } from './guards.js';
import { Player, ThrownCoin } from './player.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { stageShot } from './shots.js';

const GUARD_NAMES = ['The Librarian', 'The Steward', 'The Watchman', 'The Keeper'];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.manor = new Manor();
    this.player = new Player(this.manor);
    this.guards = this.manor.patrols.map((patrol, i) => new Guard(this.manor, patrol, GUARD_NAMES[i]));
    this.input = new Input(canvas);
    this.renderer = new Renderer(canvas);
    this.sound = new SoundBank();
    this.coins = [];
    this.noises = [];
    this.screen = 'title';
    this.elapsed = 0;
    this.lives = LIVES_START;
    this.caughtCount = 0;
    this.alertsRaised = 0;
    this.frozen = false;
    this.silent = false;
    this.prevGuardStates = this.guards.map((g) => g.state);
    this.lastTime = 0;
  }

  reset() {
    this.manor.resetSeals();
    this.player.reset();
    for (const guard of this.guards) guard.reset();
    this.coins = [];
    this.noises = [];
    this.elapsed = 0;
    this.lives = LIVES_START;
    this.caughtCount = 0;
    this.alertsRaised = 0;
    this.prevGuardStates = this.guards.map((g) => g.state);
  }

  resetAfterCaught() {
    this.player.x = this.manor.start.x;
    this.player.y = this.manor.start.y;
    this.player.facing = -Math.PI / 2;
    for (const guard of this.guards) guard.reset();
    this.coins = [];
    this.noises = [];
    this.prevGuardStates = this.guards.map((g) => g.state);
  }

  start() {
    this.reset();
    this.screen = 'play';
    this.sound.ensure();
    this.sound.startAmbient();
  }

  update(dt) {
    if (this.screen !== 'play') return;
    this.elapsed += dt;
    this.player.update(dt, this.input, this);
    for (const coin of this.coins) coin.update(dt, this);
    this.coins = this.coins.filter((coin) => !coin.done);
    for (const noise of this.noises) noise.age += dt;
    this.noises = this.noises.filter((noise) => noise.age < noise.life);
    for (const guard of this.guards) guard.update(dt, this.player, this.guards);
    this.watchGuardStates();
    if (this.checkCaught()) return;
    this.checkWin();
  }

  watchGuardStates() {
    this.guards.forEach((guard, i) => {
      const prev = this.prevGuardStates[i];
      if (guard.state !== prev) {
        if (guard.state === 'suspicious' && !this.silent) this.sound.suspicious();
        if (guard.state === 'alerted') {
          this.alertsRaised += 1;
          if (!this.silent) this.sound.alert();
        }
        this.prevGuardStates[i] = guard.state;
      }
    });
  }

  checkCaught() {
    for (const guard of this.guards) {
      if (!guard.touches(this.player)) continue;
      this.caughtCount += 1;
      this.lives -= 1;
      if (!this.silent) this.sound.caught();
      this.noises = [];
      this.coins = [];
      if (this.lives <= 0) {
        this.screen = 'gameover';
      } else {
        this.screen = 'caught';
      }
      return true;
    }
    return false;
  }

  checkWin() {
    const exit = this.manor.exit;
    const onExit = Math.hypot(exit.x - this.player.x, exit.y - this.player.y) < TILE * 0.7;
    if (onExit && this.player.hasAllSeals) {
      this.screen = 'win';
      if (!this.silent) this.sound.win();
    }
  }

  onFootstep(player) {
    if (this.silent) return;
    const floor = this.manor.floorAtPixel(player.x, player.y);
    this.sound.footstep(player.sneaking, floor === ',');
  }

  emitNoise(noise) {
    // A quiet footstep on a rug rings out nowhere: no ring, no guard hears it.
    if (noise.quiet) return;
    this.noises.push({ ...noise, age: 0, life: 1.1 });
    for (const guard of this.guards) guard.hearNoise(noise);
  }

  tossCoin(toX, toY) {
    const x = Math.max(TILE, Math.min(VIEW_W - TILE, toX));
    const y = Math.max(TILE, Math.min(VIEW_H - TILE, toY));
    this.coins.push(new ThrownCoin(this.player.x, this.player.y, x, y));
  }

  onCoinLanded() {
    if (!this.silent) this.sound.coinClink();
  }

  onSealCollected() {
    if (this.silent) return;
    this.sound.sealPickup();
    if (this.player.hasAllSeals) this.sound.doorUnlock();
  }

  handleKeys() {
    const input = this.input;
    if (input.consumePressed('KeyM')) {
      const muted = this.sound.toggleMute();
      void muted;
    }
    if (this.screen === 'title') {
      if (input.consumePressed('Enter') || input.consumePressed('NumpadEnter') || input.consumeCoinToss()) {
        this.sound.ensure();
        this.sound.click();
        this.start();
      }
      return;
    }
    if (this.screen === 'play') {
      if (input.consumePressed('KeyP') || input.consumePressed('Escape')) {
        this.screen = 'paused';
        this.sound.click();
      }
      return;
    }
    if (this.screen === 'paused') {
      if (input.consumePressed('KeyP') || input.consumePressed('Escape') || input.consumePressed('Enter')) {
        this.screen = 'play';
        this.sound.click();
      }
      return;
    }
    if (this.screen === 'caught') {
      if (input.consumePressed('Enter') || input.consumePressed('NumpadEnter')) {
        this.resetAfterCaught();
        this.screen = 'play';
        this.sound.click();
      }
      return;
    }
    if (this.screen === 'gameover' || this.screen === 'win') {
      if (input.consumePressed('Enter') || input.consumePressed('NumpadEnter')) {
        this.sound.click();
        this.start();
      }
    }
  }

  frame = (time) => {
    const dt = Math.min(0.05, (time - this.lastTime) / 1000 || 0.016);
    this.lastTime = time;
    if (!this.frozen) {
      this.handleKeys();
      this.update(dt);
    }
    this.renderer.draw(this);
    this.input.endFrame();
    requestAnimationFrame(this.frame);
  };

  run() {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) {
      this.silent = true;
      this.frozen = true;
      stageShot(shot, this);
    }
    requestAnimationFrame(this.frame);
  }
}

// Boot: one canvas, one game, first frame on the next animation tick.
const canvas = document.getElementById('game');
const game = new Game(canvas);
game.run();
