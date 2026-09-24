# Parked: YouTube comments integration

Removed from the live app on 2026-09-24 (decision: not shipping it now). A full
working copy is kept here so it can be restored later:

- `src/`   — the whole `mobile/src` as it was WITH the integration (youtube.js,
             app.js YouTube section, db.js external_id columns, strings in 7 languages).
- `native/` — Info.plist (iOS URL scheme), AndroidManifest.xml (oauth2redirect
             intent-filter), SiriIntents.swift (YouTube channel label), package.json
             (`@capacitor/browser`).

To restore: copy `src/` back over `mobile/src`, copy the native files back, run
`pnpm add @capacitor/browser@^8`, `pnpm run build`, `npx cap sync`, then fill in the
Google OAuth client IDs in `youtube.js` (see its header comment).
Verified before parking: sign-in, sync, dedupe, reply, token refresh, revoke — against a
stubbed Google API in the browser only (never against real Google).
