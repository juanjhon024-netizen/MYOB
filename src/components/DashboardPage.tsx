import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Layers,
  PlayCircle,
  TrendingUp
} from 'lucide-react';
import {
  ModuleData,
  NavPage,
  StudentProfile,
  StudentProgress
} from '../types/lms';
import {
  calculateLearningMetrics,
  getEpisodeStageStatuses
} from '../services/storage';
import { findEpisodeById } from '../data/curriculum';
import { StageStatusText } from './StatusBadge';

interface DashboardPageProps {
  student: StudentProfile;
  modules: ModuleData[];
  progress: StudentProgress;
  onNavigate: (page: NavPage) => void;
  onOpenEpisode: (episodeId: string) => void;
}

export function DashboardPage({
  student,
  modules,
  progress,
  onNavigate,
  onOpenEpisode
}: DashboardPageProps) {
  const metrics = calculateLearningMetrics(modules, progress);
  const lastEpisodeInfo =
    findEpisodeById(modules, progress.lastOpenedEpisodeId) ||
    findEpisodeById(modules, 'ep-1-1');

  const lastEpStatuses = lastEpisodeInfo
    ? getEpisodeStageStatuses(progress, lastEpisodeInfo.episode.id)
    : null;

  return (
    <div className="space-y-6">
      {/* Welcome & 5 Real KPI Stat Cards */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3569B0]">
            Dashboard Akademik · {student.className}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#14263D] sm:text-3xl text-balance">
            Selamat Datang, {student.fullName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Selamat melanjutkan pembelajaran MYOB Accounting v18.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-5 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>Total Modul</span>
              <Layers className="h-4 w-4 text-[#3569B0]" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[#14263D] tabular-nums">
              {metrics.totalModules}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>Episode Tersedia</span>
              <PlayCircle className="h-4 w-4 text-[#19A89B]" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[#14263D] tabular-nums">
              {metrics.availableEpisodesCount}
              <span className="ml-1 text-sm font-normal text-slate-500">
                / {metrics.totalEpisodes}
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>Materi Selesai</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[#14263D] tabular-nums">
              {metrics.materialsCompletedCount}
              <span className="ml-1 text-sm font-normal text-slate-500">
                / {metrics.availableEpisodesCount}
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>Kuis Dikumpulkan</span>
              <ClipboardCheck className="h-4 w-4 text-[#3569B0]" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[#14263D] tabular-nums">
              {metrics.quizzesSubmittedCount}
              <span className="ml-1 text-sm font-normal text-slate-500">
                / {metrics.quizzesAvailableCount}
              </span>
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-lg border border-slate-200 bg-[#EAF3FF] p-4">
            <div className="flex items-center justify-between text-xs font-medium text-[#14263D]">
              <span>Persentase Progres</span>
              <TrendingUp className="h-4 w-4 text-[#3569B0]" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[#3569B0] tabular-nums">
              {metrics.progressPercentage}%
            </p>
          </div>
        </div>
      </section>

      {/* LANJUTKAN PEMBELAJARAN */}
      {lastEpisodeInfo && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#19A89B]">
                LANJUTKAN PEMBELAJARAN
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-[#14263D]">
                {lastEpisodeInfo.module.code} — Episode {lastEpisodeInfo.episode.code}:{' '}
                {lastEpisodeInfo.episode.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {lastEpisodeInfo.episode.subtitle}
              </p>

              {lastEpStatuses && (
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Materi:</span>
                    <StageStatusText status={lastEpStatuses.materi} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Video:</span>
                    <StageStatusText status={lastEpStatuses.video} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Simulasi:</span>
                    <StageStatusText status={lastEpStatuses.simulasi} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Kuis:</span>
                    <StageStatusText status={lastEpStatuses.kuis} />
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={() => onOpenEpisode(lastEpisodeInfo.episode.id)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#14263D] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1e3859] whitespace-nowrap"
              >
                <span>LANJUTKAN BELAJAR</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* RUANG PEMBELAJARAN SAYA */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[#14263D]">
          RUANG PEMBELAJARAN SAYA
        </h2>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="flex flex-col justify-between bg-[#14263D] p-6 text-white lg:col-span-4">
              <div>
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#3569B0] text-white">
                  <BookOpen className="h-6 w-6" />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#19A89B]">
                  Mata Pelajaran Praktikum
                </p>
                <h3 className="mt-1 font-display text-xl font-bold leading-snug text-white">
                  MYOB ACCOUNTING VERSION 18
                </h3>
              </div>
              <p className="mt-6 text-xs text-slate-300">
                Kelas XI — Akuntansi dan Keuangan Lembaga
              </p>
            </div>

            <div className="flex flex-col justify-between p-6 lg:col-span-8">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-[#14263D]">
                    Komputer Akuntansi — MYOB Accounting v18
                  </h3>
                  <span className="text-xs font-semibold text-[#3569B0] tabular-nums">
                    Progres {metrics.progressPercentage}%
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Kelas digital terstruktur untuk mempelajari penyusunan company file, transaksi
                  pembelian, penjualan, perbankan, jurnal penyesuaian, hingga laporan keuangan.
                </p>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Kemajuan Pembelajaran Aktif</span>
                    <span className="font-mono tabular-nums">
                      {metrics.completedEpisodesCount} / {metrics.availableEpisodesCount} episode tersedia selesai
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#19A89B] transition-all duration-300"
                      style={{ width: `${metrics.progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                <div className="text-xs text-slate-500">
                  6 Modul Kurikulum · {metrics.availableEpisodesCount} Episode Aktif
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('course_room')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#3569B0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2a548e]"
                >
                  <span>Masuk Kelas</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
