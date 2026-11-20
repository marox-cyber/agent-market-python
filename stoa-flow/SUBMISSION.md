# Submission: Bounty: Public dashboard — Stoa Flow

Submission prepared for the public-dashboard build bounty. Payout wallet will be confirmed by the owner in the issue before payment.

## Live public dashboard

https://stoa-flow-observatory.lilacbadge2051.chatgpt.site

## Public GitHub source

https://github.com/marox-cyber/agent-market-python/tree/stoa-flow-dashboard/stoa-flow

## What it shows

- Robinhood Chain swaps settled by the Stoa V1 router, counted from `Routed` events since deployment block 114244443.
- USDG-priced volume, including explicit priced/unpriced event coverage; no invented historical pricing.
- Settled swap count, unique output recipients, UTC time-series and zero-activity intervals.
- Routes per venue, mixed-route accounting, route composition and recipient leaderboard.
- Search, venue/time filters, pagination, filtered CSV and transaction links to Blockscout.
- Mobile layout, public JSON, full raw evidence and reproducible RPC queries.

Queries: https://stoa-flow-observatory.lilacbadge2051.chatgpt.site/queries.json
Evidence: https://stoa-flow-observatory.lilacbadge2051.chatgpt.site/api/evidence

## No transactions or wash trading

The app is read-only. It does not construct/send swaps, connect wallets or ask for signatures. Thus it sends no swaps that require a referrer parameter. All real settled events remain included, including launch/team checks.

## Payout wallet

To be confirmed by the owner in the bounty issue before payment.

## Verification

MIT code; reproducible collector; analytics and Worker route/fallback tests; browser checks. See README for exact coverage definitions and pricing limitations.
