import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import {
  createInitialProgress,
  DatabaseConfigError,
  deleteStudentFromDb,
  getHealthSummary,
  getMediaContentById,
  getMediaMetaById,
  getStudentEntry,
  getTeacherPinValue,
  listAllMediaWithContent,
  listAllStudentsForTeacher,
  listEpisodes,
  listMediaMeta,
  normalizeCode,
  removeEpisode,
  removeMediaRecord,
  sanitizeId,
  saveMediaRecord,
  saveStudentEntry,
  setStudentDisabledInDb,
  updateTeacherPinValue,
  upsertEpisode
} from './db.ts';
import type {
  StudentProfileRecord,
  StudentProgressRecord
} from './db.ts';

function asyncRoute(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

async function requireTeacherPin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const expectedPin = await getTeacherPinValue();
    const providedPin = String(req.header('x-teacher-pin') || '').trim();
    if (!providedPin || providedPin !== expectedPin) {
      res.status(401).json({
        error: 'Akses ditolak. PIN Guru tidak sesuai atau sesi Mode Guru belum dibuka.'
      });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function createApiApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const jsonMedium = express.json({ limit: '25mb' });
  const jsonLarge = express.json({ limit: '100mb' });
  const rawMedia = express.raw({ type: () => true, limit: '100mb' });

  // Health endpoint
  app.get(
    '/api/health',
    asyncRoute(async (_req, res) => {
      const summary = await getHealthSummary();
      res.json({
        ok: true,
        mode: process.env.VERCEL === '1' ? 'vercel-serverless' : 'online-server',
        database: summary.database,
        customEpisodesCount: summary.customEpisodesCount,
        studentsCount: summary.studentsCount,
        timestamp: new Date().toISOString()
      });
    })
  );

  // ---------------------------------------------------------------------------
  // Content Endpoints (Public Read, Teacher Write)
  // ---------------------------------------------------------------------------
  app.get(
    '/api/content/episodes',
    asyncRoute(async (_req, res) => {
      const episodes = await listEpisodes();
      res.json({ episodes });
    })
  );

  app.put(
    '/api/content/episodes/:id',
    requireTeacherPin,
    jsonMedium,
    asyncRoute(async (req, res) => {
      const episode = req.body as Record<string, unknown>;
      if (!episode || typeof episode !== 'object' || !episode.id || !episode.moduleId) {
        res.status(400).json({ error: 'Data episode tidak lengkap.' });
        return;
      }
      const id = String(req.params.id || episode.id);
      const moduleId = String(episode.moduleId);
      const saved = await upsertEpisode(id, moduleId, episode);
      res.json({ ok: true, episode: saved });
    })
  );

  app.delete(
    '/api/content/episodes/:id',
    requireTeacherPin,
    asyncRoute(async (req, res) => {
      const id = String(req.params.id || '');
      if (id) {
        await removeEpisode(id);
      }
      res.json({ ok: true });
    })
  );

  app.get(
    '/api/content/backup/export',
    requireTeacherPin,
    asyncRoute(async (_req, res) => {
      const [episodes, allMedia] = await Promise.all([
        listEpisodes(),
        listAllMediaWithContent()
      ]);

      const mediaList = allMedia.map((m) => ({
        id: m.id,
        name: m.name,
        mimeType: m.mimeType,
        size: m.size,
        createdAt: m.createdAt,
        base64Data: m.buffer.toString('base64')
      }));

      res.json({
        version: 1,
        exportedAt: new Date().toISOString(),
        episodes,
        media: mediaList
      });
    })
  );

  app.post(
    '/api/content/backup/import',
    requireTeacherPin,
    jsonLarge,
    asyncRoute(async (req, res) => {
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
        const buf = Buffer.from(m.base64Data, 'base64');
        await saveMediaRecord({
          id: sanitizeId(m.id),
          name: m.name || 'lampiran',
          mimeType: m.mimeType || 'application/octet-stream',
          buffer: buf,
          createdAt: m.createdAt
        });
        mediaImported += 1;
      }

      let episodesImported = 0;
      for (const ep of payload.episodes) {
        if (!ep.id || !ep.moduleId) continue;
        await upsertEpisode(String(ep.id), String(ep.moduleId), ep);
        episodesImported += 1;
      }

      res.json({ ok: true, episodesImported, mediaImported });
    })
  );

  // ---------------------------------------------------------------------------
  // Media Endpoints (PostgreSQL BYTEA Stream with HTTP Range Support)
  // ---------------------------------------------------------------------------
  app.get(
    '/api/media',
    asyncRoute(async (_req, res) => {
      const media = await listMediaMeta();
      res.json({ media });
    })
  );

  app.get(
    '/api/media/:id/meta',
    asyncRoute(async (req, res) => {
      const meta = await getMediaMetaById(String(req.params.id || ''));
      if (!meta) {
        res.status(404).json({ error: 'Media tidak ditemukan di database.' });
        return;
      }
      res.json({ media: meta });
    })
  );

  app.get(
    '/api/media/:id',
    asyncRoute(async (req, res) => {
      const record = await getMediaContentById(String(req.params.id || ''));
      if (!record) {
        res.status(404).json({ error: 'File media tidak ditemukan di database.' });
        return;
      }

      const total = record.buffer.length;
      res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodeURIComponent(record.name || record.id)}`
      );
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      const rangeHeader = req.header('range');
      if (rangeHeader && rangeHeader.startsWith('bytes=')) {
        const parts = rangeHeader.replace('bytes=', '').split('-');
        const start = Number.parseInt(parts[0] || '0', 10);
        const maxOpenRangeChunk = 2 * 1024 * 1024; // 2 MB chunk keeps 206 streams safe under Vercel 4.5 MB response limit
        const requestedEnd = parts[1]
          ? Number.parseInt(parts[1], 10)
          : Math.min(total - 1, start + maxOpenRangeChunk - 1);
        const end = Math.min(total - 1, requestedEnd);

        if (
          Number.isNaN(start) ||
          Number.isNaN(end) ||
          start < 0 ||
          end >= total ||
          start > end
        ) {
          res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
          return;
        }

        const chunk = record.buffer.subarray(start, end + 1);
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
        res.setHeader('Content-Length', String(chunk.length));
        res.send(chunk);
        return;
      }

      res.setHeader('Content-Length', String(total));
      res.send(record.buffer);
    })
  );

  app.post(
    '/api/media',
    requireTeacherPin,
    rawMedia,
    asyncRoute(async (req, res) => {
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
        req.header('x-media-mime') ||
          req.header('content-type') ||
          'application/octet-stream'
      );

      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
      if (body.length === 0) {
        res.status(400).json({ error: 'File media kosong atau gagal diunggah.' });
        return;
      }

      const meta = await saveMediaRecord({
        id: safeId,
        name: fileName,
        mimeType,
        buffer: body
      });
      res.status(201).json({ ok: true, media: meta });
    })
  );

  app.delete(
    '/api/media/:id',
    requireTeacherPin,
    asyncRoute(async (req, res) => {
      await removeMediaRecord(String(req.params.id || ''));
      res.json({ ok: true });
    })
  );

  // ---------------------------------------------------------------------------
  // Student Session & Progress Sync Endpoints
  // ---------------------------------------------------------------------------
  app.get(
    '/api/students/lookup/:code',
    asyncRoute(async (req, res) => {
      const rawCode = String(req.params.code || '').trim();
      if (!normalizeCode(rawCode)) {
        res.json({ exists: false, isDisabled: false });
        return;
      }
      const { entry, isDisabled } = await getStudentEntry(rawCode);
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
    })
  );

  app.post(
    '/api/students/session',
    jsonMedium,
    asyncRoute(async (req, res) => {
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

      const { entry: existing, isDisabled } = await getStudentEntry(rawCode);
      if (isDisabled) {
        res.status(403).json({
          error:
            'Akun siswa dengan kode ini sedang dinonaktifkan oleh guru. Hubungi guru pengampu untuk mengaktifkan kembali.',
          isDisabled: true
        });
        return;
      }

      const now = new Date().toISOString();
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

      await saveStudentEntry(rawCode, {
        profile,
        progress,
        importedAt: now,
        source: existing?.source === 'imported' ? 'server' : existing?.source || 'server'
      });

      res.json({ profile, progress });
    })
  );

  app.get(
    '/api/students/:code/progress',
    asyncRoute(async (req, res) => {
      const rawCode = String(req.params.code || '').trim();
      if (!normalizeCode(rawCode)) {
        res.status(400).json({ error: 'Kode siswa tidak valid.' });
        return;
      }
      const { entry, isDisabled } = await getStudentEntry(rawCode);
      if (isDisabled) {
        res.status(403).json({
          error: 'Akun siswa sedang dinonaktifkan oleh guru.',
          isDisabled: true
        });
        return;
      }
      if (!entry) {
        res.status(404).json({ error: 'Data siswa tidak ditemukan di server.' });
        return;
      }
      res.json({
        profile: entry.profile,
        progress: entry.progress
      });
    })
  );

  app.put(
    '/api/students/:code/progress',
    jsonMedium,
    asyncRoute(async (req, res) => {
      const rawCode = String(req.params.code || '').trim();
      if (!normalizeCode(rawCode)) {
        res.status(400).json({ error: 'Kode siswa tidak valid.' });
        return;
      }

      const { entry: existing, isDisabled } = await getStudentEntry(rawCode);
      if (isDisabled) {
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

      await saveStudentEntry(rawCode, {
        profile,
        progress: nextProgress,
        importedAt: now,
        source: 'server'
      });

      res.json({ ok: true, profile, progress: nextProgress });
    })
  );

  app.post(
    '/api/students/:code/reset',
    asyncRoute(async (req, res) => {
      const rawCode = String(req.params.code || '').trim();
      const { entry, isDisabled } = await getStudentEntry(rawCode);
      if (!normalizeCode(rawCode) || !entry) {
        res.status(404).json({ error: 'Data siswa tidak ditemukan di server.' });
        return;
      }
      if (isDisabled) {
        res.status(403).json({
          error: 'Akun siswa sedang dinonaktifkan oleh guru.',
          isDisabled: true
        });
        return;
      }

      const now = new Date().toISOString();
      const fresh = createInitialProgress(entry.profile.studentCode);
      await saveStudentEntry(rawCode, {
        profile: {
          ...entry.profile,
          lastActiveAt: now
        },
        progress: fresh,
        importedAt: now,
        source: entry.source
      });

      res.json({ ok: true, progress: fresh });
    })
  );

  // ---------------------------------------------------------------------------
  // Teacher PIN & Admin Grading Endpoints
  // ---------------------------------------------------------------------------
  app.post(
    '/api/teacher/verify-pin',
    jsonMedium,
    asyncRoute(async (req, res) => {
      const expectedPin = await getTeacherPinValue();
      const pin = String((req.body as { pin?: string })?.pin || '').trim();
      if (!pin || pin !== expectedPin) {
        res.status(401).json({
          ok: false,
          error: 'PIN Guru tidak sesuai. Periksa kembali PIN akses Mode Guru.'
        });
        return;
      }
      res.json({ ok: true });
    })
  );

  app.put(
    '/api/teacher/pin',
    requireTeacherPin,
    jsonMedium,
    asyncRoute(async (req, res) => {
      const newPin = String((req.body as { newPin?: string })?.newPin || '').trim();
      if (newPin.length < 4) {
        res.status(400).json({ error: 'PIN Guru minimal 4 karakter/angka.' });
        return;
      }
      await updateTeacherPinValue(newPin);
      res.json({ ok: true });
    })
  );

  app.get(
    '/api/teacher/students',
    requireTeacherPin,
    asyncRoute(async (_req, res) => {
      const students = await listAllStudentsForTeacher();
      res.json({ students });
    })
  );

  app.post(
    '/api/teacher/students/import',
    requireTeacherPin,
    jsonMedium,
    asyncRoute(async (req, res) => {
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

      const existing = await getStudentEntry(body.profile.studentCode);
      const now = new Date().toISOString();
      const isDisabled = Boolean(existing.isDisabled || body.profile.isDisabled);
      const record = {
        profile: {
          ...body.profile,
          isDisabled
        },
        progress: body.progress,
        importedAt: now,
        source: 'imported' as const
      };
      await saveStudentEntry(body.profile.studentCode, record);
      res.json({ ok: true, student: record });
    })
  );

  app.patch(
    '/api/teacher/students/:code/status',
    requireTeacherPin,
    jsonMedium,
    asyncRoute(async (req, res) => {
      const rawCode = String(req.params.code || '').trim();
      if (!normalizeCode(rawCode)) {
        res.status(400).json({ error: 'Kode siswa tidak valid.' });
        return;
      }

      const disabled = Boolean((req.body as { disabled?: boolean })?.disabled);
      await setStudentDisabledInDb(rawCode, disabled);
      res.json({ ok: true, disabled });
    })
  );

  app.delete(
    '/api/teacher/students/:code',
    requireTeacherPin,
    asyncRoute(async (req, res) => {
      const rawCode = String(req.params.code || '').trim();
      if (!normalizeCode(rawCode)) {
        res.status(400).json({ error: 'Kode siswa tidak valid.' });
        return;
      }
      await deleteStudentFromDb(rawCode);
      res.json({ ok: true });
    })
  );

  // Unknown API route safeguard
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
  });

  // Centralized API error handler
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api')) {
      next(err);
      return;
    }
    if (err instanceof DatabaseConfigError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    const errObj = err as { status?: number; statusCode?: number; type?: string };
    if (errObj?.type === 'entity.too.large' || errObj?.status === 413) {
      res.status(413).json({
        error: 'Ukuran data yang dikirim melebihi batas maksimal server.'
      });
      return;
    }
    if (errObj?.type === 'entity.parse.failed' || errObj?.status === 400) {
      res.status(400).json({ error: 'Format payload JSON tidak valid.' });
      return;
    }
    console.error('API Error:', err);
    res.status(500).json({
      error: 'Terjadi kesalahan pada server atau koneksi database PostgreSQL.'
    });
  });

  return app;
}
