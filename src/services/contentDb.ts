import {
  ContentBackupPayload,
  EpisodeContent,
  StoredMediaRecord
} from '../types/lms';

const DB_NAME = 'myob_smartguide_content_db';
const DB_VERSION = 1;
const STORE_EPISODES = 'episodes';
const STORE_MEDIA = 'media';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak didukung di browser ini.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_EPISODES)) {
        db.createObjectStore(STORE_EPISODES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error('Gagal membuka IndexedDB.'));
  });
}

export async function getAllCustomEpisodes(): Promise<EpisodeContent[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EPISODES, 'readonly');
    const store = tx.objectStore(STORE_EPISODES);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as EpisodeContent[]) || []);
    req.onerror = () => reject(req.error || new Error('Gagal membaca data episode.'));
  });
}

export async function saveCustomEpisode(episode: EpisodeContent): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EPISODES, 'readwrite');
    const store = tx.objectStore(STORE_EPISODES);
    const payload: EpisodeContent = {
      ...episode,
      updatedAt: new Date().toISOString()
    };
    const req = store.put(payload);
    req.onsuccess = () => resolve();
    req.onerror = () => {
      const err = req.error;
      if (err && err.name === 'QuotaExceededError') {
        reject(
          new Error(
            'Kapasitas penyimpanan browser penuh. Hapus file media besar atau cadangkan data terlebih dahulu.'
          )
        );
      } else {
        reject(err || new Error('Gagal menyimpan episode ke IndexedDB.'));
      }
    };
  });
}

export async function deleteCustomEpisode(episodeId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EPISODES, 'readwrite');
    const store = tx.objectStore(STORE_EPISODES);
    const req = store.delete(episodeId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Gagal menghapus episode.'));
  });
}

export async function saveMediaFile(
  id: string,
  file: File | Blob,
  fileName: string,
  mimeType: string
): Promise<StoredMediaRecord> {
  const estimate = await checkStorageQuota();
  if (estimate && estimate.availableBytes < file.size + 1024 * 1024) {
    throw new Error(
      `Kapasitas penyimpanan browser tidak mencukupi untuk file ${fileName} (${formatBytes(
        file.size
      )}). Tersedia sekitar ${formatBytes(estimate.availableBytes)}.`
    );
  }

  const db = await openDb();
  const record: StoredMediaRecord = {
    id,
    name: fileName,
    mimeType,
    size: file.size,
    blob: file,
    createdAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => {
      const err = req.error;
      if (err && err.name === 'QuotaExceededError') {
        reject(
          new Error(
            'Penyimpanan browser melebihi batas kuota (QuotaExceededError). Perkecil ukuran video/PDF atau hapus file lama.'
          )
        );
      } else {
        reject(err || new Error('Gagal menyimpan file media ke IndexedDB.'));
      }
    };
  });
}

export async function getMediaById(id: string): Promise<StoredMediaRecord | null> {
  if (!id) return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readonly');
    const store = tx.objectStore(STORE_MEDIA);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as StoredMediaRecord) || null);
    req.onerror = () => reject(req.error || new Error('Gagal membaca file media.'));
  });
}

export async function getAllMediaMetadata(): Promise<
  Array<Omit<StoredMediaRecord, 'blob'>>
> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readonly');
    const store = tx.objectStore(STORE_MEDIA);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result as StoredMediaRecord[]) || [];
      resolve(
        all.map(({ id, name, mimeType, size, createdAt }) => ({
          id,
          name,
          mimeType,
          size,
          createdAt
        }))
      );
    };
    req.onerror = () => reject(req.error || new Error('Gagal membaca daftar media.'));
  });
}

export async function deleteMediaById(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Gagal menghapus media.'));
  });
}

export async function checkStorageQuota(): Promise<{
  usageBytes: number;
  quotaBytes: number;
  availableBytes: number;
  usagePercent: number;
} | null> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return null;
  }
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const availableBytes = Math.max(0, quota - usage);
    const usagePercent = quota > 0 ? Math.round((usage / quota) * 100) : 0;
    return {
      usageBytes: usage,
      quotaBytes: quota,
      availableBytes,
      usagePercent
    };
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = res.indexOf(',');
      resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
    };
    reader.onerror = () => reject(new Error('Gagal mengonversi file media ke base64.'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64);
  const len = byteString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function exportContentBackup(): Promise<ContentBackupPayload> {
  const db = await openDb();
  const episodes = await getAllCustomEpisodes();

  const mediaRecords = await new Promise<StoredMediaRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readonly');
    const req = tx.objectStore(STORE_MEDIA).getAll();
    req.onsuccess = () => resolve((req.result as StoredMediaRecord[]) || []);
    req.onerror = () => reject(req.error || new Error('Gagal membaca media untuk cadangan.'));
  });

  const serializedMedia = await Promise.all(
    mediaRecords.map(async (m) => ({
      id: m.id,
      name: m.name,
      mimeType: m.mimeType,
      size: m.size,
      createdAt: m.createdAt,
      base64Data: await blobToBase64(m.blob)
    }))
  );

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    episodes,
    media: serializedMedia
  };
}

export async function importContentBackup(
  payload: ContentBackupPayload
): Promise<{ episodesImported: number; mediaImported: number }> {
  if (
    !payload ||
    typeof payload !== 'object' ||
    !Array.isArray(payload.episodes) ||
    !Array.isArray(payload.media)
  ) {
    throw new Error('Format file cadangan tidak valid.');
  }

  let mediaImported = 0;
  for (const m of payload.media) {
    if (!m.id || !m.base64Data) continue;
    const blob = base64ToBlob(m.base64Data, m.mimeType || 'application/octet-stream');
    await saveMediaFile(m.id, blob, m.name || 'lampiran', m.mimeType || 'application/octet-stream');
    mediaImported += 1;
  }

  let episodesImported = 0;
  for (const ep of payload.episodes) {
    if (!ep.id || !ep.moduleId) continue;
    await saveCustomEpisode(ep);
    episodesImported += 1;
  }

  return { episodesImported, mediaImported };
}
