import fs from 'fs';
import path from 'path';
import { siteConfig } from '../config';

export async function GET() {
  // Get version from config (sourced from package.json)
  const version = siteConfig.version;

  // Read the raw markdown files from the current version
  const contentPath = path.join(process.cwd(), `../content/${version}`);
  const protocolContent = fs.readFileSync(path.join(contentPath, 'protocol.md'), 'utf-8');
  const serviceContent = fs.readFileSync(path.join(contentPath, 'service.md'), 'utf-8');
  const gatekeeperContent = fs.readFileSync(path.join(contentPath, 'gatekeeper.md'), 'utf-8');
  const governanceContent = fs.readFileSync(path.join(contentPath, 'governance.md'), 'utf-8');
  // Review document carries optional/deferred material (Output Provenance, Decision
  // Streams) that is specified but NOT required for v0.4 conformance. Include it so
  // AI assistants can answer questions about it, but readers should treat it as
  // forward-looking direction, not current-v0.4 obligation.
  const reviewPath = path.join(contentPath, 'review.md');
  const reviewContent = fs.existsSync(reviewPath) ? fs.readFileSync(reviewPath, 'utf-8') : null;

  // Combine all content
  const combinedContent = `
# Human Agency Protocol - Complete Context

**Version ${version} — April 2026**

---

## Homepage

### Authorization Layer for AI Agents.

Every agent action — authorized by a human, bounded, and cryptographically proven. No policy engines. No role hierarchies. A protocol for accountability that scales without scaling IT.

---

### How HAP Works

HAP separates authorization from execution. Humans authorize actions through cryptographic attestations. Gatekeepers verify those attestations before any system is allowed to execute.

Authorization path: Human → Service Provider → Gatekeeper → Executor
Execution request: AI Agent → Gatekeeper

- **Service Provider** — Issues cryptographic attestations proving a human authorized an action within defined bounds.
- **Gatekeeper** — Verifies attestations before execution and blocks any action that exceeds authorized limits.
- **Executor** — Performs the action — but only after authorization has been validated.

HAP enforces authorization through two infrastructure components: Service Providers issue attestations. Gatekeepers verify them before execution.

---

### AI Executes. Humans Own It.

AI Agents can deploy code, move money, grant access, and operate infrastructure. But they cannot own it — because ownership requires bearing consequences, and AI cannot bear them.

> HAP ensures that irreversible actions only execute within bounds set by a human who owns the outcome.

---

### Explore Use Cases

HAP applies wherever AI agents take consequential action:

- **Payment Agents** — Agents charge customers, process refunds, and manage subscriptions within bounds you set. Every transaction produces a signed receipt linking it to your authorization.
- **Email & Communication** — Agents draft and send emails on your behalf with clear bounds — who, what topics, which tone. High-stakes replies pause for your review.
- **CRM & Data Agents** — Agents manage contacts, leads, and customer records within scoped bounds — read here, write limits there, no deletes. Every action traceable.
- **Infrastructure & DevOps** — Agents ship code and manage infrastructure under your named authority. High-risk operations require explicit human review before execution.
- **Multi-Stakeholder Actions** — When one signature isn't enough. Critical decisions require attestations from multiple domain owners before the agent can act.
- **Compliance & Audit** — Prove human oversight to regulators, auditors, and insurers. EU AI Act, ISO 42001, NIST AI RMF — satisfied structurally, not through policy documents.

---

### Compliance Alignment

HAP turns policy requirements into enforceable infrastructure.

- **EU AI Act** — Article 14 mandates effective human oversight for high-risk AI. HAP satisfies this structurally — oversight is not a checkbox, it's the architecture.
- **ISO 42001** — Every AI action requires a human Decision Owner who has set the bounds and articulated the intent. No attestation, no execution.
- **NIST AI RMF** — Every decision produces a cryptographic trail of authorship, bounds, and commitments — tamper-proof and verifiable.

---

### Build With HAP

- **Protocol** — Defines authorization structure and attestation format.
- **Service Providers** — Issue cryptographic attestations.
- **Gatekeeper** — Protocol role: verifies attestations and blocks execution without a receipt.
- **Gateway** — Open-source reference implementation that embeds the Gatekeeper for agent runtimes.
- **Governance** — Protocol governance and trust model.

**HAP is the open protocol for human authority over AI agents. Verifiable, interoperable, and infrastructure-free.**

---

${protocolContent}

---

${serviceContent}

---

${gatekeeperContent}

---

${governanceContent}

---

${reviewContent ? `> **Note to readers:** The content below is *optional / deferred* material for v0.4. A v0.4 implementation MAY implement any of these without losing conformance, and MAY skip all of them without losing conformance. Treat this as forward-looking direction, not current v0.4 obligation.\n\n${reviewContent}\n\n---\n` : ''}
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
- **MCP integrations** — CRM, records, LinkedIn, Gmail, Stripe reference implementations

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
