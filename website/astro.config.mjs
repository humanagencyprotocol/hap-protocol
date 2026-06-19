// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://humanagencyprotocol.org',
  outDir: './dist',
  build: {
    format: 'directory'
  },
  // v0.5 folded service / gatekeeper / review into the single protocol page
  redirects: {
    '/service': '/protocol',
    '/gatekeeper': '/protocol',
    '/review': '/protocol'
  }
});
