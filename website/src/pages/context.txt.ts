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
  const gatekeeperContent = fs.readFileSync(path.join(contentPath, 'gatekeeper.md'), 'utf-8');
  const governanceContent = fs.readFileSync(path.join(contentPath, 'governance.md'), 'utf-8');

  // Read implementation documentation (not versioned, synced from repos if available)
  const gatewayPath = path.join(process.cwd(), 'src/content/docs/gateway.md');
  const gatewayContent = fs.existsSync(gatewayPath) ? fs.readFileSync(gatewayPath, 'utf-8') : null;
  const spPath = path.join(process.cwd(), 'src/content/docs/service-provider.md');
  const spContent = fs.existsSync(spPath) ? fs.readFileSync(spPath, 'utf-8') : null;
  const profilesPath = path.join(process.cwd(), 'src/content/docs/profiles.md');
  const profilesContent = fs.existsSync(profilesPath) ? fs.readFileSync(profilesPath, 'utf-8') : null;

  // Combine all content
  const combinedContent = `
# Human Agency Protocol - Complete Context

**Version ${version} — March 2026**

---

## Homepage

### Authorization Layer for AI Agents.

Every agent action — authorized by a human, bounded, and cryptographically proven. No policy engines. No role hierarchies. A protocol for accountability that scales without scaling IT.

---

### How HAP Works

HAP separates authorization from execution. Humans authorize actions through cryptographic attestations. Gatekeepers verify those attestations before any system is allowed to execute.

Authorization path: Human → Service Provider → Gatekeeper → Executor
Execution request: AI Agent → Gatekeeper

- **Service Provider** — Issues cryptographic attestations proving a human authorized an action within defined bounds.
- **Gatekeeper** — Verifies attestations before execution and blocks any action that exceeds authorized limits.
- **Executor** — Performs the action — but only after authorization has been validated.

HAP enforces authorization through two infrastructure components: Service Providers issue attestations. Gatekeepers verify them before execution.

---

### AI Executes. Humans Own It.

AI Agents can deploy code, move money, grant access, and operate infrastructure. But they cannot own it — because ownership requires bearing consequences, and AI cannot bear them.

> HAP ensures that irreversible actions only execute within bounds set by a human who owns the outcome.

---

### Direction is human. Execution is machine.

**AI can:**
optimize, coordinate and execute.

**Humans must:**
set the bounds, articulate the intent, and bear the consequences.

**HAP enforces that boundary.**

---

### Explore Use Cases

HAP applies wherever AI executes consequential actions:

- **Bounded AI Agents** — Agents operate under cryptographically enforced authority bounds. Any attempt to widen scope requires new human attestation.
- **Deployment Authorization** — Deployments execute only when domain owners cryptographically attest to the exact code revision and execution context.
- **Cross-Domain Decisions** — Actions requiring multiple organizational domains proceed only when all required domain owners attest to the same execution frame.
- **Financial Automation** — Automated payments execute within pre-authorized bounds set by a human domain owner.
- **Infrastructure Governance** — Infrastructure changes execute only when the attested configuration hash matches the state being applied.
- **Supply Chain Integrity** — Software artifacts carry cryptographic proof linking them to human-authorized source revisions.

---

### Compliance Alignment

HAP turns policy requirements into enforceable infrastructure.

- **EU AI Act** — Article 14 mandates effective human oversight for high-risk AI. HAP satisfies this structurally — oversight is not a checkbox, it's the architecture.
- **ISO 42001** — Every AI action requires a human Decision Owner who has set the bounds and articulated the intent. No attestation, no execution.
- **NIST AI RMF** — Every decision produces a cryptographic trail of authorship, bounds, and commitments — tamper-proof and verifiable.

---

### Build With HAP

- **Protocol** — Defines authorization structure and attestation format.
- **Service Providers** — Issue cryptographic attestations.
- **Gatekeeper** — Verifies authorization before execution.
- **Gateway** — Open-source local gateway for runtime enforcement.
- **Governance** — Protocol governance and trust model.

**HAP turns human direction into the governing layer of intelligent systems.**

---

${protocolContent}

---

${serviceContent}

---

${gatekeeperContent}

---

${governanceContent}

---

${gatewayContent ? `${gatewayContent}\n\n---\n` : ''}
${spContent ? `${spContent}\n\n---\n` : ''}
${profilesContent ? `${profilesContent}\n` : ''}
---

Repository: https://github.com/humanagencyprotocol/hap-protocol
Website: https://humanagencyprotocol.org
`.trim();

  return new Response(combinedContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
