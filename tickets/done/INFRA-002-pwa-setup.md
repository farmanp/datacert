# AI-Ready Infra Template

## 1. Objective (Required)
**What:**
Configure the application as a Progressive Web App (PWA) with offline capability, installability, and service worker caching.

**Why:**
PWA capability is a core differentiator for DataLens. Users should be able to install the app to their desktop, use it offline, and have a fast, app-like experience. This is essential for the "zero-install, fully local" value proposition.

## 2. Scope (Required)
**In Scope:**
- Web App Manifest (`manifest.json`) with name, icons, theme colors
- App icons in required sizes (192x192, 512x512, maskable)
- Service worker setup using Workbox
- Cache strategy: app shell (cache-first), WASM modules (cache-first), API calls (network-only)
- Offline fallback page
- Install prompt handling
- Update notification when new version available

**Out of Scope:**
- Push notifications
- Background sync
- IndexedDB for report storage (separate ticket)
- OPFS configuration (separate ticket)

## 3. Technical Approach
**Strategy:**
1. Create manifest.json with PWA metadata
2. Generate app icons from source SVG
3. Configure Workbox in Vite via `vite-plugin-pwa`
4. Implement cache strategies:
   - Precache: index.html, CSS, JS, WASM
   - Runtime cache: nothing for MVP (all assets precached)
5. Add install prompt UI component
6. Add update-available notification

**Files to Create/Modify:**
- `public/manifest.json` - PWA manifest
- `public/icons/` - App icons (192, 512, maskable)
- `vite.config.ts` - Add vite-plugin-pwa configuration
- `src/app/components/InstallPrompt.tsx` - Install banner
- `src/app/components/UpdateNotification.tsx` - Update toast

**Dependencies:**
```json
{
  "vite-plugin-pwa": "^0.17.x",
  "workbox-core": "^7.x",
  "workbox-precaching": "^7.x"
}
```

## 4. Acceptance Criteria (Required)
- [ ] Lighthouse PWA audit score >= 90
- [ ] App is installable on Chrome desktop and Android
- [ ] App works fully offline after first load
- [ ] WASM modules load from cache when offline
- [ ] Service worker updates trigger user notification
- [ ] Manifest includes all required fields (name, icons, start_url, display)
- [ ] Icons display correctly in all contexts (home screen, taskbar, splash)

## 5. Rollback Plan
Remove vite-plugin-pwa and delete manifest/service worker files. App will function as standard web app.

## 6. Planned Git Commit Message(s)
- chore(pwa): add web app manifest with icons
- chore(pwa): configure workbox service worker via vite-plugin-pwa
- feat(ui): add install prompt component
- feat(ui): add update notification component

## 7. Verification
- [ ] Lighthouse PWA audit passes
- [ ] Test offline mode in Chrome DevTools
- [ ] Test install flow on Chrome desktop
- [ ] Test install flow on Android Chrome
- [ ] Verify cache contains all required assets
- [ ] Verify service worker updates correctly
