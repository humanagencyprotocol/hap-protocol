// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Pages that are reachable but deliberately kept out of the index: the Austrian
// Impressum (German boilerplate, no search value) and the two Deploy Gate legal
// pages (linked from the GitHub App listing, not from this site). They carry
// `noindex` in their own <head>; listing them in the sitemap would contradict it.
const NOINDEX = ['/impress', '/deploy-gate-terms', '/deploy-gate-privacy'];

// Emitted as redirect stubs, already marked noindex + canonical.
const REDIRECTS = ['/service', '/gatekeeper'];

// https://astro.build/config
export default defineConfig({
  site: 'https://humanagencyprotocol.org',
  outDir: './dist',
  // One URL form, everywhere. The build still writes /protocol/index.html, but
  // every advertised URL — internal link, canonical tag, sitemap entry — is the
  // no-slash form, and vercel.json 308s the slashed variant onto it.
  trailingSlash: 'never',
  build: {
    format: 'directory'
  },
  integrations: [
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname.replace(/\/$/, '') || '/';
        return !NOINDEX.includes(path) && !REDIRECTS.includes(path);
      },
      serialize: (item) => {
        const path = new URL(item.url).pathname.replace(/\/$/, '') || '/';
        // The spec is the reason this site exists; say so in the priorities
        // rather than shipping a flat, signal-free sitemap.
        // The homepage entry ends up as a bare origin: `trailingSlash: 'never'`
        // strips the slash after serialize runs, so it cannot be re-added here.
        // Harmless — an empty path and "/" are the same URL (RFC 3986 §6.2.3),
        // which is why the canonical tag may keep its slash.
        if (path === '/') return { ...item, priority: 1.0, changefreq: 'monthly' };
        if (path === '/protocol') return { ...item, priority: 0.9, changefreq: 'monthly' };
        return { ...item, priority: 0.7, changefreq: 'monthly' };
      }
    })
  ],
  // v0.5 folded service / gatekeeper into the single protocol page;
  // review.md is its own page again (future directions / optional extensions)
  redirects: {
    '/service': '/protocol',
    '/gatekeeper': '/protocol'
  }
});
