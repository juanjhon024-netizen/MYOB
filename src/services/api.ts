import {
  ContentBackupPayload,
  EpisodeContent,
  StudentProfile,
  StudentProgress
} from '../types/lms';

const SESSION_PIN_KEY = 'smartguide_teacher_session_pin_v1';

export function getActiveTeacherPinSession(): string {
  try {
    return sessionStorage.getItem(SESSION_PIN_KEY) || '';
  } catch {
    return '';
  }
}

export function setActiveTeacherPinSession(pin: string): void {
  try {
    if (pin) {
      sessionStorage.setItem(SESSION_PIN_KEY, pin);
    } else {
      sessionStorage.removeItem(SESSION_PIN_KEY);
    }
  } catch {
    // ignore sessionStorage failure
  }
}

export function getServerMediaUrl(mediaId: string): string {
  return `/api/media/${encodeURIComponent(mediaId)}`;
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    if (data?.error) return data.error;
  } catch {
    // ignore json parse failure
  }
  return fallback;
}

export class ApiHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Content & Media API
// ---------------------------------------------------------------------------

export async function apiGetCustomEpisodes(): Promise<EpisodeContent[]> {
  const res = await fetch('/api/content/episodes', { cache: 'no-store' });
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal memuat episode dari server.')
    );
  }
  const data = (await res.json()) as { episodes?: EpisodeContent[] };
  return Array.isArray(data.episodes) ? data.episodes : [];
}

export async function apiSaveCustomEpisode(episode: EpisodeContent): Promise<void> {
  const res = await fetch(
    `/api/content/episodes/${encodeURIComponent(episode.id)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-teacher-pin': getActiveTeacherPinSession()
      },
      body: JSON.stringify(episode)
    }
  );
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal menyimpan episode ke server.')
    );
  }
}

export async function apiDeleteCustomEpisode(episodeId: string): Promise<void> {
  const res = await fetch(
    `/api/content/episodes/${encodeURIComponent(episodeId)}`,
    {
      method: 'DELETE',
      headers: {
        'x-teacher-pin': getActiveTeacherPinSession()
      }
    }
  );
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal menghapus episode dari server.')
    );
  }
}

export interface ServerMediaMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export async function apiUploadMediaFile(
  id: string,
  file: File | Blob,
  fileName: string,
  mimeType: string
): Promise<ServerMediaMeta> {
  const res = await fetch('/api/media', {
    method: 'POST',
    headers: {
      'Content-Type': mimeType || 'application/octet-stream',
      'x-teacher-pin': getActiveTeacherPinSession(),
      'x-media-id': id,
      'x-media-name': encodeURIComponent(fileName),
      'x-media-mime': mimeType || 'application/octet-stream'
    },
    body: file
  });
  if (!res.ok) {
    if (res.status === 413) {
      throw new ApiHttpError(
        413,
        'Ukuran file melebihi batas unggahan serverless Vercel (maksimal ~4,5 MB per unggahan). Kompres file atau gunakan file di bawah 4 MB.'
      );
    }
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal mengunggah file media ke server.')
    );
  }
  const data = (await res.json()) as { media: ServerMediaMeta };
  return data.media;
}

export async function apiGetMediaMeta(id: string): Promise<ServerMediaMeta | null> {
  const res = await fetch(`/api/media/${encodeURIComponent(id)}/meta`, {
    cache: 'no-store'
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal memeriksa metadata media di server.')
    );
  }
  const data = (await res.json()) as { media?: ServerMediaMeta };
  return data.media || null;
}

export async function apiDeleteMedia(id: string): Promise<void> {
  const res = await fetch(`/api/media/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'x-teacher-pin': getActiveTeacherPinSession()
    }
  });
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal menghapus file media di server.')
    );
  }
}

export async function apiExportContentBackup(): Promise<ContentBackupPayload> {
  const res = await fetch('/api/content/backup/export', {
    headers: {
      'x-teacher-pin': getActiveTeacherPinSession()
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal mengekspor cadangan materi dari server.')
    );
  }
  return (await res.json()) as ContentBackupPayload;
}

export async function apiImportContentBackup(
  payload: ContentBackupPayload
): Promise<{ episodesImported: number; mediaImported: number }> {
  const res = await fetch('/api/content/backup/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-teacher-pin': getActiveTeacherPinSession()
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    if (res.status === 413) {
      throw new ApiHttpError(
        413,
        'Ukuran file cadangan melebihi batas payload serverless Vercel (~4,5 MB). Unggah materi secara bertahap per episode.'
      );
    }
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal mengimpor cadangan materi ke server.')
    );
  }
  return (await res.json()) as { episodesImported: number; mediaImported: number };
}

// ---------------------------------------------------------------------------
// Student Session & Progress Sync API
// ---------------------------------------------------------------------------

export interface StudentLookupResponse {
  exists: boolean;
  isDisabled: boolean;
  profile?: StudentProfile;
}

export async function apiLookupStudent(
  studentCode: string
): Promise<StudentLookupResponse> {
  const res = await fetch(
    `/api/students/lookup/${encodeURIComponent(studentCode.trim())}`,
    { cache: 'no-store' }
  );
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal memeriksa kode siswa di server.')
    );
  }
  return (await res.json()) as StudentLookupResponse;
}

export async function apiCreateOrResumeStudentSession(input: {
  studentCode: string;
  fullName: string;
  className: string;
}): Promise<{ profile: StudentProfile; progress: StudentProgress }> {
  const res = await fetch('/api/students/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal masuk ke sesi server.')
    );
  }
  return (await res.json()) as { profile: StudentProfile; progress: StudentProgress };
}

export async function apiGetStudentProgress(
  studentCode: string
): Promise<{ profile: StudentProfile; progress: StudentProgress }> {
  const res = await fetch(
    `/api/students/${encodeURIComponent(studentCode.trim())}/progress`,
    { cache: 'no-store' }
  );
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal mengambil progres siswa dari server.')
    );
  }
  return (await res.json()) as { profile: StudentProfile; progress: StudentProgress };
}

export async function apiSaveStudentProgress(
  profile: StudentProfile,
  progress: StudentProgress
): Promise<void> {
  const res = await fetch(
    `/api/students/${encodeURIComponent(profile.studentCode.trim())}/progress`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, progress })
    }
  );
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal menyinkronkan progres ke server.')
    );
  }
}

export async function apiResetStudentProgress(
  studentCode: string
): Promise<StudentProgress> {
  const res = await fetch(
    `/api/students/${encodeURIComponent(studentCode.trim())}/reset`,
    { method: 'POST' }
  );
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal mereset progres di server.')
    );
  }
  const data = (await res.json()) as { progress: StudentProgress };
  return data.progress;
}

// ---------------------------------------------------------------------------
// Teacher Admin & Grading API
// ---------------------------------------------------------------------------

export async function apiVerifyTeacherPin(pin: string): Promise<boolean> {
  const res = await fetch('/api/teacher/verify-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: pin.trim() })
  });
  if (res.status === 401) return false;
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal memverifikasi PIN Guru.')
    );
  }
  setActiveTeacherPinSession(pin.trim());
  return true;
}

export async function apiUpdateTeacherPin(newPin: string): Promise<void> {
  const res = await fetch('/api/teacher/pin', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-teacher-pin': getActiveTeacherPinSession()
    },
    body: JSON.stringify({ newPin: newPin.trim() })
  });
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal memperbarui PIN Guru di server.')
    );
  }
  setActiveTeacherPinSession(newPin.trim());
}

export interface ServerStudentSubmission {
  profile: StudentProfile;
  progress: StudentProgress;
  importedAt: string;
  source: 'local' | 'imported' | 'server';
}

export async function apiGetTeacherStudents(): Promise<ServerStudentSubmission[]> {
  const res = await fetch('/api/teacher/students', {
    headers: {
      'x-teacher-pin': getActiveTeacherPinSession()
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal memuat daftar siswa dari server.')
    );
  }
  const data = (await res.json()) as { students?: ServerStudentSubmission[] };
  return Array.isArray(data.students) ? data.students : [];
}

export async function apiImportStudentSubmission(
  profile: StudentProfile,
  progress: StudentProgress
): Promise<void> {
  const res = await fetch('/api/teacher/students/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-teacher-pin': getActiveTeacherPinSession()
    },
    body: JSON.stringify({ profile, progress })
  });
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal mengimpor data siswa ke server.')
    );
  }
}

export async function apiSetStudentDisabled(
  studentCode: string,
  disabled: boolean
): Promise<void> {
  const res = await fetch(
    `/api/teacher/students/${encodeURIComponent(studentCode.trim())}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-teacher-pin': getActiveTeacherPinSession()
      },
      body: JSON.stringify({ disabled })
    }
  );
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal mengubah status siswa di server.')
    );
  }
}

export async function apiDeleteStudent(studentCode: string): Promise<void> {
  const res = await fetch(
    `/api/teacher/students/${encodeURIComponent(studentCode.trim())}`,
    {
      method: 'DELETE',
      headers: {
        'x-teacher-pin': getActiveTeacherPinSession()
      }
    }
  );
  if (!res.ok) {
    throw new ApiHttpError(
      res.status,
      await parseErrorMessage(res, 'Gagal menghapus data siswa di server.')
    );
  }
}
