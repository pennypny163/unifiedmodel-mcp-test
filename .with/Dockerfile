# syntax=docker/dockerfile:1

# ============================================================
# UnifiedModel MCP Server - deployment image
# Exposes the Streamable HTTP MCP endpoint at /mcp on port 8000
# so remote agent platforms (e.g. ADP) can connect over the network.
# ============================================================

# ------------------------------------------------------------
# Stage 1: Build the Go umodel-mcp binary
# ------------------------------------------------------------
FROM golang:1.22-bookworm AS go-build
WORKDIR /src

ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOFLAGS=-mod=mod

# Download dependencies first (better layer caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy the Go sources required to build the MCP server
COPY cmd ./cmd
COPY internal ./internal
COPY pkg ./pkg

RUN go build -ldflags="-w -s" -o /out/umodel-mcp ./cmd/umodel-mcp

# ------------------------------------------------------------
# Stage 2: Minimal runtime image
# ------------------------------------------------------------
FROM debian:bookworm-slim AS runner

# CA certificates for outbound HTTPS, curl for health checks, plus a non-root user
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 1001 --create-home appuser

WORKDIR /app

# Copy the compiled MCP binary
COPY --from=go-build /out/umodel-mcp /usr/local/bin/umodel-mcp

# Sample packs are read from disk at runtime (see internal/sampledata/service.go::repoPath),
# so the examples tree must exist relative to WORKDIR (/app).
COPY --chown=appuser:appuser examples ./examples

USER appuser

# ADP and other remote agent platforms connect over the network with a browser-style
# Origin header. Relax the MCP Origin check so those cross-origin requests are accepted.
ENV UMODEL_MCP_ALLOW_ALL_ORIGINS=1

EXPOSE 8000

# Serve the Streamable HTTP MCP endpoint at /mcp on port 8000,
# preloaded with the incident-investigation sample dataset.
ENTRYPOINT ["umodel-mcp"]
CMD ["--transport", "http", \
     "--addr", "0.0.0.0:8000", \
     "--mcp-path", "/mcp", \
     "--quickstart", \
     "--quickstart-sample", "incident-investigation", \
     "--graphstore", "memory"]
