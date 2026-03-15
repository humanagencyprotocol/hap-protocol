#!/usr/bin/env node

import { readFileSync, writeFileSync, cpSync, mkdirSync, existsSync, rmSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const contentRoot = join(rootDir, '..', 'content');
const gatewayRoot = join(rootDir, '..', 'hap-gateway');
const spRoot = join(rootDir, '..', 'hap-sp');

// Read version from package.json
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
const version = pkg.version;

console.log(`Syncing content for HAP v${version}...`);

// Sync main docs from current version
const sourceDir = join(contentRoot, version);
const targetDir = join(rootDir, 'src', 'content', 'docs');

// Clean target directory to remove stale files from previous versions
if (existsSync(targetDir)) {
  rmSync(targetDir, { recursive: true });
  console.log(`  Cleaned ${targetDir}`);
}

if (existsSync(sourceDir)) {
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
  console.log(`  Copied ${sourceDir} -> ${targetDir}`);
} else {
  console.error(`  Warning: Content directory not found: ${sourceDir}`);
}

// Sync HAP Agent Gateway README (with frontmatter injection)
const gatewayReadme = join(gatewayRoot, 'README.md');
const gatewayTarget = join(targetDir, 'gateway.md');

if (existsSync(gatewayReadme)) {
  let content = readFileSync(gatewayReadme, 'utf-8');

  // Remove the H1 title (will be in frontmatter)
  content = content.replace(/^# HAP Agent Gateway\n+/, '');

  // Add frontmatter
  const frontmatter = `---
title: "HAP Agent Gateway"
version: "Version ${version}"
date: "March 2026"
---

`;

  writeFileSync(gatewayTarget, frontmatter + content);
  console.log(`  Synced Gateway README -> ${gatewayTarget}`);
} else {
  console.error(`  Warning: Gateway README not found: ${gatewayReadme}`);
}

// Sync HAP Service Provider README (with frontmatter injection)
const spReadme = join(spRoot, 'README.md');
const spTarget = join(targetDir, 'service-provider.md');

if (existsSync(spReadme)) {
  let content = readFileSync(spReadme, 'utf-8');

  // Remove the H1 title (will be in frontmatter)
  content = content.replace(/^# HAP Service Provider\n+/, '');

  // Add frontmatter
  const frontmatter = `---
title: "HAP Service Provider"
version: "Version ${version}"
date: "March 2026"
---

`;

  writeFileSync(spTarget, frontmatter + content);
  console.log(`  Synced Service Provider README -> ${spTarget}`);
} else {
  console.error(`  Warning: Service Provider README not found: ${spReadme}`);
}

console.log('Done.');
