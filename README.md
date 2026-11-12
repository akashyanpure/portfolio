# akashyanpure.com

Personal portfolio of Akash Yanpure, Data Engineer. Live at **https://www.akashyanpure.com**.

Hand-built static site (HTML, CSS, Canvas, WebGL), so there is no build step. Three.js r128 and GSAP 3.12.5 load from cdnjs with integrity hashes.

```
site/
  index.html        page content (edit text here)
  css/style.css     design system & layout
  js/main.js        shared canvas engine, nav, typing, terminal
  js/world.js       Three.js particle world morphing between data shapes on scroll
  js/story.js       GSAP ScrollTrigger choreography (chapters + 3D section entrances)
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
