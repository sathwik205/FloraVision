# Model files

Place the crop JSON exports from the separate FloraVision training notebook here. Preserve the filenames ending in `-browser.json`. This suffix is historical; inference runs on the Node.js server.

Run `npm run models:check` after installation. Only the documented compact architecture is supported. Do not put `.keras`, `metadata.json`, dataset archives or arbitrary model formats here. Original Keras files remain in your Drive run folder.

No trained weights are included. A missing model disables real scans for that crop; the labeled demo is separate. Restart or redeploy after changing exports so cached weights are refreshed.
