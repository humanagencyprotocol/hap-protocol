// Site configuration - version is read from package.json
import pkg from '../package.json';

export const siteConfig = {
  version: pkg.version,
  title: 'Human Agency Protocol',
  /**
   * The positioning line, in plain text.
   *
   * Shown as the brand line above the title on every versioned specification
   * document. The homepage sets the same words as its `<h1>` but cannot consume
   * this string, because it wraps "authority" in an accent span — so that one
   * copy is marked up by hand in `index.astro` and must be kept in step.
   *
   * Plain-english form of the v0.6 invariant: a mandate constrains execution;
   * it does not transfer authority.
   */
  tagline: 'Give AI autonomy without giving it authority',
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
