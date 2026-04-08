# Human Agency Protocol

**Current: v0.3 — March 2026**

> AI executes. Humans decide.

An authorization protocol for AI agents — cryptographic pre-authorization of bounded execution.

## What is HAP?

The Human Agency Protocol defines how humans cryptographically authorize consequential actions and how implementations preserve human-defined direction during execution — whether by AI agents, CI/CD pipelines, or automated systems.

HAP distinguishes between:

- **Authorization State** — what is permitted, by whom, and under what bounded frame (enforceable)
- **Direction State** — the semantic intent that informs agent planning within those bounds (local, private)

HAP doesn't evaluate the quality of human decisions. It guarantees that decisions were made by humans, under committed constraints, and creates a verifiable record of who decided what.

## Core Principles

### Human-First Direction
AI may surface information, but humans supply intent. Every commitment — the bounds of what an agent may do and the intent behind the authorization — must originate from human action.

### Verifiable Accountability
Attestations bind human identity to specific decisions. Gate content is hashed at signing time, making published decisions tamper-evident and auditable.

### Privacy by Design
Semantic content stays local. Only structural signals and hashes leave the local environment. The protocol guarantees verifiability without requiring disclosure.

### Bounded Execution
Authorization frames define the boundaries within which agents may act. The Gatekeeper enforces that every execution request falls within those bounds.

## Documentation

### Specification (v0.3)
- **[Protocol](content/0.3/protocol.md)** — Core specification: frames, gates, attestations, profiles, bounded execution
- **[Service Providers](content/0.3/service.md)** — Attestation issuance and identity verification
- **[Gatekeeper](content/0.3/gatekeeper.md)** — Attestation verification, connector model, bounded execution
- **[Governance](content/0.3/governance.md)** — Protocol governance, invariants, and trust model

### Previous Versions
- **[v0.2](content/0.2/)** — Profiles, deploy gate, integration guide
- **[v0.1](content/0.1/)** — Foundational concepts and motivation

## Implementation

HAP is implemented as two open-source components:

- **Service Provider** — Issues cryptographic attestations after a human has set the bounds and articulated the intent for an authorization.
- **Agent Gateway** — Runs locally. Verifies attestations at runtime and enforces bounded execution when AI agents call tools via MCP.

Both are available at [github.com/humanagencyprotocol](https://github.com/humanagencyprotocol).

## Website

Visit [humanagencyprotocol.org](https://humanagencyprotocol.org) for the complete specification.

To run locally:

```bash
cd website
npm install
npm run dev
```

## Why HAP Exists

AI systems increasingly execute tasks, call tools, and trigger irreversible actions. The central risk is not only misalignment, but execution without valid human authorization and direction drift inside authorized bounds.

HAP solves this by enforcing one rule:

> Irreversible real-world actions execute only within limits defined by a Decision Owner.

This isn't about slowing down AI. It's about ensuring that when AI acts, it acts within human-defined bounds — and that authorization is provable.

## Repository Structure

```
.
├── content/
│   ├── 0.1/               # Foundation specification
│   ├── 0.2/               # Previous specification
│   └── 0.3/               # Current specification
│       ├── protocol.md
│       ├── service.md
│       ├── gatekeeper.md
│       └── governance.md
├── website/               # humanagencyprotocol.org
└── README.md
```

## Contributing

HAP is open infrastructure. Contributions welcome from:

- Developers integrating HAP into AI systems
- Researchers studying human-AI decision making
- Policy makers working on AI governance
- Organizations needing accountable AI workflows

## License

MIT

---

*The Human Agency Protocol is maintained by stewards, not owners.*
