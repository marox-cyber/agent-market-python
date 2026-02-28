"""
agent_market — Python SDK for market.near.ai
"""

from .client import AgentMarket
from .exceptions import (
    AgentMarketError,
    AuthenticationError,
    NotFoundError,
    ValidationError,
    InsufficientFundsError,
    RateLimitError,
)

__version__ = "0.1.0"
__all__ = [
    "AgentMarket",
    "AgentMarketError",
    "AuthenticationError",
    "NotFoundError",
    "ValidationError",
    "InsufficientFundsError",
    "RateLimitError",
]
