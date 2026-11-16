import pg from 'pg';
import type { Pool as PgPoolType } from 'pg';

const { Pool } = pg;

export interface StoredMediaMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface StoredMediaRecord extends StoredMediaMeta {
  buffer: Buffer;
}

export interface StudentProfileRecord {
  studentCode: string;
  fullName: string;
  className: string;
  createdAt: string;
  lastActiveAt: string;
  isDisabled?: boolean;
  disabledAt?: string;
}

export interface StudentProgressRecord {
  studentCode: string;
  lastOpenedEpisodeId: string;
  stageStatuses: Record<string, Record<string, string>>;
  materialsRead: Record<string, boolean>;
  videosWatched: Record<string, boolean>;
  simulations: Record<string, unknown>;
  quizResults: Record<string, unknown>;
  updatedAt: string;
}

export interface ServerStudentRecord {
  profile: StudentProfileRecord;
  progress: StudentProgressRecord;
  importedAt: string;
  source: 'server' | 'imported';
}

interface MemoryStore {
  teacherPin: string;
  episodes: Map<string, Record<string, unknown>>;
  media: Map<string, StoredMediaRecord>;
  students: Map<string, ServerStudentRecord>;
  disabledCodes: Set<string>;
}

const g = globalThis as typeof globalThis & {
  __smartGuidePgPool?: PgPoolType;
  __smartGuideSchemaPromise?: Promise<void>;
  __smartGuideMemStore?: MemoryStore;
};

export class DatabaseConfigError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.statusCode = 503;
  }
}

export function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}

export function sanitizeId(rawId: string): string {
  const cleaned = rawId.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return `id-${Date.now()}`;
  }
  return cleaned;
}

export function createInitialProgress(studentCode: string): StudentProgressRecord {
  return {
    studentCode,
    lastOpenedEpisodeId: 'ep-1-1',
    stageStatuses: {
      'ep-1-1': {
        materi: 'belum_dimulai',
        video: 'belum_dimulai',
        simulasi: 'belum_dimulai',
        uji_mandiri: 'belum_dimulai',
        kuis: 'belum_dimulai'
      }
    },
    materialsRead: {},
    videosWatched: {},
    simulations: {},
    quizResults: {},
    updatedAt: new Date().toISOString()
  };
}

function getDefaultTeacherPin(): string {
  const envPin = (process.env.TEACHER_PIN || '').trim();
  return envPin.length >= 4 ? envPin : '1818';
}

export function isPostgresConfigured(): boolean {
  return Boolean((process.env.DATABASE_URL || '').trim());
}

function getPgPool(): PgPoolType {
  const connectionString = (process.env.DATABASE_URL || '').trim();
  if (!connectionString) {
    throw new DatabaseConfigError(
      'DATABASE_URL belum dikonfigurasi pada Environment Variables. Atur DATABASE_URL ke PostgreSQL online Anda.'
    );
  }

  if (!g.__smartGuidePgPool) {
    const rawSsl = (process.env.DATABASE_SSL || '').trim().toLowerCase();
    const lowerUrl = connectionString.toLowerCase();
    const isLocalHost =
      lowerUrl.includes('localhost') || lowerUrl.includes('127.0.0.1');
    const urlDisablesSsl = lowerUrl.includes('sslmode=disable');

    const ssl =
      rawSsl === 'false' || urlDisablesSsl || (rawSsl !== 'true' && isLocalHost)
        ? false
        : rawSsl === 'verify'
          ? { rejectUnauthorized: true }
          : { rejectUnauthorized: false };

    g.__smartGuidePgPool = new Pool({
      connectionString,
      ssl,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true
    });

    g.__smartGuidePgPool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
  }

  return g.__smartGuidePgPool;
}

function getMemStore(): MemoryStore {
  if (process.env.VERCEL === '1') {
    throw new DatabaseConfigError(
      'DATABASE_URL wajib dikonfigurasi pada Environment Variables Vercel untuk penyimpanan PostgreSQL online.'
    );
  }

  if (!g.__smartGuideMemStore) {
    g.__smartGuideMemStore = {
      teacherPin: getDefaultTeacherPin(),
      episodes: new Map(),
      media: new Map(),
      students: new Map(),
      disabledCodes: new Set()
    };
  }
  return g.__smartGuideMemStore;
}

async function ensurePgSchema(): Promise<PgPoolType> {
  const pool = getPgPool();
  if (!g.__smartGuideSchemaPromise) {
    g.__smartGuideSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS smartguide_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS smartguide_episodes (
          id TEXT PRIMARY KEY,
          module_id TEXT NOT NULL,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS smartguide_media (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          content BYTEA NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS smartguide_students (
          normalized_code TEXT PRIMARY KEY,
          student_code TEXT NOT NULL,
          profile JSONB NOT NULL,
          progress JSONB NOT NULL,
          source TEXT NOT NULL DEFAULT 'server',
          is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
          imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(
        `INSERT INTO smartguide_settings (key, value)
         VALUES ('teacher_pin', $1)
         ON CONFLICT (key) DO NOTHING`,
        [getDefaultTeacherPin()]
      );
    })().catch((err) => {
      g.__smartGuideSchemaPromise = undefined;
      throw err;
    });
  }

  await g.__smartGuideSchemaPromise;
  return pool;
}

export async function getHealthSummary(): Promise<{
  database: 'postgresql' | 'memory-preview';
  customEpisodesCount: number;
  studentsCount: number;
}> {
  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    const epRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM smartguide_episodes`
    );
    const stRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM smartguide_students`
    );
    return {
      database: 'postgresql',
      customEpisodesCount: Number(epRes.rows[0]?.count || 0),
      studentsCount: Number(stRes.rows[0]?.count || 0)
    };
  }

  const mem = getMemStore();
  return {
    database: 'memory-preview',
    customEpisodesCount: mem.episodes.size,
    studentsCount: mem.students.size
  };
}

// ---------------------------------------------------------------------------
// Teacher PIN
// ---------------------------------------------------------------------------

export async function getTeacherPinValue(): Promise<string> {
  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    const res = await pool.query<{ value: string }>(
      `SELECT value FROM smartguide_settings WHERE key = 'teacher_pin' LIMIT 1`
    );
    return res.rows[0]?.value || getDefaultTeacherPin();
  }
  return getMemStore().teacherPin;
}

export async function updateTeacherPinValue(newPin: string): Promise<void> {
  const cleaned = newPin.trim();
  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    await pool.query(
      `INSERT INTO smartguide_settings (key, value, updated_at)
       VALUES ('teacher_pin', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [cleaned]
    );
    return;
  }
  getMemStore().teacherPin = cleaned;
}

// ---------------------------------------------------------------------------
// Episodes CRUD
// ---------------------------------------------------------------------------

export async function listEpisodes(): Promise<Array<Record<string, unknown>>> {
  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    const res = await pool.query<{ data: Record<string, unknown> }>(
      `SELECT data FROM smartguide_episodes ORDER BY updated_at ASC`
    );
    return res.rows.map((r) => r.data);
  }
  return Array.from(getMemStore().episodes.values());
}

export async function upsertEpisode(
  id: string,
  moduleId: string,
  episodeData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = {
    ...episodeData,
    id,
    moduleId,
    updatedAt: new Date().toISOString()
  };

  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    await pool.query(
      `INSERT INTO smartguide_episodes (id, module_id, data, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE
         SET module_id = EXCLUDED.module_id,
             data = EXCLUDED.data,
             updated_at = NOW()`,
      [id, moduleId, JSON.stringify(payload)]
    );
    return payload;
  }

  getMemStore().episodes.set(id, payload);
  return payload;
}

export async function removeEpisode(id: string): Promise<void> {
  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    await pool.query(`DELETE FROM smartguide_episodes WHERE id = $1`, [id]);
    return;
  }
  getMemStore().episodes.delete(id);
}

// ---------------------------------------------------------------------------
// Media CRUD (stored in PostgreSQL BYTEA, never Vercel filesystem)
// ---------------------------------------------------------------------------

export async function listMediaMeta(): Promise<StoredMediaMeta[]> {
  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    const res = await pool.query<{
      id: string;
      name: string;
      mime_type: string;
      size: number;
      created_at: Date;
    }>(
      `SELECT id, name, mime_type, size, created_at
       FROM smartguide_media
       ORDER BY created_at DESC`
    );
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      mimeType: r.mime_type,
      size: r.size,
      createdAt: new Date(r.created_at).toISOString()
    }));
  }

  return Array.from(getMemStore().media.values()).map(
    ({ id, name, mimeType, size, createdAt }) => ({
      id,
      name,
      mimeType,
      size,
      createdAt
    })
  );
}

export async function getMediaMetaById(id: string): Promise<StoredMediaMeta | null> {
  const safeId = sanitizeId(id);
  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    const res = await pool.query<{
      id: string;
      name: string;
      mime_type: string;
      size: number;
      created_at: Date;
    }>(
      `SELECT id, name, mime_type, size, created_at
       FROM smartguide_media
       WHERE id = $1
       LIMIT 1`,
      [safeId]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      mimeType: r.mime_type,
      size: r.size,
      createdAt: new Date(r.created_at).toISOString()
    };
  }

  const item = getMemStore().media.get(safeId);
  if (!item) return null;
  return {
    id: item.id,
    name: item.name,
    mimeType: item.mimeType,
    size: item.size,
    createdAt: item.createdAt
  };
}

export async function getMediaContentById(
  id: string
): Promise<StoredMediaRecord | null> {
  const safeId = sanitizeId(id);
  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    const res = await pool.query<{
      id: string;
      name: string;
      mime_type: string;
      size: number;
      content: Buffer;
      created_at: Date;
    }>(
      `SELECT id, name, mime_type, size, content, created_at
       FROM smartguide_media
       WHERE id = $1
       LIMIT 1`,
      [safeId]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      mimeType: r.mime_type,
      size: r.size,
      buffer: r.content,
      createdAt: new Date(r.created_at).toISOString()
    };
  }

  return getMemStore().media.get(safeId) || null;
}

export async function listAllMediaWithContent(): Promise<StoredMediaRecord[]> {
  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    const res = await pool.query<{
      id: string;
      name: string;
      mime_type: string;
      size: number;
      content: Buffer;
      created_at: Date;
    }>(
      `SELECT id, name, mime_type, size, content, created_at FROM smartguide_media`
    );
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      mimeType: r.mime_type,
      size: r.size,
      buffer: r.content,
      createdAt: new Date(r.created_at).toISOString()
    }));
  }
  return Array.from(getMemStore().media.values());
}

export async function saveMediaRecord(input: {
  id: string;
  name: string;
  mimeType: string;
  buffer: Buffer;
  createdAt?: string;
}): Promise<StoredMediaMeta> {
  const safeId = sanitizeId(input.id);
  const createdAt = input.createdAt || new Date().toISOString();

  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    await pool.query(
      `INSERT INTO smartguide_media (id, name, mime_type, size, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             mime_type = EXCLUDED.mime_type,
             size = EXCLUDED.size,
             content = EXCLUDED.content`,
      [safeId, input.name, input.mimeType, input.buffer.length, input.buffer, createdAt]
    );
    return {
      id: safeId,
      name: input.name,
      mimeType: input.mimeType,
      size: input.buffer.length,
      createdAt
    };
  }

  const record: StoredMediaRecord = {
    id: safeId,
    name: input.name,
    mimeType: input.mimeType,
    size: input.buffer.length,
    buffer: input.buffer,
    createdAt
  };
  getMemStore().media.set(safeId, record);
  return {
    id: record.id,
    name: record.name,
    mimeType: record.mimeType,
    size: record.size,
    createdAt: record.createdAt
  };
}

export async function removeMediaRecord(id: string): Promise<void> {
  const safeId = sanitizeId(id);
  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    await pool.query(`DELETE FROM smartguide_media WHERE id = $1`, [safeId]);
    return;
  }
  getMemStore().media.delete(safeId);
}

// ---------------------------------------------------------------------------
// Students & Progress CRUD
// ---------------------------------------------------------------------------

export async function getStudentEntry(rawCode: string): Promise<{
  entry: ServerStudentRecord | null;
  isDisabled: boolean;
}> {
  const norm = normalizeCode(rawCode);
  if (!norm) return { entry: null, isDisabled: false };

  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    const res = await pool.query<{
      profile: StudentProfileRecord;
      progress: StudentProgressRecord;
      source: 'server' | 'imported';
      is_disabled: boolean;
      imported_at: Date;
    }>(
      `SELECT profile, progress, source, is_disabled, imported_at
       FROM smartguide_students
       WHERE normalized_code = $1
       LIMIT 1`,
      [norm]
    );
    const r = res.rows[0];
    if (!r) return { entry: null, isDisabled: false };
    const isDisabled = Boolean(r.is_disabled || r.profile?.isDisabled);
    return {
      entry: {
        profile: { ...r.profile, isDisabled },
        progress: r.progress,
        source: r.source,
        importedAt: new Date(r.imported_at).toISOString()
      },
      isDisabled
    };
  }

  const mem = getMemStore();
  const entry = mem.students.get(norm) || null;
  const isDisabled = Boolean(
    mem.disabledCodes.has(norm) || entry?.profile?.isDisabled
  );
  return {
    entry: entry
      ? { ...entry, profile: { ...entry.profile, isDisabled } }
      : null,
    isDisabled
  };
}

export async function saveStudentEntry(
  rawCode: string,
  entry: ServerStudentRecord
): Promise<void> {
  const norm = normalizeCode(rawCode);
  if (!norm) return;
  const isDisabled = Boolean(entry.profile.isDisabled);

  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    await pool.query(
      `INSERT INTO smartguide_students (
         normalized_code, student_code, profile, progress, source, is_disabled, imported_at, updated_at
       )
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7::timestamptz, NOW())
       ON CONFLICT (normalized_code) DO UPDATE
         SET student_code = EXCLUDED.student_code,
             profile = EXCLUDED.profile,
             progress = EXCLUDED.progress,
             source = EXCLUDED.source,
             is_disabled = EXCLUDED.is_disabled,
             imported_at = EXCLUDED.imported_at,
             updated_at = NOW()`,
      [
        norm,
        entry.profile.studentCode,
        JSON.stringify(entry.profile),
        JSON.stringify(entry.progress),
        entry.source,
        isDisabled,
        entry.importedAt
      ]
    );
    return;
  }

  const mem = getMemStore();
  mem.students.set(norm, entry);
  if (isDisabled) {
    mem.disabledCodes.add(norm);
  } else {
    mem.disabledCodes.delete(norm);
  }
}

export async function listAllStudentsForTeacher(): Promise<ServerStudentRecord[]> {
  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    const res = await pool.query<{
      profile: StudentProfileRecord;
      progress: StudentProgressRecord;
      source: 'server' | 'imported';
      is_disabled: boolean;
      imported_at: Date;
    }>(
      `SELECT profile, progress, source, is_disabled, imported_at
       FROM smartguide_students
       ORDER BY updated_at DESC`
    );
    const list = res.rows.map((r) => ({
      profile: {
        ...r.profile,
        isDisabled: Boolean(r.is_disabled || r.profile?.isDisabled)
      },
      progress: r.progress,
      source: r.source,
      importedAt: new Date(r.imported_at).toISOString()
    }));
    list.sort((a, b) =>
      b.profile.lastActiveAt.localeCompare(a.profile.lastActiveAt)
    );
    return list;
  }

  const mem = getMemStore();
  const list = Array.from(mem.students.values()).map((entry) => {
    const norm = normalizeCode(entry.profile.studentCode);
    const isDisabled = Boolean(entry.profile.isDisabled || mem.disabledCodes.has(norm));
    return {
      ...entry,
      profile: {
        ...entry.profile,
        isDisabled
      }
    };
  });
  list.sort((a, b) =>
    b.profile.lastActiveAt.localeCompare(a.profile.lastActiveAt)
  );
  return list;
}

export async function setStudentDisabledInDb(
  rawCode: string,
  disabled: boolean
): Promise<void> {
  const norm = normalizeCode(rawCode);
  if (!norm) return;
  const now = new Date().toISOString();

  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    const existing = await getStudentEntry(rawCode);
    if (existing.entry) {
      const nextProfile: StudentProfileRecord = {
        ...existing.entry.profile,
        isDisabled: disabled,
        disabledAt: disabled ? now : undefined
      };
      await pool.query(
        `UPDATE smartguide_students
         SET is_disabled = $2, profile = $3::jsonb, updated_at = NOW()
         WHERE normalized_code = $1`,
        [norm, disabled, JSON.stringify(nextProfile)]
      );
    } else if (disabled) {
      const placeholderProfile: StudentProfileRecord = {
        studentCode: rawCode.trim(),
        fullName: rawCode.trim(),
        className: '-',
        createdAt: now,
        lastActiveAt: now,
        isDisabled: true,
        disabledAt: now
      };
      await saveStudentEntry(rawCode, {
        profile: placeholderProfile,
        progress: createInitialProgress(rawCode.trim()),
        importedAt: now,
        source: 'server'
      });
    }
    return;
  }

  const mem = getMemStore();
  if (disabled) {
    mem.disabledCodes.add(norm);
  } else {
    mem.disabledCodes.delete(norm);
  }
  const existing = mem.students.get(norm);
  if (existing) {
    existing.profile.isDisabled = disabled;
    existing.profile.disabledAt = disabled ? now : undefined;
  }
}

export async function deleteStudentFromDb(rawCode: string): Promise<void> {
  const norm = normalizeCode(rawCode);
  if (!norm) return;

  if (isPostgresConfigured()) {
    const pool = await ensurePgSchema();
    await pool.query(
      `DELETE FROM smartguide_students WHERE normalized_code = $1`,
      [norm]
    );
    return;
  }

  const mem = getMemStore();
  mem.students.delete(norm);
  mem.disabledCodes.delete(norm);
}
