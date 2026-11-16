import { useState } from 'react';
import { MonitorCheck } from 'lucide-react';
import { ModuleData, SimulationAttemptRecord, StudentProgress } from '../types/lms';
import { isEpisodeSimulationEnabled } from '../services/storage';
import { VirtualLabPanel } from './VirtualLabPanel';
import { DynamicVirtualLabPanel } from './DynamicVirtualLabPanel';

interface VirtualLabPageProps {
  modules: ModuleData[];
  progress: StudentProgress;
  onUpdateAttempt: (episodeId: string, record: SimulationAttemptRecord) => void;
}

export function VirtualLabPage({
  modules,
  progress,
  onUpdateAttempt
}: VirtualLabPageProps) {
  const labEpisodes = modules.flatMap((mod) =>
    mod.episodes
      .filter((ep) => isEpisodeSimulationEnabled(ep))
      .map((ep) => ({ module: mod, episode: ep }))
  );

  const [selectedEpId, setSelectedEpId] = useState<string>(
    labEpisodes[0]?.episode.id || 'ep-1-1'
  );

  const activeItem =
    labEpisodes.find((item) => item.episode.id === selectedEpId) ||
    labEpisodes[0];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#19A89B]">
              Laboratorium Praktikum Virtual
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#14263D]">
              Laboratorium Virtual &amp; Simulasi Terpandu
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
              Pilih simulasi praktikum yang telah disiapkan guru sesuai modul. Tersedia Mode Coba
              Terpandu dengan bantuan 3 tingkat dan Mode Uji Mandiri untuk pemeriksaan Checkpoint.
            </p>
          </div>
        </div>

        {labEpisodes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {labEpisodes.map(({ module, episode }) => {
              const selected = activeItem?.episode.id === episode.id;
              return (
                <button
                  key={episode.id}
                  type="button"
                  onClick={() => setSelectedEpId(episode.id)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                    selected
                      ? 'border-[#3569B0] bg-[#EAF3FF] text-[#14263D]'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <MonitorCheck className="h-3.5 w-3.5 text-[#3569B0]" />
                  <span>
                    {module.code} · Ep. {episode.code}: {episode.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {activeItem ? (
        activeItem.episode.guidedSimulation?.enabled &&
        activeItem.episode.guidedSimulation.steps.length > 0 ? (
          <DynamicVirtualLabPanel
            key={activeItem.episode.id}
            episode={activeItem.episode}
            config={activeItem.episode.guidedSimulation}
            attemptRecord={progress.simulations[activeItem.episode.id]}
            onUpdateAttempt={(rec) =>
              onUpdateAttempt(activeItem.episode.id, rec)
            }
          />
        ) : (
          <VirtualLabPanel
            key={activeItem.episode.id}
            episodeId={activeItem.episode.id}
            attemptRecord={progress.simulations[activeItem.episode.id]}
            onUpdateAttempt={(rec) =>
              onUpdateAttempt(activeItem.episode.id, rec)
            }
          />
        )
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Belum ada Simulasi Terpandu yang diaktifkan oleh guru.
        </div>
      )}
    </div>
  );
}
