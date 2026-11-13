# akashyanpure.com

Personal portfolio of Akash Yanpure, Data Engineer. Live at **https://www.akashyanpure.com**.

Hand-built static site (HTML, CSS, Canvas, WebGL), so there is no build step. Three.js r128 and GSAP 3.12.5 (cdnjs) and Lenis 1.1.13 (jsDelivr) load with integrity hashes; fonts are self-hosted in `site/fonts/` (SIL OFL) with metric-matched fallbacks.

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

Run `python -m http.server 8000 -d site` and open http://localhost:8000 (opening the file directly works, but browsers block self-hosted fonts over `file://`, so text shows in the fallback fonts).

## Deploy

Push to `main`. GitHub Actions publishes `site/` to GitHub Pages automatically.
