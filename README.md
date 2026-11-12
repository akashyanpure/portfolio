# akashyanpure.com

Personal portfolio of Akash Yanpure, Data Engineer. Live at **https://www.akashyanpure.com**.

Hand-built static site (HTML, CSS, Canvas), so there is no build step and no dependencies.

```
site/
  index.html        page content (edit text here)
  css/style.css     design system & layout
  js/main.js        shared canvas engine, hero network, nav, terminal
  js/lab.js         six animated data-engineering concepts
  js/ai.js          next-token prediction demo + animated RAG pipeline
  assets/           photo + résumé PDF
  CNAME             custom domain
.github/workflows/deploy.yml   deploys site/ to GitHub Pages on every push to main
```

## Local preview

Open `site/index.html` in a browser, or run `npx serve site` (or `python -m http.server -d site`).

## Deploy

Push to `main`. GitHub Actions publishes `site/` to GitHub Pages automatically.
