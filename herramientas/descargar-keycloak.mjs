import { open } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';

const url = 'https://github.com/keycloak/keycloak/releases/download/26.8.0/keycloak-26.8.0.zip';
const path = new URL('./keycloak-26.8.0.zip', import.meta.url);
const total = 174169645;
const expected = '7ed1de3fda2598369262613bf682aab7e233d80a38c405e91588f7a7454370a1';
const head = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30000) });
if (!head.ok) throw new Error(`HTTP ${head.status}`);
const file = await open(path, 'r+').catch(() => open(path, 'w+'));
try {
  const size = 1024 * 1024;
  let next = 0;
  let completed = 0;
  async function worker() {
  while (next < total) {
    const start = next;
    next += size;
    const end = Math.min(start + size, total) - 1;
    // Las descargas anteriores escriben solo bloques completos. La comprobacion
    // SHA256 final valida tambien cualquier bloque reutilizado de este archivo.
    const first = Buffer.alloc(32), last = Buffer.alloc(32);
    const a = await file.read(first, 0, 32, start);
    const b = await file.read(last, 0, 32, end - 31);
    if (a.bytesRead === 32 && b.bytesRead === 32 && first.some(x=>x!==0) && last.some(x=>x!==0)) {
      completed += end-start+1;
      continue;
    }
    let ok = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await fetch(head.url, {
          headers: { Range: `bytes=${start}-${end}` }, signal: AbortSignal.timeout(120000)
        });
        if (r.status !== 206) throw new Error(`HTTP ${r.status}, se esperaba 206`);
        const data = Buffer.from(await r.arrayBuffer());
        if (data.length !== end - start + 1) throw new Error('Descarga incompleta');
        await file.write(data, 0, data.length, start);
        completed += data.length;
        console.log(`${Math.round(completed / total * 100)}%`);
        ok = true;
        break;
      } catch (e) { console.error(`Intento ${attempt}: ${e.message}`); }
    }
    if (!ok) throw new Error('No se pudo completar la descarga');
  }
  }
  await Promise.all(Array.from({length:12}, () => worker()));
} finally { await file.close(); }
const hash = createHash('sha256');
for await (const chunk of createReadStream(path)) hash.update(chunk);
if (hash.digest('hex') !== expected) throw new Error('SHA256 incorrecto');
console.log('SHA256 oficial verificado');
