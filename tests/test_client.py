"""Unit tests for agent_market SDK."""

import pytest
from unittest.mock import MagicMock, patch

from agent_market import AgentMarket
from agent_market.exceptions import (
    AuthenticationError, NotFoundError, ValidationError,
    InsufficientFundsError, ConflictError, AgentMarketError
)
from agent_market.http import sha256_hash


# ── Helpers ──────────────────────────────────────────────────────────────────

def make_client(mock_http=None):
    client = AgentMarket.__new__(AgentMarket)
    http = mock_http or MagicMock()
    from agent_market.resources import (
        AgentsResource, JobsResource, WalletResource, BidsResource,
        AssignmentsResource, DisputesResource, MessagesResource, ServicesResource
    )
    client._http = http
    client.agents = AgentsResource(http)
    client.jobs = JobsResource(http)
    client.wallet = WalletResource(http)
    client.bids = BidsResource(http)
    client.assignments = AssignmentsResource(http)
    client.disputes = DisputesResource(http)
    client.messages = MessagesResource(http)
    client.services = ServicesResource(http)
    return client, http


# ── sha256_hash ───────────────────────────────────────────────────────────────

def test_sha256_hash_format():
    h = sha256_hash("hello")
    assert h.startswith("sha256:")
    assert len(h) == 7 + 64  # "sha256:" + 64 hex chars


def test_sha256_hash_deterministic():
    assert sha256_hash("test") == sha256_hash("test")


def test_sha256_hash_unique():
    assert sha256_hash("a") != sha256_hash("b")


# ── AgentMarket init ──────────────────────────────────────────────────────────

def test_client_requires_api_key():
    with pytest.raises(ValueError, match="API key required"):
        AgentMarket(api_key=None)


def test_client_reads_env_key(monkeypatch):
    monkeypatch.setenv("AGENT_MARKET_API_KEY", "sk_live_test")
    with patch("agent_market.client.SyncHTTP") as mock_http_cls:
        mock_http_cls.return_value = MagicMock()
        client = AgentMarket()
        mock_http_cls.assert_called_once_with(
            "https://market.near.ai", "sk_live_test", 30
        )


# ── Agents resource ───────────────────────────────────────────────────────────

def test_agents_me():
    client, http = make_client()
    http.get.return_value = {"handle": "test"}
    result = client.agents.me()
    http.get.assert_called_once_with("/v1/agents/me")
    assert result["handle"] == "test"


def test_agents_update():
    client, http = make_client()
    http.patch.return_value = {"handle": "new"}
    result = client.agents.update(handle="new")
    http.patch.assert_called_once_with("/v1/agents/me", body={"handle": "new"})


def test_agents_list_params():
    client, http = make_client()
    http.get.return_value = []
    client.agents.list(tag="developer", sort_by="earned", limit=5)
    http.get.assert_called_once_with(
        "/v1/agents",
        params={"limit": 5, "offset": 0, "tag": "developer", "sort_by": "earned"}
    )


def test_agents_my_bids():
    client, http = make_client()
    http.get.return_value = []
    client.agents.my_bids()
    http.get.assert_called_once_with(
        "/v1/agents/me/bids", params={"limit": 20, "offset": 0}
    )


# ── Jobs resource ─────────────────────────────────────────────────────────────

def test_jobs_list_no_filters():
    client, http = make_client()
    http.get.return_value = []
    client.jobs.list()
    http.get.assert_called_once_with("/v1/jobs", params={"limit": 20, "offset": 0})


def test_jobs_list_with_filters():
    client, http = make_client()
    http.get.return_value = []
    client.jobs.list(status="open", tags=["python", "ai"], job_type="standard")
    call_params = http.get.call_args[1]["params"]
    assert call_params["status"] == "open"
    assert call_params["tags"] == "python,ai"
    assert call_params["job_type"] == "standard"


def test_jobs_get():
    client, http = make_client()
    http.get.return_value = {"job_id": "abc"}
    result = client.jobs.get("abc")
    http.get.assert_called_once_with("/v1/jobs/abc")


def test_jobs_bid():
    client, http = make_client()
    http.post.return_value = {"bid_id": "bid-1", "status": "pending"}
    result = client.jobs.bid("job-1", amount=5.0, proposal="I can help")
    http.post.assert_called_once_with(
        "/v1/jobs/job-1/bids",
        body={
            "amount": "5.0",
            "proposal": "I can help",
            "eta_seconds": 86400,
            "verifiable_offered": False,
        }
    )


def test_jobs_submit_auto_hash():
    client, http = make_client()
    http.post.return_value = {"status": "submitted"}
    deliverable = "https://github.com/test/repo"
    client.jobs.submit("job-1", deliverable=deliverable)
    call_body = http.post.call_args[1]["body"]
    assert call_body["deliverable"] == deliverable
    assert call_body["deliverable_hash"] == sha256_hash(deliverable)


def test_jobs_submit_custom_hash():
    client, http = make_client()
    http.post.return_value = {}
    client.jobs.submit("job-1", deliverable="content", deliverable_hash="sha256:abc")
    call_body = http.post.call_args[1]["body"]
    assert call_body["deliverable_hash"] == "sha256:abc"


def test_jobs_award():
    client, http = make_client()
    http.post.return_value = {}
    client.jobs.award("job-1", bid_id="bid-1")
    http.post.assert_called_once_with(
        "/v1/jobs/job-1/award", body={"bid_id": "bid-1"}
    )


def test_jobs_accept():
    client, http = make_client()
    http.post.return_value = {}
    client.jobs.accept("job-1")
    http.post.assert_called_once_with("/v1/jobs/job-1/accept")


def test_jobs_cancel():
    client, http = make_client()
    http.post.return_value = {}
    client.jobs.cancel("job-1")
    http.post.assert_called_once_with("/v1/jobs/job-1/cancel")


def test_jobs_dispute():
    client, http = make_client()
    http.post.return_value = {}
    client.jobs.dispute("job-1", reason="bad work", evidence_urls=["https://example.com"])
    http.post.assert_called_once_with(
        "/v1/jobs/job-1/dispute",
        body={"reason": "bad work", "evidence_urls": ["https://example.com"]}
    )


def test_jobs_submit_entry():
    client, http = make_client()
    http.post.return_value = {"entry_id": "e-1"}
    client.jobs.submit_entry("job-1", deliverable="My tweet content")
    call_body = http.post.call_args[1]["body"]
    assert call_body["deliverable"] == "My tweet content"
    assert call_body["deliverable_hash"].startswith("sha256:")


def test_jobs_create():
    client, http = make_client()
    http.post.return_value = {"job_id": "new"}
    client.jobs.create(
        title="Test Job",
        description="Do something",
        budget_amount="5.0",
        tags=["python"]
    )
    call_body = http.post.call_args[1]["body"]
    assert call_body["title"] == "Test Job"
    assert call_body["tags"] == ["python"]
    assert call_body["budget_token"] == "NEAR"


# ── Wallet resource ───────────────────────────────────────────────────────────

def test_wallet_balance():
    client, http = make_client()
    http.get.return_value = {"balance": "10.0", "token": "NEAR"}
    result = client.wallet.balance()
    http.get.assert_called_once_with("/v1/wallet/balance")


def test_wallet_withdraw():
    client, http = make_client()
    http.post.return_value = {"tx_hash": "abc"}
    client.wallet.withdraw("my-wallet.near", "5.0")
    http.post.assert_called_once_with(
        "/v1/wallet/withdraw",
        body={"to_account_id": "my-wallet.near", "amount": "5.0"}
    )


def test_wallet_cross_chain_deposit():
    client, http = make_client()
    http.post.return_value = {"deposit_address": "0xabc"}
    client.wallet.cross_chain_deposit("ethereum", "USDC")
    http.post.assert_called_once_with(
        "/v1/wallet/deposit",
        body={"chain": "ethereum", "asset": "USDC"}
    )


# ── Bids resource ─────────────────────────────────────────────────────────────

def test_bids_withdraw():
    client, http = make_client()
    http.post.return_value = {}
    client.bids.withdraw("bid-1")
    http.post.assert_called_once_with("/v1/bids/bid-1/withdraw")


# ── Assignments resource ──────────────────────────────────────────────────────

def test_assignments_send_message():
    client, http = make_client()
    http.post.return_value = {"message_id": "m-1"}
    client.assignments.send_message("assign-1", "Hello!")
    http.post.assert_called_once_with(
        "/v1/assignments/assign-1/messages", body={"body": "Hello!"}
    )


def test_assignments_request_changes():
    client, http = make_client()
    http.post.return_value = {}
    client.assignments.request_changes("assign-1", "Please fix X")
    http.post.assert_called_once_with(
        "/v1/assignments/assign-1/request-changes", body={"feedback": "Please fix X"}
    )


# ── Exceptions ────────────────────────────────────────────────────────────────

def test_raise_for_status_401():
    from agent_market.exceptions import _raise_for_status
    with pytest.raises(AuthenticationError):
        _raise_for_status(401, {"error": "Unauthorized"})


def test_raise_for_status_404():
    from agent_market.exceptions import _raise_for_status
    with pytest.raises(NotFoundError):
        _raise_for_status(404, {"error": "Not found"})


def test_raise_for_status_409():
    from agent_market.exceptions import _raise_for_status
    with pytest.raises(ConflictError):
        _raise_for_status(409, {"error": "bid already exists"})


def test_raise_for_status_422():
    from agent_market.exceptions import _raise_for_status
    with pytest.raises(ValidationError):
        _raise_for_status(422, {"error": "Invalid input"})


def test_raise_for_status_429():
    from agent_market.exceptions import _raise_for_status
    with pytest.raises(AgentMarketError):
        _raise_for_status(429, {"error": "Rate limited"})


def test_raise_for_status_insufficient_funds():
    from agent_market.exceptions import _raise_for_status
    with pytest.raises(InsufficientFundsError):
        _raise_for_status(400, {"error": "insufficient balance"})


# ── Messages resource ─────────────────────────────────────────────────────────

def test_messages_react():
    client, http = make_client()
    http.post.return_value = {"action": "added", "emoji": "fire"}
    client.messages.react("msg-1", "fire")
    http.post.assert_called_once_with(
        "/v1/messages/msg-1/reactions", body={"emoji": "fire"}
    )


# ── Context manager ───────────────────────────────────────────────────────────

def test_context_manager():
    with patch("agent_market.client.SyncHTTP") as mock_http_cls:
        mock_http = MagicMock()
        mock_http_cls.return_value = mock_http
        with AgentMarket(api_key="sk_live_test") as client:
            pass
        mock_http.close.assert_called_once()
