# Artifact Logger

A fully offline Progressive Web App (PWA) for logging physical artifacts — souvenirs, snacks, tickets, gifts, and anything else worth remembering. Scan or enter a barcode/QR code, fill in details (photo, price, location, notes), and export everything as JSON for use with [Artifact Museum](../artifact-museum).

## Key characteristics

**Offline-first.** The app works entirely without an internet connection once installed. There is no server, no account, no cloud sync. All data is stored in the browser's IndexedDB on your device and goes nowhere unless you explicitly export it.

**Your data stays on your device.** Nothing is sent anywhere. Photos, locations, notes, and all other records remain in local browser storage until you delete them or export them manually. Clearing your browser data or uninstalling the PWA will erase everything — see [Persistent storage](#persistent-storage) below.

## What it does

- Scan QR codes and barcodes with the device camera, or enter a code manually
- Two code modes:
  - **Unique object** — one physical artifact, one record (e.g. a souvenir)
  - **Repeatable product** — multiple purchases of the same product (e.g. a favourite snack)
- Per-item logging: label, notes, photo, GPS location, price/currency, shop, recipient, consumed/gifted flags
- Quick capture mode: stamp the current timestamp and GPS in one tap, then fill details later
- Export all data as a JSON file — importable into Artifact Museum
- Language switcher (Hungarian / English), dark/light/system theme
- Installable as a PWA (works on Android, iOS, desktop Chrome/Edge)

## Requirements

- Node.js 18+
- npm
- A modern browser or device for running the built app

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
npm run lint     # ESLint
```

## Deployment

Artifact Logger is a static site — the `dist/` output of `npm run build` can be served from any static host.

### GitHub Pages

Yes, Artifact Logger can be deployed to GitHub Pages. It has no server-side code; everything runs in the browser.

1. Set `base` in `vite.config.js` to your repository path:
   ```js
   export default defineConfig({
     base: '/artifact-logger/',   // replace with your repo name
     // ...
   })
   ```
2. Build: `npm run build`
3. Deploy the `dist/` directory to the `gh-pages` branch (e.g. with the [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages) GitHub Action)

The PWA service worker requires HTTPS, which GitHub Pages provides by default.

> **Note:** If the app is served from a sub-path (e.g. `https://user.github.io/artifact-logger/`), the PWA `start_url` in `vite.config.js` must also be updated to match (e.g. `start_url: '/artifact-logger/'`).

> Docker support is planned for a future release.

## Persistent storage

By default, browsers may evict IndexedDB data under storage pressure. To protect your data:

1. Open **Settings** in the app
2. Click **Request persistent storage**

When granted, the browser will not clear your data without explicit user action. The Settings page shows current storage usage and quota.

**Always export your data regularly** via the **Export JSON** button on the home screen. Keep the export file somewhere safe — it is the only backup mechanism.

## Architecture

**Stack:** React 19 · Vite · vite-plugin-pwa · IndexedDB (via idb) · Bootstrap 5 · html5-qrcode

```
src/
  db/db.js                  — IndexedDB layer (idb): code definitions + item records
  pages/
    HomePage.jsx            — Recent items, export, quick capture toggle
    ScanPage.jsx            — Camera / manual code entry
    NewCodePage.jsx         — Create/configure a new code definition
    ItemPage.jsx            — Log and edit a single item record
    CodePage.jsx            — View/edit a code definition and its items
    SettingsPage.jsx        — Language, theme, storage info, danger zone
  components/
    CameraScanner.jsx       — html5-qrcode wrapper
  utils/
    exportData.js           — Serialise all data to JSON blob + download
    imageCompression.js     — Client-side photo compression before storage
    quickCapture.js         — Stamp timestamp + GPS in one action
    storageInfo.js          — navigator.storage API helpers
  i18n/
    translations.js         — EN/HU string table
    I18nProvider.jsx        — React context + localStorage persistence
  theme/
    ThemeProvider.jsx       — Light/dark/system theme with localStorage
```

### Data model

**codeDefinitions** (IndexedDB object store)

| Field | Type | Description |
|---|---|---|
| `id` | string | Random UUID |
| `codeType` | string | e.g. `qr_code`, `ean_13`, `code_128` |
| `codeValue` | string | Raw scanned value |
| `codeKey` | string | `"${codeType}:${codeValue}"` — unique index |
| `mode` | string | `unique_object` or `repeatable_product` |
| `name` | string | Human-readable name |
| `category` | string | `sand`, `snack`, `drink`, `souvenir`, `gift`, `ticket`, `storage`, `other` |
| `notes` | string | Internal notes about the code |

**itemRecords** (IndexedDB object store)

| Field | Type | Description |
|---|---|---|
| `id` | string | Random UUID |
| `codeDefinitionId` | string | FK → codeDefinitions |
| `label` | string | Per-instance label |
| `notes` | string | Free-text notes |
| `collectedAt` | string | ISO timestamp |
| `location` | object\|null | `{ lat, lng, accuracy }` |
| `photo` | object\|null | `{ dataUrl, width, height, compressedSize }` |
| `metadata` | object | `{ price, currency, sourceShop, recipient, consumed, gifted }` |

### Export format

```json
{
  "appVersion": 1,
  "exportedAt": "2025-01-01T12:00:00.000Z",
  "codeDefinitions": [ /* array of codeDefinition objects */ ],
  "itemRecords":     [ /* array of itemRecord objects */ ]
}
```

This JSON file is the input for the **Import** feature in Artifact Museum.
