# Bounty: Public dashboard — Stoa Flow

Status: ready to submit. GitHub integration could publish the source but issue creation in StoaDex/Stoa returned HTTP 403 (Resource not accessible by integration). No issue was created by the integration.

Entry for the **Public dashboard** build bounty at https://stoadex.com/build.

**Stoa Flow** is an independent, read-only dashboard for swaps settled through Stoa's V1 router on Robinhood Chain.

## Live dashboard
https://stoa-flow-observatory.lilacbadge2051.chatgpt.site/

## Public GitHub source (MIT)
https://github.com/marox-cyber/agent-market-python/tree/stoa-flow-dashboard/stoa-flow

The complete application is in the `stoa-flow/` directory on the dedicated `stoa-flow-dashboard` branch. The repository's default branch is a separate project; please use the branch link above.

Pinned source for review:
https://github.com/marox-cyber/agent-market-python/tree/8b98405d45259d17404d0be28aaf64290a6c17ed/stoa-flow

## Queries and evidence
- Exact JSON-RPC queries: https://stoa-flow-observatory.lilacbadge2051.chatgpt.site/queries.json
- Raw logs, block hashes, timestamps and token metadata: https://stoa-flow-observatory.lilacbadge2051.chatgpt.site/api/evidence
- Normalized swap data: https://stoa-flow-observatory.lilacbadge2051.chatgpt.site/api/swaps

## Bounty features
- Volume, settled swaps, distinct traders and routes per venue.
- UTC activity chart with 24h / 7d / 30d / all-time filters.
- Venue participation and route-composition breakdowns.
- Recipient leaderboard, token/wallet/transaction search, pagination and filtered CSV.
- Every swap links to its transaction on Blockscout.
- Responsive interface and a public methodology page.

## How the data is counted
The collector reads `Routed` events directly from Robinhood Chain, starting at deployment block **114244443**, for router:
`0x2F2804fad735a38015650f32f95Ad5E08D6B3eE5`.

Each event is identified by transaction hash + log index. Removed logs are excluded, and block hashes/timestamps are checked. Current RPC reads verify chain ID 4663 and use block-bounded queries of at most 5,000 blocks. A 64-block head buffer and a 2,048-block rescan overlap are used.

Volume is the settled USDG side, counted once. **Non-USDG pairs remain explicitly unpriced** instead of applying today's prices to historical swaps. They still count toward swaps, traders and routes. Pricing coverage is displayed beside volume.

Traders means distinct output recipients (`to`), not verified individuals. Each venue label counts once per swap; mixed-venue routes can appear under multiple venues without double-counting global swaps or volume.

The page checks for updates every 60 seconds, with up to five minutes of server reuse. Provider failures retain the last verified snapshot, its original collection time and a visible status label.

## Verification and transactions
**16 tests pass**, covering real-event reconciliation, duplicate/removed logs, mixed routes, pricing coverage, filters, CSV, provider limits, chain identity and outage handling.

This dashboard does not construct or send swaps, connect wallets or request signatures. It sends no swap transactions requiring a referrer. No wash swaps or synthetic activity were generated; actual launch/team activity remains included.

**Payout address (USDG on Robinhood Chain):** `0xb924d8f1b294b3152eb37db0e0cffb529b47fc13`. Please review this entry for the public-dashboard bounty. Thank you.
