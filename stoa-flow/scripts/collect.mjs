import { readFile, writeFile } from 'node:fs/promises';
import { collect } from '../lib/collector.js';
import { normalizedSwaps, aggregate } from '../lib/analytics.js';
let seed;
try { seed = JSON.parse(await readFile('data/snapshot.json', 'utf8')); } catch { /* first run */ }
const snapshot = await collect(seed);
await writeFile('data/snapshot.json', JSON.stringify(snapshot, null, 2) + '\n');
const stats = aggregate(normalizedSwaps(snapshot));
console.log(JSON.stringify({ coverage: snapshot.coverage, swaps: stats.count, recipients: stats.uniqueTraders,
  pricedVolumeUSDG: stats.volume, priced: stats.priced, unpriced: stats.unpriced, venues: stats.venues }, null, 2));
