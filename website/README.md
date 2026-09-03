# Human Agency Protocol Website

The official website for humanagencyprotocol.org

## Project Structure

```
website/
├── src/
│   ├── content/
│   │   └── docs/          # Synced from ../content/<version>/ on every build
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── ContentLayout.astro
│   ├── pages/
│   │   ├── index.astro    # Homepage
│   │   ├── protocol.astro
│   │   ├── governance.astro
│   │   ├── changelog.astro
│   │   ├── review.astro
│   │   └── context.txt.ts
│   └── styles/
│       └── global.css
└── public/
```

## Commands

All commands are run from the root of the website directory:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |

## Content Management

The source of truth is `../content/<version>/`, where `<version>` is the `version` field in this directory's `package.json`. `npm run sync` (run automatically by `dev` and `build`) copies that whole directory into `src/content/docs/`. To publish a new spec version: bump `version` in `package.json`, add pages and nav entries for any new files, rebuild.

## Deployment

The site is configured for deployment to GitHub Pages at humanagencyprotocol.org

GitHub Actions workflow in `.github/workflows/deploy.yml` will automatically deploy on push to main branch.

## Design System

- **Colors**: Near-monochrome with accent color `#6366f1`
- **Typography**: System fonts, responsive scaling
- **Layout**: 1200px max-width, generous spacing
- **Principles**: Simplicity, accessibility, performance

## License

MIT
