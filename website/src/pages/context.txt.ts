import fs from 'fs';
import path from 'path';
import { siteConfig } from '../config';

export async function GET() {
  // Get version from config (sourced from package.json)
  const version = siteConfig.version;

  // Read the raw markdown files from the current version
  const contentPath = path.join(process.cwd(), `../content/${version}`);
  const protocolContent = fs.readFileSync(path.join(contentPath, 'protocol.md'), 'utf-8');
  const serviceContent = fs.readFileSync(path.join(contentPath, 'service.md'), 'utf-8');
  const integrationContent = fs.readFileSync(path.join(contentPath, 'integration.md'), 'utf-8');
  const governanceContent = fs.readFileSync(path.join(contentPath, 'governance.md'), 'utf-8');

  // Read demo documentation (not versioned, synced from demo repos if available)
  const demoDeployPath = path.join(process.cwd(), 'src/content/docs/demo-deploy.md');
  const demoDeployContent = fs.existsSync(demoDeployPath) ? fs.readFileSync(demoDeployPath, 'utf-8') : null;
  const demoAgentPath = path.join(process.cwd(), 'src/content/docs/demo-agent.md');
  const demoAgentContent = fs.existsSync(demoAgentPath) ? fs.readFileSync(demoAgentPath, 'utf-8') : null;

  // Read v0.3 review/proposal document (conditional - only if it exists)
  const reviewPath = path.join(contentPath, 'review.md');
  const reviewContent = fs.existsSync(reviewPath) ? fs.readFileSync(reviewPath, 'utf-8') : null;

  // Combine all content
  const combinedContent = `
# Human Agency Protocol - Complete Context

**Version ${version} — January 2026**

---

## Homepage

### Protect the Real World from Rogue AI Actions.
### Irreversible real-world actions execute only within Decision Owner–defined limits.

Those limits are committed in advance and cryptographically enforced — enabling autonomous execution within clear bounds.

---

### AI Does Not Feel Consequences.

An agent can transfer funds, deploy to production, grant access, or publish externally in seconds.
It will never experience financial loss, regulatory penalties, reputational damage, or operational fallout.

That asymmetry creates new structural risks:
- Money moved beyond intended authority
- Data exported beyond intended scope
- Goals reinterpreted beyond intended direction
- Commitments made without explicit human consent

Autonomy without consequence-bearing actors requires a new boundary.

HAP enforces one rule:

> Irreversible real-world actions execute only within limits defined by a Decision Owner.

---

AI systems reason probabilistically.
Real-world consequences are not probabilistic — money moves, access changes, data leaves.

When probabilistic systems can trigger irreversible execution, authority must be predefined and bounded.

HAP enforces that boundary.

---

### What AI Can Do vs. What Humans Must Do

**AI can:**
optimize, coordinate and execute.

**Humans must:**
define what to optimize, set objectives, accept tradeoffs and bear consequences.

**Direction is human.**
**Execution is machine.**
**HAP keeps the boundary intact.**

---

### The Six Human Gates

AI can simulate a thousand paths, but it cannot open the gate to any of them. HAP enforces these mandatory preconditions before any execution begins.

**Frame — The Boundary**
Humans define what we are deciding. AI has no context until a human sets the decision boundary.

**Problem — The Justification**
Every action needs a reason. AI calculates solutions; only humans determine if the problem is worth solving.

**Objective — The Optimization**
AI optimizes for any metric. Only humans can choose which outcome actually matters.

**Tradeoff — The Cost**
Every choice abandons alternatives. Only humans can accept the loss of what is sacrificed.

**Commitment — The Point of No Return**
Commitment makes a choice binding. Only a human can make an AI action irreversible.

**Decision Owner — The Responsibility**
Authorship and Ownership are unified. No action is taken without an identifiable human who bears the consequences.

---

### How HAP Works

**Stop → Ask → Confirm → Proceed**

1. **Stop** — Execution is blocked if required decision states are unresolved.
2. **Ask** — HAP triggers a structured question that forces human direction.
3. **Confirm** — The human confirms the decision the AI must follow.
4. **Proceed** — Only then does the system continue.

**No skipping.**
**No inference.**
**No silent automation.**

---

### Governance Enforced, Not Documented

Most AI governance frameworks share the same core requirement: humans must remain in control of consequential AI decisions. The EU AI Act mandates it. ISO 42001 requires it. NIST AI RMF recommends it. But none of them say **how**.

HAP is the how. It enforces human oversight at the protocol level — not through policies that can be ignored, but through cryptographic gates that cannot be bypassed.

- **Enforceable by Design** — Every AI action requires a human Decision Owner who has articulated the problem, objective, and tradeoffs. No attestation, no execution.
- **EU AI Act Ready** — Article 14 mandates effective human oversight for high-risk AI. HAP satisfies this structurally — oversight is not a checkbox, it's the architecture.
- **Audit-Ready Infrastructure** — Every decision produces a cryptographic trail of authorship, tradeoffs, and commitments — tamper-proof and verifiable.

---

### Why This Matters Now

As AI accelerates, execution becomes cheap.
Unbounded execution becomes dangerous.
Direction must be explicit and enforceable.

When agents can initiate irreversible actions at machine speed, governance cannot rely on assumption or oversight.

HAP makes human direction a structural requirement of execution.

---

### Where Do You Need Human Direction Before Execution?

HAP applies wherever AI executes consequential actions:

- **Development / Deployments** — No deployment until the right owners commit to what ships and why. (Live demo available)
- **AI Agents** — Agents execute within human-approved bounds; expansions require attestation.
- **Infrastructure** — No production infrastructure change without domain owners signing off.
- **Database & Data** — No schema change, destructive query, or export without a named human committing.
- **Financial Operations** — No money movement without explicit human commitment.
- **Access & Identity** — No permission grant or role escalation without a named owner signing off.
- **Security-Sensitive Changes** — No security-impacting change without security owner attestation.
- **Customer-Facing Product** — No user-impacting change without product owner commitment.
- **Compliance & Regulated** — Cryptographic proof of required human oversight before execution.

---

### Build With HAP

- **Protocol** — How direction is described, measured, and enforced
- **Integration** — How to integrate HAP into your systems
- **Deploy Gate Demo** — Multi-person approval for GitHub PRs
- **Agent Demo** — Bounded execution for AI agents via MCP
- **Service Providers** — Verified infrastructure enforcing compliance
- **Governance** — Transparent, federated oversight

**HAP turns human direction into the governing layer of intelligent systems.**

---

${protocolContent}

---

${integrationContent}

---

${serviceContent}

---

${governanceContent}

---

${demoDeployContent ? `${demoDeployContent}\n\n---\n` : ''}
${demoAgentContent ? `${demoAgentContent}\n` : ''}
${reviewContent ? `
---

${reviewContent}
` : ''}
---

Repository: https://github.com/schadauer/human-agency-protocol
Website: https://humanagencyprotocol.org
`.trim();

  return new Response(combinedContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
