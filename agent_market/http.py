"""HTTP transport layer — sync (requests) and async (aiohttp)."""

from __future__ import annotations

import hashlib
import json
from typing import Any

import requests

try:
    import aiohttp
    _AIOHTTP_AVAILABLE = True
except ImportError:
    aiohttp = None  # type: ignore
    _AIOHTTP_AVAILABLE = False

from .exceptions import _raise_for_status


class SyncHTTP:
    """Synchronous HTTP client using requests."""

    def __init__(self, base_url: str, api_key: str, timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "agent-market-python/0.1.0",
        })
        self.timeout = timeout

    def request(self, method: str, path: str, **kwargs) -> Any:
        url = f"{self.base_url}{path}"
        resp = self.session.request(method, url, timeout=self.timeout, **kwargs)
        if resp.status_code == 204:
            return None
        try:
            data = resp.json()
        except Exception:
            data = {"error": resp.text}
        if resp.status_code >= 400:
            _raise_for_status(resp.status_code, data)
        return data

    def get(self, path: str, params: dict | None = None) -> Any:
        return self.request("GET", path, params=params)

    def post(self, path: str, body: dict | None = None) -> Any:
        return self.request("POST", path, json=body)

    def patch(self, path: str, body: dict | None = None) -> Any:
        return self.request("PATCH", path, json=body)

    def delete(self, path: str) -> Any:
        return self.request("DELETE", path)

    def close(self):
        self.session.close()


class AsyncHTTP:
    """Asynchronous HTTP client using aiohttp."""

    def __init__(self, base_url: str, api_key: str, timeout: int = 30):
        if not _AIOHTTP_AVAILABLE:
            raise ImportError("aiohttp is required for async support. Install it: pip install aiohttp")
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self._session: aiohttp.ClientSession | None = None

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "agent-market-python/0.1.0",
        }

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                headers=self._headers(), timeout=self.timeout
            )
        return self._session

    async def request(self, method: str, path: str, **kwargs) -> Any:
        url = f"{self.base_url}{path}"
        session = await self._get_session()
        async with session.request(method, url, **kwargs) as resp:
            if resp.status == 204:
                return None
            try:
                data = await resp.json()
            except Exception:
                data = {"error": await resp.text()}
            if resp.status >= 400:
                _raise_for_status(resp.status, data)
            return data

    async def get(self, path: str, params: dict | None = None) -> Any:
        return await self.request("GET", path, params=params)

    async def post(self, path: str, body: dict | None = None) -> Any:
        return await self.request("POST", path, json=body)

    async def patch(self, path: str, body: dict | None = None) -> Any:
        return await self.request("PATCH", path, json=body)

    async def delete(self, path: str) -> Any:
        return await self.request("DELETE", path)

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()


def sha256_hash(content: str) -> str:
    """Compute sha256 hash for deliverable verification."""
    return "sha256:" + hashlib.sha256(content.encode()).hexdigest()
