# Image Canvas v0.1

Local route: `/lab/image-canvas`. Import a PNG/JPEG/WebP to test dragging, resizing, downloads and local draft saving before connecting AI.

In Vercel → Project → Settings → Environment Variables, configure these **server-only** values and mark secrets Sensitive:

- `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare account ID.
- `CLOUDFLARE_API_TOKEN`: restricted to Workers AI Run for that account.
- `IMAGE_CANVAS_PASSWORD`: a long, unique personal canvas passphrase, separate from account passwords.

Never put these in GitHub, client source, or a `NEXT_PUBLIC_` variable. Redeploy after setting variables. For local use place them in `.env.local` (already ignored by Git).

Model: `@cf/stabilityai/stable-diffusion-xl-base-1.0`. Backend applies selected visual rules; these are prompt presets, not a general Skill execution engine. Generation returns a binary image from Cloudflare. No fake fallback images.

This prototype uses a shared passphrase, not account login. Only share it with yourself. It has no durable server rate limiter; before opening to visitors add persistent per-user limits, authentication, and abuse protection. The provider's free-plan quota is the final cap; avoid enabling paid overages for the experiment.

Images and drafts remain in the browser; localStorage has limited space and saving may fail for many images. The passphrase is held only in page memory. Imported images do not get sent to Cloudflare. Generation sends the text prompt to Cloudflare. Images are not automatically published to the homepage.
