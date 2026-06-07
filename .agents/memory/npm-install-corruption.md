---
name: npm install corruption on fresh import
description: Fresh clones may have incompletely extracted npm packages; symptoms and fix.
---

# Incomplete npm package extraction

On a fresh GitHub import, individual installed packages can be missing files even
though `npm install` exits 0. Observed: `pdf-lib` missing its `cjs/api/form/`
dir ("Cannot find module './form'"), and `pdfjs-dist` missing `build/pdf.mjs`
(only `.map` files present), which breaks Vite dep pre-bundle for `react-pdf`.

**Fix:** clean reinstall — `rm -rf node_modules package-lock.json ~/.npm/_cacache`
then `npm install`. Reinstalling a single package may not be enough if several are
affected. Verify the specific missing files exist afterward.

**Why:** the import-time extraction was partial; a clean install repopulates them.
