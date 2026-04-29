import { updateItemRecordPartial } from '../db/db';
import { GEO_OPTIONS } from '../constants';

export async function quickCaptureLocation(itemId) {
  if (!navigator.geolocation) {
    return {
      ok: false,
      reason: 'Geolocation is not supported.',
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const updated = await updateItemRecordPartial(itemId, {
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          },
        });

        resolve({
          ok: true,
          item: updated,
        });
      },
      (error) => {
        resolve({
          ok: false,
          reason: error.message,
        });
      },
      GEO_OPTIONS
    );
  });
}