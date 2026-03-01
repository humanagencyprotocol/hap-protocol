#!/usr/bin/env node

import { readFileSync, writeFileSync, cpSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const contentRoot = join(rootDir, '..', 'content');
const demoDeployRoot = join(rootDir, '..', 'demo-deploy');
const demoAgentRoot = join(rootDir, '..', 'demo-agent');

// Read version from package.json
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
const version = pkg.version;

console.log(`Syncing content for HAP v${version}...`);

// Sync main docs from current version
const sourceDir = join(contentRoot, version);
const targetDir = join(rootDir, 'src', 'content', 'docs');

if (existsSync(sourceDir)) {
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
  console.log(`  Copied ${sourceDir} -> ${targetDir}`);
} else {
  console.error(`  Warning: Content directory not found: ${sourceDir}`);
}

// Sync Deploy Gate Demo README (with frontmatter injection)
const deployReadme = join(demoDeployRoot, 'README.md');
const deployTarget = join(targetDir, 'demo-deploy.md');

if (existsSync(deployReadme)) {
  let content = readFileSync(deployReadme, 'utf-8');

  // Remove the H1 title (will be in frontmatter)
  content = content.replace(/^# HAP Deploy Gate Demo\n+/, '');

  // Add frontmatter
  const frontmatter = `---
title: "Deploy Gate Demo"
version: "Version ${version}"
date: "January 2026"
---

`;

  writeFileSync(deployTarget, frontmatter + content);
  console.log(`  Synced Deploy Demo README -> ${deployTarget}`);
} else {
  console.error(`  Warning: Deploy Demo README not found: ${deployReadme}`);
}

// Sync Agent Demo README (with frontmatter injection)
const agentReadme = join(demoAgentRoot, 'README.md');
const agentTarget = join(targetDir, 'demo-agent.md');

if (existsSync(agentReadme)) {
  let content = readFileSync(agentReadme, 'utf-8');

  // Remove the H1 title (will be in frontmatter)
  content = content.replace(/^# HAP Agent Demo\n+/, '');

  // Add frontmatter
  const frontmatter = `---
title: "Agent Demo"
version: "Version ${version}"
date: "January 2026"
---

`;

  writeFileSync(agentTarget, frontmatter + content);
  console.log(`  Synced Agent Demo README -> ${agentTarget}`);
} else {
  console.error(`  Warning: Agent Demo README not found: ${agentReadme}`);
}

console.log('Done.');
