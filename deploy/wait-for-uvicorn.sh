#!/bin/sh
# Start nginx only after uvicorn accepts TCP on loopback (avoids early 502s).
set -eu
i=0
while [ "$i" -lt 60 ]; do
  if python -c "import socket; socket.create_connection(('127.0.0.1', 8000), 1).close()" 2>/dev/null; then
    exec nginx -g "daemon off;"
  fi
  i=$((i + 1))
  sleep 0.5
done
echo "uvicorn not ready on 127.0.0.1:8000" >&2
exit 1
