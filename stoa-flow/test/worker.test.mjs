import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../dist/server/index.js', import.meta.url), 'utf8');
const load = () => import('data:text/javascript;base64,' + Buffer.from(source + '\n// ' + Math.random()).toString('base64'));
test('Worker serves the complete app, shared decoder and source archive', async () => {
  const worker = (await load()).default;
  for (const path of ['/', '/app.js', '/style.css', '/analytics.js']) {
    const r = await worker.fetch(new Request('https://test' + path));
    assert.equal(r.status, 200); assert.ok((await r.text()).length > 100);
  }
  const zip = await worker.fetch(new Request('https://test/source.zip'));
  assert.equal(zip.headers.get('content-type'), 'application/zip');
  assert.deepEqual([...new Uint8Array(await zip.arrayBuffer()).slice(0, 4)], [80, 75, 3, 4]);
});
test('cold snapshot is honest, complete and immediately available without upstream access', async () => {
  const worker = (await load()).default;
  const snapshot = await worker.fetch(new Request('https://test/api/snapshot')).then(r => r.json());
  assert.equal(snapshot.status, 'snapshot'); assert.equal(snapshot.coverage.complete, true);
  assert.ok(snapshot.swaps.length > 0); assert.ok(snapshot.collectedAt > 0);
});
test('upstream failure retains evidence and collection time instead of inventing zero activity', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Simulated provider outage'); };
  try {
    const worker = (await load()).default;
    const initial = await worker.fetch(new Request('https://test/api/snapshot')).then(r => r.json());
    const data = await worker.fetch(new Request('https://test/api/swaps?refresh=1')).then(r => r.json());
    assert.equal(data.status, 'stale'); assert.ok(data.error);
    assert.equal(data.collectedAt, initial.collectedAt);
    assert.deepEqual(data.swaps, initial.swaps);
    const queries = await worker.fetch(new Request('https://test/queries.json')).then(r => r.json());
    assert.equal(queries.coverage.toBlock, data.coverage.toBlock);
    assert.equal(queries.requests[0].params[0].address, data.router);
    const evidence = await worker.fetch(new Request('https://test/api/evidence')).then(r => r.json());
    assert.equal(evidence.logs.length, data.swaps.length);
  } finally { globalThis.fetch = original; }
});
test('unexpected routes and mutation methods are rejected', async () => {
  const worker = (await load()).default;
  assert.equal((await worker.fetch(new Request('https://test/not-found'))).status, 404);
  assert.equal((await worker.fetch(new Request('https://test/', { method: 'POST' }))).status, 405);
});
