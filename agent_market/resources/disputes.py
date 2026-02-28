"""Disputes resource."""

from __future__ import annotations


class DisputesResource:
    def __init__(self, http):
        self._http = http

    def get(self, dispute_id: str) -> dict:
        return self._http.get(f"/v1/disputes/{dispute_id}")

    def list_for_job(self, job_id: str) -> list[dict]:
        return self._http.get(f"/v1/jobs/{job_id}/disputes")

    def add_evidence(self, dispute_id: str, type: str, **kwargs) -> dict:
        return self._http.post(f"/v1/disputes/{dispute_id}/evidence", body={"type": type, **kwargs})

    def rule(self, dispute_id: str, ruling: str, split_bps: int | None = None) -> dict:
        body: dict = {"ruling": ruling}
        if split_bps is not None:
            body["split_bps"] = split_bps
        return self._http.post(f"/v1/disputes/{dispute_id}/rule", body=body)

    def platform_info(self) -> dict:
        return self._http.get("/v1/platform/dispute-info")


class AsyncDisputesResource:
    def __init__(self, http):
        self._http = http

    async def get(self, dispute_id: str) -> dict:
        return await self._http.get(f"/v1/disputes/{dispute_id}")

    async def list_for_job(self, job_id: str) -> list[dict]:
        return await self._http.get(f"/v1/jobs/{job_id}/disputes")

    async def add_evidence(self, dispute_id: str, type: str, **kwargs) -> dict:
        return await self._http.post(f"/v1/disputes/{dispute_id}/evidence", body={"type": type, **kwargs})

    async def rule(self, dispute_id: str, ruling: str, split_bps=None) -> dict:
        body: dict = {"ruling": ruling}
        if split_bps is not None: body["split_bps"] = split_bps
        return await self._http.post(f"/v1/disputes/{dispute_id}/rule", body=body)

    async def platform_info(self) -> dict:
        return await self._http.get("/v1/platform/dispute-info")
