# Image Canvas

Current version uses verified-email login and persistent daily quotas. See PUBLIC-CANVAS.md for setup. The earlier shared passphrase is no longer accepted. Images and drafts remain in the browser.

## Local open-source generation

For private local testing, set `IMAGE_CANVAS_PROVIDER=local` in `.env.local` (copy `.env.local.example`), then restart Next.js. Set `AFTER_NOW_LOCAL_DATA` to a folder on a drive with enough free space (for example `D:\AfterNow\ImageCanvas`) to keep the virtual environment, model weights, runtime cache, and generated PNGs off the system drive. Install the runtime with `npm run image:local:setup`, start it in a separate terminal with `npm run image:local`, and refresh `/lab/image-canvas`. Runtime files are kept in `.local-image-runtime` within that folder; generated images are in `outputs`. These files are not part of website builds or uploads.

This mode binds only to `127.0.0.1` and uses the local CUDA GPU. It does not require ComfyUI, Cloudflare credentials, or a canvas login. Generated PNGs are saved in the selected data folder's `outputs` directory, so the canvas stores only a small local file link in the browser. The machine needs an NVIDIA GPU with enough free VRAM and several GB of disk space. To return to website/cloud mode, remove `IMAGE_CANVAS_PROVIDER=local` and restart Next.js.
