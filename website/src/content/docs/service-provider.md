---
title: "HAP Service Provider"
version: "Version 0.3"
date: "March 2026"
---

The cloud authority infrastructure for the [Human Agency Protocol](https://humanagencyprotocol.org). It manages accounts, teams, domains, profiles, and attestation signing — everything organizations need to establish and verify human authority over AI agent actions.

The [HAP Agent Gateway](https://github.com/humanagencyprotocol/hap-gateway) connects to this service for cryptographic attestation signing and domain verification. The SP holds the Ed25519 signing key; the gateway holds no signing authority.

> **Alpha** — Under active development.

---

## What It Provides

**Accounts** — Register with name and email. Receive a single API key (shown once, never retrievable). No passwords. Session cookies for browser access.

**Teams** — Create teams, invite members via shareable codes, assign domain authority per member. A user's authority is always contextual to their team — the same person can have different domains in different teams.

**Domains** — Freeform authority labels (e.g., `finance`, `compliance`, `security`) assigned by team admins. Profiles define which domains are required; teams define who fills them.

**Profiles** — Browsable catalog of authorization templates. Protocol profiles are pre-loaded and immutable. Community profiles can be created by any user and are immutable once published.

**Attestation Signing** — Two modes:
- **Team-managed** — SP verifies the caller has the required domain in the specified team before signing
- **External** — SP authenticates the caller but delegates domain verification to an external system (e.g., GitHub repo ownership)

**Verification** — Public endpoints to retrieve the SP's public key and verify any attestation blob.

---

## API Surface

### Auth
- `POST /api/auth/register` — Create account, receive API key
- `POST /api/auth/session` — Exchange API key for session cookie
- `POST /api/auth/renew-key` — Rotate API key

### Attestations
- `POST /api/sp/attest` — Sign attestation (team-managed or external mode)
- `GET /api/sp/pubkey` — SP Ed25519 public key
- `POST /api/sp/verify` — Verify attestation blob
- `GET /api/attestations/mine` — User's own attestations (active/pending/expired)

### Teams
- `POST /api/groups` — Create team
- `POST /api/groups/join` — Join via invite code
- `PUT /api/groups/{id}/members/{userId}` — Assign domains (admin)
- `POST /api/groups/{id}/invite` — Regenerate invite code

### Profiles
- `GET /api/profiles` — Browse/search all profiles
- `POST /api/profiles` — Publish a community profile
- `GET /api/profiles/{id}` — Profile detail

---

## Relationship to the Gateway

```
HAP Service Provider (cloud)          HAP Agent Gateway (local)
┌───────────────────────┐             ┌───────────────────────┐
│  Accounts & teams     │             │  Vault (credentials)  │
│  Domain authority     │◄───────────►│  Gate content (local) │
│  Profile catalog      │  API calls  │  Gatekeeper           │
│  Ed25519 signing      │             │  MCP tool proxy       │
│  Attestation storage  │             │  Agent connection      │
└───────────────────────┘             └───────────────────────┘
```

The SP answers "who has authority to authorize what." The gateway answers "is this specific tool call authorized right now."
