"""Container healthcheck: uvicorn is up if /auth/me returns 401/403."""
from __future__ import annotations

import sys
import urllib.error
import urllib.request


def main() -> int:
    try:
        urllib.request.urlopen("http://127.0.0.1:8000/api/v1/auth/me", timeout=3)
    except urllib.error.HTTPError as e:
        return 0 if e.code in (401, 403) else 1
    except Exception:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
