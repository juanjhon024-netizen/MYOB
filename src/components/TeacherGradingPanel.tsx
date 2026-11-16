import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ClipboardCheck,
  FileJson,
  FileSpreadsheet,
  Info,
  MonitorCheck,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserCheck,
  Users,
  XCircle
} from 'lucide-react';
import {
  EpisodeContent,
  ModuleData,
  StudentProfile,
  StudentProgress
} from '../types/lms';
import {
  calculateLearningMetrics,
  computeEpisodeAutoGrade,
  deleteStudentRemote,
  exportTeacherGradebookCsv,
  exportTeacherGradebookJson,
  getAllStudentsForTeacher,
  getAllStudentsForTeacherRemote,
  ImportedStudentSubmission,
  importStudentSubmissionRemote,
  isEpisodeSimulationEnabled,
  setStudentDisabledRemote
} from '../services/storage';
import { CheckpointStatusText } from './StatusBadge';

interface TeacherGradingPanelProps {
  modules: ModuleData[];
}

export function TeacherGradingPanel({ modules }: TeacherGradingPanelProps) {
  const [students, setStudents] = useState<ImportedStudentSubmission[]>(() =>
    getAllStudentsForTeacher()
  );
  const [isLoadingServer, setIsLoadingServer] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [selectedStudentCode, setSelectedStudentCode] = useState<string>(
    () => getAllStudentsForTeacher()[0]?.profile.studentCode || ''
  );
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('ep-1-1');
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<StudentProfile | null>(
    null
  );

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  const availableEpisodes = useMemo(
    () =>
      modules.flatMap((mod) =>
        mod.episodes
          .filter((ep) => ep.hasContent)
          .map((ep) => ({ module: mod, episode: ep }))
      ),
    [modules]
  );

  const reloadStudents = useCallback(
    async (preferredCode?: string, silent = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      if (!silent) {
        setIsLoadingServer(true);
      }
      try {
        const next = await getAllStudentsForTeacherRemote();
        setStudents(next);
        setLastSyncedAt(new Date().toISOString());
        if (preferredCode !== undefined) {
          setSelectedStudentCode(preferredCode);
        } else if (next.length === 0) {
          setSelectedStudentCode('');
        } else {
          setSelectedStudentCode((prev) =>
            next.some((s) => s.profile.studentCode === prev)
              ? prev
              : next[0].profile.studentCode
          );
        }
      } catch (err) {
        if (!silent) {
          setBanner({
            type: 'error',
            text:
              err instanceof Error
                ? err.message
                : 'Gagal memuat daftar nilai siswa dari server.'
          });
        }
      } finally {
        isFetchingRef.current = false;
        if (!silent) {
          setIsLoadingServer(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    reloadStudents(undefined, false);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        reloadStudents(undefined, true);
      }
    }, 5000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        reloadStudents(undefined, true);
      }
    };

    const handleStorageUpdate = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith('smartguide_')) {
        reloadStudents(undefined, true);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [reloadStudents]);

  const handleToggleDisableStudent = async (profile: StudentProfile) => {
    const nextDisabled = !profile.isDisabled;
    try {
      await setStudentDisabledRemote(profile.studentCode, nextDisabled);
      await reloadStudents(profile.studentCode);
      setBanner({
        type: 'success',
        text: nextDisabled
          ? `Akun siswa "${profile.fullName}" (${profile.studentCode}) dinonaktifkan di server. Siswa tidak dapat masuk dari perangkat mana pun hingga diaktifkan kembali.`
          : `Akun siswa "${profile.fullName}" (${profile.studentCode}) berhasil diaktifkan kembali.`
      });
    } catch (err) {
      setBanner({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Gagal mengubah status akun siswa di server.'
      });
    }
  };

  const handleConfirmDeleteStudent = async () => {
    if (!confirmDeleteTarget) return;
    const { studentCode, fullName } = confirmDeleteTarget;
    try {
      await deleteStudentRemote(studentCode);
      setConfirmDeleteTarget(null);
      await reloadStudents();
      setBanner({
        type: 'success',
        text: `Nama dan seluruh data belajar siswa "${fullName}" (${studentCode}) telah dihapus permanen dari server.`
      });
    } catch (err) {
      setConfirmDeleteTarget(null);
      setBanner({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Gagal menghapus data siswa di server.'
      });
    }
  };

  const handleImportStudentFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let importedCount = 0;
    let lastCode = '';
    const failedNames: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const rawText = await file.text();
        const parsed = JSON.parse(rawText) as {
          siswa?: StudentProfile;
          progresDetail?: StudentProgress;
        };

        if (
          !parsed?.siswa?.studentCode ||
          !parsed?.siswa?.fullName ||
          !parsed?.progresDetail?.studentCode
        ) {
          failedNames.push(file.name);
          continue;
        }

        await importStudentSubmissionRemote(parsed.siswa, parsed.progresDetail);
        importedCount += 1;
        lastCode = parsed.siswa.studentCode;
      } catch {
        failedNames.push(file.name);
      }
    }

    e.target.value = '';
    await reloadStudents(lastCode || undefined);

    if (importedCount > 0 && failedNames.length === 0) {
      setBanner({
        type: 'success',
        text: `${importedCount} berkas pengumpulan siswa berhasil diimpor ke server dan dinilai otomatis.`
      });
    } else if (importedCount > 0) {
      setBanner({
        type: 'success',
        text: `${importedCount} berkas berhasil diimpor. ${failedNames.length} berkas dilewati karena format tidak sesuai (${failedNames.join(', ')}).`
      });
    } else {
      setBanner({
        type: 'error',
        text: `Gagal mengimpor berkas (${failedNames.join(', ')}). Pastikan file berasal dari tombol "Unduh Berkas Pengumpulan (.json)" milik siswa.`
      });
    }
  };

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter === 'active' && s.profile.isDisabled) return false;
      if (statusFilter === 'disabled' && !s.profile.isDisabled) return false;
      if (!q) return true;
      return (
        s.profile.fullName.toLowerCase().includes(q) ||
        s.profile.studentCode.toLowerCase().includes(q) ||
        s.profile.className.toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery, statusFilter]);

  const activeStudent =
    students.find(
      (s) =>
        s.profile.studentCode.toLowerCase() ===
        selectedStudentCode.toLowerCase()
    ) ||
    filteredStudents[0] ||
    null;

  const activeEpisodeItem:
    | { module: ModuleData; episode: EpisodeContent }
    | undefined =
    availableEpisodes.find((item) => item.episode.id === selectedEpisodeId) ||
    availableEpisodes[0];

  const studentAggregates = useMemo(() => {
    return filteredStudents.map((item) => {
      const grades = availableEpisodes.map(({ module, episode }) =>
        computeEpisodeAutoGrade(module, episode, item.progress)
      );
      const quizScores = grades
        .map((g) => g.quizScore)
        .filter((v): v is number => v !== null);
      const simScores = grades
        .map((g) => g.simScore)
        .filter((v): v is number => v !== null);
      const combinedScores = grades
        .map((g) => g.combinedScore)
        .filter((v): v is number => v !== null);

      const avgQuiz =
        quizScores.length > 0
          ? Math.round(
              quizScores.reduce((acc, v) => acc + v, 0) / quizScores.length
            )
          : null;
      const avgSim =
        simScores.length > 0
          ? Math.round(
              simScores.reduce((acc, v) => acc + v, 0) / simScores.length
            )
          : null;
      const avgCombined =
        combinedScores.length > 0
          ? Math.round(
              combinedScores.reduce((acc, v) => acc + v, 0) /
                combinedScores.length
            )
          : null;

      const totalErrors = grades.reduce((acc, g) => acc + g.totalErrors, 0);
      const totalHints = grades.reduce((acc, g) => acc + g.hintsUsed, 0);
      const cpPassed = grades.filter(
        (g) => g.checkpointStatus === 'berhasil'
      ).length;
      const metrics = calculateLearningMetrics(modules, item.progress);

      return {
        item,
        grades,
        avgQuiz,
        avgSim,
        avgCombined,
        totalErrors,
        totalHints,
        cpPassed,
        metrics
      };
    });
  }, [filteredStudents, availableEpisodes, modules]);

  const classStats = useMemo(() => {
    const validCombined = studentAggregates
      .map((s) => s.avgCombined)
      .filter((v): v is number => v !== null);
    const classAvg =
      validCombined.length > 0
        ? Math.round(
            validCombined.reduce((a, b) => a + b, 0) / validCombined.length
          )
        : null;
    const totalQuizzesSubmitted = studentAggregates.reduce(
      (a, s) => a + s.metrics.quizzesSubmittedCount,
      0
    );
    const totalCheckpointsPassed = studentAggregates.reduce(
      (a, s) => a + s.cpPassed,
      0
    );
    const activeCount = students.filter((s) => !s.profile.isDisabled).length;
    const disabledCount = students.length - activeCount;
    return {
      totalStudents: students.length,
      activeCount,
      disabledCount,
      classAvg,
      totalQuizzesSubmitted,
      totalCheckpointsPassed
    };
  }, [studentAggregates, students]);

  const activeGrade =
    activeStudent && activeEpisodeItem
      ? computeEpisodeAutoGrade(
          activeEpisodeItem.module,
          activeEpisodeItem.episode,
          activeStudent.progress
        )
      : null;

  const activeQuizRecord =
    activeStudent && activeEpisodeItem
      ? activeStudent.progress.quizResults[activeEpisodeItem.episode.id]
      : undefined;

  const activeSimRecord =
    activeStudent && activeEpisodeItem
      ? activeStudent.progress.simulations[activeEpisodeItem.episode.id]
      : undefined;

  return (
    <div className="space-y-6">
      {/* Top Action & Class Summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#19A89B]">
              Penilaian Detail &amp; Otomatis · Akses Khusus Guru
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-[#14263D]">
              Rekap Nilai &amp; Analisis Jawaban Siswa
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Sistem menilai otomatis skor kuis, ketepatan kolom praktik simulasi, jumlah
              kesalahan, serta penggunaan hint. Nilai per sesi otomatis diperbarui setiap 5 detik.
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-[#19A89B] tabular-nums">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Sinkron otomatis aktif
                {lastSyncedAt
                  ? ` · Terakhir diperbarui ${new Date(lastSyncedAt).toLocaleTimeString('id-ID')}`
                  : ''}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isLoadingServer}
              onClick={() => reloadStudents()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#14263D] hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#3569B0] ${isLoadingServer ? 'animate-spin' : ''}`} />
              <span>{isLoadingServer ? 'Memuat...' : 'Muat Ulang Server'}</span>
            </button>

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#19A89B] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#148f84] whitespace-nowrap">
              <Upload className="h-3.5 w-3.5" />
              <span>Impor Hasil Siswa (.json)</span>
              <input
                type="file"
                multiple
                accept=".json,application/json"
                onChange={handleImportStudentFile}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              disabled={students.length === 0}
              onClick={() => exportTeacherGradebookCsv(students, modules)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#14263D] hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#19A89B]" />
              <span>Ekspor Nilai Excel (CSV)</span>
            </button>

            <button
              type="button"
              disabled={students.length === 0}
              onClick={() => exportTeacherGradebookJson(students, modules)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#14263D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1e3859] disabled:opacity-40 whitespace-nowrap"
            >
              <FileJson className="h-3.5 w-3.5" />
              <span>Ekspor Laporan JSON</span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-200 pt-5 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>Siswa Terdata</span>
              <Users className="h-4 w-4 text-[#3569B0]" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[#14263D] tabular-nums">
              {classStats.totalStudents}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
              {classStats.activeCount} aktif · {classStats.disabledCount} nonaktif
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#EAF3FF] p-4">
            <div className="flex items-center justify-between text-xs font-medium text-[#14263D]">
              <span>Rata-rata Nilai Gabungan</span>
              <ClipboardCheck className="h-4 w-4 text-[#3569B0]" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[#3569B0] tabular-nums">
              {classStats.classAvg !== null ? `${classStats.classAvg}` : '—'}
              {classStats.classAvg !== null && (
                <span className="ml-1 text-xs font-normal text-slate-600">
                  / 100
                </span>
              )}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>Kuis Dinilai Otomatis</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[#14263D] tabular-nums">
              {classStats.totalQuizzesSubmitted}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>Checkpoint Berhasil</span>
              <MonitorCheck className="h-4 w-4 text-[#19A89B]" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[#14263D] tabular-nums">
              {classStats.totalCheckpointsPassed}
            </p>
          </div>
        </div>
      </section>

      {banner && (
        <div
          role="status"
          className={`flex items-start justify-between gap-4 rounded-xl border p-4 text-sm ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {banner.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-xs font-semibold underline shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Delete Student Confirmation Modal */}
      {confirmDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14263D]/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <h3 className="font-display text-lg font-bold text-[#14263D]">
                  Hapus Nama &amp; Data Siswa?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Identitas{' '}
                  <strong className="text-[#14263D]">
                    {confirmDeleteTarget.fullName}
                  </strong>{' '}
                  ({confirmDeleteTarget.studentCode} · {confirmDeleteTarget.className}) beserta
                  seluruh progres, jawaban kuis, dan riwayat praktik akan dihapus permanen dari
                  server.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteTarget(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Roster Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-[#14263D]">
              Daftar Nilai &amp; Kelola Siswa ({filteredStudents.length})
            </h3>
            <p className="text-xs text-slate-500">
              Guru dapat menonaktifkan akses masuk siswa atau menghapus nama beserta datanya.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-lg border border-slate-200 bg-[#F4F7FB] p-1">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'active', label: 'Aktif' },
                { id: 'disabled', label: 'Nonaktif' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setStatusFilter(tab.id as 'all' | 'active' | 'disabled')
                  }
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-white text-[#14263D] shadow-sm'
                      : 'text-slate-600 hover:text-[#14263D]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, kode, atau kelas..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-[#14263D] focus:border-[#3569B0] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {studentAggregates.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600">
            {students.length === 0
              ? 'Belum ada data siswa di server. Saat siswa masuk dan mengerjakan di perangkat masing-masing, hasilnya akan langsung tampil di sini.'
              : 'Tidak ada siswa yang sesuai dengan filter atau pencarian.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-[#F4F7FB] text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-6 py-3">Siswa</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Progres</th>
                  <th className="px-4 py-3 text-right">Rata-rata Kuis</th>
                  <th className="px-4 py-3 text-right">Rata-rata Praktik</th>
                  <th className="px-4 py-3 text-right">Nilai Gabungan</th>
                  <th className="px-4 py-3 text-right">Salah / Hint</th>
                  <th className="px-6 py-3 text-right">Kelola &amp; Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {studentAggregates.map((row) => {
                  const isSelected =
                    activeStudent?.profile.studentCode ===
                    row.item.profile.studentCode;
                  const isDisabled = Boolean(row.item.profile.isDisabled);
                  return (
                    <tr
                      key={row.item.profile.studentCode}
                      className={
                        isSelected
                          ? 'bg-[#EAF3FF]/60'
                          : isDisabled
                            ? 'bg-slate-50/70'
                            : 'hover:bg-slate-50/70'
                      }
                    >
                      <td className="px-6 py-3.5">
                        <p
                          className={`font-bold ${
                            isDisabled
                              ? 'text-slate-500 line-through'
                              : 'text-[#14263D]'
                          }`}
                        >
                          {row.item.profile.fullName}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {row.item.profile.studentCode} ·{' '}
                          {row.item.profile.className} ·{' '}
                          <span
                            className={
                              row.item.source === 'imported'
                                ? 'font-semibold text-[#19A89B]'
                                : 'text-[#3569B0] font-medium'
                            }
                          >
                            {row.item.source === 'imported'
                              ? 'File Impor'
                              : row.item.source === 'server'
                                ? 'Sinkron Server'
                                : 'Perangkat Ini'}
                          </span>
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {isDisabled ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-800 whitespace-nowrap">
                            <Ban className="h-3.5 w-3.5 shrink-0" />
                            <span>Nonaktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 whitespace-nowrap">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Aktif</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {row.metrics.progressPercentage}%
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-[#14263D] tabular-nums">
                        {row.avgQuiz !== null ? `${row.avgQuiz}` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-[#14263D] tabular-nums">
                        {row.avgSim !== null ? `${row.avgSim}` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-[#3569B0] tabular-nums">
                        {row.avgCombined !== null ? `${row.avgCombined}/100` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {row.totalErrors} / {row.totalHints}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedStudentCode(row.item.profile.studentCode)
                            }
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                              isSelected
                                ? 'bg-[#14263D] text-white'
                                : 'border border-slate-300 bg-white text-[#14263D] hover:bg-slate-50'
                            }`}
                          >
                            {isSelected ? 'Dibuka' : 'Detail'}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleToggleDisableStudent(row.item.profile)
                            }
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                              isDisabled
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                            }`}
                          >
                            {isDisabled ? (
                              <>
                                <UserCheck className="h-3.5 w-3.5" />
                                <span>Aktifkan</span>
                              </>
                            ) : (
                              <>
                                <Ban className="h-3.5 w-3.5" />
                                <span>Nonaktifkan</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteTarget(row.item.profile)
                            }
                            aria-label={`Hapus ${row.item.profile.fullName}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 whitespace-nowrap"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Detailed Student Grading Inspector */}
      {activeStudent && activeEpisodeItem && activeGrade && (
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-[#14263D] px-6 py-5 text-white lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#19A89B]">
                Detail Penilaian Otomatis Siswa
              </p>
              <h3 className="mt-0.5 font-display text-lg font-bold">
                {activeStudent.profile.fullName} ({activeStudent.profile.studentCode} ·{' '}
                {activeStudent.profile.className})
              </h3>
              {activeStudent.profile.isDisabled && (
                <p className="mt-1 text-xs font-medium text-amber-300">
                  Status: Nonaktif — Siswa ini tidak dapat masuk dari perangkat mana pun hingga
                  diaktifkan kembali.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:w-72">
                <label
                  htmlFor="teacher-grade-ep-select"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300"
                >
                  Pilih Episode yang Dinilai
                </label>
                <select
                  id="teacher-grade-ep-select"
                  value={activeEpisodeItem.episode.id}
                  onChange={(e) => setSelectedEpisodeId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-[#1e3859] px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                >
                  {availableEpisodes.map(({ module, episode }) => (
                    <option key={episode.id} value={episode.id}>
                      {module.code} · Ep. {episode.code}: {episode.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleToggleDisableStudent(activeStudent.profile)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 whitespace-nowrap"
                >
                  {activeStudent.profile.isDisabled ? (
                    <>
                      <UserCheck className="h-3.5 w-3.5 text-[#19A89B]" />
                      <span>Aktifkan Akun</span>
                    </>
                  ) : (
                    <>
                      <Ban className="h-3.5 w-3.5 text-amber-300" />
                      <span>Nonaktifkan Akun</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTarget(activeStudent.profile)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/50 bg-red-950/50 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-900/70 whitespace-nowrap"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Hapus Siswa</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Per-Session Score Overview Table (Auto-Updated) */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-display text-base font-bold text-[#14263D]">
                  Rekap Nilai Otomatis Per Sesi / Episode
                </h4>
                <span className="text-xs text-slate-500">
                  Pilih sesi untuk melihat rincian jawaban di bawah
                </span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-[#F4F7FB] font-semibold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5">Sesi / Episode</th>
                      <th className="px-3 py-2.5 text-right">Nilai Kuis</th>
                      <th className="px-3 py-2.5 text-right">Skor Praktik</th>
                      <th className="px-3 py-2.5 text-right">Nilai Gabungan</th>
                      <th className="px-3 py-2.5">Checkpoint</th>
                      <th className="px-3 py-2.5 text-right">Salah / Hint</th>
                      <th className="px-4 py-2.5 text-right">Rincian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {availableEpisodes.map(({ module, episode }) => {
                      const sessionGrade = computeEpisodeAutoGrade(
                        module,
                        episode,
                        activeStudent.progress
                      );
                      const isSessionActive =
                        episode.id === activeEpisodeItem.episode.id;
                      return (
                        <tr
                          key={episode.id}
                          className={
                            isSessionActive
                              ? 'bg-[#EAF3FF]/60'
                              : 'hover:bg-slate-50/70'
                          }
                        >
                          <td className="px-4 py-2.5">
                            <p className="font-semibold text-[#14263D]">
                              {module.code} · Ep. {episode.code}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {episode.title}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#14263D] tabular-nums">
                            {sessionGrade.quizScore !== null
                              ? sessionGrade.quizScore
                              : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#14263D] tabular-nums">
                            {sessionGrade.simScore !== null
                              ? sessionGrade.simScore
                              : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-[#3569B0] tabular-nums">
                            {sessionGrade.combinedScore !== null
                              ? `${sessionGrade.combinedScore}/100`
                              : '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            <CheckpointStatusText
                              status={sessionGrade.checkpointStatus}
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-600 tabular-nums">
                            {sessionGrade.totalErrors} / {sessionGrade.hintsUsed}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedEpisodeId(episode.id)}
                              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
                                isSessionActive
                                  ? 'bg-[#14263D] text-white'
                                  : 'border border-slate-300 bg-white text-[#3569B0] hover:bg-slate-50'
                              }`}
                            >
                              {isSessionActive ? 'Dibuka' : 'Lihat'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Score Breakdown Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
                <p className="text-xs text-slate-500">Nilai Kuis (50%)</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#14263D] tabular-nums">
                  {activeGrade.quizScore !== null
                    ? `${activeGrade.quizScore}`
                    : '—'}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600 tabular-nums">
                  {activeGrade.quizScore !== null
                    ? `Benar ${activeGrade.quizCorrect}/${activeGrade.quizTotal} (${activeGrade.quizAttempts}x)`
                    : 'Belum dikumpulkan'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
                <p className="text-xs text-slate-500">Skor Praktik (50%)</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#14263D] tabular-nums">
                  {activeGrade.simScore !== null
                    ? `${activeGrade.simScore}`
                    : '—'}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600 tabular-nums">
                  {activeGrade.simScore !== null
                    ? `${activeGrade.simValidCount}/${activeGrade.simTotalFields} kolom sesuai`
                    : isEpisodeSimulationEnabled(activeEpisodeItem.episode)
                      ? 'Belum dikirim'
                      : 'Simulasi nonaktif'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-[#EAF3FF] p-4">
                <p className="text-xs font-semibold text-[#14263D]">
                  Nilai Akhir Gabungan
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-[#3569B0] tabular-nums">
                  {activeGrade.combinedScore !== null
                    ? `${activeGrade.combinedScore}`
                    : '—'}
                  {activeGrade.combinedScore !== null && (
                    <span className="ml-1 text-xs font-normal text-slate-600">
                      / 100
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  Otomatis (0–100)
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
                <p className="text-xs text-slate-500">Status Checkpoint</p>
                <div className="mt-2">
                  <CheckpointStatusText status={activeGrade.checkpointStatus} />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
                <p className="text-xs text-slate-500">Telemetri Praktik</p>
                <p className="mt-1 text-xs font-semibold text-[#14263D] tabular-nums">
                  Percobaan: {activeGrade.totalAttempts}x
                </p>
                <p className="text-xs text-slate-600 tabular-nums">
                  Kesalahan: {activeGrade.totalErrors} · Hint: {activeGrade.hintsUsed}
                </p>
              </div>
            </div>

            {/* Detail Analisis Kuis */}
            <div className="space-y-3">
              <h4 className="font-display text-base font-bold text-[#14263D]">
                Rincian Analisis Jawaban Kuis Pilihan Ganda
              </h4>
              {activeEpisodeItem.episode.quizQuestions.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Episode ini belum memiliki soal kuis.
                </p>
              ) : !activeQuizRecord ? (
                <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4 text-xs text-slate-600">
                  Siswa belum mengumpulkan jawaban kuis pada episode ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeEpisodeItem.episode.quizQuestions.map((q, idx) => {
                    const chosenIdx = activeQuizRecord.answers[q.id];
                    const isCorrect = chosenIdx === q.correctIndex;
                    const chosenLabel =
                      typeof chosenIdx === 'number' && q.options[chosenIdx]
                        ? `${String.fromCharCode(65 + chosenIdx)}. ${q.options[chosenIdx]}`
                        : 'Tidak dijawab';
                    const keyLabel = `${String.fromCharCode(65 + q.correctIndex)}. ${
                      q.options[q.correctIndex] || ''
                    }`;

                    return (
                      <div
                        key={q.id}
                        className={`rounded-lg border p-4 text-xs ${
                          isCorrect
                            ? 'border-emerald-200 bg-emerald-50/50'
                            : 'border-red-200 bg-red-50/50'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-bold text-[#14263D]">
                            {idx + 1}. {q.question}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              isCorrect ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Benar</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Salah</span>
                              </>
                            )}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <p className="text-slate-700">
                            <strong>Jawaban Siswa:</strong> {chosenLabel}
                          </p>
                          <p className="text-[#14263D]">
                            <strong>Kunci Guru:</strong> {keyLabel}
                          </p>
                        </div>
                        <p className="mt-1.5 text-slate-600">
                          <strong>Pembahasan:</strong> {q.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detail Analisis Praktik Simulasi */}
            {isEpisodeSimulationEnabled(activeEpisodeItem.episode) && (
              <div className="space-y-3 border-t border-slate-200 pt-5">
                <h4 className="font-display text-base font-bold text-[#14263D]">
                  Rincian Ketepatan Kolom Praktik &amp; Checkpoint
                </h4>
                {!activeSimRecord?.lastFieldResults ? (
                  <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4 text-xs text-slate-600">
                    Siswa belum mengirimkan Checkpoint praktik simulasi pada episode ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-[#F4F7FB] font-semibold uppercase tracking-wider text-slate-600">
                        <tr>
                          <th className="px-4 py-2.5">Kolom / Tahap</th>
                          <th className="px-4 py-2.5">Jawaban Siswa</th>
                          <th className="px-4 py-2.5">Kunci Jawaban</th>
                          <th className="px-4 py-2.5">Catatan Validasi</th>
                          <th className="px-4 py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {activeSimRecord.lastFieldResults.map((res) => (
                          <tr key={res.field}>
                            <td className="px-4 py-3 font-semibold text-[#14263D]">
                              {res.label}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-700">
                              {res.actual || '(Kosong)'}
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-[#14263D]">
                              {res.expected}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {res.message}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`font-bold ${
                                  res.isValid
                                    ? 'text-emerald-700'
                                    : 'text-red-700'
                                }`}
                              >
                                {res.isValid ? 'Sesuai' : 'Perlu Diperbaiki'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#3569B0]" />
        <p>
          <strong>Sinkronisasi Server Online:</strong> Hasil kuis dan simulasi siswa yang
          dikerjakan di perangkat masing-masing otomatis tersimpan ke server dan dapat dipantau
          langsung melalui tombol <strong className="text-[#14263D]">Muat Ulang Server</strong>.
          Fitur <strong className="text-[#14263D]">Impor Hasil Siswa (.json)</strong> tetap
          disediakan sebagai cadangan.
        </p>
      </div>
    </div>
  );
}
