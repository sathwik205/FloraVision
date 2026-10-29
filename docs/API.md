# API contracts

All endpoints are same-origin. JSON success has `ok:true`; errors have `ok:false,error:{code,message}`. No upload or model management endpoint is exposed.

| Route | Purpose |
|---|---|
| `GET /api/health` | Process health/version; not model readiness |
| `GET /api/crops` | Six crops, ordered labels, installed-file status |
| `GET /api/demo` | Explicit illustrative fixture, `assessment.demo:true` |
| `POST /api/predict` | Multipart fields `crop` and `image`; actual server inference |

A successful prediction returns `assessment`: `id`, `crop`, `diseaseId`, `name`, `score`, `distribution:[{label,name,score}]`, `advisory`, `needsReview`, `modelVersion`, `durationMs`, `createdAt`, `demo:false`, `imageName`, `preprocessing`.

Installed status checks file presence and size; full validation is deferred to model load. Validated models are cached per server process/instance and invalidated by restarting or redeploying. Concurrent first requests share the same loading promise; failed loads are evicted for retry.

Validation: crops are allowlisted; image content must decode as JPEG/PNG/WebP; non-animated; at least 32 pixels on each side; at most 20 million pixels; max 4,000,000 image bytes and 4,250,000 request bytes. Original filenames are never used to build storage paths. Pixel data is oriented using EXIF, decoded to RGB, resized with the training bilinear filter and scaled to [0,1].

Errors: 400 invalid form/crop/image; 403 mismatched Origin; 413 oversized body; 503 missing/invalid model; 500 unexpected failure. Missing weights never trigger the demo or a predicted condition. `needsReview` defaults to score < 0.70 or missing guidance. Even unflagged outputs remain provisional.

```bash
curl -X POST http://localhost:3000/api/predict -F crop=potato -F image=@leaf.jpg
```

`POST` has no durable side effects. Public deployments may still need an account layer, shared rate limiting, monitoring and provider spending controls depending on usage. None is simulated in the UI.
