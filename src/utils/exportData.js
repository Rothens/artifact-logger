import { getAllCodeDefinitions, getAllItemRecords } from '../db/db';

export async function exportAllData() {
  const codeDefinitions = await getAllCodeDefinitions();
  const itemRecords = await getAllItemRecords();

  const payload = {
    appVersion: 1,
    exportedAt: new Date().toISOString(),
    codeDefinitions,
    itemRecords,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'artifact-logger-export.json';
  a.click();
  URL.revokeObjectURL(url);
}