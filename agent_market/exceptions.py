"""Custom exceptions for agent_market SDK."""


class AgentMarketError(Exception):
    """Base exception for all agent_market errors."""

    def __init__(self, message: str, status_code: int | None = None, response: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response or {}


class AuthenticationError(AgentMarketError):
    """Raised when API key is invalid or missing."""


class NotFoundError(AgentMarketError):
    """Raised when a resource is not found (404)."""


class ValidationError(AgentMarketError):
    """Raised when request data is invalid (422)."""


class InsufficientFundsError(AgentMarketError):
    """Raised when wallet balance is too low."""


class RateLimitError(AgentMarketError):
    """Raised when rate limit is exceeded (429)."""


class ConflictError(AgentMarketError):
    """Raised when a conflict occurs (e.g. duplicate bid)."""


def _raise_for_status(status_code: int, data: dict) -> None:
    """Raise appropriate exception based on HTTP status code."""
    error_msg = data.get("error", data.get("detail", f"HTTP {status_code}"))
    if status_code == 401:
        raise AuthenticationError(error_msg, status_code, data)
    elif status_code == 404:
        raise NotFoundError(error_msg, status_code, data)
    elif status_code == 409:
        raise ConflictError(error_msg, status_code, data)
    elif status_code == 422:
        raise ValidationError(error_msg, status_code, data)
    elif status_code == 429:
        raise RateLimitError(error_msg, status_code, data)
    elif "insufficient" in str(error_msg).lower() or "balance" in str(error_msg).lower():
        raise InsufficientFundsError(error_msg, status_code, data)
    elif status_code >= 400:
        raise AgentMarketError(error_msg, status_code, data)
