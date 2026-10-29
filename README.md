# FloraVision - website edition 1.1

This ZIP contains the responsive Next.js website and Node.js inference backend. Training is supplied separately in **FloraVision-Training.ipynb**. No training commands or dataset files are bundled here. Trained weights are not included: add your own exports after running the notebook.

## Start in VS Code on Windows

1. Install Node.js 22 or newer from https://nodejs.org/en/download and restart VS Code.
2. Extract the ZIP. Open the folder that directly contains **package.json** and **package-lock.json**. The archive has one root folder, `floravision-website`; Windows may place it inside another folder when extracting.
3. Open Terminal > New Terminal and run each command separately:

```powershell
node -v
npm -v
dir package.json, package-lock.json
npm ci
npm run dev
```

Alternatively, double-click `Start-FloraVision.cmd` in the extracted folder after installing Node.js. It starts from its own directory and installs dependencies when missing.

Open http://localhost:3000. Keep the terminal running. Stop with Ctrl+C. If PowerShell blocks npm.ps1, use `npm.cmd ci` and `npm.cmd run dev`; no execution-policy change is necessary. If package.json is missing, use `Get-ChildItem -Recurse -Filter package.json` to locate the correct folder. Do not create a new empty package.json.

The clearly labeled demo works without trained weights. The real scanner requires an installed model for the selected crop. An unavailable or invalid model produces an error, never a made-up prediction.

## Install trained models

1. Run the separate notebook and download `FloraVision-Models.zip`.
2. Extract it; put its JSON files directly into this project's `models/` folder.
3. Run:

```bash
npm run models:check
npm run dev
```

Restart the server after changing models. Supported names are `potato-browser.json`, `pepper-browser.json`, `corn-browser.json`, `grape-browser.json`, `apple-browser.json`, and `tomato-browser.json`. The historical `browser` suffix does not describe execution: this website runs inference on the backend. Keep these files outside `public/`.

The notebook also generates `FloraVision-Evidence.zip`. Extract it and run:

```bash
npm run models:parity -- "C:\Users\DELL\Downloads\FloraVision-Evidence\reports"
```

Adjust that path to your extracted reports folder. This compares real-image tensors exported by Keras with the Node model. It checks conversion, not disease accuracy.

## Phone and camera

The interface has a mobile drawer, bottom navigation, touch targets, image preview, theme switching and an in-page camera. **Use camera** requests the rear-facing camera where available. Capture produces a JPEG. Closing the dialog stops the stream. **Choose photo** uses the device picker with a rear-camera hint; the exact picker is controlled by the operating system.

Live camera requires HTTPS or localhost, permission, and a browser exposing getUserMedia. Opening the Vercel HTTPS URL on a phone is the simplest deployment test. On a phone, localhost refers to the phone, not the laptop. Camera access on a plain HTTP LAN address usually will not work; the file picker remains available. No claim of support for every phone or embedded in-app browser is made.

For a local layout/file-upload test on the same Wi-Fi network:

```powershell
npm run dev:lan
ipconfig
```

Open `http://<your-laptop-IPv4>:3000` on the phone, permitting private-network access through your firewall when Windows asks. Do not expose the development server publicly. Test live camera on an HTTPS deployment.

JPEG, PNG and WebP are supported. HEIC is not accepted: capture a fresh image with the live camera or export JPEG. Uploaded files must be at most 20 MB on the client; files over 4 MB are compressed. The API caps images at 4,000,000 bytes and multipart requests at 4,250,000 bytes. Images must be at least 32 pixels per side and at most 20 megapixels.

## Vercel deployment

First verify the production build locally:

```bash
npm run typecheck
npm test
npm run models:check
npm run build
npm start
```

Create a GitHub repository from the project folder, including your intended model JSON files and package-lock.json. Do not commit node_modules, .next, datasets, or private environment files. In Vercel choose Add New > Project, import that repository and select the directory containing package.json as Root Directory. Framework preset is Next.js, install command is `npm ci`, build command is `npm run build`; use the default output directory. Select Node.js 22 or a compatible newer runtime. No API key or database is required. Deploy and verify `/api/health`, `/api/crops`, an actual scan, and camera access on the HTTPS URL.

`MODEL_DIR` normally stays unset: model files live in the project models folder and are included by Next.js output tracing. Do not set it to a Colab or Google Drive path. Optional `REVIEW_THRESHOLD` defaults to 0.70. It is a screening heuristic, not a calibrated confidence threshold. Changing environment variables or model files requires a new deployment.

Vercel request bodies are limited to 4.5 MB under the documented function contract; the app uses a smaller cap. Server inference is CPU-based and must be benchmarked with actual weights on the selected plan. This project has no shared rate limiter, login system, database or cross-device account history. Add platform rate limiting and load testing before broad public use.

## Source map

| File | Responsibility |
|---|---|
| app/page.tsx | Website entry |
| components/workspace.tsx | Overview, scanner, library, journal and model studio |
| components/camera-dialog.tsx | Live camera permission, preview, capture and cleanup |
| components/botanical.tsx | Original vector artwork |
| app/globals.css | Responsive layouts, themes and animations |
| lib/client.ts | Photo compression and local journal |
| app/api/predict/route.ts | Validation, prediction and result assembly |
| lib/image.ts | Bounded upload parsing, decoding and Pillow-compatible resizing |
| lib/model-engine.ts | Validated compact-CNN reconstruction and weight loading |
| lib/inference.ts | Model cache and tensor lifecycle |
| lib/catalog-data.json | Crop labels and educational advisory records |
| scripts/check-models.ts | Validate installed exports |
| scripts/check-parity.ts | Compare exported real-image references |
| tests/ | API, inference and preprocessing checks |

## Privacy, model scope and limitations

Photos are decoded in memory and not intentionally saved. Saved journal entries stay in this browser's localStorage and contain result metadata and filename, not the image. Clear history from the UI or browser storage. Maximum journal length is 100.

The user supplies the crop. There is no independently validated crop detector or non-leaf detector. Softmax can be high for a wrong crop or unfamiliar photograph. Advisory wording is an educational draft requiring agronomist review. Models cover the known classes only. Field performance requires external evaluation.

Read `docs/VERIFICATION.md` for checks actually performed and remaining gates. Read the separate architecture/viva guide for the paper comparison. This implementation uses React/custom CSS and Next.js/Node, whereas the uploaded proposal describes Tailwind/Flask.

References: https://nextjs.org/docs | https://vercel.com/docs/errors/function_payload_too_large | https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
