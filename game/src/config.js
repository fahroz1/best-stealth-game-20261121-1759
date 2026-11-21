// Midnight Courier — shared tuning constants.
// One place for every number the rest of the game agrees on: the tile
// grid, the view size, movement speeds and the guard senses.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const PLAYER_RADIUS = 13;
export const PLAYER_WALK_SPEED = 150;
export const PLAYER_SNEAK_MULT = 0.55;
export const PLAYER_RUN_MULT = 1.45;

export const GUARD_RADIUS = 14;
export const GUARD_PATROL_SPEED = 72;
export const GUARD_SUSPICIOUS_SPEED = 96;
export const GUARD_CHASE_SPEED = 128;

export const VISION_RANGE = 6 * TILE;
export const VISION_HALF_ANGLE = (36 * Math.PI) / 180;
export const LAMP_RADIUS = 2.4 * TILE;

export const COINS_START = 5;
export const LIVES_START = 3;
export const SEALS_TOTAL = 3;

export const NOISE_RUN_RADIUS = 3.5 * TILE;
export const NOISE_COIN_RADIUS = 5 * TILE;
export const NOISE_SNEAK_RADIUS = 0.8 * TILE;

// Detection fills 0..1 while a guard can see the courier. These are the
// per-second rates before light, distance and stance modifiers.
export const DETECT_FILL_BASE = 0.55;
export const DETECT_DRAIN = 0.4;
export const DETECT_SUSPICIOUS_AT = 0.35;
export const DETECT_ALERT_AT = 1.0;
export const ALERT_MEMORY_SECONDS = 6;
export const INVESTIGATE_LOOK_SECONDS = 2.2;
