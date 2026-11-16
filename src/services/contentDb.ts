import {
  ContentBackupPayload,
  EpisodeContent,
  StoredMediaRecord
} from '../types/lms';
import {
  apiDeleteCustomEpisode,
  apiDeleteMedia,
  apiExportContentBackup,
  apiGetCustomEpisodes,
  apiGetMediaMeta,
  apiImportContentBackup,
  apiSaveCustomEpisode,
  apiUploadMediaFile,
  getServerMediaUrl
} from './api';

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

async function getAllLocalEpisodes(): Promise<EpisodeContent[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EPISODES, 'readonly');
    const store = tx.objectStore(STORE_EPISODES);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as EpisodeContent[]) || []);
    req.onerror = () =>
      reject(req.error || new Error('Gagal membaca data episode lokal.'));
  });
}

async function putLocalEpisode(episode: EpisodeContent): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EPISODES, 'readwrite');
    const store = tx.objectStore(STORE_EPISODES);
    const req = store.put(episode);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Gagal menyimpan cache episode.'));
  });
}

async function deleteLocalEpisode(episodeId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EPISODES, 'readwrite');
    const store = tx.objectStore(STORE_EPISODES);
    const req = store.delete(episodeId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Gagal menghapus cache episode.'));
  });
}

export async function getAllCustomEpisodes(): Promise<EpisodeContent[]> {
  try {
    const remote = await apiGetCustomEpisodes();
    // Mirror latest server episodes to IndexedDB in background
    Promise.all(remote.map((ep) => putLocalEpisode(ep).catch(() => undefined))).catch(
      () => undefined
    );
    return remote;
  } catch {
    return getAllLocalEpisodes().catch(() => []);
  }
}

export async function saveCustomEpisode(episode: EpisodeContent): Promise<void> {
  const payload: EpisodeContent = {
    ...episode,
    updatedAt: new Date().toISOString()
  };
  await apiSaveCustomEpisode(payload);
  await putLocalEpisode(payload).catch(() => undefined);
}

export async function deleteCustomEpisode(episodeId: string): Promise<void> {
  await apiDeleteCustomEpisode(episodeId);
  await deleteLocalEpisode(episodeId).catch(() => undefined);
}

export async function saveMediaFile(
  id: string,
  file: File | Blob,
  fileName: string,
  mimeType: string
): Promise<Omit<StoredMediaRecord, 'blob'>> {
  const meta = await apiUploadMediaFile(id, file, fileName, mimeType);
  return {
    id: meta.id,
    name: meta.name,
    mimeType: meta.mimeType,
    size: meta.size,
    createdAt: meta.createdAt
  };
}

export async function getMediaById(id: string): Promise<StoredMediaRecord | null> {
  if (!id) return null;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MEDIA, 'readonly');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as StoredMediaRecord) || null);
      req.onerror = () =>
        reject(req.error || new Error('Gagal membaca file media lokal.'));
    });
  } catch {
    return null;
  }
}

export interface ResolvedMediaSource {
  url: string;
  name: string;
  mimeType: string;
  isObjectUrl: boolean;
}

export async function resolveMediaSource(
  id?: string
): Promise<ResolvedMediaSource | null> {
  if (!id) return null;
  try {
    const meta = await apiGetMediaMeta(id);
    if (meta) {
      return {
        url: getServerMediaUrl(meta.id),
        name: meta.name,
        mimeType: meta.mimeType,
        isObjectUrl: false
      };
    }
  } catch {
    // fallback to local IndexedDB cache if offline
  }

  const localRec = await getMediaById(id);
  if (localRec) {
    return {
      url: URL.createObjectURL(localRec.blob),
      name: localRec.name,
      mimeType: localRec.mimeType,
      isObjectUrl: true
    };
  }
  return null;
}

export async function getAllMediaMetadata(): Promise<
  Array<Omit<StoredMediaRecord, 'blob'>>
> {
  try {
    const res = await fetch('/api/media', { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as {
        media?: Array<Omit<StoredMediaRecord, 'blob'>>;
      };
      if (Array.isArray(data.media)) return data.media;
    }
  } catch {
    // fallback to IndexedDB
  }
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
  await apiDeleteMedia(id).catch(() => undefined);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_MEDIA, 'readwrite');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Gagal menghapus media lokal.'));
    });
  } catch {
    // ignore local cleanup errors
  }
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

export async function exportContentBackup(): Promise<ContentBackupPayload> {
  return apiExportContentBackup();
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

  return apiImportContentBackup(payload);
}
