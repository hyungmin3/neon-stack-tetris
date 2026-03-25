# Neon Stack Tetris

A browser-first Tetris practice project built with plain HTML, CSS, and JavaScript.

## Files

- `index.html`: app structure and UI panels
- `styles.css`: responsive layout, mobile touch controls, and visual styling
- `app.js`: game loop, Tetris logic, keyboard input, touch input, and localStorage high score

## Run locally

You can open `index.html` directly in a browser.

If you prefer a local web server and have Python installed:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

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

Because this project is plain static HTML, CSS, and JavaScript, no build step is required.

## Deploy to Cloudflare Pages

1. Create a new Pages project and connect your repository.
2. Set the build command to empty.
3. Set the output directory to `/`.
4. Deploy the repository as a static site.

This project does not need an API server for the current single-player version.
