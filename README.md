# Human Agency Protocol

**Open-Source Protocol — v0.4, April 2026**

## Authorization Layer for AI Agents

An open protocol that keeps people in control of AI agents. A person sets what an agent is allowed to do. The agent can't do anything else. Every action leaves a receipt.

- Read the protocol: [content/0.4/protocol.md](content/0.4/protocol.md)
- Website: [humanagencyprotocol.org](https://humanagencyprotocol.org)
- Hosted Service Provider: [humanagencyprotocol.com](https://humanagencyprotocol.com)

---

## How It Works in Practice

What HAP makes possible — in practice.

- **One agent, one set of rules** — Each agent has its own set of rules about what it can do. A person decides what's allowed — how much it can spend, who it can email, what data it can change — and the agent can't do anything outside of that.
- **Each person controls their own area** — Each person on a team has their own area — sales, marketing, finance. They decide which AI agents work in that area and what those agents can do. No central IT team in between.
- **Actions that need approval from more than one person** — If an agent's action touches more than one area — say, a marketing agent that needs to spend part of the finance budget — each person responsible has to approve before the agent can proceed.
- **Authority follows decisions, not job titles** — Whoever is responsible for a decision approves it, no matter where they sit on the org chart. Managers don't have to sign off on everything — the person who actually owns the decision does.
- **Adding agents doesn't mean adding IT** — Agents don't get accounts, passwords, or API keys of their own. Each one works under a person's approval. Adding more agents just means more approvals — not more systems to manage.

---

## How HAP Works

A person approves what an agent is allowed to do. The system enforces it — blocking anything outside the approval. Every action produces a receipt anyone can check.

```
    Human ─────────────────────────→ AI Agent
      │                                  │
      ▼                                  ▼
Service Provider ──────────────→   Gatekeeper
                                        │
                                        ▼
                                    Executor
```

- **Service Provider** — Where a person records their approval, along with the exact limits.
- **Gatekeeper** — Checks the approval before any action runs. Blocks anything outside the approved limits.
- **Executor** — Runs the action — but only if the Gatekeeper allows it.

HAP uses two pieces of infrastructure: Service Providers record approvals. Gatekeepers check them before anything runs.

---

## Agents Aren't Employees. They're Extensions.

Other approaches give AI agents their own accounts and passwords, like employees with their own identity. But if an agent does something wrong, who's responsible? The agent can't be held to account — it's software. There's no way for it to feel a consequence.

HAP works differently. An agent never acts on its own authority. Every action traces back to the person who approved it, with the exact limits they set. The agent is an extension of the person — not a separate employee.

> Anything that can't be undone only runs if a person approved it — and stays inside the limits that person set.

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

HAP turns compliance requirements into something the system actually enforces — not just something written in a policy document.

- **EU AI Act** — Article 14 of the EU AI Act requires real human oversight of high-risk AI. HAP provides this by design — oversight isn't a checkbox in a policy, it's built into how the system runs.
- **ISO 42001** — Every AI action needs a person who owns the decision and has set the limits — and has said why. No approval, no action.
- **NIST AI RMF** — Every action leaves a tamper-proof record — who approved it, what limits were set, what happened. Anyone can verify it.

---

## Build With HAP

| Component | Purpose | Reference |
|-----------|---------|-----------|
| **Protocol** | The specification — how approvals are structured and signed | [content/0.4/protocol.md](content/0.4/protocol.md) |
| **Service Providers** | Where people record their approvals | [content/0.4/service.md](content/0.4/service.md) |
| **Gatekeeper** | The check that makes sure nothing runs without an approval | [content/0.4/gatekeeper.md](content/0.4/gatekeeper.md) |
| **Gateway** | An open-source program that runs the check alongside your AI tools | [github.com/humanagencyprotocol/hap-gateway](https://github.com/humanagencyprotocol/hap-gateway) |
| **Authority Profiles** | Seven published v0.4 profiles (charge, purchase, email, customers, schedule, publish, records) | [github.com/humanagencyprotocol/hap-profiles](https://github.com/humanagencyprotocol/hap-profiles) |
| **Governance** | How the protocol is governed and who runs it | [content/0.4/governance.md](content/0.4/governance.md) |

**HAP is an open protocol for keeping people in charge of AI agents. Verifiable. Works across platforms. Not tied to any AI vendor.**

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
