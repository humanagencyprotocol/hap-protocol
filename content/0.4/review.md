---
title: "Review"
version: "Version 0.4"
date: "April 2026"
---

This document collects v0.4 material that is specified but not required for v0.4 conformance — future directions, optional extensions, and topics deferred to v0.5. A v0.4 implementation MAY implement any of these without violating v0.4 conformance, and MAY skip all of them without losing v0.4 conformance.

The material here was originally inline in `protocol.md` v0.3 under "Future / Optional" headers. It was moved into a dedicated document in v0.4 to keep `protocol.md` focused on the binding protocol surface.

---

## Output Provenance

> **Status:** Specified in v0.3, carried forward as a future direction in v0.4. Not currently implemented in any reference implementation.

The attestation proves a human committed to bounded action. For deployment-style profiles (`ship`, `provision`), it can also be useful to bind the attestation to an observable output — a deployed URL, an artifact, a configuration state.

### Output Reference

Profiles MAY define an `output_ref` field in the context schema. When present, it declares where the output of this action will be accessible.

`output_ref` is:
- **Declared** — the proposer specifies the output target
- **Included in `context_hash`** — domain owners attest to it
- **Profile-defined format** — a URL for web deployments, an API endpoint for system actions, or a structured reference for multi-endpoint outputs

Because `output_ref` is part of the context, it is hashed and signed. This creates a cryptographic binding between the attestation and the output location.

### Output Provenance Metadata

After execution, outputs MAY carry provenance metadata that references the attestation that authorized them.

**MUST include:**
- `attestation_id` and `bounds_hash` — the unifying identifiers

**MAY include:**
- SP endpoint for attestation lookup
- Receipt IDs from the execution chain

How provenance metadata is exposed is profile-specific:
- Web deployment: `/.well-known/hap` endpoint or HTTP header
- API service: response header or metadata endpoint
- Agent: action log entries
- System change: audit log entries

### Verification Flow

Given an observable output:

1. Read provenance metadata (`attestation_id` + `bounds_hash`)
2. Fetch attestation from the SP
3. Verify attestation signature
4. Verify `output_ref` in the attested context matches the output's actual location
5. Optionally fetch receipts to verify the execution chain
6. If match — the output is cryptographically bound to the attested action

Step 4 is the critical binding. Without it, an `attestation_id` on an output is just a claim. With it, the claim is verified against what domain owners actually attested to.

### Status in v0.4

Output Provenance is a useful design pattern for deployment-style profiles, but it is not currently exercised by the agent gateway use case that drove the v0.4 release. The section is preserved as a forward-looking direction. Profiles MAY use it; the protocol does not require it. A full v0.4 implementation MAY skip Output Provenance entirely without losing v0.4 conformance.

This area will be reviewed in v0.5 alongside multi-profile integration scoping.

---

## Decision Streams

> **Status:** Specified in v0.3, carried forward as a future direction in v0.4. Not currently implemented in any reference implementation.

Individual attestations are snapshots. They prove "someone decided X" but don't show how a project evolved through decisions. For public accountability and project history, attestations can be linked into a verifiable chain.

### Stream Structure

Each attestation MAY optionally belong to a decision stream:

```json
{
  "stream": {
    "project_id": "hap-protocol",
    "sequence": 12,
    "previous_attestation_hash": "sha256:..."
  }
}
```

| Field | Purpose |
|-------|---------|
| `project_id` | Groups attestations into a project |
| `sequence` | Order within the stream (starts at 1) |
| `previous_attestation_hash` | Links to prior attestation (null for first) |

### Status in v0.4

Decision streams are not implemented in v0.4. The section is preserved as a forward direction. Profiles and SPs MAY support streams; the protocol does not require them. This area will be reviewed in v0.5.
