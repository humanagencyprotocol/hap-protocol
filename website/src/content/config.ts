import { defineCollection, z } from 'astro:content';

const docsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    version: z.string(),
    date: z.string(),
    // Optional so a spec file without one still builds; BaseLayout falls back to
    // the site description. Authored in content/<version>/*.md so the summary
    // travels with the spec rather than living in the website.
    description: z.string().optional(),
  }),
});

export const collections = {
  docs: docsCollection,
};
