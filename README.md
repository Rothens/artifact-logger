# Artifact Logger

[![Ko-fi](https://img.shields.io/badge/Support%20on-Ko--fi-FF5F5F?logo=ko-fi&logoColor=white)](https://ko-fi.com/Nipponkalandor)

A fully offline Progressive Web App (PWA) for logging physical artifacts — souvenirs, snacks, tickets, gifts, and anything else worth remembering. Scan or enter a barcode/QR code, fill in details (photo, price, location, notes), and export everything as JSON or sync directly to [Artifact Museum](https://github.com/Rothens/artifact-museum).

> **Try it live → [rothens.github.io/artifact-logger](https://rothens.github.io/artifact-logger/)**

## Key characteristics

**Offline-first.** The app works entirely without an internet connection once installed. There is no server, no account required. All data is stored in the browser's IndexedDB on your device and goes nowhere unless you explicitly export or sync it.

**Your data stays on your device.** Nothing is sent anywhere without your action. Photos, locations, notes, and all other records remain in local browser storage until you delete them, export them, or sync them manually. Clearing your browser data or uninstalling the PWA will erase everything — see [Persistent storage](#persistent-storage) below.

## What it does

- Scan QR codes and barcodes with the device camera, or enter a code manually
- Two code modes:
  - **Unique object** — one physical artifact, one record (e.g. a souvenir)
  - **Repeatable product** — multiple purchases of the same product (e.g. a favourite snack)
- Per-item logging: label, notes, photo, GPS location, price/currency, shop, recipient, consumed/gifted flags
- Quick capture mode: stamp the current timestamp and GPS in one tap, then fill details later
- Autosave while editing — changes are saved automatically after a short pause
- **Export JSON** (with photos) or **Export JSON slim** (metadata only, no photo data — lighter file, photo filenames are preserved so you can match them manually)
- **Sync to Museum** — push data directly to Artifact Museum over the network using an API token (no file download needed)
- Search and filter items on the home screen by name or category
- Offline indicator badge when the device has no network connection
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

The included GitHub Actions workflow (`.github/workflows/deploy.yml`) handles everything automatically. Just enable GitHub Pages in your repo settings:

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Push to `main` — the workflow builds and deploys automatically

The `VITE_BASE_PATH` env var is set to `/artifact-logger/` in the workflow so assets resolve correctly under the sub-path. When building for a server at a root domain, omit the variable and it defaults to `/`.

The PWA service worker requires HTTPS, which GitHub Pages provides by default.

> Docker support is planned for a future release.

## Support

If Artifact Logger is useful to you, consider buying me a coffee: **[ko-fi.com/Nipponkalandor](https://ko-fi.com/Nipponkalandor)** ☕

## Syncing to Artifact Museum

Instead of exporting a JSON file and uploading it manually, you can sync directly:

1. In Artifact Museum admin, go to **Tokens** and create an API token — copy it on first display, it is shown only once
2. In the Artifact Logger app, go to **Settings → Museum Sync**, paste the museum base URL and the token, then tap **Save**
3. Use **Test Connection** to verify the settings
4. On the home screen, tap **Sync to Museum** — the app pushes all codes and items first, then uploads photos one by one

Photos are never overwritten on the museum side: if a photo is already stored for an item, re-syncing will skip it.

## Persistent storage

By default, browsers may evict IndexedDB data under storage pressure. To protect your data:

1. Open **Settings** in the app
2. Click **Request persistent storage**

When granted, the browser will not clear your data without explicit user action. The Settings page shows current storage usage and quota.

**Always export your data regularly** via the **Export JSON** button on the home screen. Keep the export file somewhere safe — it is the only backup mechanism if you do not use Museum sync.

## Architecture

**Stack:** React 19 · Vite · vite-plugin-pwa · IndexedDB (via idb) · Bootstrap 5 · html5-qrcode

```
src/
  db/db.js                  — IndexedDB layer (idb): code definitions + item records
  pages/
    HomePage.jsx            — Recent items, export buttons, museum sync, search/filter
    ScanPage.jsx            — Camera / manual code entry
    NewCodePage.jsx         — Create/configure a new code definition
    ItemPage.jsx            — Log and edit a single item record (autosave, datetime picker)
    CodePage.jsx            — View/edit a code definition and its items
    SettingsPage.jsx        — Language, theme, storage info, museum sync settings, danger zone
  components/
    CameraScanner.jsx       — html5-qrcode wrapper
    ConfirmModal.jsx        — Reusable confirmation dialog (replaces window.confirm)
    HelpModal.jsx           — In-app help with context-aware section highlighting
  utils/
    exportData.js           — Serialise all data to JSON blob + download (full or slim)
    imageCompression.js     — Client-side photo compression before storage
    quickCapture.js         — Stamp timestamp + GPS in one action
    storageInfo.js          — navigator.storage API helpers
    museumSync.js           — Direct sync to Artifact Museum via API token
    syncSettings.js         — Read/write museum URL + token from localStorage
  constants.js              — Shared constants (photo limits, timing values)
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
| `collectedAt` | string | ISO timestamp — editable via datetime picker |
| `location` | object\|null | `{ lat, lng, accuracy }` |
| `photo` | object\|null | `{ dataUrl, name, width, height, compressedSize }` — `name` is the original filename |
| `metadata` | object | `{ price, currency, sourceShop, recipient, consumed, gifted }` |

### Export format

**Full export** (`artifact-logger-export.json`) — includes `photo.dataUrl`:

```json
{
  "appVersion": 1,
  "exportedAt": "2025-01-01T12:00:00.000Z",
  "photosIncluded": true,
  "codeDefinitions": [ /* array of codeDefinition objects */ ],
  "itemRecords":     [ /* array of itemRecord objects, photo includes dataUrl */ ]
}
```

**Slim export** (`artifact-logger-export-no-photos.json`) — omits `photo.dataUrl`, keeps filename and dimensions:

```json
{
  "appVersion": 1,
  "exportedAt": "2025-01-01T12:00:00.000Z",
  "photosIncluded": false,
  "codeDefinitions": [ /* ... */ ],
  "itemRecords":     [ /* photo: { name, width, height, compressedSize } — no dataUrl */ ]
}
```

Both formats are importable into Artifact Museum. When `photosIncluded` is false, the museum stores the photo filename so an admin can manually upload the matching file later.
