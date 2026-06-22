// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://humanagencyprotocol.org',
  outDir: './dist',
  build: {
    format: 'directory'
  },
  // v0.5 folded service / gatekeeper into the single protocol page;
  // review.md is its own page again (future directions / optional extensions)
  redirects: {
    '/service': '/protocol',
    '/gatekeeper': '/protocol'
  }
});
