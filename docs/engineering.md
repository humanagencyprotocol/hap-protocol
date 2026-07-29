# Engineering — how we build and how we verify

**Status:** canonical. Companion to [`essence.md`](./essence.md), which says what
this is; this says how it gets built without lying to ourselves.


The code-level map — which module owns what, and the seams where bugs cluster —
is internal: `suveren-as/docs/architecture.md`.

---

## The thesis

Most of the code here is written by AI. That is deliberate and it works — but it
changes what counts as evidence.

> **When the same author writes the implementation and its tests, they agree by
> construction. Agreement is not evidence.**

A human writing a test brings a second, independent model of what the code
*should* do. An AI writing both brings one model, twice. The test then encodes
the same misunderstanding as the code, passes, and certifies nothing.

This is not occasional. It is structural, and every mitigation below follows
from it.

The corollary is uncomfortable and worth stating plainly: **a green suite is a
weak signal here.** It is necessary and nowhere near sufficient.

---

## The verification ladder

Strongest evidence first. Prefer the highest rung the question can be answered on.

| Rung | Evidence | Independent of the author? |
|---|---|---|
| 1 | **A human uses the product** | Fully |
| 2 | **The shipped artefact runs** — the tarball, the image, the installed CLI | Yes: packaging, environment and OS are outside the author's model |
| 3 | **Real servers, real profiles, real connectors** (`hap-e2e`) | Largely: the wire, the schemas and the manifests are shared truth |
| 4 | **Unit tests** | No — same author, same assumptions |

Rung 4 is where most tests live and where the least assurance is. That is fine
as long as nobody mistakes it for rung 2.

**Every bug that reached a user this cycle was invisible at rung 4 and obvious at
rung 1 or 2.**

---

## The rules

Each was earned. The failure that earned it is named so the rule is arguable
rather than dogma.

### 1. "Done" means the shipped artefact ran

Not "it builds". Not "tests pass". The thing a user installs, installed and
started.

> `npm publish` honours the `files` whitelist, so the tarball is a *subset* of
> the build directory. A CLI shipped that could not start at all — a required
> file was in `bundle/dist` and not in the package. Three CI legs, a unit suite
> and a local smoke test all passed, because every one of them ran the build
> directory.

CI now packs the tarball, extracts it, installs it and runs it. That step is the
only one that sees what a user gets.

### 2. Verify the verifier

Before trusting a check, confirm it ran.

> `npx tsc` on a developer machine resolved to an unrelated LaTeX binary of the
> same name. It printed a banner and exited 0. Every "typecheck clean" was a
> program that never ran — and a missing import shipped and broke every
> platform.
>
> Separately: a poll loop printed "gateway up" unconditionally because its exit
> status was never inspected, and a commit was chained after a `grep` of test
> output rather than the test's exit code.

Check exit codes, not the presence of plausible output. A check that cannot fail
proves nothing. If you have never seen a check fail, you have not tested the
check.

### 3. Tests import the real thing

If importing is awkward, fix the design — do not mirror the logic.

> A detection rule was copied into its test because importing the module started
> a server. The copy passed. The original referenced an undefined identifier and
> crashed on first use.

A mirrored rule tests the mirror.

### 4. Test refusals harder than successes

The product's value is saying no. Roughly one permit case per gate, and three
denials: bound missing, bound present but wrong, and request malformed or
hostile.

> Three enforcement mechanisms existed in code and enforced nothing — a limit
> nothing counted, a limit whose name did not match the convention that selected
> it, and a local gate whose lookup key never matched what it stored. All three
> had passing tests around them.

A gate with no test proving it *blocks* is decoration.

### 5. Fail closed, and audibly

An absent bound blocks. A narrowed result says so.

> A read window was enforced by silently ANDing a ceiling onto the agent's
> query. Asking for data outside the window produced an empty result — and the
> agent reported "there are none", which was false. Silent filtering does not
> merely hide data; it manufactures confident false statements.

If a request cannot be satisfied within the grant, refuse and say why. Never
return a narrowed result that reads as a complete one.

### 6. Test against shipped profiles and manifests

Not inline copies.

> A test declared its own tool gating and would have passed while the shipped
> manifest was wrong. Another used a profile shape (`path` in `keyOrder`) that no
> real profile has — which is precisely why a broken lookup went unnoticed for
> months.

Fixtures drift away from production silently, and the drift is invisible because
the test still passes.

### 7. CI runs where users run

Every supported OS, on the artefact users install.

> The unit suites ran on no operating system at all — there was no CI for them.
> The read-governance lint, whose entire job is to fail the build when a
> connector ships an ungoverned tool, had no build to fail. On its first run,
> Windows immediately caught a spawn failure the other platforms cannot see.

---

## Where tests belong

Default to `hap-e2e` — real Authority Server, real gateway, real MCP servers.
**Never mock an integration**; a mock proves the mock works.

Fall back to in-repo unit tests only when the wire boundary genuinely blocks the
test: pure predicates, string builders, canonicalisation, anything with no
observable side effect.

Two obligations that follow:

- **Credential-free by default.** Anything needing real third-party credentials
  cannot gate a pull request. Prove enforcement with the local SQLite connectors;
  keep credentialed suites in a scheduled run.
- **Cross-repo drift needs a scheduled run.** This system spans five
  repositories. Its last breakages were a string changed in one repo and a
  profile version bumped in another — nothing changed in the repo that broke.
  Only a periodic run against every `main` catches that.

---

## Release discipline

1. Green CI on **all** platforms — including the packed-tarball check.
2. Version bump reflecting the change: adding an enforcement model or shipping a
   migration is **minor**, not patch.
3. Tag; publishing is tag-triggered and tokenless (OIDC Trusted Publishing).
4. **Install the published artefact and start it.** Not optional — this is the
   only rung-2 check that covers the registry itself.
5. If a release cannot start, the fix is a new patch version plus the CI step
   that would have caught it. Never just the fix.

A release that ships a migration users must act on (a profile version that
invalidates existing grants) must say so where they will see it — release notes
and the product, not only a commit message.

---

## Open source

The Gateway, `hap-core`, the profiles, the connectors and the conformance suite
are open. External contributors are expected.

That changes what tests are *for*: they stop being our safety net and become
**the contract with people we will never meet**. A stranger's pull request is
accepted or rejected by CI, so CI must encode the invariants that matter —
fail-closed behaviour, the receipt precondition, the refusal messages — not just
that the code compiles.

Two consequences:

- **A test is executable specification.** Name it for the property it protects,
  not the function it calls. `read_daily_max is not enforced anywhere` is a
  better name than `getConsumptionState returns []`.
- **Explain the why in the test.** A contributor deleting a test they do not
  understand is a real failure mode; a comment naming the bug it prevents is
  cheap insurance.

The conformance suite has a second job: proving *someone else's* implementation
is HAP-compliant. It currently spawns Suveren's own components, so it cannot yet
do that. Closing that gap is what makes "HAP is a blueprint" true.

---

## Known traps in this repository

Environment facts that have cost real time. Add to this list rather than
rediscovering.

| Trap | Consequence | Avoid by |
|---|---|---|
| `npx tsc` may resolve to an unrelated binary | Typechecks silently never run | Use the npm script (`tsc` resolves to `node_modules/.bin`) |
| `tsup` does not typecheck | Undefined identifiers ship and crash at runtime | Builds run `tsc --noEmit` first |
| `npm publish` honours `files` | Tarball ≠ build directory | The packed-tarball CI step |
| Three install modes share default ports | A local build silently shadows the npm install | `suveren-gateway status`; check what is on the port |
| A service-managed gateway writes no PID file | "not running" while it serves; a second start dies on the port | `start` and `status` probe the port, not just the file |
| `launchd`/systemd give a minimal environment | Integrations cannot spawn; no error anywhere | Autostart units carry the PATH captured at install |

---

## Maintaining this document

Add a rule only when a real failure earns it, and name the failure. Remove one
when the class of bug is impossible by construction rather than by discipline —
a rule that CI enforces does not need to be written down twice.
