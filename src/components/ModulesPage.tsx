import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileWarning,
  CheckCircle2,
  MonitorCheck
} from 'lucide-react';
import { ModuleData, StudentProgress } from '../types/lms';
import {
  getEpisodeStageStatuses,
  isEpisodeSimulationEnabled
} from '../services/storage';

interface ModulesPageProps {
  modules: ModuleData[];
  progress: StudentProgress;
  onOpenEpisode: (episodeId: string) => void;
}

export function ModulesPage({
  modules,
  progress,
  onOpenEpisode
}: ModulesPageProps) {
  const [expandedModuleId, setExpandedModuleId] = useState<string>(() => {
    const found = modules.find((m) =>
      m.episodes.some((e) => e.id === progress.lastOpenedEpisodeId)
    );
    return found?.id || modules[0]?.id || 'modul-01';
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="font-display text-2xl font-bold text-[#14263D]">
          Materi &amp; Modul Pembelajaran
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
          Struktur kurikulum 6 modul Komputer Akuntansi MYOB Accounting v18. Episode yang telah
          dilengkapi materi atau Simulasi Terpandu oleh guru dapat langsung dibuka. Episode lainnya
          berstatus <span className="font-semibold">no content</span> hingga materi ditambahkan.
        </p>
      </div>

      <div className="space-y-4">
        {modules.map((mod) => {
          const isOpen = expandedModuleId === mod.id;
          const activeCount = mod.episodes.filter((e) => e.hasContent).length;

          return (
            <section
              key={mod.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <button
                type="button"
                onClick={() => setExpandedModuleId(isOpen ? '' : mod.id)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-[#F4F7FB]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-bold text-[#3569B0]">{mod.code}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{mod.episodes.length} Episode</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{activeCount} tersedia</span>
                  </div>
                  <h2 className="mt-1 font-display text-lg font-bold text-[#14263D]">
                    {mod.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{mod.description}</p>
                </div>

                <span className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-200 divide-y divide-slate-100">
                  {mod.episodes.map((ep) => {
                    const statuses = getEpisodeStageStatuses(progress, ep.id);
                    const isRead = progress.materialsRead[ep.id];
                    const hasSim = isEpisodeSimulationEnabled(ep);

                    return (
                      <div
                        key={ep.id}
                        className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono font-semibold text-[#3569B0]">
                              Episode {ep.code}
                            </span>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            {ep.hasContent ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Konten Tersedia</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                                <FileWarning className="h-3.5 w-3.5 text-amber-600" />
                                <span>no content (belum diunggah)</span>
                              </span>
                            )}
                            {hasSim && (
                              <>
                                <span aria-hidden="true" className="text-slate-300">·</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-[#19A89B]">
                                  <MonitorCheck className="h-3.5 w-3.5" />
                                  <span>Simulasi Terpandu Aktif</span>
                                </span>
                              </>
                            )}
                          </div>

                          <h3 className="mt-1 font-display text-base font-bold text-[#14263D]">
                            {ep.title}
                          </h3>
                          <p className="mt-0.5 text-sm text-slate-600">{ep.subtitle}</p>

                          {ep.hasContent && (
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span>
                                Materi:{' '}
                                {isRead
                                  ? 'Selesai'
                                  : statuses.materi === 'sedang_dipelajari'
                                    ? 'Sedang Dipelajari'
                                    : 'Belum Dimulai'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                Kuis:{' '}
                                {progress.quizResults[ep.id]
                                  ? `Nilai ${progress.quizResults[ep.id].score}`
                                  : 'Belum dikerjakan'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          {ep.hasContent ? (
                            <button
                              type="button"
                              onClick={() => onOpenEpisode(ep.id)}
                              className="inline-flex items-center gap-2 rounded-lg bg-[#3569B0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a548e]"
                            >
                              <BookOpen className="h-4 w-4" />
                              <span>Buka Episode</span>
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="inline-flex items-center rounded-lg border border-slate-200 bg-[#F4F7FB] px-3.5 py-2 text-xs font-medium text-slate-500">
                              Status: no content
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
