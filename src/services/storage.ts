import {
  EpisodeContent,
  LearningStageKey,
  ModuleData,
  StageStatus,
  StudentProfile,
  StudentProgress
} from '../types/lms';
import {
  ApiHttpError,
  apiCreateOrResumeStudentSession,
  apiDeleteStudent,
  apiGetStudentProgress,
  apiGetTeacherStudents,
  apiImportStudentSubmission,
  apiLookupStudent,
  apiResetStudentProgress,
  apiSaveStudentProgress,
  apiSetStudentDisabled,
  apiUpdateTeacherPin,
  apiVerifyTeacherPin,
  setActiveTeacherPinSession
} from './api';

const PROFILES_KEY = 'smartguide_profiles_v1';
const ACTIVE_CODE_KEY = 'smartguide_active_student_v1';
const PROGRESS_PREFIX = 'smartguide_progress_v1_';
const TEACHER_PIN_KEY = 'smartguide_teacher_pin_v1';
const IMPORTED_SUBMISSIONS_KEY = 'smartguide_teacher_imported_submissions_v1';
const DISABLED_CODES_KEY = 'smartguide_disabled_student_codes_v1';

function migrateLegacyKeys() {
  try {
    if (!localStorage.getItem(PROFILES_KEY)) {
      const oldProfiles = localStorage.getItem('myob_smartguide_profiles_v1');
      if (oldProfiles) localStorage.setItem(PROFILES_KEY, oldProfiles);
    }
    if (!localStorage.getItem(ACTIVE_CODE_KEY)) {
      const oldActive = localStorage.getItem('myob_smartguide_active_student_v1');
      if (oldActive) localStorage.setItem(ACTIVE_CODE_KEY, oldActive);
    }
  } catch {
    // ignore storage access issues
  }
}

migrateLegacyKeys();

export function getTeacherPin(): string {
  try {
    return localStorage.getItem(TEACHER_PIN_KEY) || '1818';
  } catch {
    return '1818';
  }
}

export function setTeacherPin(newPin: string): void {
  localStorage.setItem(TEACHER_PIN_KEY, newPin.trim());
}

export async function verifyTeacherPinRemote(pin: string): Promise<boolean> {
  try {
    return await apiVerifyTeacherPin(pin);
  } catch (err) {
    if (err instanceof ApiHttpError) {
      return false;
    }
    // Offline fallback only when server is unreachable
    const ok = pin.trim() === getTeacherPin();
    if (ok) setActiveTeacherPinSession(pin.trim());
    return ok;
  }
}

export async function updateTeacherPinRemote(newPin: string): Promise<void> {
  await apiUpdateTeacherPin(newPin);
  setTeacherPin(newPin);
}

export function isEpisodeSimulationEnabled(ep: EpisodeContent): boolean {
  if (ep.guidedSimulation) {
    return ep.guidedSimulation.enabled && ep.guidedSimulation.steps.length > 0;
  }
  return Boolean(ep.hasVirtualLab);
}

export function createInitialProgress(studentCode: string): StudentProgress {
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

export function getSavedProfiles(): StudentProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function findProfileByCode(studentCode: string): StudentProfile | null {
  const normalized = studentCode.trim().toLowerCase();
  if (!normalized) return null;
  const profiles = getSavedProfiles();
  return (
    profiles.find((p) => p.studentCode.trim().toLowerCase() === normalized) || null
  );
}

export function saveStudentProfile(
  input: Pick<StudentProfile, 'studentCode' | 'fullName' | 'className'>
): StudentProfile {
  const now = new Date().toISOString();
  const normalizedCode = input.studentCode.trim();
  const profiles = getSavedProfiles();
  const existingIdx = profiles.findIndex(
    (p) => p.studentCode.trim().toLowerCase() === normalizedCode.toLowerCase()
  );

  const profile: StudentProfile =
    existingIdx >= 0
      ? {
          ...profiles[existingIdx],
          studentCode: normalizedCode,
          fullName: input.fullName.trim(),
          className: input.className.trim(),
          isDisabled: false,
          lastActiveAt: now
        }
      : {
          studentCode: normalizedCode,
          fullName: input.fullName.trim(),
          className: input.className.trim(),
          createdAt: now,
          lastActiveAt: now
        };

  if (existingIdx >= 0) {
    profiles[existingIdx] = profile;
  } else {
    profiles.unshift(profile);
  }

  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  localStorage.setItem(ACTIVE_CODE_KEY, profile.studentCode);

  const legacyProgress = localStorage.getItem(
    'myob_smartguide_progress_v1_' + profile.studentCode
  );
  if (!localStorage.getItem(PROGRESS_PREFIX + profile.studentCode)) {
    if (legacyProgress) {
      localStorage.setItem(PROGRESS_PREFIX + profile.studentCode, legacyProgress);
    } else {
      saveStudentProgress(createInitialProgress(profile.studentCode));
    }
  }

  return profile;
}

export function cacheRemoteStudentData(
  profile: StudentProfile,
  progress: StudentProgress
): void {
  const normalizedCode = profile.studentCode.trim().toLowerCase();
  const profiles = getSavedProfiles();
  const existingIdx = profiles.findIndex(
    (p) => p.studentCode.trim().toLowerCase() === normalizedCode
  );

  if (existingIdx >= 0) {
    profiles[existingIdx] = profile;
  } else {
    profiles.unshift(profile);
  }

  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  localStorage.setItem(ACTIVE_CODE_KEY, profile.studentCode);
  localStorage.setItem(
    PROGRESS_PREFIX + profile.studentCode,
    JSON.stringify(progress)
  );

  const disabledSet = getDisabledCodeSet();
  disabledSet.delete(normalizedCode);
  saveDisabledCodeSet(disabledSet);
}

export async function lookupStudentRemote(studentCode: string): Promise<{
  exists: boolean;
  isDisabled: boolean;
  profile: StudentProfile | null;
}> {
  const trimmed = studentCode.trim();
  if (!trimmed) return { exists: false, isDisabled: false, profile: null };
  try {
    const res = await apiLookupStudent(trimmed);
    return {
      exists: res.exists,
      isDisabled: res.isDisabled,
      profile: res.profile || null
    };
  } catch {
    const localProf = findProfileByCode(trimmed);
    return {
      exists: Boolean(localProf),
      isDisabled: isStudentCodeDisabled(trimmed),
      profile: localProf
    };
  }
}

export async function enterStudentSessionRemote(input: {
  studentCode: string;
  fullName: string;
  className: string;
}): Promise<{ profile: StudentProfile; progress: StudentProgress }> {
  try {
    const { profile, progress } = await apiCreateOrResumeStudentSession(input);
    cacheRemoteStudentData(profile, progress);
    return { profile, progress };
  } catch (err) {
    if (err instanceof ApiHttpError) {
      if (err.status === 403) {
        setStudentDisabledStatus(input.studentCode, true);
      }
      throw err;
    }
    // Fallback if offline
    if (isStudentCodeDisabled(input.studentCode)) {
      throw new Error(
        'Akun siswa ini sedang dinonaktifkan oleh guru.'
      );
    }
    const saved = saveStudentProfile(input);
    const loadedProg = loadStudentProgress(saved.studentCode);
    return { profile: saved, progress: loadedProg };
  }
}

export async function fetchStudentProgressRemote(studentCode: string): Promise<
  | { status: 'ok'; profile: StudentProfile; progress: StudentProgress }
  | { status: 'disabled' | 'deleted' | 'offline' }
> {
  try {
    const { profile, progress } = await apiGetStudentProgress(studentCode);
    cacheRemoteStudentData(profile, progress);
    return { status: 'ok', profile, progress };
  } catch (err) {
    if (err instanceof ApiHttpError) {
      if (err.status === 403) {
        setStudentDisabledStatus(studentCode, true);
        return { status: 'disabled' };
      }
      if (err.status === 404) {
        return { status: 'deleted' };
      }
    }
    return { status: 'offline' };
  }
}

export async function syncProgressToServer(
  profile: StudentProfile,
  progress: StudentProgress
): Promise<'ok' | 'disabled' | 'offline'> {
  try {
    await apiSaveStudentProgress(profile, progress);
    return 'ok';
  } catch (err) {
    if (err instanceof ApiHttpError && err.status === 403) {
      setStudentDisabledStatus(profile.studentCode, true);
      return 'disabled';
    }
    return 'offline';
  }
}

export async function resetStudentProgressRemote(
  studentCode: string
): Promise<StudentProgress> {
  try {
    const fresh = await apiResetStudentProgress(studentCode);
    saveStudentProgress(fresh);
    return fresh;
  } catch (err) {
    if (err instanceof ApiHttpError && err.status === 403) {
      throw err;
    }
    return resetStudentProgress(studentCode);
  }
}

function getDisabledCodeSet(): Set<string> {
  try {
    const raw = localStorage.getItem(DISABLED_CODES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((c) => String(c).trim().toLowerCase()));
  } catch {
    return new Set();
  }
}

function saveDisabledCodeSet(codes: Set<string>): void {
  localStorage.setItem(DISABLED_CODES_KEY, JSON.stringify(Array.from(codes)));
}

export function isStudentCodeDisabled(studentCode: string): boolean {
  const normalized = studentCode.trim().toLowerCase();
  if (!normalized) return false;
  if (getDisabledCodeSet().has(normalized)) return true;
  const prof = findProfileByCode(studentCode);
  return Boolean(prof?.isDisabled);
}

export function getActiveStudent(): StudentProfile | null {
  try {
    const code = localStorage.getItem(ACTIVE_CODE_KEY);
    if (!code) return null;
    const prof = findProfileByCode(code);
    if (!prof || isStudentCodeDisabled(prof.studentCode)) {
      return null;
    }
    return prof;
  } catch {
    return null;
  }
}

export function clearActiveStudentSession(): void {
  localStorage.removeItem(ACTIVE_CODE_KEY);
}

export function loadStudentProgress(studentCode: string): StudentProgress {
  try {
    const raw =
      localStorage.getItem(PROGRESS_PREFIX + studentCode) ||
      localStorage.getItem('myob_smartguide_progress_v1_' + studentCode);
    if (!raw) return createInitialProgress(studentCode);
    const parsed = JSON.parse(raw) as StudentProgress;
    return {
      ...createInitialProgress(studentCode),
      ...parsed,
      studentCode
    };
  } catch {
    return createInitialProgress(studentCode);
  }
}

export function saveStudentProgress(progress: StudentProgress): void {
  const next: StudentProgress = {
    ...progress,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(PROGRESS_PREFIX + progress.studentCode, JSON.stringify(next));
}

export function resetStudentProgress(studentCode: string): StudentProgress {
  const fresh = createInitialProgress(studentCode);
  saveStudentProgress(fresh);
  return fresh;
}

export function getEpisodeStageStatuses(
  progress: StudentProgress,
  episodeId: string
): Record<LearningStageKey, StageStatus> {
  const existing = progress.stageStatuses[episodeId];
  return {
    materi: existing?.materi ?? 'belum_dimulai',
    video: existing?.video ?? 'belum_dimulai',
    simulasi: existing?.simulasi ?? 'belum_dimulai',
    uji_mandiri: existing?.uji_mandiri ?? 'belum_dimulai',
    kuis: existing?.kuis ?? 'belum_dimulai'
  };
}

export function calculateLearningMetrics(
  modules: ModuleData[],
  progress: StudentProgress
) {
  const allEpisodes = modules.flatMap((m) => m.episodes);
  const availableEpisodes = allEpisodes.filter((ep) => ep.hasContent);

  let completedEpisodesCount = 0;
  let totalStageScore = 0;
  let totalPossibleStages = 0;

  for (const ep of availableEpisodes) {
    const statuses = getEpisodeStageStatuses(progress, ep.id);
    const hasLab = isEpisodeSimulationEnabled(ep);
    const hasVideo = Boolean(ep.videoInfo || ep.videoAttachmentId);
    const hasQuiz = ep.quizQuestions.length > 0;

    const relevantStages: LearningStageKey[] = ['materi'];
    if (hasVideo) relevantStages.push('video');
    if (hasLab) relevantStages.push('simulasi', 'uji_mandiri');
    if (hasQuiz) relevantStages.push('kuis');

    totalPossibleStages += relevantStages.length;
    let epDoneStages = 0;
    for (const key of relevantStages) {
      if (statuses[key] === 'selesai') {
        totalStageScore += 1;
        epDoneStages += 1;
      } else if (statuses[key] === 'sedang_dipelajari') {
        totalStageScore += 0.4;
      }
    }

    const quizDone = !hasQuiz || (progress.quizResults[ep.id]?.attempts ?? 0) > 0;
    const simDone = !hasLab || Boolean(progress.simulations[ep.id]?.lastUpdatedAt);

    if (
      epDoneStages >= Math.max(1, relevantStages.length - (hasVideo ? 1 : 0)) &&
      quizDone &&
      simDone
    ) {
      completedEpisodesCount += 1;
    }
  }

  const progressPercentage =
    totalPossibleStages > 0
      ? Math.min(100, Math.round((totalStageScore / totalPossibleStages) * 100))
      : 0;

  const quizEntries = Object.values(progress.quizResults);
  quizEntries.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const latestQuiz = quizEntries[0] ?? null;

  const materialsCompletedCount = availableEpisodes.filter(
    (ep) => progress.materialsRead[ep.id]
  ).length;

  const quizzesSubmittedCount = availableEpisodes.filter(
    (ep) => ep.quizQuestions.length > 0 && (progress.quizResults[ep.id]?.attempts ?? 0) > 0
  ).length;

  const quizzesAvailableCount = availableEpisodes.filter(
    (ep) => ep.quizQuestions.length > 0
  ).length;

  return {
    totalModules: modules.length,
    totalEpisodes: allEpisodes.length,
    availableEpisodesCount: availableEpisodes.length,
    completedEpisodesCount,
    materialsCompletedCount,
    quizzesSubmittedCount,
    quizzesAvailableCount,
    latestQuizScore: latestQuiz ? latestQuiz.score : null,
    progressPercentage
  };
}

export interface ImportedStudentSubmission {
  profile: StudentProfile;
  progress: StudentProgress;
  importedAt: string;
  source: 'local' | 'imported' | 'server';
}

export function getImportedSubmissions(): ImportedStudentSubmission[] {
  try {
    const raw = localStorage.getItem(IMPORTED_SUBMISSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveImportedSubmission(
  profile: StudentProfile,
  progress: StudentProgress
): void {
  const existing = getImportedSubmissions();
  const nextEntry: ImportedStudentSubmission = {
    profile,
    progress,
    importedAt: new Date().toISOString(),
    source: 'imported'
  };
  const filtered = existing.filter(
    (e) =>
      e.profile.studentCode.trim().toLowerCase() !==
      profile.studentCode.trim().toLowerCase()
  );
  localStorage.setItem(
    IMPORTED_SUBMISSIONS_KEY,
    JSON.stringify([nextEntry, ...filtered])
  );
}

export async function importStudentSubmissionRemote(
  profile: StudentProfile,
  progress: StudentProgress
): Promise<void> {
  await apiImportStudentSubmission(profile, progress);
  saveImportedSubmission(profile, progress);
}

export function getAllStudentsForTeacher(): ImportedStudentSubmission[] {
  const localProfiles = getSavedProfiles();
  const imported = getImportedSubmissions();
  const disabledSet = getDisabledCodeSet();
  const byCode = new Map<string, ImportedStudentSubmission>();

  for (const imp of imported) {
    const key = imp.profile.studentCode.trim().toLowerCase();
    const isDis = Boolean(imp.profile.isDisabled || disabledSet.has(key));
    byCode.set(key, {
      ...imp,
      profile: {
        ...imp.profile,
        isDisabled: isDis
      }
    });
  }

  for (const prof of localProfiles) {
    const key = prof.studentCode.trim().toLowerCase();
    const isDis = Boolean(prof.isDisabled || disabledSet.has(key));
    byCode.set(key, {
      profile: {
        ...prof,
        isDisabled: isDis
      },
      progress: loadStudentProgress(prof.studentCode),
      importedAt: prof.lastActiveAt,
      source: 'local'
    });
  }

  return Array.from(byCode.values());
}

export async function getAllStudentsForTeacherRemote(): Promise<
  ImportedStudentSubmission[]
> {
  const remoteList = await apiGetTeacherStudents();
  return remoteList;
}

export function setStudentDisabledStatus(
  studentCode: string,
  disabled: boolean
): void {
  const normalized = studentCode.trim().toLowerCase();
  if (!normalized) return;
  const now = new Date().toISOString();

  // Update disabled code registry
  const disabledSet = getDisabledCodeSet();
  if (disabled) {
    disabledSet.add(normalized);
  } else {
    disabledSet.delete(normalized);
  }
  saveDisabledCodeSet(disabledSet);

  // Update local profiles
  const profiles = getSavedProfiles();
  const nextProfiles = profiles.map((p) =>
    p.studentCode.trim().toLowerCase() === normalized
      ? {
          ...p,
          isDisabled: disabled,
          disabledAt: disabled ? now : undefined
        }
      : p
  );
  localStorage.setItem(PROFILES_KEY, JSON.stringify(nextProfiles));

  // Update imported submissions
  const imported = getImportedSubmissions();
  const nextImported = imported.map((item) =>
    item.profile.studentCode.trim().toLowerCase() === normalized
      ? {
          ...item,
          profile: {
            ...item.profile,
            isDisabled: disabled,
            disabledAt: disabled ? now : undefined
          }
        }
      : item
  );
  localStorage.setItem(IMPORTED_SUBMISSIONS_KEY, JSON.stringify(nextImported));
}

export async function setStudentDisabledRemote(
  studentCode: string,
  disabled: boolean
): Promise<void> {
  await apiSetStudentDisabled(studentCode, disabled);
  setStudentDisabledStatus(studentCode, disabled);
}

export function deleteStudentData(studentCode: string): void {
  const normalized = studentCode.trim().toLowerCase();
  if (!normalized) return;

  // Remove from local profiles & delete associated progress keys
  const profiles = getSavedProfiles();
  const matchedCodes = profiles
    .filter((p) => p.studentCode.trim().toLowerCase() === normalized)
    .map((p) => p.studentCode);

  const remainingProfiles = profiles.filter(
    (p) => p.studentCode.trim().toLowerCase() !== normalized
  );
  localStorage.setItem(PROFILES_KEY, JSON.stringify(remainingProfiles));

  const codesToClean = Array.from(new Set([studentCode.trim(), ...matchedCodes]));
  for (const code of codesToClean) {
    localStorage.removeItem(PROGRESS_PREFIX + code);
    localStorage.removeItem('myob_smartguide_progress_v1_' + code);
  }

  // Case-insensitive cleanup for any matching progress keys
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(PROGRESS_PREFIX)) {
        const suffix = k.slice(PROGRESS_PREFIX.length).trim().toLowerCase();
        if (suffix === normalized) keysToRemove.push(k);
      } else if (k.startsWith('myob_smartguide_progress_v1_')) {
        const suffix = k
          .slice('myob_smartguide_progress_v1_'.length)
          .trim()
          .toLowerCase();
        if (suffix === normalized) keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // ignore storage enumeration issues
  }

  // Remove from imported submissions
  const imported = getImportedSubmissions();
  const remainingImported = imported.filter(
    (item) => item.profile.studentCode.trim().toLowerCase() !== normalized
  );
  localStorage.setItem(
    IMPORTED_SUBMISSIONS_KEY,
    JSON.stringify(remainingImported)
  );

  // Remove from disabled registry
  const disabledSet = getDisabledCodeSet();
  disabledSet.delete(normalized);
  saveDisabledCodeSet(disabledSet);

  // Clear active session if it belongs to deleted student
  const activeCode = localStorage.getItem(ACTIVE_CODE_KEY);
  if (activeCode && activeCode.trim().toLowerCase() === normalized) {
    localStorage.removeItem(ACTIVE_CODE_KEY);
  }
}

export async function deleteStudentRemote(studentCode: string): Promise<void> {
  await apiDeleteStudent(studentCode);
  deleteStudentData(studentCode);
}

export interface EpisodeAutoGradeSummary {
  episodeId: string;
  moduleCode: string;
  episodeCode: string;
  episodeTitle: string;
  quizScore: number | null;
  quizCorrect: number;
  quizTotal: number;
  quizAttempts: number;
  simScore: number | null;
  simValidCount: number;
  simTotalFields: number;
  checkpointStatus: 'belum' | 'berhasil' | 'perlu_diperbaiki';
  combinedScore: number | null;
  totalAttempts: number;
  totalErrors: number;
  hintsUsed: number;
}

export function computeEpisodeAutoGrade(
  module: ModuleData,
  episode: EpisodeContent,
  progress: StudentProgress
): EpisodeAutoGradeSummary {
  const quiz = progress.quizResults[episode.id];
  const sim = progress.simulations[episode.id];
  const hasQuiz = episode.quizQuestions.length > 0;
  const hasSim = isEpisodeSimulationEnabled(episode);

  let quizScore: number | null = null;
  let quizCorrect = 0;
  if (hasQuiz && quiz) {
    let recomputedCorrect = 0;
    for (const q of episode.quizQuestions) {
      if (quiz.answers[q.id] === q.correctIndex) {
        recomputedCorrect += 1;
      }
    }
    quizCorrect = recomputedCorrect;
    quizScore = Math.round((recomputedCorrect / episode.quizQuestions.length) * 100);
  }

  let simScore: number | null = null;
  let simValidCount = 0;
  let simTotalFields = 0;
  if (hasSim && sim?.lastFieldResults && sim.lastFieldResults.length > 0) {
    simTotalFields = sim.lastFieldResults.length;
    simValidCount = sim.lastFieldResults.filter((f) => f.isValid).length;
    simScore = Math.round((simValidCount / simTotalFields) * 100);
  }

  let combinedScore: number | null = null;
  if (quizScore !== null && simScore !== null) {
    combinedScore = Math.round(quizScore * 0.5 + simScore * 0.5);
  } else if (quizScore !== null) {
    combinedScore = quizScore;
  } else if (simScore !== null) {
    combinedScore = simScore;
  }

  const totalAttempts =
    (sim?.independentAttempts ?? 0) + (sim?.guidedCompleted ? 1 : 0);
  const totalErrors =
    (sim?.independentErrors ?? 0) + (sim?.guidedErrors ?? 0);

  return {
    episodeId: episode.id,
    moduleCode: module.code,
    episodeCode: episode.code,
    episodeTitle: episode.title,
    quizScore,
    quizCorrect,
    quizTotal: episode.quizQuestions.length,
    quizAttempts: quiz?.attempts ?? 0,
    simScore,
    simValidCount,
    simTotalFields,
    checkpointStatus: sim?.checkpointStatus ?? 'belum',
    combinedScore,
    totalAttempts,
    totalErrors,
    hintsUsed: sim?.guidedHintsUsed ?? 0
  };
}

export function triggerFileDownload(
  filename: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// Student submission archive JSON (for handing over to teacher without showing detailed rubric UI)
export function exportStudentSubmissionJson(
  profile: StudentProfile,
  progress: StudentProgress
): void {
  const payload = {
    aplikasi: 'Smart-Guide',
    jenisBerkas: 'Pengumpulan Hasil Belajar Siswa',
    dieksportPada: new Date().toISOString(),
    siswa: profile,
    progresDetail: progress
  };

  const safeCode = profile.studentCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  triggerFileDownload(
    `smart-guide-pengumpulan-${safeCode}.json`,
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8'
  );
}

function escapeCsvCell(value: string | number | boolean): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Teacher-only detailed CSV gradebook export
export function exportTeacherGradebookCsv(
  students: ImportedStudentSubmission[],
  modules: ModuleData[]
): void {
  const availableEpisodes = modules.flatMap((m) =>
    m.episodes
      .filter((e) => e.hasContent)
      .map((e) => ({ module: m, episode: e }))
  );

  const headers = [
    'Kode Siswa',
    'Nama Lengkap',
    'Kelas',
    'Status Akun',
    'Modul',
    'Kode Episode',
    'Judul Episode',
    'Nilai Kuis Otomatis (0-100)',
    'Jawaban Benar Kuis',
    'Total Soal Kuis',
    'Percobaan Kuis',
    'Skor Praktik Simulasi (0-100)',
    'Status Checkpoint',
    'Nilai Akhir Gabungan (50% Kuis + 50% Praktik)',
    'Total Percobaan Praktik',
    'Total Kesalahan Praktik',
    'Jumlah Hint Digunakan',
    'Terakhir Diperbarui'
  ];

  const rows: string[] = [];
  for (const item of students) {
    for (const { module, episode } of availableEpisodes) {
      const grade = computeEpisodeAutoGrade(module, episode, item.progress);
      const cpLabel =
        grade.checkpointStatus === 'berhasil'
          ? 'BERHASIL'
          : grade.checkpointStatus === 'perlu_diperbaiki'
            ? 'PERLU DIPERBAIKI'
            : 'Belum Dikerjakan';

      rows.push(
        [
          item.profile.studentCode,
          item.profile.fullName,
          item.profile.className,
          item.profile.isDisabled ? 'Nonaktif' : 'Aktif',
          `${module.code} - ${module.title}`,
          episode.code,
          episode.title,
          grade.quizScore !== null ? grade.quizScore : 'Belum Dikerjakan',
          grade.quizCorrect,
          grade.quizTotal,
          grade.quizAttempts,
          grade.simScore !== null ? grade.simScore : 'Belum Dikerjakan',
          cpLabel,
          grade.combinedScore !== null ? grade.combinedScore : 'Belum Lengkap',
          grade.totalAttempts,
          grade.totalErrors,
          grade.hintsUsed,
          item.progress.updatedAt
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    }
  }

  const csvBody = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
  triggerFileDownload(
    `smart-guide-rekap-penilaian-guru-${new Date().toISOString().slice(0, 10)}.csv`,
    csvBody,
    'text/csv;charset=utf-8'
  );
}

export function exportTeacherGradebookJson(
  students: ImportedStudentSubmission[],
  modules: ModuleData[]
): void {
  const availableEpisodes = modules.flatMap((m) =>
    m.episodes
      .filter((e) => e.hasContent)
      .map((e) => ({ module: m, episode: e }))
  );

  const report = students.map((item) => ({
    siswa: item.profile,
    sumberData: item.source,
    penilaianPerEpisode: availableEpisodes.map(({ module, episode }) =>
      computeEpisodeAutoGrade(module, episode, item.progress)
    )
  }));

  triggerFileDownload(
    `smart-guide-rekap-penilaian-guru-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(
      {
        aplikasi: 'Smart-Guide',
        jenisLaporan: 'Penilaian Detail Otomatis (Khusus Guru)',
        dieksportPada: new Date().toISOString(),
        dataSiswa: report
      },
      null,
      2
    ),
    'application/json;charset=utf-8'
  );
}
