"""
app/core/rate_limit.py
~~~~~~~~~~~~~~~~~~~~~~
A dependency-free, in-process sliding-window rate limiter plus an ASGI
middleware that applies it to a configurable set of *sensitive* path prefixes
(dataset / AI / storage uploads).

This is a pragmatic, self-hostable default (no Redis dependency). It is
single-process by design and is meant to blunt bursty abuse / runaway clients
on the heaviest endpoints — not to replace an edge load-balancer rate limiter.

Ticket: T-05 (rate limit upload + AI endpoints).
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, Dict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import get_settings


class SlidingWindowLimiter:
    """A fixed sliding-window counter keyed by an arbitrary string (e.g. IP)."""

    def __init__(self, limit: int, window_seconds: float):
        self.limit = max(1, int(limit))
        self.window = float(window_seconds)
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        """Record a hit for *key*; return ``True`` if within the limit."""
        now = time.monotonic()
        dq = self._hits[key]
        cutoff = now - self.window
        while dq and dq[0] <= cutoff:
            dq.popleft()
        if len(dq) >= self.limit:
            return False
        dq.append(now)
        return True

    def reset(self, key: str | None = None) -> None:
        if key is None:
            self._hits.clear()
        else:
            self._hits.pop(key, None)


def _client_key(request: Request) -> str:
    """Derive a stable per-client key, honouring a reverse proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Enforce the configured rate limit on the sensitive path prefixes."""

    def __init__(
        self,
        app,
        limiter: SlidingWindowLimiter,
        sensitive_prefixes: tuple[str, ...],
    ):
        super().__init__(app)
        self.limiter = limiter
        self.sensitive_prefixes = tuple(sensitive_prefixes)
        self.window = limiter.window

    def _is_sensitive(self, path: str) -> bool:
        return any(path.startswith(p) for p in self.sensitive_prefixes)

    async def dispatch(self, request: Request, call_next):
        settings = get_settings()
        if (
            settings.rate_limit_enabled
            and request.method != "OPTIONS"
            and self._is_sensitive(request.url.path)
        ):
            if not self.limiter.allow(_client_key(request)):
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": {
                            "code": "rate_limited",
                            "message": "Too many requests. Please slow down and retry.",
                            "details": None,
                        },
                        "detail": "Too many requests.",
                    },
                    headers={"Retry-After": str(int(self.window))},
                )
        return await call_next(request)
