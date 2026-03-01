# HAP Agent Demo

A bounded-execution MCP server and authorization UI built on **[Human Agency Protocol v0.3](https://humanagencyprotocol.org/review)**.

AI agents call tools (payments, emails) through MCP — but every tool execution is gated by human-created authorizations. Domain owners define bounds (amount limits, allowed environments, recipient caps) and articulate problem, objective, and tradeoffs before any agent action proceeds. The Gatekeeper enforces these bounds at runtime.

---

## Protocol Foundation

This demo implements the HAP v0.3 bounded execution model. Five concepts are enough to follow the code.

### Profiles

Profiles define everything about a specific use case: which gates exist, what execution context fields are required, what questions each gate asks, and what bounds constrain execution. This demo ships two profiles:

| Profile | Use Case | Bounds |
|---|---|---|
| `payment-gate@0.3` | Financial transactions | `amount_max`, `currency`, `target_env` |
| `comms-send@0.3` | Communications (email) | `max_recipients`, `channel` |

### Bounds

Bounds are field-level constraints that limit what an agent can do within an authorization:

| Type | Enforcement | Example |
|---|---|---|
| `max` | Actual value must be ≤ bound | `amount_max: 100` → agent can send up to $100 |
| `enum` | Value must be in allowed set | `target_env: ["staging"]` → agent cannot target production |

### Gates

Human checkpoints requiring explicit decisions. The authorization wizard walks domain owners through seven gates — from selecting a profile and execution path, through defining bounds, to articulating problem, objective, and tradeoffs, and finally committing.

### Attestations

Cryptographically signed proofs that a human passed all gates and committed to a specific frame with specific bounds. An attestation contains:

- `frame_hash` — binds to exactly one action + context
- `gate_content_hashes` — SHA-256 of what the owner wrote in each gate
- `resolved_domains` — which domain the owner attested for
- `expires_at` — TTL (time-limited authorization window)
- `bounds` — field constraints the Gatekeeper enforces at execution time

### Gatekeeper

The enforcement point, embedded in the MCP server. On every tool call, the Gatekeeper:

1. Resolves the profile from the frame
2. Recomputes the frame hash and verifies it against the attestation
3. Verifies the Ed25519 signature and TTL
4. Checks bounds — `max` (actual ≤ bound) and `enum` (value in allowed set)

If any check fails, the tool call is rejected.

---

## Architecture

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Authority UI   │     │   MCP Server      │     │   AI Agent       │
│   (React/Vite)   │     │   (Express/MCP)   │     │   (Claude, etc.) │
│                  │     │                   │     │                  │
│  • 6-gate wizard │     │  • Tool registry  │     │  Calls tools:    │
│  • Profile select│     │  • Gatekeeper     │     │  • make-payment  │
│  • Bounds editor │     │  • Attestation    │     │  • send-email    │
│  • Gate questions│     │    cache          │     │  • list-auth.    │
│                  │     │  • Gate store     │     │                  │
└────────┬─────────┘     └────────┬──────────┘     └────────┬─────────┘
         │                        │                         │
         │ POST /attest           │ Verify bounds           │ MCP protocol
         │ POST /gate-content     │ at execution            │ (stdio/SSE/HTTP)
         │                        │                         │
         ▼                        ▼                         │
┌───────────────────┐                                       │
│ Service Provider  │◄──────────────────────────────────────┘
│                   │     Fetch attestations + pubkey
│ • Signs attesta.  │
│ • Stores blobs    │
│ • Manages keys    │
└───────────────────┘
```

**Authority UI** — React/Vite application (port 3002). Domain owners (finance, compliance) log in and create time-limited, scope-bounded authorizations through a 6-gate wizard. Gate content is hashed client-side; only hashes are sent to the Service Provider.

**MCP Server** — Express server (port 3003) implementing the Model Context Protocol. Provides tools to AI agents (`make-payment`, `send-email`, `list-authorizations`, `check-pending-attestations`). Tools are dynamically enabled/disabled based on active authorizations. Embeds the Gatekeeper for runtime bounds enforcement.

**Service Provider** — Signs attestations with its Ed25519 key. Stores attestation blobs and manages the authorization lifecycle.

**AI Agent** — Any MCP-compatible agent (Claude, etc.). Connects via stdio, SSE, or Streamable HTTP transport. Sees only authorized tools with current bounds in their descriptions.

---

## MCP Tools

The MCP server exposes tools that are dynamically managed based on active authorizations:

| Tool | Profile | Description |
|---|---|---|
| `make-payment` | `payment-gate@0.3` | Execute a payment within authorized bounds |
| `send-email` | `comms-send@0.3` | Send an email within authorized bounds |
| `list-authorizations` | — | List active and pending authorizations |
| `check-pending-attestations` | — | Check attestations waiting for gate content |

Tool descriptions update dynamically to show current bounds and remaining TTL. Tools without active authorizations are hidden from the agent.

---

## The Authorization Flow

### 1. Owner Creates Authorization (Authority UI)

The domain owner progresses through the gate wizard:

1. **Profile & Path** — Select the profile (`payment-gate@0.3`) and execution path
2. **Bounds** — Define field constraints (e.g., `amount_max: 100`, `currency: ["USD"]`)
3. **Problem** — What problem does this authorization solve?
4. **Objective** — What outcome is being authorized?
5. **Tradeoffs** — What risks are being accepted?
6. **Commit** — Review and sign the attestation

### 2. Agent Executes Within Bounds (MCP Server)

```
Agent: "make-payment amount=50 currency=USD"
  → Gatekeeper checks: 50 ≤ 100 (amount_max) ✓, USD ∈ ["USD"] ✓
  → Payment executes

Agent: "make-payment amount=200 currency=USD"
  → Gatekeeper checks: 200 ≤ 100 (amount_max) ✗
  → Rejected: "amount 200 exceeds bound amount_max=100"
```

---

## Project Structure

```
demo-agent/
├── apps/
│   ├── authority-ui/          # Authorization UI (React/Vite, port 3002)
│   │   └── src/
│   │       ├── App.tsx        # Login + main views
│   │       ├── components/
│   │       │   ├── GateWizard.tsx        # Multi-step wizard
│   │       │   ├── ProfileSelector.tsx   # Profile + path selection
│   │       │   ├── BoundsEditor.tsx      # Field constraint editor
│   │       │   ├── GateInput.tsx         # Problem/objective/tradeoffs
│   │       │   └── CommitReview.tsx      # Review + sign
│   │       └── lib/
│   │           ├── sp-client.ts          # SP HTTP client
│   │           └── frame.ts             # Frame hash computation
│   └── mcp-server/            # MCP Server + Gatekeeper (Express, port 3003)
│       ├── bin/
│       │   ├── cli.ts         # Stdio transport entry
│       │   └── http.ts        # SSE + Streamable HTTP server
│       └── src/
│           ├── index.ts       # Tool registration + mandate brief
│           ├── tools/
│           │   ├── payment.ts           # make-payment handler
│           │   ├── email.ts             # send-email handler
│           │   ├── authorizations.ts    # list-authorizations handler
│           │   └── pending.ts           # check-pending handler
│           └── lib/
│               ├── gatekeeper.ts        # MCPGatekeeper wrapper
│               ├── sp-client.ts         # SP client
│               ├── attestation-cache.ts # Attestation caching
│               ├── gate-store.ts        # Gate content storage
│               └── mandate-brief.ts     # Agent system instructions
├── packages/
│   └── hap-core/              # Shared protocol logic
│       └── src/
│           ├── frame.ts       # Frame canonicalization + hashing
│           ├── attestation.ts # Attestation verification (EdDSA)
│           ├── gatekeeper.ts  # Bounds enforcement logic
│           ├── profiles/      # Profile definitions
│           └── types.ts       # Protocol types
└── pnpm-workspace.yaml
```

---

## Quick Start

Three services, three terminals:

```bash
# Prerequisites
cd demo-agent && pnpm install && pnpm build
```

```bash
# Terminal 1 — Service Provider (port 3001)
cd demo-sp && pnpm dev
```

```bash
# Terminal 2 — MCP Server (port 3003)
cd demo-agent && pnpm dev:mcp-http
```

```bash
# Terminal 3 — Authority UI (port 3002)
cd demo-agent && pnpm dev:ui
```

| Service | Port | Purpose |
|---------|------|---------|
| Service Provider | 3001 | Signs attestations, manages keys |
| Authority UI | 3002 | Human authorization wizard |
| MCP Server | 3003 | Agent tool provider + Gatekeeper |

### Create Your First Authorization

1. Open `http://localhost:3002`
2. Login as Alice (`demo-alice-key`) — finance domain owner
3. Select profile `payment-gate@0.3` → path `payment-routine`
4. Set bounds: `amount_max: 80`, `currency: EUR`, `target_env: production`
5. Answer the 3 gates (problem, objective, tradeoffs)
6. Commit — the attestation is signed and gate content is pushed to the MCP server

The agent can now make payments up to 80 EUR for the next 60 minutes.

---

## Connecting an Agent

Any MCP-compatible client can connect. The MCP server runs on `http://localhost:3003` and supports SSE and Streamable HTTP transports.

### OpenClaw (stdio — via `openclaw.yaml`)

```yaml
agents:
  - id: main
    model: anthropic/claude-sonnet-4-5
    mcp_servers:
      - name: hap-agent
        command: npx
        args:
          - tsx
          - /path/to/demo-agent/apps/mcp-server/bin/cli.ts
        env:
          HAP_SP_URL: http://localhost:3001
```

> **Note:** Stdio mode reads gate content from `~/.hap/gates.json` on disk. The MCP HTTP server must have run at least once to populate this file. For live gate content updates, use the HTTP plugin instead.

### OpenClaw (HTTP — via plugin)

Add to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "mcp-integration": {
        "enabled": true,
        "config": {
          "servers": {
            "hap-agent": {
              "enabled": true,
              "transport": "http",
              "url": "http://localhost:3003/mcp"
            }
          }
        }
      }
    }
  }
}
```

This is the **recommended** integration — the agent receives live tool updates when authorizations are granted or revoked.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hap-agent": {
      "url": "http://localhost:3003/sse"
    }
  }
}
```

### Any MCP Client

```
SSE endpoint:        GET  http://localhost:3003/sse
Streamable HTTP:     POST http://localhost:3003/mcp
Health check:        GET  http://localhost:3003/health
```

---

## What the Agent Sees

When an agent connects, it receives:

**1. Mandate Brief** (in MCP `instructions`) — system-level context:

```
You are an agent operating under the Human Agency Protocol (HAP).
You have bounded authorities granted by human decision owners.
You MUST stay within these bounds — the Gatekeeper will reject actions that exceed them.

=== ACTIVE AUTHORITIES ===

[payment-routine] payment-gate@0.3 (59 min remaining)
  Bounds: amount_max: 80, currency: EUR, target_env: production
  Problem: Monthly supplier invoices need timely processing.
  Objective: Pay approved invoices within terms without manual review.
  Tradeoffs: Rounding < 2 EUR acceptable. Late payments not acceptable.
```

**2. Dynamic Tool Descriptions** (in `tools/list`) — each tool carries its live authorization context:

```
make-payment:
  Make a payment to a recipient. Available authorizations:
    - payment-routine: amount_max: 80, currency: EUR, target_env: production (59 min remaining)
      Purpose: Pay approved invoices within terms without manual review.
  Pass the authorization name as the "authorization" parameter.
```

**3. Tool Visibility** — only tools with active authorizations are shown. No payment authorization → `make-payment` is hidden.

---

## Environment Variables

### MCP Server

```bash
HAP_SP_URL=http://localhost:3001    # Service Provider URL
HAP_MCP_PORT=3003                   # MCP server port
```

### Authority UI

The Vite dev server proxies `/api` to `http://localhost:3001` (SP) and `/mcp-api` to `http://localhost:3003` (MCP server).

---

## Protocol Compliance

This demo implements **HAP v0.3** bounded execution as specified in the [review draft](https://humanagencyprotocol.org/review).

| Spec Section | Implementation |
|---|---|
| §4 Profiles | `payment-gate@0.3` and `comms-send@0.3` with field constraints and execution paths |
| §4.2 Execution Context | Declared/action/computed field sources with bounds |
| §5 Frames | Canonical frame hashing (SHA-256 of key-ordered fields) |
| §6 Attestations | Ed25519 signatures, TTL enforcement, gate content hashes, bounds |
| §7 Domains | Role-based attestations (finance, compliance) |
| §8 Gatekeeper | Stateless verification + runtime bounds enforcement (max, enum) |
| §17.1 AI Constraints | Agent operates within human-defined bounds; cannot self-authorize |

### What This Demo Does Not Implement

- **Identity verification** — The demo uses API keys for login. In production, the SP verifies identity via OAuth (§10.5).
- **Immutability rule** — The demo does not enforce that the authorization source is unmodifiable by the attester within the same action (§10.4).
- **Attestation persistence** — Attestations are cached in-memory on the MCP server (they persist at the SP). Gate content (problem/objective/tradeoffs) persists locally at `~/.hap/gates.json`.

---

See [humanagencyprotocol.org](https://humanagencyprotocol.org) for the full specification.
