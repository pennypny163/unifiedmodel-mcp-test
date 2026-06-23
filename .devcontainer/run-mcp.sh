#!/usr/bin/env bash
# ============================================================
# Start the UnifiedModel MCP server inside a GitHub Codespace.
# Serves the Streamable HTTP MCP endpoint at /mcp on port 8000,
# preloaded with the incident-investigation sample dataset.
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

# Make sure the binary exists (postCreateCommand normally builds it,
# but rebuild defensively in case the workspace was recreated).
if [ ! -x ./bin/umodel-mcp ]; then
  echo "[run-mcp] building umodel-mcp ..."
  go build -ldflags="-w -s" -o ./bin/umodel-mcp ./cmd/umodel-mcp
fi

# Relax the Origin check so remote agent platforms (e.g. ADP) can connect.
export UMODEL_MCP_ALLOW_ALL_ORIGINS=1

echo "[run-mcp] starting MCP server on 0.0.0.0:8000/mcp ..."
exec ./bin/umodel-mcp \
  --transport http \
  --addr 0.0.0.0:8000 \
  --mcp-path /mcp \
  --quickstart \
  --quickstart-sample incident-investigation \
  --graphstore memory
