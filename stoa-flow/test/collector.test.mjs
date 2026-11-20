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
