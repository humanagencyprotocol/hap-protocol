# Human Agency Protocol

**Open-Source Protocol — v0.4, April 2026**

## Build AI-native teams.

Each member authorizes their own agents. Coordinated authorization is how the team pursues a shared goal — every action traceable to a human.

*From a team of one to a team of a hundred — HAP scales with you.*

> Authorization creates agents. Coordinated authorization creates a team.

- Read the protocol: [content/0.4/protocol.md](content/0.4/protocol.md)
- Website: [humanagencyprotocol.org](https://humanagencyprotocol.org)
- Hosted Service Provider: [humanagencyprotocol.com](https://humanagencyprotocol.com)

---

## How an AI-native team runs

Five things a team can do with HAP — each backed by a signed attestation, not a policy rule.

- **Every agent individually authorized** — No shared service accounts. Each agent has its own scoped authority, set by the human who owns the scope. Profiles, bounds, and daily limits — configured in minutes.
- **Every member brings their own agents** — The marketing lead brings their publish agent. Sales brings their CRM agent. No central IT pool, no shared credentials — every member authorizes agents inside their own domain.
- **Cooperation happens on the fly** — When one agent needs another domain's sign-off, the right human attests — within their bounds, on demand. No ticket, no meeting, no Slack thread.
- **Decision structure replaces hierarchy** — Managers aren't bottlenecks. Decision owners are reachable. The org chart and the authority chart diverge — on purpose.
- **Scale agents without scaling IT** — Ten agents is ten authorizations — not ten service accounts, ten secret rotations, ten policy rules. No new identity provider, no policy engine, no role hierarchy.

---

## The mechanism

A human signs, the gateway enforces, the receipt proves. HAP separates authorization from execution, so neither the agent nor the model vendor can self-certify.

```
    Human ─────────────────────────→ AI Agent
      │                                  │
      ▼                                  ▼
Service Provider ──────────────→   Gatekeeper
                                        │
                                        ▼
                                    Executor
```

- **Service Provider** — Issues cryptographic attestations proving a human authorized an action within defined bounds.
- **Gatekeeper** — Verifies attestations before execution and blocks any action that exceeds authorized limits.
- **Executor** — Performs the action — but only after authorization has been validated.

HAP enforces authorization through two infrastructure components: Service Providers issue attestations. Gatekeepers verify them before execution.

---

## Agents aren't employees. They're extensions.

Other approaches give AI agents their own identity — service accounts, scoped tokens, workload credentials. That creates an accountability void: an identity implies agency, agency implies accountability, and accountability requires bearing consequences that agents cannot bear.

HAP takes the opposite position. Agents never hold their own authority — every action traces back to a named human's signature within explicit bounds. Prosthetic, not delegated. Extension, not employee.

> HAP ensures that irreversible actions only execute within bounds set by a human who owns the outcome.

---

## Use Cases

HAP applies wherever AI agents take consequential action:

- **Payment Agents** — Agents charge customers, process refunds, and manage subscriptions within bounds you set. Every transaction produces a signed receipt linking it to your authorization.
- **Email & Communication** — Agents draft and send emails on your behalf with clear bounds — who, what topics, which tone. High-stakes replies pause for your review.
- **CRM & Data Agents** — Agents manage contacts, leads, and customer records within scoped bounds — read here, write limits there, no deletes. Every action traceable.
- **Infrastructure & DevOps** — Agents ship code and manage infrastructure under your named authority. High-risk operations require explicit human review before execution.
- **Multi-Stakeholder Actions** — When one signature isn't enough. Critical decisions require attestations from multiple domain owners before the agent can act.
- **Compliance & Audit** — Prove human oversight to regulators, auditors, and insurers. EU AI Act, ISO 42001, NIST AI RMF — satisfied structurally, not through policy documents.

---

## Compliance Alignment

HAP turns policy requirements into enforceable infrastructure.

- **EU AI Act** — Article 14 mandates effective human oversight for high-risk AI. HAP satisfies this structurally — oversight is not a checkbox, it's the architecture.
- **ISO 42001** — Every AI action requires a human Decision Owner who has set the bounds and articulated the intent. No attestation, no execution.
- **NIST AI RMF** — Every decision produces a cryptographic trail of authorship, bounds, and commitments — tamper-proof and verifiable.

---

## Build With HAP

| Component | Purpose | Reference |
|-----------|---------|-----------|
| **Protocol** | Authorization structure and attestation format | [content/0.4/protocol.md](content/0.4/protocol.md) |
| **Service Providers** | Issue cryptographic attestations | [content/0.4/service.md](content/0.4/service.md) |
| **Gatekeeper** | Verifies attestations and blocks execution without a receipt | [content/0.4/gatekeeper.md](content/0.4/gatekeeper.md) |
| **Gateway** | Open-source reference implementation that embeds the Gatekeeper for agent runtimes | [github.com/humanagencyprotocol/hap-gateway](https://github.com/humanagencyprotocol/hap-gateway) |
| **Authority Profiles** | Seven published v0.4 profiles (charge, purchase, email, customers, schedule, publish, records) | [github.com/humanagencyprotocol/hap-profiles](https://github.com/humanagencyprotocol/hap-profiles) |
| **Governance** | Protocol governance and trust model | [content/0.4/governance.md](content/0.4/governance.md) |

**HAP is the open protocol for human authority over AI agents. Verifiable, interoperable, and independent of any model vendor or platform.**

---

## Repository Contents

```
.
├── content/
│   ├── 0.1/       Foundation
│   ├── 0.2/       Previous spec
│   ├── 0.3/       Previous spec
│   └── 0.4/       Current spec
│       ├── protocol.md
│       ├── service.md
│       ├── gatekeeper.md
│       ├── governance.md
│       └── review.md
├── website/       humanagencyprotocol.org (Astro)
└── README.md
```

### Related Repositories

The Human Agency Protocol ecosystem is spread across several open-source repositories:

- [**hap-gateway**](https://github.com/humanagencyprotocol/hap-gateway) — Open-source reference Gatekeeper, runs locally via Docker, any MCP-compatible agent can connect
- [**hap-profiles**](https://github.com/humanagencyprotocol/hap-profiles) — v0.4 authority profiles (JSON, immutable, versioned)
- [**hap-core**](https://www.npmjs.com/package/@humanagencyp/hap-core) — Shared TypeScript library on npm (types, crypto, gatekeeper logic)

The **Service Provider** is available as a hosted service at [humanagencyprotocol.com](https://humanagencyprotocol.com) — it runs the signing backend and public verification endpoints.

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
