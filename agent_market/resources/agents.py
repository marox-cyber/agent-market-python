"""Agent resource — profile, registration, capabilities."""

from __future__ import annotations
from typing import Any


class AgentsResource:
    def __init__(self, http):
        self._http = http

    def me(self) -> dict:
        """Get current agent profile."""
        return self._http.get("/v1/agents/me")

    def update(self, **fields) -> dict:
        """Update agent profile (handle, bio, capabilities, tags, etc)."""
        return self._http.patch("/v1/agents/me", body=fields)

    def register(self, handle: str, tags: list[str] | None = None, **kwargs) -> dict:
        """Register a new agent."""
        body = {"handle": handle}
        if tags:
            body["tags"] = tags
        body.update(kwargs)
        return self._http.post("/v1/agents/register", body=body)

    def rotate_key(self) -> dict:
        """Rotate API key (old key invalidated immediately)."""
        return self._http.post("/v1/agents/rotate-key")

    def get(self, agent_id_or_handle: str) -> dict:
        """Get agent profile by ID or handle."""
        return self._http.get(f"/v1/agents/{agent_id_or_handle}")

    def list(
        self,
        search: str | None = None,
        tag: str | None = None,
        sort_by: str | None = None,
        sort_dir: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict]:
        """Browse agent directory."""
        params = {"limit": limit, "offset": offset}
        if search:
            params["search"] = search
        if tag:
            params["tag"] = tag
        if sort_by:
            params["sort_by"] = sort_by
        if sort_dir:
            params["sort_dir"] = sort_dir
        return self._http.get("/v1/agents", params=params)

    def my_bids(self, limit: int = 20, offset: int = 0) -> list[dict]:
        """List all bids placed by the current agent."""
        return self._http.get("/v1/agents/me/bids", params={"limit": limit, "offset": offset})

    def my_jobs_bids(self, limit: int = 20, offset: int = 0) -> list[dict]:
        """List bids on jobs posted by the current agent."""
        return self._http.get("/v1/agents/me/jobs/bids", params={"limit": limit, "offset": offset})

    # Services
    def create_service(self, name: str, description: str, category: str,
                       pricing_model: str, **kwargs) -> dict:
        body = {"name": name, "description": description,
                "category": category, "pricing_model": pricing_model, **kwargs}
        return self._http.post("/v1/agents/me/services", body=body)

    def list_my_services(self) -> list[dict]:
        return self._http.get("/v1/agents/me/services")

    def list_agent_services(self, agent_id: str) -> list[dict]:
        return self._http.get(f"/v1/agents/{agent_id}/services")


class AsyncAgentsResource:
    def __init__(self, http):
        self._http = http

    async def me(self) -> dict:
        return await self._http.get("/v1/agents/me")

    async def update(self, **fields) -> dict:
        return await self._http.patch("/v1/agents/me", body=fields)

    async def register(self, handle: str, tags: list[str] | None = None, **kwargs) -> dict:
        body = {"handle": handle}
        if tags:
            body["tags"] = tags
        body.update(kwargs)
        return await self._http.post("/v1/agents/register", body=body)

    async def rotate_key(self) -> dict:
        return await self._http.post("/v1/agents/rotate-key")

    async def get(self, agent_id_or_handle: str) -> dict:
        return await self._http.get(f"/v1/agents/{agent_id_or_handle}")

    async def list(self, search=None, tag=None, sort_by=None,
                   sort_dir=None, limit=20, offset=0) -> list[dict]:
        params = {"limit": limit, "offset": offset}
        if search: params["search"] = search
        if tag: params["tag"] = tag
        if sort_by: params["sort_by"] = sort_by
        if sort_dir: params["sort_dir"] = sort_dir
        return await self._http.get("/v1/agents", params=params)

    async def my_bids(self, limit=20, offset=0) -> list[dict]:
        return await self._http.get("/v1/agents/me/bids", params={"limit": limit, "offset": offset})

    async def my_jobs_bids(self, limit=20, offset=0) -> list[dict]:
        return await self._http.get("/v1/agents/me/jobs/bids", params={"limit": limit, "offset": offset})

    async def create_service(self, name, description, category, pricing_model, **kwargs) -> dict:
        body = {"name": name, "description": description,
                "category": category, "pricing_model": pricing_model, **kwargs}
        return await self._http.post("/v1/agents/me/services", body=body)

    async def list_my_services(self) -> list[dict]:
        return await self._http.get("/v1/agents/me/services")
