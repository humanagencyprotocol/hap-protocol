import fs from 'fs';
import path from 'path';
import { siteConfig } from '../config';

export async function GET() {
  // Get version from config (sourced from package.json)
  const version = siteConfig.version;

  // Read the raw markdown files from the current version
  const contentPath = path.join(process.cwd(), `../content/${version}`);
  // v0.5 folds the former service.md / gatekeeper.md into protocol.md;
  // review.md holds the non-normative future directions.
  const protocolContent = fs.readFileSync(path.join(contentPath, 'protocol.md'), 'utf-8');
  const governanceContent = fs.readFileSync(path.join(contentPath, 'governance.md'), 'utf-8');
  const reviewContent = fs.readFileSync(path.join(contentPath, 'review.md'), 'utf-8');

  // Combine all content
  const combinedContent = `
# Human Agency Protocol - Complete Context

**Version ${version} — June 2026**

---

## Homepage

### Human authorization for consequential AI actions.

AI agents carry no authority of their own. Before an agent moves money, changes records, sends communication, grants access, or touches infrastructure, the action must receive a signed pre-execution receipt linked to human authorization.

---

### No receipt. No execution.

The receipt is not a post-execution log. It is the precondition for execution — and the audit artifact proving the action was authorized before it ran.

The 4-step causal chain:
1. A human authorizes bounded execution — scope, limits, time, and commitment mode.
2. The Gatekeeper verifies the attestation, checks per-action bounds, and enforces local context constraints.
3. The Authority Server checks cumulative limits, expiry, and revocation, then signs the receipt.
4. The Executor runs the action — only after the receipt exists.

Open infrastructure: Any compliant Authority Server can issue receipts — Suveren is one implementation. The protocol is open; no single vendor owns the trust layer.

---

### HAP composes. It doesn't compete.

HAP isn't another login, API gateway, or agent framework. It's the layer that decides whether an already-reachable capability may be used for a consequential action — with proof.

- **OAuth / OpenID Connect** — Grants API access.
- **MCP** — Exposes tools to agents.
- **Identity (EUDI, passkeys, WebAuthn)** — Proves who you are.
- **HAP** — Authorizes the consequential action — before it runs, with a signed receipt.

OAuth grants reachable capability. HAP governs authorized use of that capability.

---

### You decide how much runs on its own.

The level of autonomy is a signed choice on every authorization — the protocol's commitment mode, not a default the agent can change.

- **Automatic** — The agent acts within the bounds you set. No per-action approval — the Authority Server enforces the limits and issues a signed receipt for each action before execution.
- **Review** — The agent proposes; you approve each action before it runs. No approval, no receipt — no execution.
- **Review above a cap** — The agent runs on its own under a limit you set. Above it, the action routes to a named set of approvers before any receipt is issued.

---

### Agents aren't employees. They're executors.

Most systems give agents their own accounts, credentials, and standing permissions — one more identity to manage. HAP does the opposite.

An agent never carries authority of its own. A human authorizes a bounded action; the receipt is cryptographic proof that this specific action was authorized — and issued before it ran. An agent may have technical identifiers for logging and routing, but it holds no independent authority.

As AI systems become more capable, HAP keeps authority from quietly moving from humans into machines.

---

### Two models for authorizing agents.

How a system treats agent authority is an architectural decision with long-term governance consequences.

Agent-identity approach vs HAP approach:
- Treat agents as authority-bearing actors → Treat agents as executors
- Manage standing agent permissions → Issue bounded action receipts
- Rely on accounts and credentials → Bind execution to human authorization
- Audit after execution → Verify the receipt before execution
- Agent acts under standing authority → Agent acts only inside receipt-approved bounds

EU AI Act — Article 14: Article 14 requires effective human oversight of high-risk AI. HAP turns that oversight into an enforceable control at the action layer: consequential actions cannot run unless a human-linked authorization receipt exists before execution. HAP is Article-14-enabling infrastructure — not compliance on its own. Compliance still requires governance, training, documentation, and human competence.

---

### Where consequential actions need proof.

HAP applies wherever AI agents take consequential action:

- **Payments** — Refunds, charges, payouts.
- **Email** — High-stakes sends.
- **CRM** — Record changes and deletes.
- **Infrastructure** — Deploys and config.
- **Multi-owner approvals** — Two people must sign.
- **Compliance audit** — Verifiable receipts.

---

### No single vendor owns the trust layer.

HAP is an open standard — MIT-licensed, developed in the open, and maintained by stewards, not owners. Any compliant Authority Server can issue receipts.

---

# Protocol Specification

${protocolContent}

---

# Governance

${governanceContent}

---

# Review — Future Directions (non-normative)

${reviewContent}

---

## HAP Agent Gateway — Reference Implementation

**Status: open source, running in production today.**

The HAP Agent Gateway is an open-source reference implementation of the Gatekeeper role. It runs on your machine as a local checkpoint between your AI agents and the external tools they use — payments, email, CRM, deployments, infrastructure. Any MCP-compatible agent can connect.

Agents never hold credentials or signing keys. They connect to the gateway, receive a compact authority brief (active authorizations, bounds, live consumption), and call tools. Every call is verified against a signed attestation before execution. Nothing runs without a valid receipt.

**Two execution modes:**

- **Automatic** — You commit to bounds upfront (max amounts, allowed actions, time windows). The agent executes autonomously within those bounds. Every call produces a signed receipt.
- **Review each action** — You define bounds but defer commitment. When the agent proposes an action, you see exactly which tool, which arguments, which context — and approve or reject in the gateway UI.

Both modes are bounded. Both produce receipts. Both create a full audit trail.

**Run it:**

    docker run -d --name hap-gateway \\
      -p 7400:3000 -p 7430:3030 \\
      -v $HOME/.hap:/app/data \\
      ghcr.io/humanagencyprotocol/hap-gateway

Open \`http://localhost:7400\`. MCP server at \`http://localhost:7430\` (Streamable HTTP + SSE).
Source: https://github.com/humanagencyprotocol/hap-gateway

---

## HAP Service Provider

**Status: live at humanagencyprotocol.com. Signing real attestations today.**

The Service Provider is the authorization backend. It tracks who has authority to authorize what, signs Ed25519 attestations that prove human commitment, and stores the receipts of every action executed under those attestations. Use it solo or in teams.

**What it does:**

- **Authorization** — Define what your agents are allowed to do. Set bounds, time limits, and choose automatic or per-action review.
- **Personal or team** — Create a team, assign roles, require multi-party approval for critical actions.
- **Receipts** — Every action produces a signed receipt — cryptographic proof of what was done, when, and under which authorization.
- **Public verification** — Open endpoints let third parties (auditors, regulators, insurers) independently confirm any authorization or receipt without trusting the operator.

**Division of responsibility:** The Service Provider answers "who has authority to authorize what." The Gateway answers "is this specific tool call authorized right now." The receipt proves it happened within bounds.

---

## HAP Authority Profiles (v0.4)

**Status: 7 profiles published and in use. Immutable and versioned.**

Profiles are authorization templates — each defines what an AI agent can do within a specific domain. A profile specifies the bounds schema (what a human commits to), the context schema (local parameters), execution paths with TTLs, and the gates a human must answer before authorizing.

Profiles are referenced by ID (e.g., \`charge@0.4\`) and are immutable once published.

**v0.4 catalog:**

| Profile | Domain | Example bounds |
|---------|--------|----------------|
| \`charge@0.4\` | Charging customers (payments, refunds, subscriptions) | amount_max, amount_daily_max, transaction_count_daily_max |
| \`purchase@0.4\` | Spending company money (subscriptions, supplies, ads) | spend_max, spend_daily_max, allowed_vendors |
| \`email@0.4\` | Sending, drafting, and reading email | recipient_max, send_daily_max, allowed_domains |
| \`customers@0.4\` | CRM operations (contacts, deals, tasks) | write_daily_max, contact_type |
| \`schedule@0.4\` | Calendar access (read, draft, book) | booking_daily_max, booking_duration_max, allowed_calendars |
| \`publish@0.4\` | Public content (social, blog, etc.) | post_daily_max, allowed_platforms, audience |
| \`records@0.4\` | Personal structured data (queries, exports) | row_limit_max, query_count_daily_max, access_level |

All profiles require the same six gates: bounds, problem, objective, tradeoff, commitment, and decision owner.

**Community profiles:** Anyone can publish profiles through the Service Provider. Published profiles are immutable and versioned. There is no central approval process — trust is local to each operator.

Source: https://github.com/humanagencyprotocol/hap-profiles

---

## Protocol Status

HAP is not a paper spec. Every component described above is implemented and running:

- **Specification** — v${version}, published in \`content/${version}/\` (open source)
- **Agent Gateway** — open source, Docker image at \`ghcr.io/humanagencyprotocol/hap-gateway\`
- **Authority Profiles** — open source, 7 v0.4 profiles at github.com/humanagencyprotocol/hap-profiles
- **Service Provider** — hosted service at humanagencyprotocol.com (not open source; runs the signing backend and public verification endpoints)
- **MCP integrations** — CRM, records, LinkedIn, Gmail, Mollie reference implementations

An AI agent reading this context can connect to a running HAP gateway today and operate within bounds.

---

Repository: https://github.com/humanagencyprotocol/hap-protocol
Website: https://humanagencyprotocol.org
`.trim();

  return new Response(combinedContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
