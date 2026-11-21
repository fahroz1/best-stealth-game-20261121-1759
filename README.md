# Midnight Courier

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759/fahroz1/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759/fahroz1/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A 2D top-down stealth game. You are a hooded courier who must slip through
a guarded manor at night to deliver a sealed letter. Gather the three wax
seals hidden around the manor to unseal the study door, then reach the exit
— unseen.

## How to play

- **Move** with WASD or the arrow keys.
- **Hold Shift** to sneak: slower, quieter, and harder for guards to spot.
- Running is fast but loud — guards hear your footsteps and come to look.
- **Q or click** tosses one of your limited coins toward the pointer. The
  clink draws the nearest guard over to investigate.
- **Walk over a wax seal** to collect it. All three unseal the study door.
- Four guards patrol fixed routes with visible vision cones. Walls,
  bookshelves, crates, curtains and potted plants block their sight.
- A guard's detection fills while you stand in their cone in the open —
  faster in lamplight, slower in darkness and while sneaking. A glimpse
  makes them suspicious (they walk over to check); full detection makes
  them alerted (they chase you and raise the alarm). If an alerted guard
  touches you, you lose a life and start again at the entrance.
- Lose all three lives and the run ends. Reach the green EXIT with all
  three seals to win and earn a stealth rating.
- Rugs hush your steps; polished marble carries them. Lamp pools light
  you up; dark corners hide you.
- **P** pauses, **M** mutes, **Enter** starts and restarts.

## How to run

No build step, no network, no external assets — all art is drawn on canvas
and all sound is synthesized with the WebAudio API.

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `game/` with any static HTTP server and open `game/index.html`.

## Screenshots

The four screenshots in `screenshots/` are staged by the game's own code:
`?shot=start` (title), `?shot=play` (mid-level sneaking),
`?shot=alert` (a guard closing in) and `?shot=win` (the delivered letter).

## Layout

- `game/index.html` — the page that loads the game.
- `game/src/config.js` — tuning constants.
- `game/src/level.js` — the manor floor: rooms, cover, lamps, light, sight.
- `game/src/guards.js` — patrols, vision cones, suspicion and alert states.
- `game/src/player.js` — movement, noise, thrown coins, seal collection.
- `game/src/render.js` — all canvas drawing, HUD and screens.
- `game/src/audio.js` — synthesized sound effects and the night drone.
- `game/src/input.js` — keyboard and mouse input.
- `game/src/shots.js` — the staged screenshot scenes.
- `game/src/main.js` — game state, rules glue and the main loop.
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json`.
- `serve.ts` — a small static server for local play-testing.

## License

MIT — see [LICENSE](LICENSE).
