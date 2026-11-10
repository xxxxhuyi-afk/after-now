# Exhibition Library

The After Now Lab homepage links to `/lab/exhibitions`. The feature retains 202 cases, 3,039 images, 371 exhibit entries, and the five-zone Guangdong Science Center model (208 groups). Model geometry loads only after clicking its load button; case images load separately.

## Access protection

The library's HTML, catalogue, images, fonts, geometry, and textures are stored only as AES-256-GCM ciphertext in `public/exhibition-vault`. The supplied password is not included in source code or environment files. PBKDF2-SHA256 with a fresh 16-byte salt and 600,000 iterations derives the decryption key in the browser. Every asset uses a fresh random 12-byte nonce.

The gate at `/lab/exhibitions` checks an encrypted probe before opening the library. Its service worker controls only `/exhibition-library/`; other website features are unaffected. Decrypted resources are returned with `Cache-Control: no-store` and are not written into Cache Storage. A derived key, not the password, is retained in this tab's sessionStorage for up to eight hours. The lock button clears it. Authorized users can still save material they can view.

HTTPS and a modern browser with Service Worker and Web Crypto support are required. Localhost is supported for development. Password protection is cryptographic client-side access, not a server account system. Changing the password requires re-encrypting the vault; do not add the original plaintext album into `public` or Git history.

## Model scope

This contains the existing November 9 model, with estimated dimensions. The later requested quantum-gallery red-box geometry corrections are not included. The album labels this limitation.

## Verification

The route was built and tested with Next.js 16.2.12. Checks cover incorrect password rejection, unlocking, image loading, search, model lazy loading, group controls, reference switching, reload persistence, locking, and mobile layout. The full site's production build also passes. Two existing homepage CSS-module selectors were scoped to `.page` to make the existing animation rules valid module selectors.

The originating local archive and unencrypted source files remain outside this repository. Future content updates must rebuild the encrypted vault from those sources rather than editing encrypted `.bin` files.
