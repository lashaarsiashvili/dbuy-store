# Project Guidelines & Architecture Memory

## Deployment & Hosting Target
- **Target Platform**: Cloudflare Pages / Static Site Hosting (e.g. `dbuystore.com`).
- **Firebase Status**: Completely decoupled (`ENABLE_FIREBASE = false`). Do NOT re-introduce Firebase or create mandatory external backend dependencies for viewing products, browsing, or cart functionality.
- **Runtime Environment**: The storefront must remain 100% functional in a purely static frontend environment without requiring a running Node.js server.

## Data Persistence & State Management
- **Catalog Source of Truth**:
  - `src/data/initialProducts.ts` and `src/data/initialBillboards.ts` hold the default pre-baked catalog and billboards.
  - In `StoreContext.tsx`, `products` and `billboards` state initializers must always sanitize URLs and gracefully fall back to `initialProducts` if `localStorage` is empty or has 0 products. This prevents blank screens if a user clears their cache or visits on a fresh browser.
- **Image URL Sanitization (Crucial)**:
  - All image URLs in products and billboards must be relative paths starting with `/uploads/...` (never absolute container URLs like `https://ais-dev-...` or `https://ais-pre-...`).
  - `sanitizeImageUrl`, `sanitizeProductUrls`, and `sanitizeBillboardUrls` must be preserved in `StoreContext.tsx` to continuously protect against domain mismatches, broken image links, or CORS errors when running on custom domains.

## Build Process & Asset Handling
- **Image Bundling**:
  - The `build` script in `package.json` must always copy upload assets from `data/uploads/` into `public/uploads/` before bundling:
    ```bash
    mkdir -p public/uploads && (cp -r data/uploads/* public/uploads/ 2>/dev/null || true) && tsx scripts/generate-sitemap.ts && vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
    ```
  - This guarantees that all images reside directly inside `dist/uploads/` on the static build.
- **Routing**:
  - `public/_redirects` should maintain SPA fallback (`/* /index.html 200`) for Cloudflare Pages routing. Do NOT add `/api/*` rewrite rules to `_redirects` as that overrides Cloudflare Pages Functions.

## Contact Form & Email Dispatch Architecture
- **Dual-Environment Dispatch**:
  - **AI Studio Container (Local/Dev)**: Handled by `server.ts` at `POST /api/contact` via `nodemailer` connecting to Zoho Mail SMTP (`smtp.zoho.eu`, port 465 SSL).
  - **Cloudflare Pages (Production `dbuystore.com`)**: Handled serverlessly by `functions/api/contact.ts` at `POST /api/contact` via Cloudflare Sockets (`cloudflare:sockets`) connecting to Zoho Mail SMTP (`smtp.zoho.eu`, port 465 SSL).
  - Both endpoints send the official DBUY Store HTML support ticket to `support@dbuystore.com` and `lashaarsiashvili@gmail.com`, and send an auto-acknowledgement email back to the customer.
