# Verification - 29 October 2026

## Completed checks

- Dependencies installed successfully with npm ci using the included lockfile.
- TypeScript checking passed after the camera and parity additions.
- All 13 backend tests passed: multipart and image validation, invalid crop, origin mismatch, missing model, synthetic inference, advice mapping, weight structure/reference checks, tensor cleanup and Pillow bilinear enlargement/reduction parity.
- Notebook Python cells compile and contain zero comment tokens. The grouped split function was executed on synthetic image fixtures; split completeness, mapped/fallback behavior, duplicate exclusion, group separation and Apple annotation alias passed. Notebook/website labels and their order match for all six crops.
- The notebook has no dependency on a project ZIP, old Flask module name or manually defined notebook variables from earlier versions.

## Not verified here

- Real Colab/GPU training was not run. No trained disease weights or new accuracy results are supplied.
- Keras-to-Node parity with your trained models must be run after exporting. Constant-reference checks and a real-image parity command are supplied.
- Next.js production build was attempted; the environment returned `ENOENT: uv_resident_set_memory` during framework memory tracing before compilation. No framework patch was used. Production build/deployment is unverified.
- The managed preview service was unavailable (`sites-previewd` mailbox missing). Browser rendering, camera permission/capture, and physical Android/iPhone behavior could not be tested. Responsive CSS, camera cleanup and fallback paths were reviewed in source.

## Required release checks on your computer and phone

1. npm ci; npm run typecheck; npm test; npm run build.
2. Train in Colab, install exports, run npm run models:check and npm run models:parity with the extracted evidence reports path.
3. At widths 360, 390, 768 and 1280 px: inspect all screens, drawer, bottom navigation, scroll, keyboard focus and dialogs.
4. In current Android Chrome and iPhone Safari over HTTPS: grant and deny camera permission; capture a photo; close the camera and confirm its indicator stops; test the picker, retry, cancellation, and large-photo compression.
5. Run real predictions for each installed crop, save/download/delete journal records, reload and check persistence, and test invalid/corrupt/oversized inputs.
6. Record actual locked-test metrics and separate external field-image results. Record cold and warm website latency on named hardware before making performance claims.

The example demo and synthetic tests are not scientific evaluation results. The application is a screening prototype, not a validated agricultural diagnostic or offline edge application.
