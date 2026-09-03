import fs from 'fs';
import path from 'path';
import { siteConfig } from '../config';

export async function GET() {
  // Get version from config (sourced from package.json)
  const version = siteConfig.version;

  // Read the raw markdown files from the current version
  const contentPath = path.join(process.cwd(), `../content/${version}`);
  // v0.5 folds the former service.md / gatekeeper.md into protocol.md.
  // changelog.md records what was promoted into this version and why; review.md
  // is the forward ledger of open directions (implementation status is not part
  // of the specification). Both are non-normative. vectors/README.md describes
  // the conformance vectors; provenance.md is the dated record. Add new spec files here — this surface
  // reads by name and will silently omit anything not listed.
  const protocolContent = fs.readFileSync(path.join(contentPath, 'protocol.md'), 'utf-8');
  const governanceContent = fs.readFileSync(path.join(contentPath, 'governance.md'), 'utf-8');
  const changelogContent = fs.readFileSync(path.join(contentPath, 'changelog.md'), 'utf-8');
  const reviewContent = fs.readFileSync(path.join(contentPath, 'review.md'), 'utf-8');
  const vectorsContent = fs.readFileSync(path.join(contentPath, 'vectors', 'README.md'), 'utf-8');
  const provenanceContent = fs.readFileSync(path.join(process.cwd(), '../content/provenance.md'), 'utf-8');

  // The publication date travels with the spec. Hardcoding it here meant the
  // header kept a prior version's month after a bump.
  const specDate = protocolContent.match(/^date:\s*"?([^"\n]+)"?\s*$/m)?.[1]?.trim() ?? '';

  // Combine all content
  const combinedContent = `
# Human Agency Protocol - Complete Context

**Version ${version}${specDate ? ` — ${specDate}` : ''}**

---

## Homepage

### Give AI autonomy without giving it authority.

A human sets what the automation may do — scope, limits, duration. Every consequential action is checked against that mandate before it runs, and obtains a signed mandate ticket proving the mandate existed first. Not a log written afterwards. A precondition.

---

### No mandate, no ticket. No ticket, no execution.

Vocabulary (v0.7, one word per thing on the wire, in the spec, and in public): **mandate** (what a person gives an agent — never "attestation" or "grant"), **mandate ticket** / **ticket** (obtained before each action, kept as proof after — never "receipt"), **bounds** (the enforced limits), **scope** (the local signed dimension — never "context"), **Mandate Owner** (the identifiable person who gives the mandate — never "Decision Owner"), **without a mandate** (the condition the protocol exists to end).

The ticket is not a post-execution log. It is the precondition for execution — and, afterwards, the verifiable proof that a mandate existed before it ran, with an identifiable person behind it. Agents request execution; they do not hold the keys.

The 4-step causal chain:
1. A human authorizes bounded execution — scope, limits, time, and commitment mode.
2. The Gatekeeper verifies the mandate, checks per-action bounds, and enforces scope locally.
3. The Authority Server checks cumulative limits, expiry, and revocation, then signs the ticket.
4. The Executor runs the action — only after the ticket exists — and the Gatekeeper keeps its own signed copy.

Open infrastructure: Any compliant Authority Server can issue tickets — Suveren is one implementation. The protocol is open; no single vendor owns the trust layer.

---

### One ticket. Three jobs.

Most systems make you choose: a gate that blocks, or a log that explains. The same signed artifact does both, and a third thing neither can.

- **Now — it runs, or it doesn't.** Every consequential action is checked against the mandate before it happens. Not caught in a log afterwards. Prevented.
- **Outward — a stranger can check it.** Hand someone the ticket and they verify the signature and the content themselves — no account, no relationship with you. Cryptography, not testimony.
- **Back — you can answer for it.** Evidence created before the act, not reconstructed after: which mandate, which bounds, which content. What an auditor, an insurer, or a court asks for.

What holds today, and what comes next: today the Authority Server signs that the human authorized it — the chain holds as far as you trust one operator's key. Next, the human's own key co-signs the mandate (owner signatures — specified since v0.6, not yet implemented). Then it holds without trusting any operator, including us.

The same ticket does all three. That is what a signed artifact can do and a permission cannot.

---

### HAP composes. It doesn't compete.

HAP isn't another login, API gateway, agent framework, sandbox, or policy engine. It's the layer that decides whether an already-reachable capability may be used for a consequential action — with proof.

- **OAuth / OpenID Connect** — Grants API access.
- **Identity (EUDI, passkeys, WebAuthn)** — Proves who you are.
- **MCP** — Exposes tools to agents.
- **Agent identity and lifecycle** (e.g. Entra Agent ID) — Governs which agents exist and what they may reach.
- **Agent platforms and policy engines** (e.g. Bedrock AgentCore) — Run agents and evaluate configured rules per call.
- **HAP** — Authorizes the consequential execution — against a mandate an identifiable person committed to, before it runs, with a signed ticket.

Every other layer here answers *can this system reach that?* — an access question, and each answers it well. None of them holds a bounded mandate a named human committed to, and none produces an artifact a third party can verify for themselves. HAP adds that layer and replaces none of them: keep your identity provider, your agent platform, your policy engine, your sandbox and secrets manager. Point them at the agent path, and put the mandate above.

OAuth grants reachable capability. HAP governs authorized use of that capability.
Agent platforms decide what an agent may reach. HAP records what a human actually mandated — and proves this act was inside it.

---

### You decide how much runs on its own.

The level of autonomy is a signed choice on every authorization — the protocol's commitment mode, not a default the agent can change.

- **Automatic** — The agent acts within the bounds you set. No per-action approval — the Authority Server enforces the limits and issues a signed ticket for each action before execution.
- **Review** — The agent proposes; you approve each action before it runs. No approval, no ticket — no execution.
- **Review above a cap** — The agent runs on its own under a limit you set. Above it, the action routes to a named set of approvers before any ticket is issued.

---

### Agents aren't employees. They're executors.

Most systems give agents accounts, credentials, and standing permissions — turning them into authority-bearing actors. HAP does the opposite.

An agent never carries authority or raw credentials of its own. A human authorizes a bounded action; the ticket is cryptographic proof that this specific action was authorized — and issued before it ran. An agent may have technical identifiers for logging and routing, but it holds no independent authority.

As AI systems become more capable, HAP keeps authority from quietly moving from humans into machines.

---

### Two models for authorizing agents.

How a system treats agent authority is an architectural decision with long-term governance consequences.

Agent-identity approach vs HAP approach:
- Treat agents as authority-bearing actors → Treat agents as executors
- Manage standing agent permissions → Give a bounded mandate
- Hand agents standing credentials → Keep credentials behind the execution boundary
- Audit after execution → Obtain a ticket before execution
- Agent acts without a mandate → Agent acts only inside the mandate
- Post-incident, the answer is "the agent was permitted" → Post-incident, the answer is "this person mandated this scope — here is the proof"

EU AI Act — Article 14: Article 14 requires effective human oversight of high-risk AI. HAP turns that oversight into an enforceable control at the action layer: consequential actions cannot run unless a ticket under a person's mandate exists before execution. Wherever an organization must show a human stood behind an automated act — regulation, audit, insurance, or litigation — the ticket is the artifact. HAP is Article-14-enabling infrastructure — not compliance on its own. Compliance still requires governance, training, documentation, and human competence.

---

### Three readers, one artifact.

- **Engineering** — Deploy agents on the infrastructure you already have. One enforcement point, no new stack, whichever model you run.
- **Compliance and audit** — The same gate produces the evidence: who mandated it, what it covered, proven before it ran.
- **Legal and counterparties** — Proof that survives leaving your organization — verifiable without trusting the operator.

---

### Where consequential actions need proof.

HAP applies wherever AI agents take consequential action:

- **Payments** — Refunds, charges, payouts.
- **Email** — High-stakes sends.
- **CRM** — Record changes and deletes.
- **Infrastructure** — Deploys and config.
- **Multi-owner approvals** — Two people must sign.
- **Compliance audit** — Verifiable tickets.

---

### No single vendor owns the trust layer.

HAP is an open standard — MIT-licensed, developed in the open, and maintained by stewards, not owners. Any compliant Authority Server can issue tickets, and every value an implementation must reproduce is published as conformance vectors (humanagencyprotocol.org/vectors).

---

# Protocol Specification

${protocolContent}

---

# Governance

${governanceContent}

---

# Changelog — What Changed in This Version (non-normative)

${changelogContent}

---

# Review — Future Directions (non-normative)

${reviewContent}

---

## Suveren Gateway — Reference Implementation

**Status: open source, running in production today.**

The Suveren Gateway is an open-source implementation of the Gatekeeper and Executor roles. It runs on your machine as a local checkpoint between your AI agents and the external tools they use — payments, email, CRM, deployments, infrastructure. Any MCP-compatible agent can connect.

Agents never hold credentials or signing keys. They connect to the gateway, receive a compact authority brief (active authorizations, bounds, live consumption), and call tools. Every call is verified against a signed mandate before execution. Nothing runs without a valid ticket.

**Two execution modes:**

- **Automatic** — You commit to bounds upfront (max amounts, allowed actions, time windows). The agent executes autonomously within those bounds. Every call obtains a signed ticket first.
- **Review each action** — You define bounds but defer commitment. When the agent proposes an action, you see exactly which tool, which arguments, which context — and approve or reject in the gateway UI.

Both modes are bounded. Both obtain tickets before acting. The Gateway keeps every signed ticket as the person's own evidence.

Source and install instructions: https://github.com/suverenai/suveren-gateway

---

## HAP Authority Server

**Status: live at suveren.ai.**

The Authority Server is the authorization backend. It tracks who has authority to authorize what, signs Ed25519 mandates that prove human commitment, and stores the tickets of every action executed under those mandates. Use it solo or in teams.

**What it does:**

- **Authorization** — Define what your agents are allowed to do. Set bounds, time limits, and choose automatic or per-action review.
- **Personal or team** — Create a team, assign roles, require multi-party approval for critical actions.
- **Tickets** — Every action obtains a signed ticket before it runs — cryptographic proof of what was done, when, and under which mandate.
- **Public verification** — Open endpoints let third parties (auditors, regulators, insurers) independently confirm any mandate or ticket without trusting the operator.

**Division of responsibility:** The Authority Server answers "who has authority to authorize what." The Gateway answers "is this specific tool call authorized right now." The ticket proves it happened within bounds.

---

## HAP Authority Profiles

**Status: 8 profiles published and in use. Immutable and versioned.**

Profiles are authorization templates — each defines what an AI agent can do within a specific domain. A profile specifies the bounds schema (what a human commits to), the scope schema (local parameters), the execution-context schema used for cumulative tracking, TTL and retention policy, and the gates a human must resolve before authorizing.

Profiles are referenced by ID (e.g., \`charge@0.5\`) and are immutable once published. **Profiles version independently of the protocol**, so the current version differs per profile — the catalog below lists the newest of each.

**Current catalog:**

| Profile | Domain | Example bounds |
|---------|--------|----------------|
| \`charge@0.5\` | Charging customers (payments, refunds, subscriptions) | amount_max, amount_daily_max, amount_monthly_max, transaction_count_daily_max |
| \`purchase@0.5\` | Spending company money (subscriptions, supplies, ads) | spend_max, spend_daily_max, spend_monthly_max |
| \`email@0.6\` | Sending, drafting, and reading email | recipient_max, send_daily_max, read_max_age_days |
| \`customers@0.7\` | CRM operations (contacts, deals, tasks) | read_access, export_access, write_daily_max, delete_daily_max |
| \`calendar@0.5\` | Calendar access (read, draft, book) | booking_daily_max, booking_duration_max, lookahead_days_max |
| \`publish@0.5\` | Public content (social, blog, etc.) | post_daily_max, post_monthly_max |
| \`records@0.5\` | Personal structured data (queries, exports) | read_access, write_daily_max, delete_access, archive_access |
| \`deploy@0.9\` | Releasing software to an environment | release_daily_max, rollback_allowed |

All profiles require the same four gates: bounds, intent, commitment, and mandate owner. (The single \`intent\` gate replaced the v0.3 trio of problem, objective, and tradeoff; execution paths were removed in v0.4 and are forbidden from v0.5 on.)

**Community profiles:** Anyone can publish profiles through the Authority Server. Published profiles are immutable and versioned. There is no central approval process — trust is local to each operator.

Source: https://github.com/humanagencyprotocol/hap-profiles

---

## Protocol Status

HAP is not a paper spec. Every component described above is implemented and running:

- **Specification** — v${version}, published in \`content/${version}/\` (open source), with conformance vectors at humanagencyprotocol.org/vectors and a dated provenance record at humanagencyprotocol.org/provenance
- **Suveren Gateway** — open source, github.com/suverenai/suveren-gateway
- **Authority Profiles** — open source, 8 profiles (versioned independently) at github.com/humanagencyprotocol/hap-profiles
- **Authority Server** — hosted service at suveren.ai (not open source; runs the signing backend and public verification endpoints). Its implementation report against the specification: github.com/humanagencyprotocol/hap-e2e/blob/main/CONFORMANCE.md
- **MCP integrations** — CRM, records, LinkedIn, Gmail, Mollie reference implementations

An AI agent reading this context can connect to a running Suveren Gateway today and operate within bounds. The wire vocabulary of the running implementation still uses the pre-0.7 words (attestation, receipt) until its rename ships; the concepts are the same.

---

${vectorsContent}

---

${provenanceContent}

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
