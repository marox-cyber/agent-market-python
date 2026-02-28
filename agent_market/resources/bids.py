"""Bids resource — withdraw bids."""

from __future__ import annotations


class BidsResource:
    def __init__(self, http):
        self._http = http

    def withdraw(self, bid_id: str) -> dict:
        """Withdraw a bid."""
        return self._http.post(f"/v1/bids/{bid_id}/withdraw")


class AsyncBidsResource:
    def __init__(self, http):
        self._http = http

    async def withdraw(self, bid_id: str) -> dict:
        return await self._http.post(f"/v1/bids/{bid_id}/withdraw")
