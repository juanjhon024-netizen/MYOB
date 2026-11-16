import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const DATA_DIR = path.resolve(__dirname, 'data');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const DB_PATH = path.join(DATA_DIR, 'smartguide-db.json');
const DEFAULT_TEACHER_PIN = (process.env.TEACHER_PIN || '1818').trim();

interface StoredMediaMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface StudentProfileRecord {
  studentCode: string;
  fullName: string;
  className: string;
  createdAt: string;
  lastActiveAt: string;
  isDisabled?: boolean;
  disabledAt?: string;
}

interface StudentProgressRecord {
  studentCode: string;
  lastOpenedEpisodeId: string;
  stageStatuses: Record<string, Record<string, string>>;
  materialsRead: Record<string, boolean>;
  videosWatched: Record<string, boolean>;
  simulations: Record<string, unknown>;
  quizResults: Record<string, unknown>;
  updatedAt: string;
}

interface ServerStudentRecord {
  profile: StudentProfileRecord;
  progress: StudentProgressRecord;
  importedAt: string;
  source: 'server' | 'imported';
}

interface ServerDatabase {
  teacherPin: string;
  episodes: Record<string, Record<string, unknown>>;
  mediaMeta: Record<string, StoredMediaMeta>;
  students: Record<string, ServerStudentRecord>;
  disabledCodes: string[];
}

function createInitialProgress(studentCode: string): StudentProgressRecord {
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

function createDefaultDb(): ServerDatabase {
  return {
    teacherPin: DEFAULT_TEACHER_PIN,
    episodes: {},
    mediaMeta: {},
    students: {},
    disabledCodes: []
  };
}

function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}

function sanitizeId(rawId: string): string {
  const cleaned = rawId.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return `id-${Date.now()}`;
  }
  return cleaned;
}

let dbCache: ServerDatabase | null = null;
let writeChain: Promise<void> = Promise.resolve();

async function ensureDataDirs(): Promise<void> {
  await fsp.mkdir(MEDIA_DIR, { recursive: true });
}

async function loadDb(): Promise<ServerDatabase> {
  if (dbCache) return dbCache;
  await ensureDataDirs();
  try {
    const raw = await fsp.readFile(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ServerDatabase>;
    dbCache = {
      teacherPin:
        typeof parsed.teacherPin === 'string' && parsed.teacherPin.trim().length >= 4
          ? parsed.teacherPin.trim()
          : DEFAULT_TEACHER_PIN,
      episodes: parsed.episodes && typeof parsed.episodes === 'object' ? parsed.episodes : {},
      mediaMeta: parsed.mediaMeta && typeof parsed.mediaMeta === 'object' ? parsed.mediaMeta : {},
      students: parsed.students && typeof parsed.students === 'object' ? parsed.students : {},
      disabledCodes: Array.isArray(parsed.disabledCodes)
        ? Array.from(new Set(parsed.disabledCodes.map((c) => normalizeCode(String(c)))))
        : []
    };
  } catch {
    dbCache = createDefaultDb();
    await persistDb(dbCache);
  }
  return dbCache;
}

async function persistDb(nextDb: ServerDatabase): Promise<void> {
  dbCache = nextDb;
  const serialized = JSON.stringify(nextDb, null, 2);
  writeChain = writeChain.then(async () => {
    await ensureDataDirs();
    const tmpPath = `${DB_PATH}.${process.pid}.${Date.now()}.tmp`;
    await fsp.writeFile(tmpPath, serialized, 'utf-8');
    await fsp.rename(tmpPath, DB_PATH);
  });
  await writeChain;
}

async function requireTeacherPin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const db = await loadDb();
  const providedPin = String(req.header('x-teacher-pin') || '').trim();
  if (!providedPin || providedPin !== db.teacherPin) {
    res.status(401).json({
      error: 'Akses ditolak. PIN Guru tidak sesuai atau sesi Mode Guru belum dibuka.'
    });
    return;
  }
  next();
}

function isStudentDisabledInDb(db: ServerDatabase, rawCode: string): boolean {
  const norm = normalizeCode(rawCode);
  if (!norm) return false;
  if (db.disabledCodes.includes(norm)) return true;
  return Boolean(db.students[norm]?.profile?.isDisabled);
}

async function startServer(): Promise<void> {
  await ensureDataDirs();
  await loadDb();

  const app = express();
  app.disable('x-powered-by');

  const jsonMedium = express.json({ limit: '25mb' });
  const jsonLarge = express.json({ limit: '250mb' });
  const rawMedia = express.raw({ type: () => true, limit: '250mb' });

  // Health endpoint
  app.get('/api/health', async (_req, res) => {
    const db = await loadDb();
    res.json({
      ok: true,
      mode: 'online-server',
      customEpisodesCount: Object.keys(db.episodes).length,
      studentsCount: Object.keys(db.students).length,
      timestamp: new Date().toISOString()
    });
  });

  // ---------------------------------------------------------------------------
  // Content Endpoints (Public Read, Teacher Write)
  // ---------------------------------------------------------------------------
  app.get('/api/content/episodes', async (_req, res) => {
    const db = await loadDb();
    res.json({ episodes: Object.values(db.episodes) });
  });

  app.put('/api/content/episodes/:id', requireTeacherPin, jsonMedium, async (req, res) => {
    const db = await loadDb();
    const episode = req.body as Record<string, unknown>;
    if (!episode || typeof episode !== 'object' || !episode.id || !episode.moduleId) {
      res.status(400).json({ error: 'Data episode tidak lengkap.' });
      return;
    }
    const id = String(req.params.id || episode.id);
    const payload = {
      ...episode,
      id,
      updatedAt: new Date().toISOString()
    };
    db.episodes[id] = payload;
    await persistDb(db);
    res.json({ ok: true, episode: payload });
  });

  app.delete('/api/content/episodes/:id', requireTeacherPin, async (req, res) => {
    const db = await loadDb();
    const id = String(req.params.id || '');
    if (id && db.episodes[id]) {
      delete db.episodes[id];
      await persistDb(db);
    }
    res.json({ ok: true });
  });

  app.get('/api/content/backup/export', requireTeacherPin, async (_req, res) => {
    const db = await loadDb();
    const episodes = Object.values(db.episodes);
    const mediaList: Array<StoredMediaMeta & { base64Data: string }> = [];

    for (const meta of Object.values(db.mediaMeta)) {
      const safeId = sanitizeId(meta.id);
      const filePath = path.join(MEDIA_DIR, safeId);
      if (fs.existsSync(filePath)) {
        const buf = await fsp.readFile(filePath);
        mediaList.push({
          ...meta,
          base64Data: buf.toString('base64')
        });
      }
    }

    res.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      episodes,
      media: mediaList
    });
  });

  app.post('/api/content/backup/import', requireTeacherPin, jsonLarge, async (req, res) => {
    const db = await loadDb();
    const payload = req.body as {
      episodes?: Array<Record<string, unknown>>;
      media?: Array<{
        id?: string;
        name?: string;
        mimeType?: string;
        createdAt?: string;
        base64Data?: string;
      }>;
    };

    if (!payload || !Array.isArray(payload.episodes) || !Array.isArray(payload.media)) {
      res.status(400).json({ error: 'Format file cadangan tidak valid.' });
      return;
    }

    let mediaImported = 0;
    for (const m of payload.media) {
      if (!m.id || !m.base64Data) continue;
      const safeId = sanitizeId(m.id);
      const buf = Buffer.from(m.base64Data, 'base64');
      await fsp.writeFile(path.join(MEDIA_DIR, safeId), buf);
      db.mediaMeta[safeId] = {
        id: safeId,
        name: m.name || 'lampiran',
        mimeType: m.mimeType || 'application/octet-stream',
        size: buf.length,
        createdAt: m.createdAt || new Date().toISOString()
      };
      mediaImported += 1;
    }

    let episodesImported = 0;
    for (const ep of payload.episodes) {
      if (!ep.id || !ep.moduleId) continue;
      const id = String(ep.id);
      db.episodes[id] = {
        ...ep,
        id,
        updatedAt: new Date().toISOString()
      };
      episodesImported += 1;
    }

    await persistDb(db);
    res.json({ ok: true, episodesImported, mediaImported });
  });

  // ---------------------------------------------------------------------------
  // Media Endpoints (Public Stream / Teacher Upload & Delete)
  // ---------------------------------------------------------------------------
  app.get('/api/media', async (_req, res) => {
    const db = await loadDb();
    res.json({ media: Object.values(db.mediaMeta) });
  });

  app.get('/api/media/:id/meta', async (req, res) => {
    const db = await loadDb();
    const safeId = sanitizeId(String(req.params.id || ''));
    const meta = db.mediaMeta[safeId];
    const filePath = path.join(MEDIA_DIR, safeId);
    if (!meta || !fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Media tidak ditemukan di server.' });
      return;
    }
    res.json({ media: meta });
  });

  app.get('/api/media/:id', async (req, res) => {
    const db = await loadDb();
    const safeId = sanitizeId(String(req.params.id || ''));
    const meta = db.mediaMeta[safeId];
    const filePath = path.join(MEDIA_DIR, safeId);
    if (!meta || !fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File media tidak ditemukan di server.' });
      return;
    }
    res.setHeader('Content-Type', meta.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(meta.name || safeId)}`
    );
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(filePath);
  });

  app.post('/api/media', requireTeacherPin, rawMedia, async (req, res) => {
    const db = await loadDb();
    const rawId = String(req.header('x-media-id') || `media-${Date.now()}`);
    const safeId = sanitizeId(rawId);
    let fileName = 'lampiran';
    try {
      const hdrName = req.header('x-media-name');
      if (hdrName) fileName = decodeURIComponent(hdrName);
    } catch {
      fileName = String(req.header('x-media-name') || 'lampiran');
    }
    const mimeType = String(
      req.header('x-media-mime') || req.header('content-type') || 'application/octet-stream'
    );

    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
    if (body.length === 0) {
      res.status(400).json({ error: 'File media kosong atau gagal diunggah.' });
      return;
    }

    await ensureDataDirs();
    await fsp.writeFile(path.join(MEDIA_DIR, safeId), body);

    const meta: StoredMediaMeta = {
      id: safeId,
      name: fileName,
      mimeType,
      size: body.length,
      createdAt: new Date().toISOString()
    };
    db.mediaMeta[safeId] = meta;
    await persistDb(db);
    res.status(201).json({ ok: true, media: meta });
  });

  app.delete('/api/media/:id', requireTeacherPin, async (req, res) => {
    const db = await loadDb();
    const safeId = sanitizeId(String(req.params.id || ''));
    const filePath = path.join(MEDIA_DIR, safeId);
    if (fs.existsSync(filePath)) {
      await fsp.unlink(filePath).catch(() => undefined);
    }
    if (db.mediaMeta[safeId]) {
      delete db.mediaMeta[safeId];
      await persistDb(db);
    }
    res.json({ ok: true });
  });

  // ---------------------------------------------------------------------------
  // Student Session & Progress Sync Endpoints
  // ---------------------------------------------------------------------------
  app.get('/api/students/lookup/:code', async (req, res) => {
    const db = await loadDb();
    const rawCode = String(req.params.code || '').trim();
    const norm = normalizeCode(rawCode);
    if (!norm) {
      res.json({ exists: false, isDisabled: false });
      return;
    }
    const isDisabled = isStudentDisabledInDb(db, rawCode);
    const entry = db.students[norm];
    if (!entry) {
      res.json({ exists: false, isDisabled });
      return;
    }
    res.json({
      exists: true,
      isDisabled,
      profile: {
        studentCode: entry.profile.studentCode,
        fullName: entry.profile.fullName,
        className: entry.profile.className,
        createdAt: entry.profile.createdAt,
        lastActiveAt: entry.profile.lastActiveAt,
        isDisabled
      }
    });
  });

  app.post('/api/students/session', jsonMedium, async (req, res) => {
    const db = await loadDb();
    const body = req.body as {
      studentCode?: string;
      fullName?: string;
      className?: string;
    };
    const rawCode = String(body?.studentCode || '').trim();
    const norm = normalizeCode(rawCode);
    if (!norm) {
      res.status(400).json({ error: 'Kode Siswa wajib diisi.' });
      return;
    }

    if (isStudentDisabledInDb(db, rawCode)) {
      res.status(403).json({
        error:
          'Akun siswa dengan kode ini sedang dinonaktifkan oleh guru. Hubungi guru pengampu untuk mengaktifkan kembali.',
        isDisabled: true
      });
      return;
    }

    const now = new Date().toISOString();
    const existing = db.students[norm];
    const nextFullName =
      String(body?.fullName || '').trim() || existing?.profile.fullName || '';
    const nextClassName =
      String(body?.className || '').trim() || existing?.profile.className || '';

    if (!nextFullName || !nextClassName) {
      res.status(400).json({ error: 'Nama Lengkap dan Kelas wajib diisi.' });
      return;
    }

    const profile: StudentProfileRecord = existing
      ? {
          ...existing.profile,
          studentCode: rawCode,
          fullName: nextFullName,
          className: nextClassName,
          isDisabled: false,
          lastActiveAt: now
        }
      : {
          studentCode: rawCode,
          fullName: nextFullName,
          className: nextClassName,
          createdAt: now,
          lastActiveAt: now
        };

    const progress: StudentProgressRecord = existing
      ? {
          ...createInitialProgress(profile.studentCode),
          ...existing.progress,
          studentCode: profile.studentCode
        }
      : createInitialProgress(profile.studentCode);

    db.students[norm] = {
      profile,
      progress,
      importedAt: now,
      source: existing?.source === 'imported' ? 'server' : existing?.source || 'server'
    };

    await persistDb(db);
    res.json({ profile, progress });
  });

  app.get('/api/students/:code/progress', async (req, res) => {
    const db = await loadDb();
    const rawCode = String(req.params.code || '').trim();
    const norm = normalizeCode(rawCode);
    if (!norm) {
      res.status(400).json({ error: 'Kode siswa tidak valid.' });
      return;
    }
    if (isStudentDisabledInDb(db, rawCode)) {
      res.status(403).json({
        error: 'Akun siswa sedang dinonaktifkan oleh guru.',
        isDisabled: true
      });
      return;
    }
    const entry = db.students[norm];
    if (!entry) {
      res.status(404).json({ error: 'Data siswa tidak ditemukan di server.' });
      return;
    }
    res.json({
      profile: entry.profile,
      progress: entry.progress
    });
  });

  app.put('/api/students/:code/progress', jsonMedium, async (req, res) => {
    const db = await loadDb();
    const rawCode = String(req.params.code || '').trim();
    const norm = normalizeCode(rawCode);
    if (!norm) {
      res.status(400).json({ error: 'Kode siswa tidak valid.' });
      return;
    }
    if (isStudentDisabledInDb(db, rawCode)) {
      res.status(403).json({
        error: 'Akun siswa sedang dinonaktifkan oleh guru.',
        isDisabled: true
      });
      return;
    }

    const body = req.body as {
      profile?: Partial<StudentProfileRecord>;
      progress?: StudentProgressRecord;
    };
    if (!body?.progress || typeof body.progress !== 'object') {
      res.status(400).json({ error: 'Payload progres tidak valid.' });
      return;
    }

    const now = new Date().toISOString();
    const existing = db.students[norm];
    const profile: StudentProfileRecord = existing
      ? {
          ...existing.profile,
          fullName: body.profile?.fullName?.trim() || existing.profile.fullName,
          className: body.profile?.className?.trim() || existing.profile.className,
          lastActiveAt: now
        }
      : {
          studentCode: rawCode,
          fullName: body.profile?.fullName?.trim() || rawCode,
          className: body.profile?.className?.trim() || '-',
          createdAt: body.profile?.createdAt || now,
          lastActiveAt: now
        };

    const nextProgress: StudentProgressRecord = {
      ...createInitialProgress(profile.studentCode),
      ...body.progress,
      studentCode: profile.studentCode,
      updatedAt: now
    };

    db.students[norm] = {
      profile,
      progress: nextProgress,
      importedAt: now,
      source: 'server'
    };

    await persistDb(db);
    res.json({ ok: true, profile, progress: nextProgress });
  });

  app.post('/api/students/:code/reset', async (req, res) => {
    const db = await loadDb();
    const rawCode = String(req.params.code || '').trim();
    const norm = normalizeCode(rawCode);
    if (!norm || !db.students[norm]) {
      res.status(404).json({ error: 'Data siswa tidak ditemukan di server.' });
      return;
    }
    if (isStudentDisabledInDb(db, rawCode)) {
      res.status(403).json({
        error: 'Akun siswa sedang dinonaktifkan oleh guru.',
        isDisabled: true
      });
      return;
    }

    const entry = db.students[norm];
    const fresh = createInitialProgress(entry.profile.studentCode);
    entry.progress = fresh;
    entry.profile.lastActiveAt = new Date().toISOString();
    entry.importedAt = entry.profile.lastActiveAt;
    await persistDb(db);
    res.json({ ok: true, progress: fresh });
  });

  // ---------------------------------------------------------------------------
  // Teacher PIN & Admin Grading Endpoints
  // ---------------------------------------------------------------------------
  app.post('/api/teacher/verify-pin', jsonMedium, async (req, res) => {
    const db = await loadDb();
    const pin = String((req.body as { pin?: string })?.pin || '').trim();
    if (!pin || pin !== db.teacherPin) {
      res.status(401).json({
        ok: false,
        error: 'PIN Guru tidak sesuai. Periksa kembali PIN akses Mode Guru.'
      });
      return;
    }
    res.json({ ok: true });
  });

  app.put('/api/teacher/pin', requireTeacherPin, jsonMedium, async (req, res) => {
    const db = await loadDb();
    const newPin = String((req.body as { newPin?: string })?.newPin || '').trim();
    if (newPin.length < 4) {
      res.status(400).json({ error: 'PIN Guru minimal 4 karakter/angka.' });
      return;
    }
    db.teacherPin = newPin;
    await persistDb(db);
    res.json({ ok: true });
  });

  app.get('/api/teacher/students', requireTeacherPin, async (_req, res) => {
    const db = await loadDb();
    const disabledSet = new Set(db.disabledCodes.map((c) => normalizeCode(c)));
    const students = Object.values(db.students).map((entry) => {
      const norm = normalizeCode(entry.profile.studentCode);
      const isDisabled = Boolean(entry.profile.isDisabled || disabledSet.has(norm));
      return {
        ...entry,
        profile: {
          ...entry.profile,
          isDisabled
        }
      };
    });
    students.sort((a, b) =>
      b.profile.lastActiveAt.localeCompare(a.profile.lastActiveAt)
    );
    res.json({ students });
  });

  app.post('/api/teacher/students/import', requireTeacherPin, jsonMedium, async (req, res) => {
    const db = await loadDb();
    const body = req.body as {
      profile?: StudentProfileRecord;
      progress?: StudentProgressRecord;
    };
    if (
      !body?.profile?.studentCode ||
      !body?.profile?.fullName ||
      !body?.progress?.studentCode
    ) {
      res.status(400).json({ error: 'Format data pengumpulan siswa tidak valid.' });
      return;
    }

    const norm = normalizeCode(body.profile.studentCode);
    const now = new Date().toISOString();
    const isDisabled = db.disabledCodes.includes(norm) || Boolean(body.profile.isDisabled);
    db.students[norm] = {
      profile: {
        ...body.profile,
        isDisabled
      },
      progress: body.progress,
      importedAt: now,
      source: 'imported'
    };
    await persistDb(db);
    res.json({ ok: true, student: db.students[norm] });
  });

  app.patch(
    '/api/teacher/students/:code/status',
    requireTeacherPin,
    jsonMedium,
    async (req, res) => {
      const db = await loadDb();
      const rawCode = String(req.params.code || '').trim();
      const norm = normalizeCode(rawCode);
      if (!norm) {
        res.status(400).json({ error: 'Kode siswa tidak valid.' });
        return;
      }

      const disabled = Boolean((req.body as { disabled?: boolean })?.disabled);
      const now = new Date().toISOString();
      const disabledSet = new Set(db.disabledCodes.map((c) => normalizeCode(c)));
      if (disabled) {
        disabledSet.add(norm);
      } else {
        disabledSet.delete(norm);
      }
      db.disabledCodes = Array.from(disabledSet);

      if (db.students[norm]) {
        db.students[norm].profile.isDisabled = disabled;
        db.students[norm].profile.disabledAt = disabled ? now : undefined;
      }

      await persistDb(db);
      res.json({ ok: true, disabled });
    }
  );

  app.delete('/api/teacher/students/:code', requireTeacherPin, async (req, res) => {
    const db = await loadDb();
    const rawCode = String(req.params.code || '').trim();
    const norm = normalizeCode(rawCode);
    if (!norm) {
      res.status(400).json({ error: 'Kode siswa tidak valid.' });
      return;
    }

    delete db.students[norm];
    db.disabledCodes = db.disabledCodes.filter((c) => normalizeCode(c) !== norm);
    await persistDb(db);
    res.json({ ok: true });
  });

  // Unknown API route safeguard
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
  });

  // ---------------------------------------------------------------------------
  // Frontend Serving (Vite Dev Middleware in Dev, dist/ Static Files in Prod)
  // ---------------------------------------------------------------------------
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Smart-Guide Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Gagal menjalankan server Smart-Guide:', err);
  process.exit(1);
});
