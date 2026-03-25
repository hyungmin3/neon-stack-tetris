# Neon Stack Tetris

A browser-first Tetris practice project built with Vite, vanilla JavaScript, ESLint, and Prettier.

## Project structure

- `index.html`: Vite entry HTML
- `src/main.js`: game loop, input, rendering, and localStorage logic
- `src/styles.css`: responsive layout, touch controls, and visual styling
- `public/.nojekyll`: copied into the build output for GitHub Pages
- `.github/workflows/deploy-pages.yml`: build and deploy workflow for GitHub Pages

## Run locally

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build the production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Lint and format:

```bash
npm run lint
npm run format
```

## Controls

- `Left / Right`: move piece
- `Up` or `X`: rotate clockwise
- `Down`: soft drop while held
- `Space`: hard drop
- `P`: pause or resume
- `R`: restart

Mobile uses on-screen touch buttons for the same actions.

## Features in this version

- 10x20 board
- All 7 standard tetrominoes
- Line clearing, scoring, levels, pause, restart, and game over
- Keyboard controls and mobile touch controls
- `localStorage` best score persistence
- No backend required

## Deploy to GitHub Pages

This repository includes a GitHub Actions workflow for Pages deployment.

1. Push the project to a GitHub repository.
2. In GitHub, open `Settings > Pages`.
3. Set `Build and deployment` to `GitHub Actions`.
4. Push to the `main` branch.
5. Wait for the `Deploy static content to Pages` workflow to finish.
6. Open the published Pages URL.

The workflow installs dependencies, builds the app with Vite, and uploads `dist/`.

## Deploy to Cloudflare Pages

1. Create a new Pages project and connect your repository.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Deploy the repository as a static site.

This project does not need an API server for the current single-player version.
