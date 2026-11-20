import { normalizedSwaps, RPC, LOG_SPAN, ROUTER, DEPLOY_BLOCK, TOPIC, EVENT } from '../lib/analytics.js';
import { collect } from '../lib/collector.js';
// Build injects ASSETS, SNAPSHOT and SOURCE_ZIP into the single-file Worker.
let latest = SNAPSHOT;
let verified = false;
let inFlight = null;
let lastError = null;
let lastAttempt = 0;
const headers = { 'x-stoa-flow-build': '20261120-5', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin',
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; object-src 'none'" };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...headers, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
async function dataset(force = false) {
  if (verified && Date.now() / 1000 - latest.collectedAt < 300 && !force) return latest;
  if (lastError && Date.now() - lastAttempt < 300000 && !inFlight) return latest;
  if (Date.now() - lastAttempt < 10000 && !inFlight) return latest;
  if (!inFlight) {
    lastAttempt = Date.now();
    inFlight = collect(latest).then(value => { latest = value; verified = true; lastError = null; return value; })
      .catch(e => { lastError = (String(e?.name || 'Error') + ': ' + String(e?.message || e)).slice(0, 180); console.error('Stoa Flow RPC refresh:', lastError); return latest; })
      .finally(() => { inFlight = null; });
  }
  return await inFlight;
}
function queryDocument(s) {
  const requests = [];
  for (let b = DEPLOY_BLOCK; b <= s.coverage.toBlock; b += LOG_SPAN) requests.push({ jsonrpc: '2.0', id: requests.length + 1,
    method: 'eth_getLogs', params: [{ address: ROUTER, fromBlock: '0x' + b.toString(16), toBlock: '0x' + Math.min(s.coverage.toBlock, b + LOG_SPAN - 1).toString(16), topics: [TOPIC] }] });
  return { network: 4663, endpoint: s.rpc || RPC, event: EVENT, coverage: s.coverage, requests,
    timestampQuery: { jsonrpc: '2.0', id: 1, method: 'eth_getBlockByNumber', params: ['<event.blockNumber>', false] },
    rules: { eventKey: 'transactionHash:logIndex', volume: 'USDG side only, count once; non-USDG pairs remain unpriced',
      traders: 'distinct output recipient (indexed to)', venueRoutes: 'Each venue label once per swap; mixed routes overlap',
      excluded: 'removed logs, reverted swaps, logs outside the V1 router' } };
}
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { ...headers, allow: 'GET, HEAD' } });
    if (url.pathname === '/api/snapshot') return json({ chainId: 4663, router: ROUTER, rpc: latest.rpc || RPC, collectedAt: latest.collectedAt,
      coverage: latest.coverage, status: verified && !lastError ? 'live' : 'snapshot', error: lastError, swaps: normalizedSwaps(latest) });
    if (url.pathname === '/api/swaps') {
      const s = await dataset(url.searchParams.get('refresh') === '1');
      return json({ chainId: 4663, router: ROUTER, rpc: s.rpc || RPC, collectedAt: s.collectedAt, coverage: s.coverage,
        status: lastError ? 'stale' : verified ? 'live' : 'snapshot', error: lastError, swaps: normalizedSwaps(s) });
    }
    if (url.pathname === '/api/evidence') {
      const s = await dataset();
      return new Response(JSON.stringify(s, null, 2), { headers: { ...headers, 'content-type': 'application/json', 'content-disposition': 'attachment; filename="stoa-flow-evidence.json"', 'cache-control': 'no-store' } });
    }
    if (url.pathname === '/queries.json') return json(queryDocument(await dataset()));
    if (url.pathname === '/source.zip') {
      const bytes = Uint8Array.from(atob(SOURCE_ZIP), c => c.charCodeAt(0));
      return new Response(bytes, { headers: { ...headers, 'content-type': 'application/zip', 'content-disposition': 'attachment; filename="stoa-flow-source.zip"', 'cache-control': 'public, max-age=300' } });
    }
    const path = url.pathname === '/' || url.pathname === '/index.html' ? 'index.html' : url.pathname.slice(1);
    const asset = ASSETS[path];
    if (asset) return new Response(request.method === 'HEAD' ? null : asset.content, { headers: { ...headers, 'content-type': asset.type,
      'cache-control': path === 'index.html' ? 'no-cache' : 'public, max-age=300' } });
    return new Response('Not found', { status: 404, headers });
  },
};
