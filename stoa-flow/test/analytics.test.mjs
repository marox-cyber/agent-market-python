import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizedSwaps, aggregate, decodeLog, toCsv, ZERO, USDG, VENUES } from '../lib/analytics.js';
const snapshot = JSON.parse(await readFile(new URL('../data/snapshot.json', import.meta.url), 'utf8'));
const swaps = normalizedSwaps(snapshot);
const now = snapshot.collectedAt;
test('real evidence decodes and reconciles with an independent integer USDG sum', () => {
  let total = 0n;
  for (const log of snapshot.logs) {
    const w = log.data.slice(2).match(/.{64}/g);
    const tokenIn = '0x' + w[0].slice(24), tokenOut = '0x' + w[1].slice(24);
    if (tokenIn === USDG) total += BigInt('0x' + w[2]);
    else if (tokenOut === USDG) total += BigInt('0x' + w[3]);
  }
  assert.equal(swaps.length, snapshot.logs.length);
  assert.ok(Math.abs(aggregate(swaps, { now }).volume - Number(total) / 1e6) < 1e-8);
  assert.ok(swaps.every(x => x.time > 0 && x.time <= now));
});
test('repeated provider logs do not double count a swap', () => {
  const duplicate = { ...snapshot, logs: [...snapshot.logs, ...snapshot.logs] };
  assert.equal(normalizedSwaps(duplicate).length, swaps.length);
});
test('removed and unrelated logs are excluded', () => {
  const log = snapshot.logs[0];
  assert.equal(decodeLog({ ...log, removed: true }), null);
  assert.equal(decodeLog({ ...log, address: ZERO }), null);
});
test('missing timestamps or noncanonical block hashes fail instead of becoming epoch events', () => {
  assert.throws(() => normalizedSwaps({ ...snapshot, blocks: {} }), /Missing or mismatched/);
  const block = swaps[0].block;
  assert.throws(() => normalizedSwaps({ ...snapshot, blocks: { ...snapshot.blocks, [block]: { hash: 'bad', time: now } } }), /Missing or mismatched/);
});
test('mixed routes count one swap and deduplicate repeated venue labels', () => {
  const base = swaps[0];
  const venue = Object.keys(VENUES)[2];
  const s = aggregate([{ ...base, usd: 20, venues: [venue, Object.keys(VENUES)[3]], time: now }], { now });
  assert.equal(s.count, 1); assert.equal(s.volume, 20); assert.equal(s.venues.length, 1); assert.equal(s.venues[0].swaps, 1);
});
test('unpriced swaps remain visible and do not acquire a zero-dollar valuation', () => {
  const s = aggregate([{ ...swaps[0], usd: null, time: now }], { now });
  assert.equal(s.count, 1); assert.equal(s.priced, 0); assert.equal(s.unpriced, 1); assert.equal(s.volume, 0);
});
test('time, venue and wallet filters intersect and UTC zero buckets remain', () => {
  const old = { ...swaps[0], time: now - 90000, id: 'old' };
  const recent = { ...swaps[0], time: now - 30, id: 'new' };
  const s = aggregate([old, recent], { now, range: '24h', venue: recent.venues[0], search: recent.trader });
  assert.equal(s.count, 1); assert.equal(s.buckets.length, 25); assert.equal(s.buckets.reduce((a, b) => a + b.swaps, 0), 1);
  assert.ok(s.buckets.some(x => x.swaps === 0));
});
test('CSV retains exact raw integers and blocks spreadsheet formula execution', () => {
  const x = { ...swaps[0], symIn: '=CMD()', rawIn: '99999999999999999999999999999999999999' };
  const csv = toCsv([x]);
  assert.ok(csv.includes(x.rawIn)); assert.ok(csv.includes("'=CMD()")); assert.equal(csv.split('\r\n').length, 2);
});
