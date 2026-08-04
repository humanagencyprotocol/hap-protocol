import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { siteConfig } from '../config';

/**
 * Specification feed.
 *
 * The spec is versioned and dated, so it has a real publication history worth
 * subscribing to. Aggregators and AI crawlers both consume feeds, which is the
 * cheapest discovery surface this site can offer.
 *
 * `date` in the frontmatter is a human string ("June 2026"). Anything Date
 * cannot parse falls back to undefined rather than emitting "Invalid Date".
 */
export async function GET(context: APIContext) {
  const docs = await getCollection('docs');
  const origin = (context.site ?? new URL(siteConfig.url)).origin;

  return rss({
    title: `${siteConfig.title} — specification`,
    description: siteConfig.description,
    site: context.site ?? siteConfig.url,
    items: docs.map((doc) => {
      const parsed = new Date(doc.data.date);
      return {
        title: doc.data.title,
        description: doc.data.description ?? '',
        // Absolute and slash-free, matching the canonical tag. Left relative,
        // the feed helper appends a trailing slash and advertises a second URL
        // for every document.
        link: `${origin}/${doc.slug}`,
        ...(Number.isNaN(parsed.valueOf()) ? {} : { pubDate: parsed }),
      };
    }),
    customData: '<language>en</language>',
  });
}
