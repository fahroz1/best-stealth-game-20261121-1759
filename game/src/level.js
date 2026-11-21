// Midnight Courier — the manor floor.
// The level is a grid of tiles, 32 by 18, drawn as text so the rooms are
// easy to read and rearrange. Legend:
//   # wall        . wooden floor      , rug (quiet floor)
//   M marble (loud floor)            L lamp (walkable, lights a pool)
//   B bookshelf   C crate            P potted plant    ~ curtain
//   S wax seal    E study exit door  @ courier start
// Walls and tall cover block movement and guard sight. Rugs hush footsteps;
// marble carries them. Lamps make the courier easier to spot.
import { COLS, LAMP_RADIUS, ROWS, TILE } from './config.js';

const MAP = [
  '################################',
  '#PB..B.~~.B.B..#MMMM~~MMMMMMMM' + 'P#',
  '#.S.L..........#MMMMLMMMMMMMMSM#',
  '#B..,,,,,.......MMMMMMMMMMMMMMM#',
  '#...,,,,,......#MMMMMMCCCMMMMMM#',
  '#B..,,,,,...L..#MMMMMMMMMMMMLMM#',
  '#..............#MMMMMMMMMMMMMMM#',
  '#####.###################.######',
  '#.............CCC..............#',
  '#.......L.,,,,,,S,,,,,..L......#',
  '#...................CC.........#',
  '#####.###################.######',
  '#P.....~~......#.............B.#',
  '#...L..........#....,,,,L,,....#',
  '#..............#....,,,,,,,...E#',
  '#..@.......C.P.#....,,,,,,,....#',
  '#..............#...............#',
  '################################',
];

export const SOLID_TILES = new Set(['#', 'B', 'C', 'P', '~']);
export const SIGHT_BLOCKERS = SOLID_TILES;

function parseMap() {
  const grid = MAP.map((row) => row.split(''));
  const lamps = [];
  const seals = [];
  let exit = null;
  let start = null;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = grid[y][x];
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      if (tile === 'L') lamps.push({ x: cx, y: cy, tx: x, ty: y });
      if (tile === 'S') seals.push({ x: cx, y: cy, tx: x, ty: y, taken: false });
      if (tile === 'E') exit = { x: cx, y: cy, tx: x, ty: y };
      if (tile === '@') start = { x: cx, y: cy, tx: x, ty: y };
    }
  }
  return { grid, lamps, seals, exit, start };
}

export class Manor {
  constructor() {
    const parsed = parseMap();
    this.grid = parsed.grid;
    this.lamps = parsed.lamps;
    this.seals = parsed.seals;
    this.exit = parsed.exit;
    this.start = parsed.start;
    // Guard patrol loops, in tile coordinates. Every leg is axis-aligned
    // and runs down clear floor, so guards never need to path around cover.
    this.patrols = [
      // The librarian's loop around the library shelves.
      [{ tx: 2, ty: 2 }, { tx: 12, ty: 2 }, { tx: 12, ty: 6 }, { tx: 2, ty: 6 }],
      // The dining steward's loop across the marble hall.
      [{ tx: 18, ty: 2 }, { tx: 29, ty: 2 }, { tx: 29, ty: 6 }, { tx: 18, ty: 6 }],
      // The gallery watchman, up and down the long rug runner.
      [{ tx: 3, ty: 9 }, { tx: 28, ty: 9 }],
      // The study keeper's loop past the sealed exit door.
      [{ tx: 18, ty: 13 }, { tx: 28, ty: 13 }, { tx: 28, ty: 15 }, { tx: 18, ty: 15 }],
    ];
  }

  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
    return this.grid[ty][tx];
  }

  tileAtPixel(px, py) {
    return this.tileAt(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  isSolidTile(tx, ty) {
    return SOLID_TILES.has(this.tileAt(tx, ty));
  }

  // Circle-versus-tile collision: true when a circle of `radius` at (px, py)
  // overlaps any solid tile.
  hitsSolid(px, py, radius) {
    const minTx = Math.floor((px - radius) / TILE);
    const maxTx = Math.floor((px + radius) / TILE);
    const minTy = Math.floor((py - radius) / TILE);
    const maxTy = Math.floor((py + radius) / TILE);
    for (let ty = minTy; ty <= maxTy; ty += 1) {
      for (let tx = minTx; tx <= maxTx; tx += 1) {
        if (!this.isSolidTile(tx, ty)) continue;
        const nearestX = Math.max(tx * TILE, Math.min(px, tx * TILE + TILE));
        const nearestY = Math.max(ty * TILE, Math.min(py, ty * TILE + TILE));
        const dx = px - nearestX;
        const dy = py - nearestY;
        if (dx * dx + dy * dy < radius * radius) return true;
      }
    }
    return false;
  }

  floorAtPixel(px, py) {
    return this.tileAtPixel(px, py);
  }

  isLit(px, py) {
    for (const lamp of this.lamps) {
      const dx = px - lamp.x;
      const dy = py - lamp.y;
      if (dx * dx + dy * dy < LAMP_RADIUS * LAMP_RADIUS) return true;
    }
    return false;
  }

  // Sampled line of sight: walls and tall cover block a guard's view.
  hasLineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 6));
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      if (this.isSolidTile(Math.floor((x1 + dx * t) / TILE), Math.floor((y1 + dy * t) / TILE))) {
        return false;
      }
    }
    return true;
  }

  resetSeals() {
    for (const seal of this.seals) seal.taken = false;
  }
}
