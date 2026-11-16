import { CheckCircle2, FileJson, Info, Lock } from 'lucide-react';
import {
  ModuleData,
  StudentProfile,
  StudentProgress
} from '../types/lms';
import {
  calculateLearningMetrics,
  exportStudentSubmissionJson,
  getEpisodeStageStatuses,
  isEpisodeSimulationEnabled
} from '../services/storage';
import { StageStatusText } from './StatusBadge';

interface GradesProgressPageProps {
  student: StudentProfile;
  modules: ModuleData[];
  progress: StudentProgress;
}

export function GradesProgressPage({
  student,
  modules,
  progress
}: GradesProgressPageProps) {
  const metrics = calculateLearningMetrics(modules, progress);
  const availableEpisodes = modules.flatMap((mod) =>
    mod.episodes
      .filter((ep) => ep.hasContent)
      .map((ep) => ({ module: mod, episode: ep }))
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#14263D]">
              Status &amp; Progres Pembelajaran
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Pantau penyelesaian materi, video, praktik simulasi, dan pengumpulan kuis Anda.
              Penilaian detail dan otomatis hanya dapat diakses oleh guru di Mode Guru.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => exportStudentSubmissionJson(student, progress)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3569B0] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2a548e] whitespace-nowrap"
            >
              <FileJson className="h-4 w-4" />
              <span>Unduh Berkas Pengumpulan (.json)</span>
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
            <p className="text-xs text-slate-500">Identitas Siswa</p>
            <p className="mt-1 font-display text-base font-bold text-[#14263D]">
              {student.fullName}
            </p>
            <p className="text-xs text-slate-600 tabular-nums">
              {student.studentCode} · {student.className}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
            <p className="text-xs text-slate-500">Episode Selesai</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#14263D] tabular-nums">
              {metrics.completedEpisodesCount}
              <span className="ml-1 text-sm font-normal text-slate-500">
                / {metrics.availableEpisodesCount}
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
            <p className="text-xs text-slate-500">Kuis Dikumpulkan</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#3569B0] tabular-nums">
              {metrics.quizzesSubmittedCount}
              <span className="ml-1 text-sm font-normal text-slate-500">
                / {metrics.quizzesAvailableCount}
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#EAF3FF] p-4">
            <p className="text-xs text-[#14263D]">Progres Keseluruhan</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#3569B0] tabular-nums">
              {metrics.progressPercentage}%
            </p>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-[#14263D]">
            Status Penyelesaian Aktivitas per Episode
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-[#F4F7FB] text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-6 py-3.5">Episode</th>
                <th className="px-4 py-3.5">Materi</th>
                <th className="px-4 py-3.5">Video</th>
                <th className="px-4 py-3.5">Praktik Simulasi</th>
                <th className="px-6 py-3.5">Kuis Evaluasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {availableEpisodes.map(({ module, episode }) => {
                const statuses = getEpisodeStageStatuses(progress, episode.id);
                const sim = progress.simulations[episode.id];
                const quiz = progress.quizResults[episode.id];
                const hasSim = isEpisodeSimulationEnabled(episode);
                const hasQuiz = episode.quizQuestions.length > 0;

                return (
                  <tr key={episode.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <p className="text-xs font-semibold text-[#3569B0]">
                        {module.code} · Ep. {episode.code}
                      </p>
                      <p className="font-semibold text-[#14263D]">
                        {episode.title}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StageStatusText status={statuses.materi} />
                    </td>
                    <td className="px-4 py-4">
                      <StageStatusText status={statuses.video} />
                    </td>
                    <td className="px-4 py-4">
                      {!hasSim ? (
                        <span className="text-xs text-slate-500">
                          Simulasi belum diaktifkan
                        </span>
                      ) : sim?.lastUpdatedAt ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Sudah Dikirim</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Belum dikirim
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {!hasQuiz ? (
                        <span className="text-xs text-slate-500">
                          Belum ada kuis
                        </span>
                      ) : quiz ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Dikumpulkan ({quiz.attempts}x)</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Belum dikumpulkan
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-600">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#19A89B]" />
          <p>
            <strong className="text-[#14263D]">Penilaian Khusus Guru:</strong> Skor kuis
            otomatis, ketepatan entri simulasi, status kelulusan checkpoint, serta analisis
            kesalahan hanya dapat dilihat oleh guru di menu{' '}
            <strong className="text-[#14263D]">Mode Guru</strong>.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#3569B0]" />
          <p>
            <strong className="text-[#14263D]">Sinkronisasi Server &amp; Cadangan:</strong> Progres
            belajar Anda otomatis tersimpan ke server Smart-Guide dan dapat dilihat oleh guru
            melalui Mode Guru. Tombol{' '}
            <strong className="text-[#14263D]">Unduh Berkas Pengumpulan (.json)</strong> tetap
            disediakan apabila diperlukan sebagai arsip cadangan.
          </p>
        </div>
      </div>
    </div>
  );
}
