"""Jobs resource — full job lifecycle management."""

from __future__ import annotations
from typing import Any

from ..http import sha256_hash


class JobsResource:
    def __init__(self, http):
        self._http = http

    def list(
        self,
        status: str | None = None,
        tags: list[str] | None = None,
        job_type: str | None = None,
        judge: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict]:
        """List jobs with optional filters."""
        params: dict = {"limit": limit, "offset": offset}
        if status:
            params["status"] = status
        if tags:
            params["tags"] = ",".join(tags)
        if job_type:
            params["job_type"] = job_type
        if judge:
            params["judge"] = judge
        return self._http.get("/v1/jobs", params=params)

    def get(self, job_id: str) -> dict:
        """Get job details."""
        return self._http.get(f"/v1/jobs/{job_id}")

    def create(
        self,
        title: str,
        description: str,
        budget_amount: str,
        budget_token: str = "NEAR",
        tags: list[str] | None = None,
        job_type: str = "standard",
        **kwargs,
    ) -> dict:
        """Create a new job."""
        body: dict = {
            "title": title,
            "description": description,
            "budget_amount": budget_amount,
            "budget_token": budget_token,
            "job_type": job_type,
        }
        if tags:
            body["tags"] = tags
        body.update(kwargs)
        return self._http.post("/v1/jobs", body=body)

    def update(self, job_id: str, **fields) -> dict:
        """Update an open job."""
        return self._http.patch(f"/v1/jobs/{job_id}", body=fields)

    def delete(self, job_id: str) -> None:
        """Delete a job (only when open and no work done)."""
        return self._http.delete(f"/v1/jobs/{job_id}")

    def award(self, job_id: str, bid_id: str) -> dict:
        """Award a job to a bidder."""
        return self._http.post(f"/v1/jobs/{job_id}/award", body={"bid_id": bid_id})

    def submit(self, job_id: str, deliverable: str, deliverable_hash: str | None = None) -> dict:
        """Submit work for a job. Auto-computes hash if not provided."""
        if deliverable_hash is None:
            deliverable_hash = sha256_hash(deliverable)
        return self._http.post(f"/v1/jobs/{job_id}/submit", body={
            "deliverable": deliverable,
            "deliverable_hash": deliverable_hash,
        })

    def accept(self, job_id: str) -> dict:
        """Accept submitted work (requester action)."""
        return self._http.post(f"/v1/jobs/{job_id}/accept")

    def cancel(self, job_id: str) -> dict:
        """Cancel an open job."""
        return self._http.post(f"/v1/jobs/{job_id}/cancel")

    def dispute(self, job_id: str, reason: str, evidence_urls: list[str] | None = None) -> dict:
        """Open a dispute."""
        body: dict = {"reason": reason}
        if evidence_urls:
            body["evidence_urls"] = evidence_urls
        return self._http.post(f"/v1/jobs/{job_id}/dispute", body=body)

    def request_changes(self, job_id: str, feedback: str) -> dict:
        """Request changes on a submitted job."""
        return self._http.post(f"/v1/jobs/{job_id}/request-changes", body={"feedback": feedback})

    # Bids
    def list_bids(self, job_id: str, limit: int = 20, offset: int = 0) -> list[dict]:
        """List bids on a job."""
        return self._http.get(f"/v1/jobs/{job_id}/bids", params={"limit": limit, "offset": offset})

    def bid(
        self,
        job_id: str,
        amount: float,
        proposal: str,
        eta_seconds: int = 86400,
        verifiable_offered: bool = False,
    ) -> dict:
        """Place a bid on a job."""
        return self._http.post(f"/v1/jobs/{job_id}/bids", body={
            "amount": str(amount),
            "proposal": proposal,
            "eta_seconds": eta_seconds,
            "verifiable_offered": verifiable_offered,
        })

    # Messages
    def post_message(self, job_id: str, body: str) -> dict:
        """Post a public message on a job (creator only)."""
        return self._http.post(f"/v1/jobs/{job_id}/messages", body={"body": body})

    def list_messages(self, job_id: str, limit: int = 20, before: str | None = None) -> list[dict]:
        """Read public messages on a job."""
        params: dict = {"limit": limit}
        if before:
            params["before"] = before
        return self._http.get(f"/v1/jobs/{job_id}/messages", params=params)

    # Competition entries
    def submit_entry(self, job_id: str, deliverable: str, deliverable_hash: str | None = None) -> dict:
        """Submit a competition entry."""
        if deliverable_hash is None:
            deliverable_hash = sha256_hash(deliverable)
        return self._http.post(f"/v1/jobs/{job_id}/entries", body={
            "deliverable": deliverable,
            "deliverable_hash": deliverable_hash,
        })

    def list_entries(self, job_id: str) -> list[dict]:
        """List competition entries."""
        return self._http.get(f"/v1/jobs/{job_id}/entries")

    def resolve_competition(self, job_id: str, results: list[dict]) -> dict:
        """Resolve a competition (judge only). results = [{'entry_id': ..., 'bps': ...}]"""
        return self._http.post(f"/v1/jobs/{job_id}/resolve", body={"results": results})


class AsyncJobsResource:
    def __init__(self, http):
        self._http = http

    async def list(self, status=None, tags=None, job_type=None,
                   judge=None, limit=20, offset=0) -> list[dict]:
        params: dict = {"limit": limit, "offset": offset}
        if status: params["status"] = status
        if tags: params["tags"] = ",".join(tags)
        if job_type: params["job_type"] = job_type
        if judge: params["judge"] = judge
        return await self._http.get("/v1/jobs", params=params)

    async def get(self, job_id: str) -> dict:
        return await self._http.get(f"/v1/jobs/{job_id}")

    async def create(self, title, description, budget_amount,
                     budget_token="NEAR", tags=None, job_type="standard", **kwargs) -> dict:
        body = {"title": title, "description": description,
                "budget_amount": budget_amount, "budget_token": budget_token,
                "job_type": job_type}
        if tags: body["tags"] = tags
        body.update(kwargs)
        return await self._http.post("/v1/jobs", body=body)

    async def update(self, job_id: str, **fields) -> dict:
        return await self._http.patch(f"/v1/jobs/{job_id}", body=fields)

    async def delete(self, job_id: str) -> None:
        return await self._http.delete(f"/v1/jobs/{job_id}")

    async def award(self, job_id: str, bid_id: str) -> dict:
        return await self._http.post(f"/v1/jobs/{job_id}/award", body={"bid_id": bid_id})

    async def submit(self, job_id: str, deliverable: str, deliverable_hash: str | None = None) -> dict:
        if deliverable_hash is None:
            deliverable_hash = sha256_hash(deliverable)
        return await self._http.post(f"/v1/jobs/{job_id}/submit", body={
            "deliverable": deliverable, "deliverable_hash": deliverable_hash})

    async def accept(self, job_id: str) -> dict:
        return await self._http.post(f"/v1/jobs/{job_id}/accept")

    async def cancel(self, job_id: str) -> dict:
        return await self._http.post(f"/v1/jobs/{job_id}/cancel")

    async def dispute(self, job_id: str, reason: str, evidence_urls=None) -> dict:
        body: dict = {"reason": reason}
        if evidence_urls: body["evidence_urls"] = evidence_urls
        return await self._http.post(f"/v1/jobs/{job_id}/dispute", body=body)

    async def request_changes(self, job_id: str, feedback: str) -> dict:
        return await self._http.post(f"/v1/jobs/{job_id}/request-changes", body={"feedback": feedback})

    async def list_bids(self, job_id: str, limit=20, offset=0) -> list[dict]:
        return await self._http.get(f"/v1/jobs/{job_id}/bids", params={"limit": limit, "offset": offset})

    async def bid(self, job_id: str, amount: float, proposal: str,
                  eta_seconds=86400, verifiable_offered=False) -> dict:
        return await self._http.post(f"/v1/jobs/{job_id}/bids", body={
            "amount": str(amount), "proposal": proposal,
            "eta_seconds": eta_seconds, "verifiable_offered": verifiable_offered})

    async def post_message(self, job_id: str, body: str) -> dict:
        return await self._http.post(f"/v1/jobs/{job_id}/messages", body={"body": body})

    async def list_messages(self, job_id: str, limit=20, before=None) -> list[dict]:
        params: dict = {"limit": limit}
        if before: params["before"] = before
        return await self._http.get(f"/v1/jobs/{job_id}/messages", params=params)

    async def submit_entry(self, job_id: str, deliverable: str, deliverable_hash=None) -> dict:
        if deliverable_hash is None:
            deliverable_hash = sha256_hash(deliverable)
        return await self._http.post(f"/v1/jobs/{job_id}/entries", body={
            "deliverable": deliverable, "deliverable_hash": deliverable_hash})

    async def list_entries(self, job_id: str) -> list[dict]:
        return await self._http.get(f"/v1/jobs/{job_id}/entries")

    async def resolve_competition(self, job_id: str, results: list[dict]) -> dict:
        return await self._http.post(f"/v1/jobs/{job_id}/resolve", body={"results": results})
