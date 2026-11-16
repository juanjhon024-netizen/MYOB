import { ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  LearningStageKey,
  ModuleData,
  NavPage,
  StudentProgress
} from '../types/lms';
import { getEpisodeStageStatuses } from '../services/storage';
import { StageStatusText } from './StatusBadge';

interface CourseRoomPageProps {
  modules: ModuleData[];
  progress: StudentProgress;
  onOpenEpisode: (episodeId: string, initialTab?: string) => void;
  onNavigate: (page: NavPage) => void;
}

export function CourseRoomPage({
  modules,
  progress,
  onOpenEpisode,
  onNavigate
}: CourseRoomPageProps) {
  const activeEpId = progress.lastOpenedEpisodeId || 'ep-1-1';
  const epStatuses = getEpisodeStageStatuses(progress, activeEpId);

  const flowSteps: Array<{
    key: LearningStageKey;
    label: string;
    description: string;
    action: () => void;
    actionLabel: string;
  }> = [
    {
      key: 'materi',
      label: '1. BACA MATERI',
      description: 'Pelajari konsep dasar dan studi kasus pada modul.',
      action: () => onOpenEpisode(activeEpId, 'materi'),
      actionLabel: 'Buka Materi'
    },
    {
      key: 'video',
      label: '2. TONTON VIDEO',
      description: 'Simak demonstrasi langkah praktik dasar MYOB.',
      action: () => onNavigate('videos'),
      actionLabel: 'Buka Video'
    },
    {
      key: 'simulasi',
      label: '3. SIMULASI TERPANDU',
      description: 'Praktik bertahap di Laboratorium Virtual.',
      action: () => onNavigate('virtual_lab'),
      actionLabel: 'Buka Simulasi'
    },
    {
      key: 'kuis',
      label: '4. KERJAKAN KUIS',
      description: 'Uji pemahaman melalui soal pilihan ganda.',
      action: () => onNavigate('quiz'),
      actionLabel: 'Buka Kuis'
    },
    {
      key: 'uji_mandiri',
      label: '5. STATUS & EKSPOR',
      description: 'Periksa status penyelesaian & unduh berkas pengumpulan.',
      action: () => onNavigate('grades'),
      actionLabel: 'Lihat Status'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <section className="rounded-xl border border-slate-200 bg-[#14263D] px-6 py-7 text-white sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#19A89B]">
          SMK Kelas XI AKL · Ruang Kelas Digital
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Komputer Akuntansi — MYOB Accounting v18
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">
          Pembelajaran praktikum komputer akuntansi berbasis panduan dan simulasi.
        </p>
      </section>

      {/* Learning Flow Pipeline */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-lg font-bold text-[#14263D]">
          Alur Tahapan Belajar
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Ikuti 5 langkah berikut secara berurutan agar pembelajaran lebih terarah.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-5">
          {flowSteps.map((step) => {
            const status = epStatuses[step.key];
            return (
              <div
                key={step.key}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-[#F4F7FB] p-4"
              >
                <div>
                  <p className="text-xs font-bold text-[#3569B0]">{step.label}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    {step.description}
                  </p>
                </div>
                <div className="mt-4 space-y-3 border-t border-slate-200 pt-3">
                  <StageStatusText status={status} />
                  <button
                    type="button"
                    onClick={step.action}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#14263D] hover:border-[#3569B0] hover:text-[#3569B0]"
                  >
                    {step.actionLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Objectives & 6-Module Roadmap */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <h2 className="font-display text-lg font-bold text-[#14263D]">
            Tujuan Pembelajaran
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#19A89B]" />
              <span>
                Memahami konsep dasar komputerisasi akuntansi perusahaan dagang menggunakan
                MYOB Accounting v18.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#19A89B]" />
              <span>
                Mampu menyiapkan company file, periode akuntansi, daftar akun, kode pajak, dan
                saldo awal dengan akurat.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#19A89B]" />
              <span>
                Terampil melakukan pencatatan transaksi hingga verifikasi laporan keuangan
                secara mandiri.
              </span>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#14263D]">
              Peta 6 Modul Pembelajaran
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('modules')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#3569B0] hover:underline"
            >
              <span>Buka Daftar Episode</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {modules.map((mod) => {
              const readyCount = mod.episodes.filter((e) => e.hasContent).length;
              return (
                <div
                  key={mod.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#14263D]">
                      {mod.code} — {mod.title}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {mod.episodes.length} Episode · {readyCount} tersedia
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      readyCount > 0
                        ? onOpenEpisode(
                            mod.episodes.find((e) => e.hasContent)!.id
                          )
                        : onNavigate('modules')
                    }
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#3569B0] hover:bg-[#EAF3FF]"
                  >
                    {readyCount > 0 ? 'Pelajari' : 'Lihat'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
