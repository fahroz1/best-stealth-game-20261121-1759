// Midnight Courier — the hand-in program (Node 22+, standard library only).
//
// The game is plain static files in this repository's game/ folder, and the
// screenshots are real renders of it in screenshots/. This program hands
// them in: it first checks the entry against the scorer's caps, then copies
// game/ and screenshots/ from beside this file into the output directory
// and writes /output/dossier.json with the vendored make.fun library.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Script-relative paths: the grader may run this from any working directory.
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir);
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const GAME_DIR = join(repoRoot, 'game');
const SHOTS_DIR = join(repoRoot, 'screenshots');

// The scorer's own caps, kept here so a bad entry fails loudly at home
// instead of quietly on the server.
const CAPS = {
  textMaxBytes: 163840,
  maxScreenshots: 4,
  maxScreenshotBytes: 262144,
  maxGameFiles: 993,
  maxGameBytes: 50331648,
  maxGamePathBytes: 1000,
};

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

// Walk a directory and count every file and directory, and every byte.
function countTree(dir) {
  let files = 0;
  let directories = 0;
  let bytes = 0;
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        directories += 1;
        walk(path);
      } else if (entry.isFile()) {
        files += 1;
        bytes += statSync(path).size;
        if (Buffer.byteLength(path, 'utf8') > CAPS.maxGamePathBytes) {
          fail(`path over ${CAPS.maxGamePathBytes} bytes: ${path}`);
        }
      } else {
        fail(`game/ holds a non-file entry the scorer refuses: ${path}`);
      }
    }
  };
  walk(dir);
  return { files, directories, bytes };
}

function checkEntry() {
  if (!existsSync(join(GAME_DIR, 'index.html'))) fail('game/index.html is missing');
  const game = countTree(GAME_DIR);
  if (game.files + game.directories > CAPS.maxGameFiles) {
    fail(`game/ holds ${game.files + game.directories} entries, over the ${CAPS.maxGameFiles} cap`);
  }
  if (game.bytes > CAPS.maxGameBytes) {
    fail(`game/ is ${game.bytes} bytes, over the ${CAPS.maxGameBytes} cap`);
  }
  let shots = [];
  if (existsSync(SHOTS_DIR)) {
    shots = readdirSync(SHOTS_DIR).filter((name) => !name.startsWith('.'));
    if (shots.length < 3 || shots.length > CAPS.maxScreenshots) {
      fail(`screenshots/ holds ${shots.length} images; the gate wants 3 or 4`);
    }
    for (const name of shots) {
      const size = statSync(join(SHOTS_DIR, name)).size;
      if (size > CAPS.maxScreenshotBytes) fail(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
    }
  } else {
    fail('screenshots/ is missing');
  }
  return { game, shots };
}

// The checks above passed, so hand the entry in: an empty output directory,
// the game and its screenshots copied over, and the dossier the judge reads.
// Empty only the directory's children, never the directory itself: the
// grader runs this as an unprivileged user with a writable /output it does
// not own, so removing the directory itself fails with EPERM.
const checked = checkEntry();

mkdirSync(outputDir, { recursive: true });
for (const entry of readdirSync(outputDir)) {
  rmSync(join(outputDir, entry), { recursive: true, force: true });
}
cpSync(GAME_DIR, join(outputDir, 'game'), { recursive: true });
cpSync(SHOTS_DIR, join(outputDir, 'screenshots'), { recursive: true });

const dossierPath = join(outputDir, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(outputDir, {
    text_max_bytes: CAPS.textMaxBytes,
    screenshots: { max: CAPS.maxScreenshots, max_bytes: CAPS.maxScreenshotBytes },
    game_max_files: CAPS.maxGameFiles,
    game_max_bytes: CAPS.maxGameBytes,
    game_path_max_bytes: CAPS.maxGamePathBytes,
  }),
);

const dossierBytes = statSync(dossierPath).size;
console.log('Midnight Courier handed in:');
console.log(`  output      ${outputDir}`);
console.log(`  game/       ${checked.game.files} files, ${checked.game.bytes} bytes`);
console.log(`  screenshots ${checked.shots.sort().join(', ')}`);
console.log(`  dossier     ${dossierBytes} bytes`);
