import { useState } from 'react';
import { ModuleData, QuizAttemptRecord, StudentProgress } from '../types/lms';
import { QuizPanel } from './QuizPanel';

interface QuizPageProps {
  modules: ModuleData[];
  progress: StudentProgress;
  onSaveQuizResult: (episodeId: string, result: QuizAttemptRecord) => void;
  onFinishQuiz?: () => void;
}

export function QuizPage({
  modules,
  progress,
  onSaveQuizResult,
  onFinishQuiz
}: QuizPageProps) {
  const episodesWithQuiz = modules.flatMap((mod) =>
    mod.episodes
      .filter((ep) => ep.hasContent && ep.quizQuestions.length > 0)
      .map((ep) => ({ module: mod, episode: ep }))
  );

  const [selectedEpId, setSelectedEpId] = useState<string>(
    episodesWithQuiz[0]?.episode.id || 'ep-1-1'
  );

  const activeItem =
    episodesWithQuiz.find((item) => item.episode.id === selectedEpId) ||
    episodesWithQuiz[0];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="font-display text-2xl font-bold text-[#14263D]">
          Tugas &amp; Kuis Evaluasi
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Kerjakan kuis pilihan ganda untuk mengukur pemahaman konsep akuntansi MYOB v18.
          Jawaban yang dikumpulkan akan dinilai secara otomatis dan detail oleh guru melalui
          Mode Guru.
        </p>

        {episodesWithQuiz.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {episodesWithQuiz.map(({ module, episode }) => (
              <button
                key={episode.id}
                type="button"
                onClick={() => setSelectedEpId(episode.id)}
                className={`rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                  episode.id === activeItem?.episode.id
                    ? 'border-[#3569B0] bg-[#EAF3FF] text-[#14263D]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {module.code} · Ep. {episode.code}: {episode.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeItem ? (
        <QuizPanel
          key={activeItem.episode.id}
          episode={activeItem.episode}
          existingResult={progress.quizResults[activeItem.episode.id]}
          onSaveResult={(res) => onSaveQuizResult(activeItem.episode.id, res)}
          onFinish={onFinishQuiz}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Belum ada kuis yang tersedia.
        </div>
      )}
    </div>
  );
}
