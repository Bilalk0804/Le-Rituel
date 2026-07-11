# Image Integration Test Playbook

Refer to this while testing `/api/skin/analyze` and any image-based endpoints in Le Rituel.

## Rules
- Use base64-encoded images (or multipart file upload). Prefer base64 for CI.
- Accepted formats: JPEG, PNG, WEBP only. Never SVG, BMP, HEIC, or animated GIF/APNG.
- The image must contain real visual features (objects, edges, textures, shadows).
- Do not send blank or solid-color images.
- If the source is animated, extract the first frame first.
- Re-detect MIME after any transcoding — do not trust the file extension.
- Resize large images to reasonable bounds (≤ 1920px on the long side) to keep payloads small.

## Le Rituel — /api/skin/analyze
- Method: POST
- Auth: requires cookie session (protected route)
- Body: `{ "image_base64": "<data-url or raw base64>", "mime_type": "image/jpeg" }`
- Success: `{ "analysis": { "skin_type": "...", "concerns": ["..."], "notes": "..." } }`
- Skin type ∈ { oily, dry, combination, normal, sensitive }
- Concerns ⊆ { acne, dark spots, fine lines, redness, dullness, large pores } — max 3
- Photo is NEVER persisted; the endpoint discards it after analysis.
- Failure modes to check:
  - Missing image → 422
  - Non-image MIME → 400
  - LLM returns non-JSON → endpoint retries once, else returns 502
