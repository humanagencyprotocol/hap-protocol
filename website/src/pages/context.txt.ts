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

### Explore Use Cases

HAP applies wherever AI agents take consequential action:

- **Payment Agents** — Agents charge customers, process refunds, and manage subscriptions within bounds you set. Every transaction produces a signed receipt linking it to your authorization.
- **Email & Communication** — Agents draft and send emails on your behalf with clear bounds — who, what topics, which tone. High-stakes replies pause for your review.
- **CRM & Data Agents** — Agents manage contacts, leads, and customer records within scoped bounds — read here, write limits there, no deletes. Every action traceable.
- **Infrastructure & DevOps** — Agents ship code and manage infrastructure under your named authority. High-risk operations require explicit human review before execution.
- **Multi-Stakeholder Actions** — When one signature isn't enough. Critical decisions require attestations from multiple domain owners before the agent can act.
- **Compliance & Audit** — Prove human oversight to regulators, auditors, and insurers. EU AI Act, ISO 42001, NIST AI RMF — satisfied structurally, not through policy documents.

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

**HAP is the open protocol for human authority over AI agents. Verifiable, interoperable, and infrastructure-free.**

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
