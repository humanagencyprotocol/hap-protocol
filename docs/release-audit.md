# Auditing a release

How to establish that the software currently serving a domain is the build a
human approved — and what can be established without that access.

Written 2026-08-03, when the release badge shipped. The badge makes the weak
claim in public; this is the strong one, and it exists because the weak claim is
easy to mistake for it.

---

## The two claims

**Public — what any visitor can get.** The page carries the hash of its own
build identifier and offers it to the Authority Server, which answers: a human
approved releasing a build with that identifier, at this time, under a signed
grant.

That is real, and it is narrower than it looks. **The page supplies the
identifier.** A page could name a build it is not, and the answer would come back
green. What a visitor learns is that this site publishes a release-approval
trail — not that the bytes on their screen are the approved bytes.

**Audit — what someone with hosting access can get.** That the exact build named
by a receipt is the build serving the domain right now, and which commit it came
from. This is the claim that actually holds, and it cannot be made from the page.

The gap is not a defect to be fixed by better wording. It is structural: a
verifier can only derive a key independently if they hold something the page did
not give them. An email recipient holds the delivered message. A website visitor
holds nothing but the page.

---

## What the receipt contains

| | In the receipt | Public |
|---|---|---|
| approver, timestamp, signature | yes | yes |
| `contentHash` of the build identifier | yes | yes |
| repo, environment, workflow | yes, in `executionContext` | **redacted** |
| the build identifier in plaintext | **no** — only its hash | no |
| **commit sha** | **no** | no |

Two absences surprise people:

**The commit is not in the receipt.** `deploy@0.7` gates *"make these bytes
live"*, not *"build this source"*, so the release call never carries a commit.
It is recoverable — see step 4 — but from the artifact, not the receipt.

**The build identifier is only a hash.** The Authority Server never receives the
URL. That is the privacy property working, and it is why step 3 is a search
rather than a lookup.

---

## The audit

Requires: the receipt (from the badge, a footer link, or the receipts list) and
read access to the hosting account.

**1 — Read the receipt.** `https://www.suveren.ai/r/<id>` gives the approver,
the timestamp, `signatureValid`, and `contentHash`. Note the hash.

**2 — List the project's deployments.** Every build the project has produced,
each with its own immutable address.

**3 — Find the build the receipt names.** For each deployment, take its address,
apply the normal form (`https://<lowercase-host>` — scheme added if absent, no
path, query, port or trailing slash), canonicalize it (NFC, LF line endings,
trailing whitespace stripped), and SHA-256 it. **The deployment whose hash equals
`contentHash` is the build that was approved.**

```bash
node -e '
const {createHash}=require("crypto");
const url="hap-abc123.vercel.app";                 // as the host lists it
const norm="https://"+new URL("https://"+url.replace(/^https?:\/\//,"")).hostname.toLowerCase();
console.log("sha256:"+createHash("sha256").update(norm,"utf8").digest("hex"));
'
```

Exactly one should match. None matching means the receipt is for a different
project — or the identifier was normalized differently, which is why the normal
form is declared rather than assumed.

**4 — Recover the commit.** The hosting platform records the commit each
deployment was built from. This is where the commit comes from; the receipt never
had it.

**5 — Ask what is serving.** Which deployment is currently aliased to the
production domain.

**6 — Compare.** If step 5 equals step 3, the live site is the approved build,
and step 4 names its source. If they differ, something was promoted outside the
gate — or promoted and then replaced.

---

## What a mismatch means, and does not

Step 6 disagreeing is worth investigating and is **not** by itself evidence of
wrongdoing. Ordinary causes:

- A later release replaced it, and the receipt being audited is simply older.
  Check the newest receipt for the domain, not an arbitrary one.
- A rollback re-promoted an earlier build. Rollbacks are legitimate and produce
  their own receipts — the same artifact can carry several.
- The identifier was normalized differently at approval time than at audit time,
  producing a hash that never matches anything. This looks identical to "never
  approved", which is why normalization is a declared, breaking-change-governed
  part of the profile.

**Only after excluding those** does a mismatch mean a build reached production
without passing the gate.

---

## Making the audit unnecessary

The audit exists because the visitor cannot derive the key. Two changes would
narrow that, neither currently built:

- **Bind the domain as well as the artifact** (`fields: ["deployment_url",
  "domain"]`). The receipt would then name the site the reader is standing on —
  something they know without being told. It corroborates rather than proves,
  since the artifact half is still page-supplied, and it costs a connector
  release plus a profile version.
- **Dual-sign a public projection** so the signature can be checked against the
  published Authority Server key rather than the Authority Server's own word.
  Already recorded as a future direction in `content/0.5/review.md`.

Neither removes the structural gap. A page that identifies itself is always
making a claim about itself, and only an outside observer — a hosting account, a
transparency log, a second party — can settle it.
