import { getAllCodeDefinitions, getAllItemRecords } from '../db/db';

/**
 * Build and trigger a JSON download of all data.
 *
 * @param {object} options
 * @param {boolean} [options.includePhotos=true]
 *   When false, strips photo.dataUrl from every item record but keeps
 *   photo.name (and all other fields) so the receiver knows which file
 *   to look for. Results in a much smaller file.
 */
export async function exportAllData({ includePhotos = true } = {}) {
  const codeDefinitions = await getAllCodeDefinitions();
  let itemRecords = await getAllItemRecords();

  if (!includePhotos) {
    itemRecords = itemRecords.map((item) => {
      if (!item.photo) return item;
      // Keep everything except the dataUrl
      const { dataUrl: _dropped, ...photoMeta } = item.photo;
      return { ...item, photo: photoMeta };
    });
  }

  const payload = {
    appVersion: 1,
    exportedAt: new Date().toISOString(),
    photosIncluded: includePhotos,
    codeDefinitions,
    itemRecords,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });

  const suffix = includePhotos ? '' : '-no-photos';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `artifact-logger-export${suffix}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
