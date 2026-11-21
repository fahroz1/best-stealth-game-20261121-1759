// Midnight Courier — guards: patrols, vision cones and alert states.
// A guard walks a fixed waypoint loop, pauses at each stop to look around,
// and watches a 72-degree cone about six tiles long. Walls and tall cover
// block the view. While the courier stands inside a cone in line of sight,
// the guard's detection fills — faster in lamplight, slower in darkness
// and while the courier sneaks. At a glimpse the guard grows suspicious
// and walks to the last spot they saw; at full detection they are alerted,
// chase the courier and raise nearby guards. A guard that loses the trail
// calms back down to patrol.
import {
  ALERT_MEMORY_SECONDS,
  DETECT_ALERT_AT,
  DETECT_DRAIN,
  DETECT_FILL_BASE,
  DETECT_SUSPICIOUS_AT,
  GUARD_CHASE_SPEED,
  GUARD_PATROL_SPEED,
  GUARD_RADIUS,
  GUARD_SUSPICIOUS_SPEED,
  INVESTIGATE_LOOK_SECONDS,
  TILE,
  VISION_HALF_ANGLE,
  VISION_RANGE,
} from './config.js';

export const GUARD_CALM = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_ALERTED = 'alerted';

function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export class Guard {
  constructor(manor, waypoints, name) {
    this.manor = manor;
    this.name = name;
    this.waypoints = waypoints.map((w) => tileCenter(w.tx, w.ty));
    this.wpIndex = 1;
    const start = this.waypoints[0];
    this.x = start.x;
    this.y = start.y;
    this.facing = 0;
    this.state = GUARD_CALM;
    this.detection = 0;
    this.waitTimer = 0;
    this.lookTimer = 0;
    this.alertTimer = 0;
    this.investigate = null;
    this.lastSeen = null;
    this.seenPlayer = false;
    this.stepPhase = Math.random() * Math.PI * 2;
    this.aimAt(this.waypoints[1]);
  }

  aimAt(point) {
    this.facing = Math.atan2(point.y - this.y, point.x - this.x);
  }

  reset() {
    const start = this.waypoints[0];
    this.x = start.x;
    this.y = start.y;
    this.wpIndex = 1;
    this.state = GUARD_CALM;
    this.detection = 0;
    this.waitTimer = 0;
    this.lookTimer = 0;
    this.alertTimer = 0;
    this.investigate = null;
    this.lastSeen = null;
    this.seenPlayer = false;
    this.aimAt(this.waypoints[1]);
  }

  // True when the courier is inside the cone and nothing blocks the view.
  canSee(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance > VISION_RANGE) return false;
    let angle = Math.atan2(dy, dx) - this.facing;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    if (Math.abs(angle) > VISION_HALF_ANGLE) return false;
    return this.manor.hasLineOfSight(this.x, this.y, player.x, player.y);
  }

  // How fast detection fills right now: lamplight and closeness hurry it,
  // darkness, distance and sneaking slow it.
  detectionRate(player, distance) {
    const closeness = 1 - (distance / VISION_RANGE) * 0.6;
    const light = this.manor.isLit(player.x, player.y) ? 1.6 : 0.6;
    const stance = player.sneaking ? 0.5 : player.running ? 1.2 : 1;
    return DETECT_FILL_BASE * closeness * light * stance;
  }

  hearNoise(noise) {
    if (this.state === GUARD_ALERTED) return;
    const dx = noise.x - this.x;
    const dy = noise.y - this.y;
    if (dx * dx + dy * dy > noise.radius * noise.radius) return;
    this.investigate = { x: noise.x, y: noise.y };
    if (this.state === GUARD_CALM) this.state = GUARD_SUSPICIOUS;
    this.lookTimer = 0;
  }

  becomeAlerted(player) {
    this.state = GUARD_ALERTED;
    this.detection = DETECT_ALERT_AT;
    this.lastSeen = { x: player.x, y: player.y };
    this.alertTimer = ALERT_MEMORY_SECONDS;
  }

  update(dt, player, guards) {
    const distance = Math.hypot(player.x - this.x, player.y - this.y);
    this.seenPlayer = this.canSee(player);
    if (this.seenPlayer) {
      this.detection = Math.min(
        DETECT_ALERT_AT,
        this.detection + this.detectionRate(player, distance) * dt,
      );
      this.lastSeen = { x: player.x, y: player.y };
      this.alertTimer = ALERT_MEMORY_SECONDS;
      if (this.detection >= DETECT_ALERT_AT && this.state !== GUARD_ALERTED) {
        this.becomeAlerted(player);
        // An alerted guard shouts: nearby guards grow suspicious too.
        for (const other of guards) {
          if (other === this || other.state === GUARD_ALERTED) continue;
          const od = Math.hypot(other.x - this.x, other.y - this.y);
          if (od < 5 * TILE) {
            other.state = GUARD_SUSPICIOUS;
            other.investigate = { x: player.x, y: player.y };
            other.detection = Math.max(other.detection, 0.6);
          }
        }
      } else if (this.detection >= DETECT_SUSPICIOUS_AT && this.state === GUARD_CALM) {
        this.state = GUARD_SUSPICIOUS;
        this.investigate = { x: player.x, y: player.y };
      }
    } else {
      this.detection = Math.max(0, this.detection - DETECT_DRAIN * dt);
      if (this.state === GUARD_ALERTED) {
        this.alertTimer -= dt;
        if (this.alertTimer <= 0) {
          this.state = GUARD_SUSPICIOUS;
          this.investigate = this.lastSeen ? { ...this.lastSeen } : null;
          this.detection = 0.5;
        }
      }
      if (this.state === GUARD_SUSPICIOUS && this.detection < DETECT_SUSPICIOUS_AT && !this.investigate) {
        this.state = GUARD_CALM;
      }
    }

    if (this.state === GUARD_CALM) this.patrol(dt);
    else if (this.state === GUARD_SUSPICIOUS) this.investigateSpot(dt);
    else this.chase(dt, player);
  }

  // Walk toward a point, sliding along walls instead of sticking to them.
  moveToward(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) return true;
    const step = Math.min(distance, speed * dt);
    const nx = this.x + (dx / distance) * step;
    const ny = this.y + (dy / distance) * step;
    if (!this.manor.hitsSolid(nx, this.y, GUARD_RADIUS)) this.x = nx;
    if (!this.manor.hitsSolid(this.x, ny, GUARD_RADIUS)) this.y = ny;
    this.facing = Math.atan2(dy, dx);
    this.stepPhase += dt * 9;
    return Math.hypot(tx - this.x, ty - this.y) < 4;
  }

  patrol(dt) {
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      // Look around while waiting at a waypoint.
      this.facing += Math.sin(this.waitTimer * 2.4) * dt * 0.9;
      return;
    }
    const target = this.waypoints[this.wpIndex];
    if (this.moveToward(target.x, target.y, GUARD_PATROL_SPEED, dt)) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.waitTimer = 1.1;
    }
  }

  investigateSpot(dt) {
    if (!this.investigate) {
      this.state = GUARD_CALM;
      return;
    }
    if (this.lookTimer > 0) {
      this.lookTimer -= dt;
      this.facing += dt * 1.6;
      if (this.lookTimer <= 0) {
        this.investigate = null;
        this.state = GUARD_CALM;
        this.detection = 0;
      }
      return;
    }
    if (this.moveToward(this.investigate.x, this.investigate.y, GUARD_SUSPICIOUS_SPEED, dt)) {
      this.lookTimer = INVESTIGATE_LOOK_SECONDS;
    }
  }

  chase(dt, player) {
    // Chase the courier's last seen spot; the trail refreshes while visible.
    const target = this.seenPlayer ? player : this.lastSeen;
    if (!target) {
      this.state = GUARD_SUSPICIOUS;
      return;
    }
    this.moveToward(target.x, target.y, GUARD_CHASE_SPEED, dt);
  }

  // Caught when an alerted guard closes to touching distance.
  touches(player) {
    return (
      this.state === GUARD_ALERTED &&
      Math.hypot(player.x - this.x, player.y - this.y) < GUARD_RADIUS + 13
    );
  }
}
