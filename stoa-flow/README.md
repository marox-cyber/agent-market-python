# Stoa Flow

Independent, read-only on-chain analytics for Stoa's V1 router on Robinhood Chain (4663).

- Live dashboard: https://stoa-flow-observatory.lilacbadge2051.chatgpt.site
- Public GitHub source: https://github.com/marox-cyber/agent-market-python/tree/stoa-flow-dashboard/stoa-flow
- Exact queries: `/queries.json`
- Raw event evidence: `/api/evidence`
- Normalized swaps: `/api/swaps`
- Downloadable MIT source: `/source.zip`

## Features

UTC activity chart, 24h/7d/30d/all-time filters, USDG-priced volume with pricing coverage, settled swaps, unique output recipients, venue routing, route composition, recipient leaderboard, searchable/paginated transaction table, links to Blockscout, filtered CSV exports, reproducible queries and raw RPC evidence. Responsive layout with a mobile navigation bar. No wallet connection and no swap execution.

## Counting

Read `Routed` events from router `0x2F2804fad735a38015650f32f95Ad5E08D6B3eE5`, deployment block `114244443`. The event signature, decoder and exact adapter addresses are in `lib/analytics.js`. Source addresses were checked against Stoa's official contract documentation and public repository on 20 November 2026.

Deduplicate by transaction hash + log index; ignore removed events. Require canonical block hash matches and block timestamps. A successful collection must finish all block ranges; a failed request retains the original saved snapshot and is visibly marked. A new collection scans an overlap of 2,048 blocks and leaves a 64-block head buffer; this is not a guarantee against deeper reorganizations. Refresh while open every 60 seconds, with up to five minutes of server reuse. A cold page shows the saved verified evidence immediately while requesting fresh data.

Volume counts the actual USDG input, otherwise the actual USDG output, exactly once per swap. USDG is assumed to equal $1; this is a stablecoin notional, not an independent market valuation. Non-USDG pairs stay unpriced; all are included in swaps, recipients and route counts. Thus USDG-priced volume is a lower-coverage measure, not total economic USD volume. Integer raw amounts are preserved; formatted quantities and chart totals use JavaScript floating point.

Traders means distinct output recipient addresses (`to`), not unique humans. Venue participation is counted once per venue label per swap; V4 adapter versions share one label. A mixed-venue swap participates in both venues, so participation shares may sum above 100%. Transaction counts and global volume are never summed across overlapping venues. Launch checks and team transactions are included; no synthetic or wash activity is generated. Only this V1 router is covered.

## Reproduce locally

Requires Node.js 22.12+ and Python 3; no npm dependencies, API keys or database.

```sh
npm run collect
npm test
npm run build
npm run validate
npm run dev -- --port 3000
```

The initial evidence was collected from the official `https://rpc.mainnet.chain.robinhood.com`. Live reads use `https://robinhood.api.pocket.network` after the official public RPC returned HTTP 429 from hosting. Pocket’s chain ID was verified as 4663, and its incremental collection preserved the original 31-event evidence. The collector makes only read calls: `eth_chainId`, `eth_blockNumber`, `eth_getLogs`, `eth_getBlockByNumber` and ERC-20 metadata `eth_call`. A 429 is not retried immediately, and failed refreshes have a five-minute cooldown. The active evidence endpoint is recorded in the JSON and methodology page. For the independently collected initial evidence, see `data/snapshot.json`. Re-run `npm run collect` to update it. The source archive includes its evidence and build/test scripts.

## Deploy

`npm run build` creates `dist/server/index.js`, a self-contained Cloudflare Worker module. Deploy its default `fetch` export on a Workers-compatible host; there are no bindings or secrets. For ChatGPT Sites, set `.openai/hosting.json` to a valid project ID and use the Sites source and publication workflow. The archive's project ID is a placeholder for independent deployments.

The development server honors `--host` and `--port` or `PORT`. The development server is only a preview; production uses the Worker.

## Bounty readiness

This project implements the public-dashboard category from https://stoadex.com/build. The dashboard and source download are public. The complete code is published on the dedicated stoa-flow-dashboard branch in the public GitHub repository linked above. Payout address will be confirmed by the owner in the bounty issue before any payment. No swap links are sent or swap transactions constructed, so the conditional swap-referrer requirement does not trigger. If adding swap functionality, every swap must use the owner's confirmed referrer address.

Submission is requested through a GitHub issue in StoaDex/Stoa. Acceptance and payout are determined by Stoa. Independent community work; not an official Stoa product.

## Validation

Eight analytics tests cover independent integer-volume reconciliation against real logs, duplicate logs, removed logs, missing/mismatched block headers, mixed-venue accounting, unpriced events, filter/time boundaries and CSV safety. Worker tests verify routes, the source archive and upstream-failure fallback. Collector tests verify chain identity and that a 429 is not immediately retried (15 tests total). Browser checks cover range filters, chart switching, token search, empty states and methodology navigation.

## License

MIT. Stoa and Robinhood marks belong to their respective owners. This project uses its own wordmark; the small network indicator is a text badge.
