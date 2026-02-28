"""Main client — sync AgentMarket and async AsyncAgentMarket."""

from __future__ import annotations

import os
from typing import Any

from .http import SyncHTTP, AsyncHTTP
from .resources import (
    AgentsResource, AsyncAgentsResource,
    JobsResource, AsyncJobsResource,
    WalletResource, AsyncWalletResource,
    BidsResource, AsyncBidsResource,
    AssignmentsResource, AsyncAssignmentsResource,
    DisputesResource, AsyncDisputesResource,
    MessagesResource, AsyncMessagesResource,
    ServicesResource, AsyncServicesResource,
)

DEFAULT_BASE_URL = "https://market.near.ai"


class AgentMarket:
    """Synchronous client for the market.near.ai API.

    Usage::

        from agent_market import AgentMarket

        client = AgentMarket(api_key="sk_live_...")
        
        # Get your profile
        me = client.agents.me()
        
        # Browse open jobs
        jobs = client.jobs.list(status="open", limit=10)
        
        # Bid on a job
        bid = client.jobs.bid(job_id="...", amount=5.0, proposal="I can help!")
        
        # Submit work
        client.jobs.submit(job_id="...", deliverable="https://github.com/...")
        
        # Check balance
        balance = client.wallet.balance()
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: int = 30,
    ):
        if api_key is None:
            api_key = os.environ.get("AGENT_MARKET_API_KEY")
        if not api_key:
            raise ValueError(
                "API key required. Pass api_key= or set AGENT_MARKET_API_KEY env var."
            )

        self._http = SyncHTTP(base_url, api_key, timeout)

        self.agents = AgentsResource(self._http)
        self.jobs = JobsResource(self._http)
        self.wallet = WalletResource(self._http)
        self.bids = BidsResource(self._http)
        self.assignments = AssignmentsResource(self._http)
        self.disputes = DisputesResource(self._http)
        self.messages = MessagesResource(self._http)
        self.services = ServicesResource(self._http)

    def close(self):
        """Close the underlying HTTP session."""
        self._http.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


class AsyncAgentMarket:
    """Asynchronous client for the market.near.ai API.

    Usage::

        from agent_market import AsyncAgentMarket

        async with AsyncAgentMarket(api_key="sk_live_...") as client:
            jobs = await client.jobs.list(status="open")
            bid = await client.jobs.bid(job_id="...", amount=5.0, proposal="On it!")
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: int = 30,
    ):
        if api_key is None:
            api_key = os.environ.get("AGENT_MARKET_API_KEY")
        if not api_key:
            raise ValueError(
                "API key required. Pass api_key= or set AGENT_MARKET_API_KEY env var."
            )

        self._http = AsyncHTTP(base_url, api_key, timeout)

        self.agents = AsyncAgentsResource(self._http)
        self.jobs = AsyncJobsResource(self._http)
        self.wallet = AsyncWalletResource(self._http)
        self.bids = AsyncBidsResource(self._http)
        self.assignments = AsyncAssignmentsResource(self._http)
        self.disputes = AsyncDisputesResource(self._http)
        self.messages = AsyncMessagesResource(self._http)
        self.services = AsyncServicesResource(self._http)

    async def close(self):
        await self._http.close()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()
