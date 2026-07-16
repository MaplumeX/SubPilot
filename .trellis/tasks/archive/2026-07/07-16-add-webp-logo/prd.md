# Add WebP support to logo upload and cache

## Goal

Allow users to upload and cache WebP logo images. Currently only JPG, PNG, and GIF
are accepted; WebP is a common modern format that is silently rejected by both the
upload and cache-logo flows, causing "Invalid file type" errors.

## Requirements

- Add `image/webp` to the backend content-type whitelist (`ALLOWED_CONTENT_TYPES`)
  and extension map (`EXT_MAP`) in `backend/app/routers/subscriptions.py`.
- Add `image/webp` to the frontend upload whitelist in
  `frontend/src/components/SubscriptionForm.tsx`.
- Update the error message in both i18n locale files (`en.json`, `zh-CN.json`) to
  include WebP in the allowed-formats text.
- Update the spec note in `backend/quality-guidelines.md` that documents the
  accepted content types (currently says "JPEG, PNG, and GIF").

## Acceptance Criteria

- [ ] Uploading a `.webp` logo via the subscription form succeeds (no "Invalid file type").
- [ ] Caching a WebP search-result image via `cache-logo` succeeds and serves
      `/static/logos/<uuid>.webp`.
- [ ] Existing JPG/PNG/GIF uploads still work.
- [ ] Error message text in both EN and ZH reflects the new allowed list.
- [ ] Spec note in `quality-guidelines.md` updated.

## Out of Scope

- SVG support (security considerations; separate decision).
- BMP / ICO support.
- Any changes to file-size limits or SSRF protections.