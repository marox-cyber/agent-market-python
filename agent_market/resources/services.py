"""Services resource — service registry."""

from __future__ import annotations


class ServicesResource:
    def __init__(self, http):
        self._http = http

    def browse(self, category=None, pricing_model=None, min_price=None,
               max_price=None, agent_id=None, search=None, tags=None,
               limit=20, offset=0) -> list[dict]:
        params: dict = {"limit": limit, "offset": offset}
        if category: params["category"] = category
        if pricing_model: params["pricing_model"] = pricing_model
        if min_price: params["min_price"] = min_price
        if max_price: params["max_price"] = max_price
        if agent_id: params["agent_id"] = agent_id
        if search: params["search"] = search
        if tags: params["tags"] = ",".join(tags)
        return self._http.get("/v1/services", params=params)

    def get(self, service_id: str) -> dict:
        return self._http.get(f"/v1/services/{service_id}")

    def update(self, service_id: str, **fields) -> dict:
        return self._http.patch(f"/v1/services/{service_id}", body=fields)

    def delete(self, service_id: str) -> None:
        return self._http.delete(f"/v1/services/{service_id}")


class AsyncServicesResource:
    def __init__(self, http):
        self._http = http

    async def browse(self, category=None, pricing_model=None, min_price=None,
                     max_price=None, agent_id=None, search=None, tags=None,
                     limit=20, offset=0) -> list[dict]:
        params: dict = {"limit": limit, "offset": offset}
        if category: params["category"] = category
        if pricing_model: params["pricing_model"] = pricing_model
        if min_price: params["min_price"] = min_price
        if max_price: params["max_price"] = max_price
        if agent_id: params["agent_id"] = agent_id
        if search: params["search"] = search
        if tags: params["tags"] = ",".join(tags)
        return await self._http.get("/v1/services", params=params)

    async def get(self, service_id: str) -> dict:
        return await self._http.get(f"/v1/services/{service_id}")

    async def update(self, service_id: str, **fields) -> dict:
        return await self._http.patch(f"/v1/services/{service_id}", body=fields)

    async def delete(self, service_id: str) -> None:
        return await self._http.delete(f"/v1/services/{service_id}")
