import { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle, ClipboardCheck } from 'lucide-react';
import { EpisodeContent, QuizAttemptRecord } from '../types/lms';

interface QuizPanelProps {
  episode: EpisodeContent;
  existingResult?: QuizAttemptRecord;
  onSaveResult: (result: QuizAttemptRecord) => void;
  onFinish?: () => void;
}

export function QuizPanel({
  episode,
  existingResult,
  onSaveResult,
  onFinish
}: QuizPanelProps) {
  const questions = episode.quizQuestions;
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>(
    existingResult?.answers || {}
  );
  const [isSubmitted, setIsSubmitted] = useState<boolean>(
    Boolean(existingResult)
  );
  const [validationMsg, setValidationMsg] = useState<string>('');

  useEffect(() => {
    setSelectedAnswers(existingResult?.answers || {});
    setIsSubmitted(Boolean(existingResult));
    setValidationMsg('');
  }, [episode.id, existingResult]);

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Belum ada soal kuis pilihan ganda untuk episode ini. Soal dapat ditambahkan oleh guru
        melalui menu <strong className="text-[#14263D]">Mode Guru &amp; Simulasi</strong>.
      </div>
    );
  }

  const answeredCount = questions.filter(
    (q) => typeof selectedAnswers[q.id] === 'number'
  ).length;

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
    setValidationMsg('');
  };

  const handleSubmit = () => {
    if (answeredCount < questions.length) {
      setValidationMsg(
        `Harap jawab semua soal terlebih dahulu (${answeredCount}/${questions.length} terjawab).`
      );
      return;
    }

    let correctCount = 0;
    for (const q of questions) {
      if (selectedAnswers[q.id] === q.correctIndex) {
        correctCount += 1;
      }
    }

    const score = Math.round((correctCount / questions.length) * 100);
    const result: QuizAttemptRecord = {
      episodeId: episode.id,
      score,
      correctCount,
      totalQuestions: questions.length,
      answers: { ...selectedAnswers },
      submittedAt: new Date().toISOString(),
      attempts: (existingResult?.attempts ?? 0) + 1
    };

    setIsSubmitted(true);
    setValidationMsg('');
    onSaveResult(result);
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setValidationMsg('');
  };

  const displayCorrect = isSubmitted
    ? questions.filter((q) => selectedAnswers[q.id] === q.correctIndex).length
    : 0;
  const displayScore = isSubmitted
    ? Math.round((displayCorrect / questions.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#3569B0]">
              <ClipboardCheck className="h-4 w-4" />
              <span>Kuis Pilihan Ganda · Episode {episode.code}</span>
            </div>
            <h2 className="mt-1 font-display text-xl font-bold text-[#14263D]">
              Evaluasi: {episode.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600 tabular-nums">
              Jumlah Soal: {questions.length} butir · Terjawab: {answeredCount}/
              {questions.length}
            </p>
          </div>

          {isSubmitted && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Status Pengumpulan
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 font-display text-base font-bold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Jawaban Dikumpulkan</span>
              </p>
              {existingResult && (
                <p className="text-xs text-emerald-800 tabular-nums">
                  Percobaan ke-{existingResult.attempts} · Penilaian oleh Guru
                </p>
              )}
            </div>
          )}
        </div>

        {isSubmitted && (
          <div className="mt-4 rounded-lg border border-[#3569B0]/25 bg-[#EAF3FF] p-4 text-xs text-[#14263D]">
            <strong>Catatan Penilaian:</strong> Jawaban kuis Anda telah disimpan. Penilaian
            otomatis, rincian skor, kunci jawaban, dan pembahasan detail hanya dapat diakses
            oleh guru melalui <strong className="text-[#3569B0]">Mode Guru</strong>.
          </div>
        )}
      </div>

      <div className="space-y-4">
        {questions.map((q, qIdx) => {
          const chosen = selectedAnswers[q.id];

          return (
            <div
              key={q.id}
              className="rounded-xl border border-slate-200 bg-white p-6"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 tabular-nums">
                Soal {qIdx + 1} dari {questions.length}
              </p>
              <h3 className="mt-1.5 text-base font-bold text-[#14263D]">
                {q.question}
              </h3>

              <div className="mt-4 space-y-2.5">
                {q.options.map((opt, optIdx) => {
                  const isSelected = chosen === optIdx;

                  let optionStyle =
                    'border-slate-200 bg-white text-[#14263D] hover:border-[#3569B0] hover:bg-[#EAF3FF]/40';
                  if (isSubmitted) {
                    optionStyle = isSelected
                      ? 'border-[#3569B0] bg-[#EAF3FF] text-[#14263D] font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-500';
                  } else if (isSelected) {
                    optionStyle =
                      'border-[#3569B0] bg-[#EAF3FF] text-[#14263D] font-semibold';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => handleSelectOption(q.id, optIdx)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${optionStyle}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-current/30 font-mono text-xs font-bold">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isSubmitted && isSelected && (
                        <span className="text-xs font-semibold text-[#3569B0] shrink-0">
                          Pilihan Anda
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          {validationMsg && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {validationMsg}
            </p>
          )}
          {!validationMsg && !isSubmitted && (
            <p className="text-xs text-slate-500">
              Jawaban Anda akan disimpan ke server untuk dinilai otomatis oleh guru.
            </p>
          )}
          {isSubmitted && existingResult && (
            <p className="text-xs text-slate-500 tabular-nums">
              Percobaan ke-{existingResult.attempts} telah tersimpan di server.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isSubmitted ? (
            <>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#14263D] hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Ulangi Kuis</span>
              </button>
              {onFinish && (
                <button
                  type="button"
                  onClick={onFinish}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#19A89B] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#148f84]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Selesai</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3569B0] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2a548e]"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Kumpulkan Jawaban</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
