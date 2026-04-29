import { openDB } from 'idb';
import { buildCodeKey, generateId } from '../utils/code';

const DB_NAME = 'artifactLoggerDb';
const DB_VERSION = 1;

const CODE_STORE = 'codeDefinitions';
const ITEM_STORE = 'itemRecords';

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(CODE_STORE)) {
        const codeStore = db.createObjectStore(CODE_STORE, { keyPath: 'id' });
        codeStore.createIndex('codeKey', 'codeKey', { unique: true });
      }

      if (!db.objectStoreNames.contains(ITEM_STORE)) {
        const itemStore = db.createObjectStore(ITEM_STORE, { keyPath: 'id' });
        itemStore.createIndex('codeDefinitionId', 'codeDefinitionId', { unique: false });
        itemStore.createIndex('collectedAt', 'collectedAt', { unique: false });
      }
    },
  });
}

/* -----------------------------
   Code Definitions
----------------------------- */

export async function getAllCodeDefinitions() {
  const db = await getDb();
  return db.getAll(CODE_STORE);
}

export async function getCodeDefinitionById(id) {
  const db = await getDb();
  return db.get(CODE_STORE, id);
}

export async function getCodeDefinitionByCode(codeType, codeValue) {
  const db = await getDb();
  const codeKey = buildCodeKey(codeType, codeValue);
  return db.getFromIndex(CODE_STORE, 'codeKey', codeKey);
}

export async function createCodeDefinition({
  codeType,
  codeValue,
  mode,
  name = '',
  category = 'other',
  notes = '',
}) {
  const db = await getDb();

  const record = {
    id: generateId(),
    codeType,
    codeValue,
    codeKey: buildCodeKey(codeType, codeValue),
    mode,
    name,
    category,
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.put(CODE_STORE, record);
  return record;
}

export async function saveCodeDefinition(codeDefinition) {
  const db = await getDb();
  const updated = {
    ...codeDefinition,
    updatedAt: new Date().toISOString(),
  };
  await db.put(CODE_STORE, updated);
  return updated;
}

/* -----------------------------
   Item Records
----------------------------- */

export async function getAllItemRecords() {
  const db = await getDb();
  return db.getAll(ITEM_STORE);
}

export async function getItemRecordById(id) {
  const db = await getDb();
  return db.get(ITEM_STORE, id);
}

export async function getItemRecordsByCodeDefinitionId(codeDefinitionId) {
  const db = await getDb();
  return db.getAllFromIndex(ITEM_STORE, 'codeDefinitionId', codeDefinitionId);
}

export async function getLatestItemRecordByCodeDefinitionId(codeDefinitionId) {
  const items = await getItemRecordsByCodeDefinitionId(codeDefinitionId);
  items.sort((a, b) => {
    const aTime = a.collectedAt || a.updatedAt || '';
    const bTime = b.collectedAt || b.updatedAt || '';
    return bTime.localeCompare(aTime);
  });
  return items[0] || null;
}

export async function createItemRecord({
  codeDefinitionId,
  label = '',
  notes = '',
}) {
  const db = await getDb();

  const record = {
    id: generateId(),
    codeDefinitionId,
    label,
    notes,
    collectedAt: '',
    updatedAt: new Date().toISOString(),
    location: null,
    photo: null,
    metadata: {
      price: '',
      currency: 'JPY',
      sourceShop: '',
      recipient: '',
      consumed: false,
      gifted: false,
    },
  };

  await db.put(ITEM_STORE, record);
  return record;
}

export async function saveItemRecord(itemRecord) {
  const db = await getDb();
  const updated = {
    ...itemRecord,
    updatedAt: new Date().toISOString(),
  };
  await db.put(ITEM_STORE, updated);
  return updated;
}

/* -----------------------------
   Scan Flow Helper
----------------------------- */

export async function resolveExistingCodeScan(codeType, codeValue) {
  const codeDefinition = await getCodeDefinitionByCode(codeType, codeValue);

  if (!codeDefinition) {
    return {
      kind: 'new_code',
      codeType,
      codeValue,
    };
  }

  if (codeDefinition.mode === 'unique_object') {
    let item = await getLatestItemRecordByCodeDefinitionId(codeDefinition.id);

    if (!item) {
      item = await createItemRecord({
        codeDefinitionId: codeDefinition.id,
      });
    }

    return {
      kind: 'open_unique_item',
      codeDefinition,
      item,
    };
  }

  const latestItem = await getLatestItemRecordByCodeDefinitionId(codeDefinition.id);

  return {
    kind: 'repeatable_product',
    codeDefinition,
    latestItem,
  };
}

export async function updateItemRecordPartial(id, patch) {
  const db = await getDb();
  const existing = await db.get(ITEM_STORE, id);

  if (!existing) {
    throw new Error(`Item record not found: ${id}`);
  }

  const updated = {
    ...existing,
    ...patch,
    metadata: {
      ...existing.metadata,
      ...(patch.metadata || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  await db.put(ITEM_STORE, updated);
  return updated;
}

export async function createItemRecordWithTimestamp({
  codeDefinitionId,
  label = '',
  notes = '',
}) {
  const db = await getDb();

  const record = {
    id: generateId(),
    codeDefinitionId,
    label,
    notes,
    collectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    location: null,
    photo: null,
    metadata: {
      price: '',
      currency: 'JPY',
      sourceShop: '',
      recipient: '',
      consumed: false,
      gifted: false,
    },
  };

  await db.put(ITEM_STORE, record);
  return record;
}

export async function deleteItemRecord(id) {
  const db = await getDb();
  await db.delete(ITEM_STORE, id);
}

export async function deleteAllData() {
  const db = await getDb();
  const tx = db.transaction([CODE_STORE, ITEM_STORE], 'readwrite');
  await tx.objectStore(ITEM_STORE).clear();
  await tx.objectStore(CODE_STORE).clear();
  await tx.done;
}

export async function deleteCodeDefinitionAndItems(codeDefinitionId) {
  const db = await getDb();

  // Single transaction — if any delete fails the whole operation rolls back,
  // preventing orphaned item records from referencing a deleted code definition.
  const tx = db.transaction([CODE_STORE, ITEM_STORE], 'readwrite');
  try {
    const itemStore = tx.objectStore(ITEM_STORE);
    const index = itemStore.index('codeDefinitionId');
    const items = await index.getAll(codeDefinitionId);

    await Promise.all(items.map((item) => itemStore.delete(item.id)));
    await tx.objectStore(CODE_STORE).delete(codeDefinitionId);
    await tx.done;
  } catch (err) {
    tx.abort();
    throw err;
  }
}