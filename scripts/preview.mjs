// A loopback-only static preview; desktop production builds need no server.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
const root = resolve('out');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain' };
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(root, `.${pathname}`, pathname.endsWith('/') ? 'index.html' : '');
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    const body = await readFile(path); res.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream'); res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Candid: http://127.0.0.1:4173'));
