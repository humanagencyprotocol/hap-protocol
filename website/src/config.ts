// Site configuration - version is read from package.json
import pkg from '../package.json';

export const siteConfig = {
  version: pkg.version,
  title: 'Human Agency Protocol',
  /**
   * Site-wide fallback description.
   *
   * Individual pages override this — see `description` in the docs collection
   * frontmatter (`content/<version>/*.md`) and the `description` prop on
   * BaseLayout. This string is the last resort, so it has to stand on its own.
   *
   * Wording follows docs/essence.md: the receipt is a precondition, not a log.
   */
  description:
    'The open protocol for bounded AI-agent authority: humans authorize, agents execute, and every consequential action requires a signed receipt before it runs.',
  /** Canonical origin. Must match `site` in astro.config.mjs. */
  url: 'https://humanagencyprotocol.org',
  /** Social share card. 1200x630. */
  ogImage: '/og-image.png',
  github: 'https://github.com/humanagencyprotocol/hap-protocol',
  /** The conforming implementation — cross-linked for entity association. */
  implementation: 'https://www.suveren.ai',
};
