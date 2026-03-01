---
title: "Deploy Gate Demo"
version: "Version 0.2"
date: "January 2026"
---

A merge-blocking deployment gate built on **[Human Agency Protocol v0.3](https://humanagencyprotocol.org/review)**.

Before code ships, each required domain owner reviews the same deterministic execution context and takes explicit responsibility for what the change does, why, and at what cost. No rubber stamps — cryptographic proof that the right people bound themselves to the deployment.

**Live demo:** [demo.humanagencyprotocol.org](https://demo.humanagencyprotocol.org/)

**GitHub:** [github.com/humanagencyprotocol/hap-deploy-gate-demo](https://github.com/humanagencyprotocol/hap-deploy-gate-demo)

---

## Protocol Foundation

This demo implements the HAP v0.3 execution context model. Understanding five concepts is enough to follow the code.

### Gates

Human checkpoints requiring explicit decisions. Gates 3–5 are *articulation gates* — the reviewer must state what the change does, why, and what it costs. The protocol enforces presence (field non-empty), not adequacy or authorship. Whether the reviewer wrote the content or confirmed AI-assisted output, they take responsibility by signing.

### Frames

A frame uniquely identifies an action and its execution context. It is derived from five fields in canonical order:

```
repo=owner/repo
sha=abc123...
env=prod
profile=deploy-gate@0.3
path=deploy-prod-canary
```

The frame hash is `sha256:` + SHA-256 of this canonical string. Two reviewers looking at the same PR under the same profile and path always see the same frame.

### Attestations

Cryptographically signed proofs that a human passed all gates and committed to a specific frame. An attestation contains:

- `frame_hash` — binds to exactly one action + context
- `execution_context_hash` — binds to the resolved execution context
- `gate_content_hashes` — SHA-256 of what the reviewer wrote in each gate
- `resolved_domains` — which domain the reviewer attested for
- `expires_at` — TTL (1 hour in this demo)

Attestations are self-contained. Anyone with the SP's public key can verify one independently.

### Domains

Areas of authority requiring separate attestation. Each execution path declares which domains must attest before execution is authorized:

| Execution Path | Required Domains |
|---|---|
| `deploy-prod-canary` | engineering |
| `deploy-prod-full` | engineering, release_management |

A single person cannot attest for multiple domains in the same frame.

### Profiles

Profiles define everything about a specific use case: which gates exist, what execution context fields are required, what questions each gate asks, and which domains each path requires. This demo uses the `deploy-gate@0.3` profile.

---

## Architecture

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Local App      │     │  Service Provider  │     │   Gatekeeper     │
│   (UI)           │────→│  (SP)              │     │                  │
│                  │     │                    │     │  Validates:      │
│  • 6-gate wizard │     │  • Verifies        │     │  • Signature     │
│  • AI reading aid│     │    identity        │     │  • Frame hash    │
│  • Client-side   │     │  • Checks domain   │     │  • TTL           │
│    key generation│     │    authorization   │     │  • Domain        │
│                  │     │  • Signs           │     │    coverage      │
│                  │     │    attestation     │     │                  │
└──────────────────┘     └────────┬──────────┘     └────────┬─────────┘
                                  │                         │
                                  ▼                         │
                         ┌───────────────────┐              │
                         │ Attestation Store  │◄─────────────┘
                         │                    │
                         │ • Stores blobs     │
                         │ • Tracks PR state  │
                         │ • Updates GitHub   │
                         │   check status     │
                         └────────────────────┘
```

**Local App (UI)** — The reviewer's browser. Runs the 6-gate wizard, generates ECDSA keys client-side, and never sends gate content to the server. Only hashes leave the browser.

**Service Provider (SP)** — Verifies the reviewer's identity and domain authorization, then co-signs the attestation with its Ed25519 key. The SP sees gate content hashes, not gate content.

**Attestation Store** — Persists attestation blobs keyed by `{frameHash}:{domain}`. In production uses Vercel KV (Upstash Redis); locally uses an in-memory store.

**Gatekeeper** — The enforcement point. Reconstructs the frame from action parameters, fetches the profile, looks up required domains, and validates each attestation (signature, frame hash, TTL, domain scope). Authorizes execution only when all required domains have valid attestations. Stateless — validates locally.

---

## The 6-Gate Model

The reviewer progresses through six gates in order. Each gate must be explicitly closed before the next opens.

```
┌─ 1 ─┐   ┌─ 2 ─┐   ┌─ 3 ─┐   ┌─ 4 ─┐   ┌─ 5 ─┐   ┌─ 6 ─┐
│Decis-│──→│Frame │──→│Prob- │──→│Objec-│──→│Trade-│──→│Commi-│
│ion   │   │      │   │lem   │   │tive  │   │offs  │   │tment │
│Owner │   │      │   │      │   │      │   │      │   │      │
└──────┘   └──────┘   └──────┘   └──────┘   └──────┘   └──────┘
 select     review     write      write      write      sign
 domain     context    problem    objective  tradeoffs  attestation
```

### Gate 1 — Decision Owner

Select your domain (engineering, release management, etc.). This determines which execution path applies to you and scopes all subsequent gates. Domain selection precedes context review — you must know *who you are* before reviewing *what you're approving*.

### Gate 2 — Frame

Review the execution context. Everything shown here is deterministic — two reviewers always see the same data for the same PR:

| Source | Fields | Origin |
|---|---|---|
| **Declared** | `profile`, `execution_path` | `.hap/binding.json` in the repo |
| **From action** | `repo`, `sha`, `base_sha` | GitHub PR metadata |
| **Computed** | `changed_paths`, `diff_url` | Derived from PR files |

The frame also shows changed files with inline diffs, the selected execution path, and any existing attestations from other domains.

### Gate 3 — Problem

*"What problem does this change solve for your domain?"*

The reviewer states what problem this change solves for their domain. This is not a description of the code — it is a statement of responsibility from the reviewer's area of authority.

### Gate 4 — Objective

*"What outcome are you approving for your domain?"*

The reviewer states what they believe the change will achieve. This creates an auditable record of what was intended, separate from what was implemented.

### Gate 5 — Tradeoffs

*"What risks are you accepting as [domain] under [path]?"*

The reviewer acknowledges specific tradeoffs they are accepting. The execution path matters — a canary deployment has different risk characteristics than a full rollout.

### Gate 6 — Commitment

Review a summary of everything declared in gates 1–5, then sign. Signing generates an ECDSA key pair in the browser, hashes the gate content, and sends the hashes (not the content) to the Service Provider for co-signing. The resulting attestation blob is published to the Attestation Store.

---

## Execution Context

The execution context is the set of facts that bind an attestation to a specific action. HAP v0.3 classifies every field by its source.

### Field Sources

```
.hap/binding.json (committed to repo)    GitHub PR metadata
┌───────────────────────┐                  ┌───────────────────────┐
│ profile: deploy-gate@0.3  │  declared    │ repo: owner/repo      │  action
│ execution_path: canary    │──────────┐   │ sha: 71b6e7e...       │──────────┐
└───────────────────────┘              │   │ base_sha: a3f2c1...   │          │
                                       │   └───────────────────────┘          │
                                       ▼                                      ▼
                              ┌─────────────────────────────────────────────────┐
                              │            Resolved Execution Context           │
                              │                                                 │
                              │  declared:  profile, execution_path             │
                              │  action:    repo, sha, base_sha                 │
                              │  computed:  changed_paths, diff_url             │
                              └─────────────────────────────────────────────────┘
                                                       │
                                                       ▼
                                              execution_context_hash
                                              (SHA-256 of canonical form)
```

### binding.json

The only human-authored governance file. Contains exactly two fields:

```json
{
  "profile": "deploy-gate@0.3",
  "execution_path": "deploy-prod-canary"
}
```

This file is committed to the repository at `.hap/binding.json`. The profile determines what gates exist and what domains are required. The execution path selects which deployment strategy applies.

### Determinism Guarantee

All execution context fields are deterministic, verifiable, and persistent. Two reviewers loading the same PR always see identical data. The system resolves `action` and `computed` fields automatically — the reviewer cannot modify them.

---

## Verification

### What Gets Verified

The Gatekeeper performs five checks before authorizing execution:

1. **Signature** — Ed25519 signature from the SP is valid
2. **Frame hash** — Attestation's frame hash matches the reconstructed frame
3. **Execution context hash** — Matches the current resolved context
4. **TTL** — Attestation has not expired (1-hour window)
5. **Domain coverage** — All domains required by the execution path have valid attestations

### GitHub Integration

The GitHub App automates verification:

- On PR open/update → creates a pending check ("Verify HAP Attestation")
- On attestation publish → evaluates domain coverage
- When all required domains attested → check passes → merge unblocked
- On new commits → existing attestations invalidated (SHA changed)

---

## AI Assistant

The demo includes an optional AI assistant operating within the constraints defined in [HAP v0.3 §17.1](https://humanagencyprotocol.org/review#17-ai-assisted-content). The AI is a **reading aid** — it helps reviewers understand changes, it never writes attestation content.

### Three Enforceable Constraints (§17.1)

1. **Protocol does not supply content.** The UI never auto-generates or prefills gate fields. What the reviewer writes (including AI-assisted thinking) is their responsibility.
2. **Commitment requires explicit action.** The reviewer must explicitly close each gate and trigger attestation signing. No automation.
3. **Gate resolution = presence only.** A gate closes when its field is non-empty. The protocol does not evaluate origin, adequacy, or correctness.

### Reading Aid

Each articulation gate (3–5) offers a "Summarize for my domain" button. The AI describes the code changes from the reviewer's domain perspective — what the code does, not what the reviewer should write. Follow-up questions are supported as a conversation.

### Alignment Check

After writing gate content, the reviewer can optionally check alignment. The AI compares what the reviewer wrote against the actual PR changes and flags:

- Gibberish or placeholder text
- Generic filler unrelated to the changes
- Statements about topics not present in the diff

If aligned, a confirmation is shown. If not, the reviewer can acknowledge and proceed, or revise their text. The alignment check is advisory — it cannot block gate closure.

### AI Options

| Option | Privacy | Use Case |
|---|---|---|
| **Local AI** (Ollama) | Data stays on machine | Recommended for sensitive repos |
| **Public AI** (OpenAI, etc.) | PR content sent to provider | Demo and non-sensitive repos only |
| **No AI** | No AI features | Manual review |

### Advisory Boundary

All AI output remains local and is never included in the signed attestation. The attestation records **what was committed** — not the AI's analysis or the reviewer's reasoning process.

---

## Project Structure

```
demo/
├── apps/
│   ├── ui/                  # Attestation UI (Next.js, port 3000)
│   │   ├── src/app/
│   │   │   ├── page.tsx     # 6-gate wizard
│   │   │   └── style-guide/ # Design system kitchen sink
│   │   └── src/local-ai/    # AI client (Ollama, OpenAI)
│   └── server/              # Service Provider + Store (Next.js, port 3001)
│       └── src/
│           ├── app/api/
│           │   ├── sp/      # SP endpoints (attest, verify, pubkey)
│           │   ├── gatekeeper/ # Gatekeeper
│           │   └── github/  # Webhook handler
│           └── lib/         # Attestation store, key management
├── packages/
│   └── hap-core/            # Shared protocol logic
│       └── src/
│           ├── frame.ts            # Frame canonicalization + hashing
│           ├── execution-context.ts # Execution context canonicalization
│           ├── attestation.ts       # Attestation parsing + formatting
│           ├── profiles/            # Profile definitions
│           └── types.ts             # Protocol types
└── .github/
    └── workflows/
        └── hap-check.yml   # GitHub Actions attestation verification
```

---

## Quick Start

### Option A: Use the Public Server (Recommended)

A public Service Provider is available at **https://service.humanagencyprotocol.org** — no server setup required.

```bash
pnpm install
pnpm --filter @hap-demo/core build
pnpm dev:ui
```

Create `apps/ui/.env.local`:
```
GITHUB_TOKEN=<your personal access token with repo scope>
NEXT_PUBLIC_SP_URL=https://service.humanagencyprotocol.org
```

### Option B: Run Your Own Server

```bash
pnpm install
pnpm --filter @hap-demo/core build
pnpm dev:server   # Port 3001
pnpm dev:ui        # Port 3000 (separate terminal)
```

Create `apps/ui/.env.local`:
```
GITHUB_TOKEN=<your personal access token with repo scope>
NEXT_PUBLIC_SP_URL=http://localhost:3001
```

---

## GitHub Setup

### Option 1: GitHub App (Recommended)

The GitHub App provides automatic PR check updates when attestations are published.

#### Step 1: Register a GitHub App

1. Go to https://github.com/settings/apps/new
2. Configure:
   - **Name:** `HAP Deploy Gate` (or your preferred name)
   - **Homepage URL:** `https://humanagencyprotocol.org`
   - **Webhook URL:** `https://YOUR_SERVER_DOMAIN/api/github/webhook`
   - **Webhook secret:** Generate with `openssl rand -hex 32`

3. Repository permissions:

   | Permission | Access |
   |---|---|
   | Checks | Read & write |
   | Contents | Read-only |
   | Pull requests | Read-only |
   | Metadata | Read-only |

4. Subscribe to events: Pull request

#### Step 2: Generate Private Key

1. After creation, go to "Private keys" and generate one
2. Convert for env var:
   ```bash
   cat your-app.private-key.pem | awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}'
   ```

#### Step 3: Install and Configure

1. Install the app on your target repository
2. Create `apps/server/.env.local`:
   ```bash
   GITHUB_APP_ID=123456
   GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
   GITHUB_APP_WEBHOOK_SECRET=your_webhook_secret
   ```

### Option 2: GitHub Action Only

If you don't want the GitHub App, attestations can be copy-pasted as PR comments and verified by the GitHub Action workflow.

### Branch Protection (Required for Merge Gate)

To block merges without valid attestations:

1. **Settings → Rules → Rulesets → New branch ruleset**
2. **Name:** `HAP Protection`, **Enforcement:** Active
3. **Target branches:** Include pattern `main`
4. **Branch rules:**
   - Require status checks to pass → Add `Verify HAP Attestation`
   - Require a pull request before merging (recommended)
   - Block force pushes (recommended)

Without this, the workflow reports status but does not block merges.

---

## API Reference

Full endpoint documentation with request/response schemas is available on the [server homepage](http://localhost:3001) when running locally.

### Service Provider

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/sp/pubkey` | SP public key (Ed25519) |
| `POST` | `/api/sp/attest` | Request attestation signing |
| `POST` | `/api/sp/verify` | Verify attestation signature |

### Attestation Store

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/attestations` | Publish attestation |
| `GET` | `/api/attestations?owner=&repo=&sha=` | Get attestation status for a PR |

### Gatekeeper

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/gatekeeper/execute/deploy` | Validate and authorize deployment |
| `POST` | `/api/gatekeeper/authorize` | Validate attestation coverage |

### Context Resolution

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/pr-context/:owner/:repo/:sha` | Resolve execution context for a commit |

### Other

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/github/webhook` | GitHub App webhook handler |
| `GET` | `/prod` | Current production state |
| `GET` | `/prod.json` | Production state (JSON) |

---

## Environment Variables

### Server (`apps/server/.env.local`)

```bash
# SP keypair (optional — generates ephemeral if not set)
SP_PRIVATE_KEY=<hex>
SP_PUBLIC_KEY=<hex>

# GitHub App
GITHUB_APP_ID=<number>
GITHUB_APP_PRIVATE_KEY=<pem with \n>
GITHUB_APP_WEBHOOK_SECRET=<string>

# Storage (production only — local dev uses in-memory store)
KV_REST_API_URL=<url>
KV_REST_API_TOKEN=<token>
```

### UI (`apps/ui/.env.local`)

```bash
GITHUB_TOKEN=<token>                           # GitHub PAT with repo scope
NEXT_PUBLIC_SP_URL=http://localhost:3001        # SP URL
```

---

## Protocol Compliance

This demo implements **HAP v0.3** as specified in the [review draft](https://humanagencyprotocol.org/review).

| Spec Section | Implementation |
|---|---|
| §4 Profiles | `deploy-gate@0.3` with execution paths and gate questions |
| §4.2 Execution Context | Declared/action/computed field sources with determinism guarantee |
| §5 Frames | Canonical frame hashing (`SHA-256` of key-ordered fields) |
| §6 Attestations | Ed25519 signatures, TTL enforcement, gate content hashes |
| §7 Domains | Role-based attestations with per-path required domain lists |
| §8 Gatekeeper | Stateless validation of signature, frame, TTL, and domain coverage |
| §10 Identity | DID-based identity model, authorization mapping via `owners.json` |
| §17.1 AI Constraints | AI as reading aid only; no auto-generation of gate content |

### What This Demo Does Not Implement

- **Identity verification** — The demo does not verify the reviewer's identity. Anyone can attest as any domain. In production, the SP verifies identity via OAuth and checks authorization against the project's `.hap/owners.json` before signing (§10.5).
- **Immutability rule** — The demo does not enforce that the authorization source is unmodifiable by the attester within the same action (§10.4).
- **Multiple profiles** — Only `deploy-gate@0.3` is implemented. The protocol supports arbitrary profiles.

---

See [humanagencyprotocol.org](https://humanagencyprotocol.org) for the full specification.
