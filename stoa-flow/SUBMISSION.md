# Bounty: Public dashboard — Stoa Flow

Status: submitted. Public issue: https://github.com/StoaDex/Stoa/issues/11

Submitted by `marox-cyber` on 2026-11-20T15:14:47Z. Awaiting Stoa review; no acceptance or payout has been confirmed.

Entry for the **Public dashboard** build bounty.

**Live dashboard:** https://stoa-flow-observatory.lilacbadge2051.chatgpt.site/
**Public MIT source:** https://github.com/marox-cyber/agent-market-python/tree/stoa-flow-dashboard/stoa-flow
**Queries:** https://stoa-flow-observatory.lilacbadge2051.chatgpt.site/queries.json
**Raw on-chain evidence:** https://stoa-flow-observatory.lilacbadge2051.chatgpt.site/api/evidence

Stoa Flow reads Routed events from the Robinhood Chain V1 router, starting at block 114244443. It shows USDG-priced volume, settled swaps, distinct output recipients and routes per venue, with UTC charts, time/venue filters, transaction search, Blockscout links and CSV exports.

The complete code is in the stoa-flow/ directory on the stoa-flow-dashboard branch linked above. **16 tests pass**, including duplicate/removed logs, mixed routes, pricing coverage, provider range caps and outage handling.

Volume counts the settled USDG side once. Non-USDG pairs remain explicitly unpriced and still count toward activity. Mixed-venue participation never double-counts global swaps/volume. The methodology and exact queries are public.

The app checks for updates every 60 seconds, with up to five minutes of server reuse. RPC failures retain a visibly labelled verified snapshot. The app is read-only: no swaps, wallet connections, signatures or wash trading, so it sends no transactions requiring a referrer.

**Payout address (USDG on Robinhood Chain):** 0xb924d8f1b294b3152eb37db0e0cffb529b47fc13

Please review this entry for the public-dashboard bounty.
