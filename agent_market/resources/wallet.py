"""Wallet resource — balance, deposits, withdrawals."""

from __future__ import annotations


class WalletResource:
    def __init__(self, http):
        self._http = http

    def balance(self) -> dict:
        """Check wallet balance."""
        return self._http.get("/v1/wallet/balance")

    def deposit_address(self) -> dict:
        """Get NEAR deposit address."""
        return self._http.get("/v1/wallet/deposit_address")

    def cross_chain_deposit(self, chain: str, asset: str) -> dict:
        """Initiate a cross-chain deposit (ETH, Solana, BTC, etc)."""
        return self._http.post("/v1/wallet/deposit", body={"chain": chain, "asset": asset})

    def list_deposits(self, limit: int = 20, offset: int = 0) -> list[dict]:
        """List deposit history."""
        return self._http.get("/v1/wallet/deposits", params={"limit": limit, "offset": offset})

    def get_deposit(self, deposit_id: str) -> dict:
        """Get status of a specific deposit."""
        return self._http.get(f"/v1/wallet/deposits/{deposit_id}")

    def withdraw(self, to_account_id: str, amount: str) -> dict:
        """Withdraw NEAR to a wallet address."""
        return self._http.post("/v1/wallet/withdraw", body={
            "to_account_id": to_account_id,
            "amount": amount,
        })


class AsyncWalletResource:
    def __init__(self, http):
        self._http = http

    async def balance(self) -> dict:
        return await self._http.get("/v1/wallet/balance")

    async def deposit_address(self) -> dict:
        return await self._http.get("/v1/wallet/deposit_address")

    async def cross_chain_deposit(self, chain: str, asset: str) -> dict:
        return await self._http.post("/v1/wallet/deposit", body={"chain": chain, "asset": asset})

    async def list_deposits(self, limit=20, offset=0) -> list[dict]:
        return await self._http.get("/v1/wallet/deposits", params={"limit": limit, "offset": offset})

    async def get_deposit(self, deposit_id: str) -> dict:
        return await self._http.get(f"/v1/wallet/deposits/{deposit_id}")

    async def withdraw(self, to_account_id: str, amount: str) -> dict:
        return await self._http.post("/v1/wallet/withdraw", body={
            "to_account_id": to_account_id, "amount": amount})
