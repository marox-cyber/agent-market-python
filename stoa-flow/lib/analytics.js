export const ZERO = '0x0000000000000000000000000000000000000000';
export const ROUTER = '0x2f2804fad735a38015650f32f95ad5e08d6b3ee5';
export const DEPLOY_BLOCK = 114244443;
export const RPC = 'https://robinhood.api.pocket.network';
export const LOG_SPAN = 50000;
export const EXPLORER = 'https://robinhoodchain.blockscout.com';
export const USDG = '0x5fc5360d0400a0fd4f2af552add042d716f1d168';
export const WETH = '0x0bd7d308f8e1639fab988df18a8011f41eacad73';
export const TOPIC = '0x2bbce25631e8fa58085b7ea5929726c3acdf2df8d6b1f099eb32fb7425a4f6da';
export const EVENT = 'Routed(address indexed sender,address indexed to,address indexed referrer,address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOut,address mid,address venue1,address venue2)';
export const VENUES = {
  '0x5c8537e7d755884326de0969ce7bdb14195f56be': 'Uniswap V2',
  '0x28802ad6f9859d14dfc6226ea9a8b60686d3a2e6': 'Uniswap V3',
  '0x8965140fb51b2e99a0cd31a0e99eae01d36517b8': 'Uniswap V4',
  '0x27958279f95225b2a5517e7dd12b6fc0317e5c5d': 'Uniswap V4',
  '0xe0b9109ff2bafb145078522a9630accbe84ce644': 'Uniswap V4',
  '0xf0904b95d66f565de215cc7dc58b6054f72a9352': 'Aero',
  '0x87b3b896beabdc421f9d9b0a3fd3dbbae1ddd568': 'Ramses',
  '0x58c2c83b66088b57b9dd487ba1090992bc9eebe0': 'Pons curve',
  '0x1341db53ed69ce1def86bdbfc60d5fd92cf9004f': 'Metric',
  '0xb40892c77bc4a1aba744c1afd96fce048d6456c3': 'up.',
};

export function decodeLog(log) {
  if (log.removed || log.address?.toLowerCase() !== ROUTER || log.topics?.[0] !== TOPIC) return null;
  if (log.topics.length !== 4 || !/^0x[0-9a-f]{448}$/i.test(log.data)) throw new Error('Malformed Routed event');
  const words = log.data.slice(2).match(/.{64}/g);
  const address = x => '0x' + x.slice(-40).toLowerCase();
  return {
    id: log.transactionHash + ':' + Number(BigInt(log.logIndex)), hash: log.transactionHash,
    block: Number(BigInt(log.blockNumber)), blockHash: log.blockHash, logIndex: Number(BigInt(log.logIndex)),
    sender: address(log.topics[1]), trader: address(log.topics[2]), referrer: address(log.topics[3]),
    tokenIn: address(words[0]), tokenOut: address(words[1]),
    rawIn: BigInt('0x' + words[2]).toString(), rawOut: BigInt('0x' + words[3]).toString(),
    mid: address(words[4]), venue1: address(words[5]), venue2: address(words[6]),
  };
}

export function normalizedSwaps(snapshot) {
  const found = new Map();
  for (const log of snapshot.logs) {
    const x = decodeLog(log);
    if (!x) continue;
    const block = snapshot.blocks[x.block];
    if (!block || block.hash !== x.blockHash) throw new Error('Missing or mismatched block ' + x.block);
    const a = snapshot.tokens[x.tokenIn], b = snapshot.tokens[x.tokenOut];
    const amountIn = a?.decimals != null ? Number(x.rawIn) / 10 ** a.decimals : null;
    const amountOut = b?.decimals != null ? Number(x.rawOut) / 10 ** b.decimals : null;
    // Only the settled USDG side is valued. Never apply current prices to historical swaps.
    const usd = x.tokenIn === USDG ? amountIn : x.tokenOut === USDG ? amountOut : null;
    found.set(x.id, { ...x, time: block.time, symIn: a?.symbol || x.tokenIn.slice(0, 8),
      symOut: b?.symbol || x.tokenOut.slice(0, 8), amountIn, amountOut, usd,
      venues: [...new Set([x.venue1, x.venue2].filter(v => v !== ZERO))],
      route: [x.venue1, x.venue2].filter(v => v !== ZERO).map(v => VENUES[v] || v.slice(0, 8)).join(' / '),
      hops: x.mid === ZERO ? 1 : 2,
    });
  }
  return [...found.values()].sort((a, b) => b.block - a.block || b.logIndex - a.logIndex);
}

export function aggregate(swaps, { now = Math.floor(Date.now() / 1000), range = 'all', venue = '', search = '' } = {}) {
  const seconds = { '24h': 86400, '7d': 604800, '30d': 2592000 }[range];
  const since = seconds ? now - seconds : 0;
  const q = search.trim().toLowerCase();
  const filtered = swaps.filter(x => x.time >= since && x.time <= now && (!venue || x.venues.includes(venue)) &&
    (!q || [x.hash, x.trader, x.sender, x.symIn, x.symOut, x.tokenIn, x.tokenOut, x.route].some(v => v.toLowerCase().includes(q))));
  const volume = filtered.reduce((s, x) => s + (x.usd ?? 0), 0);
  const priced = filtered.filter(x => x.usd != null).length;
  const traders = new Map();
  const venues = new Map();
  const routes = new Map();
  for (const x of filtered) {
    const t = traders.get(x.trader) || { address: x.trader, swaps: 0, volume: 0 };
    t.swaps++; t.volume += x.usd ?? 0; traders.set(x.trader, t);
    // Per-venue routes count a venue once per swap. Shares may sum above 100% for mixed routes.
    const venueNames = new Set(x.venues.map(v => VENUES[v] || v));
    for (const name of venueNames) {
      const v = venues.get(name) || { name, swaps: 0, volume: 0 };
      v.swaps++; v.volume += x.usd ?? 0; venues.set(name, v);
    }
    const r = routes.get(x.route) || { name: x.route, swaps: 0, volume: 0 };
    r.swaps++; r.volume += x.usd ?? 0; routes.set(x.route, r);
  }
  const step = range === '24h' ? 3600 : 86400;
  const start = Math.floor((seconds ? since : Math.min(now, ...swaps.map(x => x.time))) / step) * step;
  const end = Math.floor(now / step) * step;
  const buckets = [];
  for (let t = start; t <= end; t += step) {
    const rows = filtered.filter(x => x.time >= t && x.time < t + step);
    buckets.push({ time: t, volume: rows.reduce((s, x) => s + (x.usd ?? 0), 0), swaps: rows.length });
  }
  return { filtered, volume, priced, unpriced: filtered.length - priced, count: filtered.length,
    uniqueTraders: traders.size, senders: new Set(filtered.map(x => x.sender)).size,
    twoHop: filtered.filter(x => x.hops === 2).length,
    venues: [...venues.values()].sort((a, b) => b.swaps - a.swaps),
    routes: [...routes.values()].sort((a, b) => b.swaps - a.swaps),
    traders: [...traders.values()].sort((a, b) => b.volume - a.volume || b.swaps - a.swaps), buckets };
}

export function toCsv(swaps) {
  const columns = ['hash', 'logIndex', 'block', 'time', 'trader', 'sender', 'symIn', 'symOut', 'rawIn', 'rawOut', 'amountIn', 'amountOut', 'usd', 'route', 'venue1', 'venue2', 'referrer'];
  const cell = v => '"' + String(v ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
  return [columns.join(','), ...swaps.map(x => columns.map(k => cell(x[k])).join(','))].join('\r\n');
}
