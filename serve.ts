// Midnight Courier — a small static server for local play-testing.
// Serves only the game/ directory beside this file on localhost, so the
// game can be played and screenshotted without a build step:
//   node serve.ts            (http://localhost:8080)
//   node serve.ts --port 8123
// Anything outside game/ is refused; every request is logged with its
// status so a stray network fetch is easy to spot.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const portArg = process.argv.indexOf('--port');
const envPort = Number(process.env.PORT ?? '');
const port =
  (portArg !== -1 && Number(process.argv[portArg + 1])) ||
  (Number.isInteger(envPort) && envPort > 0 && envPort < 65536 ? envPort : 0) ||
  8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400).end('bad request');
    console.log(`${new Date().toISOString()} 400 ${url.pathname}`);
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(root, normalize(pathname)));
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end('forbidden');
    console.log(`${new Date().toISOString()} 403 ${url.pathname}`);
    return;
  }
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    console.log(`${new Date().toISOString()} 404 ${url.pathname}`);
    return;
  }
  response.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  console.log(`${new Date().toISOString()} 200 ${url.pathname}`);
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Midnight Courier is on http://localhost:${port}`);
});
