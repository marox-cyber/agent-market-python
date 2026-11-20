import test from 'node:test';
import assert from 'node:assert/strict';
import { collect, rpcBatch } from '../lib/collector.js';
test('429 limits are respected without an immediate retry', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('Rate limited', { status: 429 }); };
  try { await assert.rejects(() => rpcBatch([{ method: 'eth_chainId', params: [] }]), /429/); assert.equal(calls, 1); }
  finally { globalThis.fetch = original; }
});
test('a provider on the wrong chain cannot overwrite Robinhood evidence', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json([{ id: 0, result: '0x1' }, { id: 1, result: '0x123456' }]);
  try { await assert.rejects(() => collect(), /chain identity/); }
  finally { globalThis.fetch = original; }
});
test('a gateway single-call response is correlated by request id', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ jsonrpc: '2.0', id: 0, result: [] });
  try { const [r] = await rpcBatch([{ method: 'eth_getLogs', params: [{}] }]); assert.deepEqual(r.result, []); }
  finally { globalThis.fetch = original; }
});

test('catch-up collection completes within a provider cap of 10,001 blocks', async () => {
  const { readFile } = await import('node:fs/promises');
  const seed = JSON.parse(await readFile(new URL('../data/snapshot.json', import.meta.url), 'utf8'));
  const head = seed.coverage.toBlock + 20000;
  const original = globalThis.fetch;
  const ranges = [];
  globalThis.fetch = async (url, request) => {
    const calls = JSON.parse(request.body);
    const replies = calls.map(c => {
      if (c.method === 'eth_chainId') return { id: c.id, result: '0x1237' };
      if (c.method === 'eth_blockNumber') return { id: c.id, result: '0x' + head.toString(16) };
      if (c.method === 'eth_getLogs') {
        const range = c.params[0];
        const from = Number(BigInt(range.fromBlock)), to = Number(BigInt(range.toBlock));
        ranges.push([from, to]);
        return to - from + 1 > 10001 ? { id: c.id, error: { message: 'block range too large (max 10001 blocks)' } } : { id: c.id, result: [] };
      }
      if (c.method === 'eth_getBlockByNumber') return { id: c.id, result: { hash: '0x' + 'ab'.repeat(32), timestamp: '0x' + seed.collectedAt.toString(16) } };
      throw new Error('Unexpected test RPC ' + c.method);
    });
    return Response.json(replies.length === 1 ? replies[0] : replies);
  };
  try {
    const result = await collect(seed);
    assert.ok(ranges.length >= 3);
    assert.ok(ranges.every(([a, b]) => b - a + 1 <= 10001));
    for (let i = 1; i < ranges.length; i++) assert.equal(ranges[i][0], ranges[i - 1][1] + 1);
    assert.equal(result.coverage.toBlock, head - 64);
    assert.equal(result.coverage.complete, true);
  } finally { globalThis.fetch = original; }
});
