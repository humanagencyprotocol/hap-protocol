# Human Agency Protocol

**Open-Source Protocol — v0.5, June 2026**

## Human authorization for consequential AI actions

AI agents carry no authority of their own. Before an agent moves money, changes records, sends communication, grants access, or touches infrastructure, the action must receive a signed pre-execution receipt linked to human authorization.

- Read the protocol: [content/0.5/protocol.md](content/0.5/protocol.md)
- Governance: [content/0.5/governance.md](content/0.5/governance.md)
- Website: [humanagencyprotocol.org](https://humanagencyprotocol.org)

---

## No receipt. No execution.

The receipt is not a post-execution log. It is the precondition for execution — and the audit artifact proving the action was authorized before it ran.

1. A human authorizes **bounded execution** — scope, limits, time, and commitment mode.
2. The **Gatekeeper** verifies the attestation, checks per-action bounds, and enforces local context constraints.
3. The **Authority Server** checks cumulative limits, expiry, and revocation, then **signs the receipt**.
4. The **Executor** runs the action — only **after** the receipt exists.

---

## How HAP Works

```
    Human ─────────────────────────→ AI Agent
      │                                  │
      ▼                                  ▼
Authority Server ──────────────→   Gatekeeper
                                        │
                                        ▼
                                    Executor
```

- **Authority Server** — Verifies bounds, cumulative limits, expiry, and revocation, and issues the signed receipt.
- **Gatekeeper** — Verifies the attestation and per-action bounds/context locally, then obtains the receipt before anything runs. Fail-closed: no receipt, no execution.
- **Executor** — Runs the action — only after a valid receipt exists.

---

## Where HAP Fits

HAP composes with existing systems — it replaces none of them. It is **not** an authentication protocol, an API-access protocol, a tool-transport protocol, or a task-orchestration protocol. It is the authorization, enforcement, and receipt layer for consequential execution.

- **OAuth / OpenID Connect** grant API access.
- **MCP** exposes tools to agents.
- **Identity** systems (EUDI, passkeys, WebAuthn) prove who you are.
- **HAP** authorizes the consequential action — before it runs, with a signed receipt.

**OAuth grants reachable capability. HAP governs authorized use of that capability.**

---

## Commitment Modes

You decide how much runs on its own — a signed choice on every authorization, not a default the agent can change.

- **Automatic** — The agent acts within the bounds you set. No per-action approval; the Authority Server enforces the limits and issues a signed receipt for each action before execution.
- **Review** — The agent proposes; you approve each action before it runs. No approval, no receipt — no execution.
- **Review above a cap** — The agent runs on its own under a limit you set. Above it, the action routes to a named set of approvers before any receipt is issued.

---

## Agents Aren't Employees. They're Executors.

Most systems give agents their own accounts, credentials, and standing permissions — one more identity to manage. HAP does the opposite. An agent never carries authority of its own. The receipt is cryptographic proof that a specific action was authorized — before it ran — linked to the human who authorized it. An agent may have technical identifiers for logging and routing, but it holds no independent authority.

> As AI systems become more capable, HAP keeps authority from quietly moving from humans into machines.

---

## Use Cases

HAP applies wherever AI agents take consequential action:

- **Payments** — Refunds, charges, and payouts within bounds you set. Every transaction carries a signed receipt — issued by the Authority Server before it runs — linking it to your authorization.
- **Email & Communication** — Agents draft and send within clear bounds; high-stakes sends pause for your review.
- **CRM & Data** — Record changes and deletes within scoped bounds — read here, write limits there. Every action traceable.
- **Infrastructure & DevOps** — Deploys and config changes under your named authority; high-risk operations require explicit review before execution.
- **Multi-owner approvals** — When one signature isn't enough, critical actions require attestations from a named set of approvers before the agent can act.
- **Compliance audit** — Verifiable receipts prove human oversight to regulators, auditors, and insurers.

---

## Compliance

HAP turns human oversight into something the system enforces — not just a policy document.

- **EU AI Act — Article 14** — Article 14 requires effective human oversight of high-risk AI. HAP provides an enforceable oversight control **at the action layer**: consequential actions cannot run unless a human-linked authorization receipt exists before execution. HAP is Article-14-**enabling** infrastructure — not compliance on its own. Compliance still requires governance, training, documentation, and human competence.

HAP also maps onto the human-oversight and record-keeping themes in ISO/IEC 42001 and the NIST AI RMF, but it is enabling infrastructure for those frameworks — not a substitute for an organization's own management system.

---

## Build With HAP

| Component | Purpose | Reference |
|-----------|---------|-----------|
| **Protocol** | The specification — concepts, wire format, and role behavior | [content/0.5/protocol.md](content/0.5/protocol.md) |
| **Authority Server** | Issues signed receipts; enforces bounds, cumulative limits, expiry, revocation | [content/0.5/protocol.md#authority-server-behavior](content/0.5/protocol.md#authority-server-behavior) |
| **Gatekeeper** | Verifies and obtains the receipt before anything runs | [content/0.5/protocol.md#gatekeeper--executor-behavior](content/0.5/protocol.md#gatekeeper--executor-behavior) |
| **Gateway** | Suveren's open-source Gatekeeper + Executor — runs alongside your AI tools | [github.com/suverenai/suveren-gateway](https://github.com/suverenai/suveren-gateway) |
| **Authority Profiles** | Seven published v0.4 profiles (charge, purchase, email, customers, schedule, publish, records) | [github.com/humanagencyprotocol/hap-profiles](https://github.com/humanagencyprotocol/hap-profiles) |
| **Governance** | How the protocol is governed and who runs it | [content/0.5/governance.md](content/0.5/governance.md) |

**HAP is an open protocol for keeping people in charge of AI agents. Verifiable. Works across platforms. Not tied to any AI vendor.**

---

## Repository Contents

```
.
├── content/
│   ├── 0.1/ – 0.3/   Previous specs
│   ├── 0.4/          Prior spec (Service Provider / Gatekeeper / Governance / Review)
│   └── 0.5/          Current spec
│       ├── protocol.md     (concepts + wire format + Authority Server + Gatekeeper behavior)
│       └── governance.md
├── website/          humanagencyprotocol.org (Astro)
└── README.md
```

> v0.5 folds the former `service.md` (Authority Server), `gatekeeper.md`, and `review.md` into a single `protocol.md`, and retires the older "Service Provider" term in favor of **Authority Server**.

### Related Repositories

The Human Agency Protocol ecosystem spans the open protocol repos plus Suveren's reference implementation:

**Protocol (open source):**
- [**hap-profiles**](https://github.com/humanagencyprotocol/hap-profiles) — v0.4 authority profiles (JSON, immutable, versioned)
- [**hap-core**](https://www.npmjs.com/package/@humanagencyp/hap-core) — Shared TypeScript library on npm (types, crypto, gatekeeper logic)
- **hap-e2e** — protocol conformance test suite

**Suveren — reference implementation:**
- [**suveren-gateway**](https://github.com/suverenai/suveren-gateway) — the Gatekeeper + Executor: runs locally, any MCP-compatible agent can connect (open source)

---

## Running the Website Locally

```bash
cd website
npm install
npm run dev
```

The sync script reads the spec version from `website/package.json` and copies `content/<version>/` into the Astro content collection on every build.

---

## License

MIT — open infrastructure. The Human Agency Protocol is maintained by stewards, not owners.
