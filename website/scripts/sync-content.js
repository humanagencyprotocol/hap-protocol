#!/usr/bin/env node

import { readFileSync, cpSync, mkdirSync, existsSync, rmSync, readdirSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const contentRoot = join(rootDir, '..', 'content');

// Read version from package.json
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
const version = pkg.version;

console.log(`Syncing content for HAP v${version}...`);

const sourceDir = join(contentRoot, version);
const targetDir = join(rootDir, 'src', 'content', 'docs');
const vectorsPublicDir = join(rootDir, 'public', 'vectors');

// Clean targets so stale files from previous versions never survive a bump.
for (const dir of [targetDir, vectorsPublicDir]) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true });
    console.log(`  Cleaned ${dir}`);
  }
}

if (!existsSync(sourceDir)) {
  console.error(`  Warning: Content directory not found: ${sourceDir}`);
} else {
  mkdirSync(targetDir, { recursive: true });
  // The four spec documents: every .md at the top level of the version directory.
  for (const f of readdirSync(sourceDir).filter((f) => f.endsWith('.md'))) {
    copyFileSync(join(sourceDir, f), join(targetDir, f));
  }
  console.log(`  Copied ${sourceDir}/*.md -> ${targetDir}`);

  // Conformance vectors (v0.7+): the JSON is the artifact and is served raw from
  // /vectors/*.json; the README becomes the /vectors page. Kept out of the content
  // collection so the RSS feed never advertises a file with no page.
  const vectorsDir = join(sourceDir, 'vectors');
  if (existsSync(vectorsDir)) {
    mkdirSync(vectorsPublicDir, { recursive: true });
    for (const f of readdirSync(vectorsDir).filter((f) => f.endsWith('.json'))) {
      copyFileSync(join(vectorsDir, f), join(vectorsPublicDir, f));
    }
    const readme = join(vectorsDir, 'README.md');
    if (existsSync(readme)) copyFileSync(readme, join(targetDir, 'vectors.md'));
    console.log(`  Copied vectors -> ${vectorsPublicDir} and ${targetDir}/vectors.md`);
  }
}

// The dated provenance record is version-independent and lives beside the versions.
const provenance = join(contentRoot, 'provenance.md');
if (existsSync(provenance)) {
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(provenance, join(targetDir, 'provenance.md'));
  console.log(`  Copied ${provenance} -> ${targetDir}/provenance.md`);
}

console.log('Done.');
