"""SSRF-safe outbound HTTP GET helper.

Resolves the URL host, rejects private/reserved/loopback/link-local/multicast/
unspecified IPs and CGNAT (100.64.0.0/10) ranges, then performs the request to
the original URL. The IP is validated immediately before the request to close
the obvious SSRF vector (internal-IP targeting). A residual TOCTOU window
exists between validation and the underlying httpx DNS lookup; this is an
accepted tradeoff (see design.md risk table) because rewriting the URL host to
the pinned IP breaks TLS certificate validation for image-CDN hosts that serve
different certs per SNI.
"""

from __future__ import annotations

import ipaddress
import logging
import socket
from urllib.parse import urlparse

import httpx

_logger = logging.getLogger(__name__)

# Hosts the search endpoint is allowed to talk to. cache-logo passes
# allowlist=None (IP filter is the real defense there).
ALLOWED_SEARCH_HOSTS: set[str] = {"duckduckgo.com", "search.brave.com"}

# CGNAT range — ipaddress.is_private does NOT flag 100.64.0.0/10.
_CGNAT_NET = ipaddress.ip_network("100.64.0.0/10")


class SsrfBlockedError(Exception):
    """Raised when a URL/host/IP is rejected by the SSRF guard."""


def _is_blocked_ip(ip: str) -> bool:
    addr = ipaddress.ip_address(ip)
    return (
        addr.is_private
        or addr.is_reserved
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_multicast
        or addr.is_unspecified
        or addr in _CGNAT_NET
    )


def _resolve_and_validate(host: str) -> str:
    """Resolve ``host`` to an IPv4 address and validate it. Returns the IP."""
    try:
        ip = socket.gethostbyname(host)
    except socket.gaierror as exc:  # pragma: no cover - network-dependent
        raise SsrfBlockedError(f"DNS resolution failed for {host!r}: {exc}") from exc
    if _is_blocked_ip(ip):
        raise SsrfBlockedError(f"Resolved IP {ip} for {host!r} is not allowed")
    return ip


def safe_get(
    url: str,
    *,
    allowlist: set[str] | None = None,
    timeout: float = 10.0,
    headers: dict[str, str] | None = None,
    follow_redirects: bool = True,
) -> httpx.Response:
    """SSRF-safe GET.

    - If ``allowlist`` is provided, the URL host (lowercased) must be in it.
    - Resolves the host and rejects private/reserved/CGNAT IPs before any
      network call to the target.
    - Redirects are followed by httpx (default) without per-hop re-validation;
      the residual TOCTOU is documented in the module docstring.
    """
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        raise SsrfBlockedError(f"Unsupported URL scheme: {scheme!r}")
    host = parsed.hostname or ""
    if not host:
        raise SsrfBlockedError("URL has no host")

    if allowlist is not None and host.lower() not in allowlist:
        raise SsrfBlockedError(f"Host {host!r} is not in the allowlist")

    _resolve_and_validate(host)

    with httpx.Client(timeout=timeout, follow_redirects=follow_redirects) as client:
        return client.get(url, headers=headers)