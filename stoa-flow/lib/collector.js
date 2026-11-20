import { RPC, LOG_SPAN, ROUTER, TOPIC, DEPLOY_BLOCK, ZERO, USDG, WETH, decodeLog } from './analytics.js';

export async function rpcBatch(calls) {
  const result = [];
  for (let start = 0; start < calls.length; start += 20) {
    const batch = calls.slice(start, start + 20).map((c, id) => ({ jsonrpc: '2.0', id, ...c }));
    let error;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'StoaFlow/1.0 (community on-chain analytics)' },
          body: JSON.stringify(batch), signal: AbortSignal.timeout(16000) });
        if (!response.ok) {
          const failure = new Error('RPC HTTP ' + response.status);
          failure.rateLimited = response.status === 429;
          throw failure;
        }
        const body = await response.json();
        const replies = Array.isArray(body) ? body : batch.length === 1 && body?.id === batch[0].id && ('result' in body || 'error' in body) ? [body] : null;
        if (!replies) throw new Error(body?.error?.message || 'RPC batch rejected');
        const byId = new Map(replies.map(x => [x.id, x]));
        result.push(...batch.map(x => byId.get(x.id) || { error: { message: 'Missing RPC result' } }));
        error = null; break;
      } catch (e) { error = e; if (e.rateLimited) break; }
    }
    if (error) throw error;
  }
  return result;
}

export async function rpc(method, params) {
  const [r] = await rpcBatch([{ method, params }]);
  if (r.error || r.result == null) throw new Error(r.error?.message || 'Missing ' + method + ' result');
  return r.result;
}

export async function collect(seed = null) {
  const [identity, tip] = await rpcBatch([{ method: 'eth_chainId', params: [] }, { method: 'eth_blockNumber', params: [] }]);
  if (identity.error || !identity.result || Number(BigInt(identity.result)) !== 4663) throw new Error('Unexpected RPC chain identity');
  if (tip.error || !tip.result) throw new Error('RPC head unavailable');
  const head = Number(BigInt(tip.result));
  // Leave a small finality buffer; this is indexed history, not a finality oracle.
  const to = head - 64;
  const seedTo = seed?.coverage?.toBlock;
  if (seedTo && to < seedTo) throw new Error('RPC head is behind the saved snapshot');
  const from = seedTo ? Math.max(DEPLOY_BLOCK, seedTo - 2048) : DEPLOY_BLOCK;
  const freshLogs = [];
  for (let block = from; block <= to; block += LOG_SPAN) {
    const logs = await rpc('eth_getLogs', [{ address: ROUTER, fromBlock: '0x' + block.toString(16),
      toBlock: '0x' + Math.min(to, block + LOG_SPAN - 1).toString(16), topics: [TOPIC] }]);
    if (!Array.isArray(logs)) throw new Error('Invalid log response');
    freshLogs.push(...logs.filter(x => !x.removed));
  }
  const logs = [...(seed?.logs || []).filter(x => Number(BigInt(x.blockNumber)) < from), ...freshLogs];
  const decoded = logs.map(decodeLog).filter(Boolean);
  const blocks = { ...(seed?.blocks || {}) };
  const missing = [...new Set(decoded.filter(x => !blocks[x.block] || blocks[x.block].hash !== x.blockHash).map(x => x.block))];
  const headers = await rpcBatch([...missing, to].map(b => ({ method: 'eth_getBlockByNumber', params: ['0x' + b.toString(16), false] })));
  for (let i = 0; i < missing.length; i++) {
    const b = headers[i].result;
    if (!b || headers[i].error) throw new Error('Missing timestamp for block ' + missing[i]);
    blocks[missing[i]] = { hash: b.hash, time: Number(BigInt(b.timestamp)) };
  }
  const boundary = headers.at(-1).result;
  if (!boundary) throw new Error('Missing coverage boundary');
  const tokens = { ...(seed?.tokens || {}),
    [ZERO]: { symbol: 'ETH', decimals: 18 }, [WETH]: { symbol: 'WETH', decimals: 18 },
    [USDG]: { symbol: 'USDG', decimals: 6 },
  };
  const unknown = [...new Set(decoded.flatMap(x => [x.tokenIn, x.tokenOut]))].filter(a => tokens[a]?.decimals == null);
  const metadata = await rpcBatch(unknown.flatMap(to => [
    { method: 'eth_call', params: [{ to, data: '0x313ce567' }, 'latest'] },
    { method: 'eth_call', params: [{ to, data: '0x95d89b41' }, 'latest'] },
  ]));
  for (let i = 0; i < unknown.length; i++) {
    const d = metadata[i * 2].result, s = metadata[i * 2 + 1].result;
    let symbol = unknown[i].slice(0, 8);
    try {
      const hex = s.slice(2), bytes = hex.length === 64 ? hex : hex.slice(128, 128 + Number(BigInt('0x' + hex.slice(64, 128))) * 2);
      symbol = new TextDecoder().decode(Uint8Array.from(bytes.match(/.{2}/g) || [], x => parseInt(x, 16))).replace(/\0/g, '').replace(/[^\w.$-]/g, '').slice(0, 16) || symbol;
    } catch { /* retain address label */ }
    const decimals = d && d !== '0x' ? Number(BigInt(d)) : null;
    tokens[unknown[i]] = { symbol, decimals: decimals != null && decimals >= 0 && decimals <= 255 ? decimals : null };
  }
  return { schema: 1, chainId: 4663, router: ROUTER, rpc: RPC, collectedAt: Math.floor(Date.now() / 1000),
    coverage: { fromBlock: DEPLOY_BLOCK, toBlock: to, headBlock: head, toHash: boundary.hash,
      toTime: Number(BigInt(boundary.timestamp)), complete: true, finalityBuffer: 64 },
    logs, blocks, tokens };
}
