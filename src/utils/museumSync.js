import { getAllCodeDefinitions, getAllItemRecords } from '../db/db';
import { getSyncSettings } from './syncSettings';

/**
 * Push all data to the museum.
 *
 * @param {function} onProgress  Called with { phase, done, total } during photo uploads.
 * @returns {object}  { codesNew, codesUpdated, itemsNew, itemsUpdated, photosUploaded, photosSkipped }
 */
export async function syncToMuseum(onProgress) {
  const { baseUrl, token } = getSyncSettings();
  if (!baseUrl || !token) throw new Error('Museum URL and token are not configured.');

  const base = baseUrl.replace(/\/$/, '');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // ── 1. Push codes + items (no photos) ──────────────────────────────────────
  const [codeDefinitions, allItems] = await Promise.all([
    getAllCodeDefinitions(),
    getAllItemRecords(),
  ]);

  // Strip photo dataUrl — keep name/width/height/size so the museum knows the filename
  const itemRecords = allItems.map((item) => {
    if (!item.photo) return item;
    const { dataUrl: _dropped, ...photoMeta } = item.photo;
    return { ...item, photo: photoMeta };
  });

  const pushRes = await fetch(`${base}/api/sync/push`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      appVersion: 1,
      exportedAt: new Date().toISOString(),
      photosIncluded: false,
      codeDefinitions,
      itemRecords,
    }),
  });

  if (!pushRes.ok) {
    const err = await pushRes.json().catch(() => ({}));
    throw new Error(err.error ?? `Push failed (${pushRes.status})`);
  }

  const pushResult = await pushRes.json();

  // ── 2. Upload photos one by one ────────────────────────────────────────────
  const itemsWithPhotos = allItems.filter((item) => item.photo?.dataUrl);
  let photosUploaded = 0;
  let photosSkipped = 0;

  for (let i = 0; i < itemsWithPhotos.length; i++) {
    const item = itemsWithPhotos[i];
    onProgress?.({ phase: 'photos', done: i, total: itemsWithPhotos.length });

    const res = await fetch(`${base}/api/sync/photo/${item.id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dataUrl: item.photo.dataUrl,
        name: item.photo.name ?? null,
        width: item.photo.width ?? null,
        height: item.photo.height ?? null,
        size: item.photo.compressedSize ?? item.photo.size ?? null,
      }),
    });

    if (!res.ok) {
      // Non-fatal — log and continue so a single bad photo doesn't abort everything
      console.warn(`Photo upload failed for item ${item.id}:`, res.status);
      continue;
    }

    const body = await res.json();
    if (body.skipped) {
      photosSkipped++;
    } else {
      photosUploaded++;
    }
  }

  onProgress?.({ phase: 'done', done: itemsWithPhotos.length, total: itemsWithPhotos.length });

  return {
    ...pushResult,
    photosUploaded,
    photosSkipped,
  };
}
