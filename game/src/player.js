// Midnight Courier — the courier: movement, noise and thrown coins.
// WASD or arrows move; Shift sneaks (slower, quieter, harder to spot) and
// plain running is fast but loud — every few steps it rings out a noise
// circle that guards walk over to check. Q or a mouse click tosses one of
// the courier's limited coins toward the pointer: the clink draws the
// nearest guard to that spot. Walking over a wax seal collects it; E does
// the same when one is close.
import {
  COINS_START,
  NOISE_COIN_RADIUS,
  NOISE_RUN_RADIUS,
  NOISE_SNEAK_RADIUS,
  PLAYER_RADIUS,
  PLAYER_RUN_MULT,
  PLAYER_SNEAK_MULT,
  PLAYER_WALK_SPEED,
  SEALS_TOTAL,
  TILE,
} from './config.js';

export class Player {
  constructor(manor) {
    this.manor = manor;
    this.reset();
  }

  reset() {
    this.x = this.manor.start.x;
    this.y = this.manor.start.y;
    this.facing = -Math.PI / 2;
    this.sneaking = false;
    this.running = false;
    this.moving = false;
    this.coins = COINS_START;
    this.seals = 0;
    this.noiseTimer = 0;
    this.stepTimer = 0;
  }

  update(dt, input, world) {
    const left = input.isDown('ArrowLeft', 'KeyA');
    const right = input.isDown('ArrowRight', 'KeyD');
    const up = input.isDown('ArrowUp', 'KeyW');
    const down = input.isDown('ArrowDown', 'KeyS');
    let mx = (right ? 1 : 0) - (left ? 1 : 0);
    let my = (down ? 1 : 0) - (up ? 1 : 0);
    const length = Math.hypot(mx, my);
    this.moving = length > 0;
    this.sneaking = input.isDown('ShiftLeft', 'ShiftRight') || input.sneakToggle;
    // Running is the default pace; sneaking is the slow quiet one.
    this.running = this.moving && !this.sneaking;
    if (this.moving) {
      mx /= length;
      my /= length;
      const speed = PLAYER_WALK_SPEED * (this.sneaking ? PLAYER_SNEAK_MULT : PLAYER_RUN_MULT);
      const nx = this.x + mx * speed * dt;
      const ny = this.y + my * speed * dt;
      if (!this.manor.hitsSolid(nx, this.y, PLAYER_RADIUS)) this.x = nx;
      if (!this.manor.hitsSolid(this.x, ny, PLAYER_RADIUS)) this.y = ny;
      this.facing = Math.atan2(my, mx);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.sneaking ? 0.55 : 0.34;
        world.onFootstep(this);
      }
      // Loud running rings out on marble and wood alike.
      this.noiseTimer -= dt;
      if (this.running && this.noiseTimer <= 0) {
        this.noiseTimer = 0.45;
        const floor = this.manor.floorAtPixel(this.x, this.y);
        const radius = floor === ',' ? NOISE_RUN_RADIUS * 0.45 : NOISE_RUN_RADIUS;
        world.emitNoise({ x: this.x, y: this.y, radius, kind: 'footsteps', quiet: floor === ',' });
      }
    }

    // Toss a coin toward the pointer: Q, or a mouse click.
    const toss = input.consumeCoinToss();
    if (toss && this.coins > 0) {
      this.coins -= 1;
      world.tossCoin(toss.x, toss.y);
    }

    // Collect seals by walking over them; E also works when one is close.
    for (const seal of this.manor.seals) {
      if (seal.taken) continue;
      const near = Math.hypot(seal.x - this.x, seal.y - this.y) < TILE * 0.9;
      if (near) {
        seal.taken = true;
        this.seals += 1;
        world.onSealCollected(seal);
      }
    }
  }

  get hasAllSeals() {
    return this.seals >= SEALS_TOTAL;
  }
}

// A tossed coin: it arcs to its target, then clinks and rings out.
export class ThrownCoin {
  constructor(fromX, fromY, toX, toY) {
    this.fromX = fromX;
    this.fromY = fromY;
    this.toX = toX;
    this.toY = toY;
    this.x = fromX;
    this.y = fromY;
    this.t = 0;
    this.landed = false;
    this.ringAge = 0;
  }

  update(dt, world) {
    if (!this.landed) {
      this.t += dt / 0.38;
      if (this.t >= 1) {
        this.t = 1;
        this.landed = true;
        this.ringAge = 0;
        world.emitNoise({ x: this.toX, y: this.toY, radius: NOISE_COIN_RADIUS, kind: 'coin', quiet: false });
        world.onCoinLanded(this);
      }
      const ease = this.t;
      this.x = this.fromX + (this.toX - this.fromX) * ease;
      this.y = this.fromY + (this.toY - this.fromY) * ease;
    } else {
      this.ringAge += dt;
    }
  }

  get done() {
    return this.landed && this.ringAge > 1.6;
  }

  get height() {
    return this.landed ? 0 : Math.sin(this.t * Math.PI) * 26;
  }
}
