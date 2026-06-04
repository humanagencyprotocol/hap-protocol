---
title: "External Advisor Review"
version: "Version 0.5-preview"
date: "May 2026"
---

External-advisor evaluation of HAP v0.5-preview, scored across six aspects. Honest and fair. Read once before promoting v0.5-preview to v0.5.

---

## 1. Completeness — **B−**

The protocol surface is largely covered: attestation lifecycle, receipt lifecycle, bounds/context split, commitment modes, revocation, group/personal governance, tool-gating, retention, migration. The companion-spec mechanism creates a real escape valve for things that don't belong in Core. That's mature.

What's missing or under-specified:

- **Authentication between Gatekeeper and SP.** The spec says "the SP derives `userId` from the authenticated request context" without specifying the mechanism (cookie? bearer? mTLS? OAuth?). Two independent SPs cannot interoperate without this. **Single biggest completeness gap.**
- **Proposal API.** Heavily referenced in error codes (`PROPOSAL_REQUIRED`, `PROPOSAL_MISMATCH`, etc.) but the actual request/response schemas for `/api/proposals` and the approval flow are not in the spec. A second-source Gatekeeper cannot implement review mode from the spec alone.
- **DID resolution rules.** `did:key`, `did:github`, `did:email` are mentioned by name but the resolution algorithm — how a verifier obtains the public key for a `did:key:z6Mk...` — is left to "external mechanisms."
- **Timestamps and TTL units.** Unix seconds is implied throughout (`issued_at`, `expires_at`, `ttl: 86400`) but never stated. Spec MUST say "Unix epoch seconds, UTC."
- **Clock skew.** No rule on how Gatekeeper and SP reconcile clock drift on TTL boundaries. Today the failure mode is opaque (Gatekeeper accepts → SP rejects with `ATTESTATION_EXPIRED`).
- **Multi-domain attestation aggregation in receipt requests.** Spec example shows two domain owners producing two attestations sharing the same `bounds_hash`. The receipt request schema takes a single `boundsHash`. How does the SP know "both attestations are present"? Today this works because the SP looks up by `boundsHash` and sees both rows, but the spec doesn't say so.
- **Concurrency on cumulative state.** Spec describes atomic CAS for proposal state transitions, but is silent on parallel receipt requests against the same attestation. Two simultaneous tool calls + cumulative_sum is a race.
- **`above_cap_caps` semantics for cumulative bounds.** Example shows per-transaction (`amount_max: 1000`). What does a cap on a `cumulative_count` bound mean — the cap on the running count, or per-call? Underspecified.
- **Pagination on receipt listings.** Long-running attestations could accumulate thousands of receipts. Cursor model? Page size limits? Not addressed.
- **`weekly` window anchor.** Says "Monday 00:00 in SP timezone" — but if a tenanted SP has customers across timezones, this becomes a customer-surprise factor. Either pin to UTC or make the timezone part of the bound.

**Recommendation:** ship a v0.5.1 patch within ~30 days addressing auth, proposal API, timestamp units, and clock-skew rule. The other items can ride v0.6.

---

## 2. Structure / format — **B**

The four-file split (protocol / service / gatekeeper / governance) is intuitive and roughly the right cut. New readers can find what they need. "New in v0.5" callouts are useful.

Concerns:

- **`protocol.md` is 1400+ lines.** It now does double duty as the conceptual primer *and* the wire-format reference. Readers who need to implement an SP wade through "Decision States" and "Privacy Invariant" before reaching the receipt schema. I'd split: a short `core.md` (concepts) and a longer `protocol.md` (wire format).
- **Error codes are duplicated three times** (protocol/service/gatekeeper) with a comment saying protocol.md is canonical. Three tables that "MUST stay in sync" inevitably drift. Either make the others one-liner pointers, or fold service/gatekeeper into protocol.md.
- **Migration section** is in protocol.md, but several v0.5 changes are documented inline as "(new in v0.5)" sprinkled across all four files. A single "What's new in v0.5" file (or top-level section) would help integrators audit changes faster.
- **Tool-Gating Manifest is in protocol.md** but cross-referenced from gatekeeper.md. It's really a Gatekeeper-side concept. Move to gatekeeper.md, leave a one-line forward reference in protocol.md.
- **Companion specs are pointers from `governance.md`** but the actual specs don't exist as files yet. Either ship the companion-spec files (even as drafts) or mark them clearly as "future." Right now `intent-disclosure@0.1` is mentioned in normative-sounding language with no concrete artifact behind it.
- **Inconsistent normative-rule formatting.** Some sections use numbered "Normative rules:" lists; others embed MUST/SHOULD in prose. Pick one and apply uniformly — auditors and conformance-test authors need predictability.

---

## 3. Feasibility — **B+**

Implementable. The reference implementation already exists and most v0.5 changes are deltas, not redesigns. No element of v0.5 makes me think "this can't be built."

Specific risks:

- **Signing canonicalization parity.** "RFC 8785 compatible" is the right call, but JCS implementations vary subtly — number formatting (BigInt, scientific notation), control-character escapes, surrogate pair handling. Without test vectors shipped on day one, two independent implementations *will* produce different bytes for the same payload. Test vectors are listed in the implementation checklist; they must be the *first* deliverable, not the last.
- **`weekly` timezone bind.** A federated multi-SP world breaks if SP-A anchors weeks in UTC and SP-B anchors in Europe/Berlin. Cumulative state for the same attestation processed by two SPs would diverge. Either pin to UTC or specify the timezone in the bound itself.
- **Profile bytes retention** is operationally heavy. In a multi-tenant SP, the longest-retention tenant determines storage. For a 10-year-retention profile, the SP keeps the bytes for 10 years even if all tenants stopped using it on day 1. Probably acceptable, but operators need to model this in capacity planning.
- **Encrypted Intent companion spec invariant C2** (signed payload must include hash of `intent_ciphertext + approvers_frozen`) makes attestations brittle: any change in approver set requires re-attestation. In a real team where someone joins/leaves, you re-attest constantly. May need a more flexible commitment scheme (e.g., commit to a Merkle root of approvers).
- **`above_cap_caps` validation.** Spec says SP must reject attestations where `above_cap_caps` references unknown bounds fields. But it doesn't say the SP must reject caps that are *higher* than the bound itself (which would be semantically meaningless). Easy enforcement gap.

---

## 4. Ease of implementation — **B+**

For an SP greenfield: ~3-5 weeks to a conformant first cut, assuming Ed25519, JCS, and a KV store are already at hand. The state model (attestations + receipts + cumulative state + revocation + supersession + proposals) is the bulk of the work. Honest estimate: 2-3k lines of well-tested code.

For a Gatekeeper greenfield: ~1-2 weeks. Local verification + receipt request + tool-gating manifest interpretation. The tool-gating manifest is the most idiosyncratic part — but it's also the part where the v0.5 spec is clearest.

For a profile author: minutes. Add `actionTypes`, move `enum` to `constraint.values`, drop `paths`. Trivial.

For a third-party verifier: a few days, *if* the SP exposes the third-party verification endpoint described in service.md. The piece that's hardest is canonicalization — which is why test vectors are critical.

Friction points specific to v0.5:

- **Tool-gating manifest schema** isn't versioned. If `executionMapping` grows a new transform in v0.6, every Gatekeeper has to ad-hoc detect & handle. Add a `manifestVersion` field.
- **Multiple discriminated unions** — `BoundType.kind`, `commitment_mode`, `category`, `source` (declared/cumulative). Each is reasonable individually, but a typed-language implementer ends up writing many switch statements. Not a flaw, just a flag.
- **No reference test harness.** Profile JSON validators, canonicalization vector checkers, attestation/receipt validators — these all exist in the spec text as "MUST be published." A single repo `hap-conformance` with all of them would dramatically lower the bar.

---

## 5. Adoption — **C+**

This is where v0.5 is weakest. Not because the spec is bad — because the surrounding conditions don't yet exist.

Strengths:
- The companion-spec mechanism is genuinely good for adoption — it lets integrators say "I implement HAP Core but not `intent-disclosure`" without losing conformance.
- The migration story from v0.4 is honest about which fields rename and which are retired.
- Backward compatibility is preserved for `automatic` and `review` mode signed payloads.

Adoption barriers v0.5 doesn't yet address:

- **Only one SP exists.** A fully-functioning reference SP runs at https://humanagencyprotocol.com/ (source in `hap-sp/`, hosted but not open source). It is production-grade — the adoption concern is not whether *any* SP exists, it's that today only one does. "Anyone can run an SP" is the right principle, but until a second independent SP exists (preferably in a different language and operated by a different party), the spec is implicitly mirroring the reference SP. Idiosyncrasies leak: the per-user storage key suffix, the synthesized personal group, the `revocation.superseded` event format — all promoted into spec text *because* the reference SP did them. A second SP would have illuminated which were essential and which were incidental. Note: the reference SP is closed source by design ("hosted service" per the project's open-source scope), which is a defensible product decision — but it raises the bar for a second SP, since they cannot read the source for clarification.
- **Tool-gating manifest is MCP-flavored.** Namespaced tool names with `__` separators, `_imagePreview` reserved key, `category: "read"` mirroring MCP semantics. This is fine as a reference manifest format, but a non-MCP integrator (HTTP API, gRPC, queue worker, plain function call) has to invent mappings. The spec should either explicitly cover non-MCP runtimes or factor out the MCP-specific bits.
- **No quickstart.** Reading 3000+ lines across 4 files before writing the first line of integration code is a hard sell. Most successful protocols (OAuth, OIDC, even WebFinger) have a "5-minute quickstart" alongside the formal spec. v0.5 has none.
- **Vocabulary load.** "Decision Owner," "Direction State," "Authorization State," "Gatekeeper," "Service Provider," "Profile," "Bounds," "Context," "Intent," "commitment_mode," "actionType," "Receipt," "Attestation." That's a lot to internalize. Some terms collide with industry usage ("Intent" in agent frameworks usually means "what the user typed"). A glossary would help; cleaner naming would help more.
- **No SDK promise.** A spec without a multi-language SDK is read by maybe 100 people; a spec with SDKs in JS/Python/Go/Rust is consumed by thousands. v0.5 mentions `hap-core` (TS only). The spec should state which languages the conformance test suite targets.
- **Marketing posture.** HAP positions itself as "the governance layer for AI agents" — an enormous claim. Adoption depends on integrators believing that layer is needed. Most agent vendors today either roll their own auth or piggyback on OAuth. Without a forcing function (regulatory pressure, a high-profile incident, a major framework integration), HAP is competing with "do nothing" — the hardest competitor.

---

## 6. Details / abstraction balance — **B**

Mostly right, with three areas that lean too concrete and one too abstract.

At the right level:
- **Bounds vs context split.** Excellent abstraction. "Enforceable abstract limits go to the SP, operational details stay local" is the kind of structural insight that lets the protocol scale to new domains without changing Core.
- **BoundType union with 4 kinds.** Closed set. Profile authors can't invent new enforcement semantics. SP dispatch is explicit.
- **Commitment modes as signed payload field.** Clean.
- **`actionType` registry.** Right abstraction — protocol says "actionType is a closed set per profile," profile says which strings are valid. Neither bleeds into the other.

Too concrete:
- **`executionMapping` transforms.** `length`, `join`, `join_domains` are very specific. `join_domains` is essentially "extract email domain" — a single use case (Gmail integration) leaking into the protocol surface. Should either generalize (`{ transform: "regex-extract", pattern: "@(.+)$" }`) or move out of Core into a profile-companion document.
- **AES-256-GCM in `intent-disclosure@0.1`.** Specifying the exact AEAD primitive forecloses migration to ChaCha20-Poly1305 or AES-GCM-SIV later. Specify the security properties (AEAD with N-byte nonce, M-byte tag) and let implementers pick.
- **The `__` separator for namespaced MCP tool names.** This is an MCP convention bleeding into the spec.

Too abstract:
- **"Each SP defines its own authentication mechanism."** Not abstraction — gap. The protocol can be permissive about *which* mechanism (OAuth/mTLS/API key) but should require *one* and document a profile for federated multi-SP scenarios.
- **"DID resolution is out of HAP Core scope."** Same issue. If two SPs disagree on how to resolve `did:key:z6Mk...`, every cross-SP attestation breaks.
- **`gate_content_hashes` as an "open-ended map."** The spec says only `intent` is required, others are reserved for future use. But what happens if an SP receives a `gate_content_hashes` with a key it doesn't recognize? Reject? Pass through? Today the answer is implementation-defined, which means no two SPs will agree.

---

## Overall verdict — **B / B+**

v0.5-preview is a thoughtful, careful evolution of v0.4. It tightens what was loose (canonicalization, error codes, naming), adds what was missing (`actionType` registry, `review_above_cap`, tool-gating manifest as protocol surface), and has an honest migration story. The companion-spec mechanism gives the protocol a credible path to scale without bloating Core.

It is not yet a *shippable foundational protocol*. The completeness gaps (auth between Gatekeeper and SP, proposal API schema, DID resolution, timestamp units, clock skew) are blockers for second-source implementation. The adoption picture is honest but thin — one reference SP, one language, no quickstart, MCP-flavored manifest format.

---

## Recommended path from v0.5-preview to v0.5

In order of leverage:

1. **v0.5.1 patch (≤30 days):** auth mechanism between Gatekeeper and SP, proposal API request/response schemas, timestamp/TTL units, clock-skew rule, signing test vectors shipped as a real artifact in `hap-core`. None of these change semantics; all close interop gaps.
2. **A `hap-conformance` repo** with profile validators, canonicalization vectors, attestation/receipt test cases. This is the single highest-leverage adoption move.
3. **A second SP** in a different language (Go or Python), operated by a different party. The reference SP at humanagencyprotocol.com is closed source by design (it's a hosted product), so a second implementation cannot copy it — it must work from the spec alone. That's exactly the test the spec needs. A second SP will reveal which spec text is normative and which is reference-SP idiosyncrasy, and will save v0.6 from inheriting bugs. Stretch: a small, intentionally minimal **MIT-licensed reference SP** (the smallest implementation that passes conformance) would let new operators bootstrap without reimplementing from scratch — without competing with the hosted product.
4. **Quickstart doc** — 200 lines or fewer, "integrate HAP into your agent in 5 minutes." Without this, the spec stays an academic artifact.
5. **Publish at least the `intent-disclosure@0.1` companion spec** as a draft. The reference implementation already does the work; document it.

The protocol is real and the design is competent. The work between v0.5-preview and "first external integrator ships against this" is mostly *not* spec work — it's tooling, tests, and a quickstart.
