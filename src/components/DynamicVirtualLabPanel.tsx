import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  MonitorCheck,
  RotateCcw,
  ShieldAlert,
  Wrench
} from 'lucide-react';
import {
  EpisodeContent,
  GuidedSimulationConfig,
  SimulationAttemptRecord
} from '../types/lms';
import {
  runCustomTroubleshooting,
  validateCustomSimulation
} from '../services/simulationValidator';

interface DynamicVirtualLabPanelProps {
  episode: EpisodeContent;
  config: GuidedSimulationConfig;
  initialMode?: 'terpandu' | 'mandiri';
  attemptRecord?: SimulationAttemptRecord;
  onUpdateAttempt: (record: SimulationAttemptRecord) => void;
}

export function DynamicVirtualLabPanel({
  episode,
  config,
  initialMode = 'terpandu',
  attemptRecord,
  onUpdateAttempt
}: DynamicVirtualLabPanelProps) {
  const [mode, setMode] = useState<'terpandu' | 'mandiri'>(initialMode);
  const [answers, setAnswers] = useState<Record<string, string>>(
    attemptRecord?.customAnswers || {}
  );
  const [guidedStepIdx, setGuidedStepIdx] = useState<number>(0);
  const [revealedHintLevel, setRevealedHintLevel] = useState<number>(0);
  const [stepFeedback, setStepFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState<boolean>(false);
  const [hasSubmittedCheckpoint, setHasSubmittedCheckpoint] = useState<boolean>(
    Boolean(attemptRecord?.lastFieldResults && attemptRecord.lastFieldResults.length > 0)
  );

  const currentRecord: SimulationAttemptRecord = attemptRecord || {
    episodeId: episode.id,
    guidedCompleted: false,
    guidedHintsUsed: 0,
    guidedErrors: 0,
    independentAttempts: 0,
    independentErrors: 0,
    independentCompleted: false,
    checkpointStatus: 'belum'
  };

  const steps = config.steps;
  const totalSteps = steps.length;
  const isReviewStep = guidedStepIdx >= totalSteps;
  const currentStep = !isReviewStep ? steps[guidedStepIdx] : null;

  const handleRevealHint = (level: number) => {
    if (level > revealedHintLevel) {
      setRevealedHintLevel(level);
      onUpdateAttempt({
        ...currentRecord,
        guidedHintsUsed: currentRecord.guidedHintsUsed + 1,
        lastUpdatedAt: new Date().toISOString()
      });
    }
  };

  const handleAnswerChange = (stepId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [stepId]: val }));
    setStepFeedback(null);
  };

  const handleGuidedNext = () => {
    if (!currentStep) return;
    const actual = (answers[currentStep.id] || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const expected = currentStep.expectedAnswer.trim().replace(/\s+/g, ' ').toLowerCase();

    if (actual !== expected) {
      setStepFeedback({
        type: 'error',
        text: `Isian "${currentStep.fieldLabel}" belum sesuai target. Gunakan Petunjuk Bertingkat jika membutuhkan bantuan.`
      });
      onUpdateAttempt({
        ...currentRecord,
        guidedErrors: currentRecord.guidedErrors + 1,
        customAnswers: answers
      });
      return;
    }

    setStepFeedback(null);
    setRevealedHintLevel(0);
    setGuidedStepIdx((idx) => Math.min(totalSteps, idx + 1));
  };

  const handleConfirmCheckpoint = () => {
    const check = validateCustomSimulation(config, answers);
    setHasSubmittedCheckpoint(true);
    const status = check.isAllValid ? 'berhasil' : 'perlu_diperbaiki';

    setStepFeedback({
      type: 'success',
      text: 'Hasil praktik & Checkpoint telah dikirim. Penilaian detail dan otomatis hanya dapat diakses oleh guru di Mode Guru.'
    });

    if (mode === 'terpandu') {
      onUpdateAttempt({
        ...currentRecord,
        guidedCompleted: check.isAllValid ? true : currentRecord.guidedCompleted,
        checkpointStatus: status,
        customAnswers: { ...answers },
        lastFieldResults: check.results,
        lastUpdatedAt: new Date().toISOString()
      });
    } else {
      onUpdateAttempt({
        ...currentRecord,
        independentAttempts: currentRecord.independentAttempts + 1,
        independentErrors: currentRecord.independentErrors + check.errorCount,
        independentCompleted: check.isAllValid
          ? true
          : currentRecord.independentCompleted,
        checkpointStatus: status,
        customAnswers: { ...answers },
        lastFieldResults: check.results,
        lastUpdatedAt: new Date().toISOString()
      });
    }
  };

  const handleReset = () => {
    setAnswers({});
    setGuidedStepIdx(0);
    setRevealedHintLevel(0);
    setStepFeedback(null);
    setHasSubmittedCheckpoint(false);
    setShowTroubleshoot(false);
  };

  const diagnostics = runCustomTroubleshooting(config, answers);

  const renderStepControl = (
    step: GuidedSimulationConfig['steps'][number],
    inputId: string
  ) => {
    const val = answers[step.id] || '';
    if (step.fieldType === 'choice' && step.options && step.options.length > 0) {
      return (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {step.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleAnswerChange(step.id, opt)}
              className={`rounded-lg border p-3.5 text-left text-sm transition-colors ${
                val === opt
                  ? 'border-[#3569B0] bg-[#EAF3FF] font-semibold text-[#14263D]'
                  : 'border-slate-200 bg-[#F4F7FB] text-slate-700 hover:border-slate-300'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    if (step.fieldType === 'select' && step.options && step.options.length > 0) {
      return (
        <select
          id={inputId}
          value={val}
          onChange={(e) => handleAnswerChange(step.id, e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#14263D] focus:border-[#3569B0] focus:outline-none"
        >
          <option value="">-- Pilih Jawaban --</option>
          {step.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        id={inputId}
        type={step.fieldType === 'number' ? 'text' : 'text'}
        inputMode={step.fieldType === 'number' ? 'numeric' : 'text'}
        value={val}
        onChange={(e) => handleAnswerChange(step.id, e.target.value)}
        placeholder={step.placeholder || `Masukkan ${step.fieldLabel}...`}
        className={`w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-[#14263D] focus:border-[#3569B0] focus:outline-none ${
          step.fieldType === 'number' ? 'font-mono' : ''
        }`}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
              <span>Simulasi Pembelajaran (Diatur oleh Guru) — Bukan Aplikasi MYOB Resmi</span>
            </div>
            <h2 className="mt-2 font-display text-xl font-bold text-[#14263D]">
              {config.title || `Simulasi Terpandu — Episode ${episode.code}`}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{config.caseSummary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-[#F4F7FB] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('terpandu');
                  setStepFeedback(null);
                }}
                className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  mode === 'terpandu'
                    ? 'bg-[#3569B0] text-white'
                    : 'text-slate-600 hover:text-[#14263D]'
                }`}
              >
                Mode Coba Terpandu
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('mandiri');
                  setStepFeedback(null);
                }}
                className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  mode === 'mandiri'
                    ? 'bg-[#14263D] text-white'
                    : 'text-slate-600 hover:text-[#14263D]'
                }`}
              >
                Mode Uji Mandiri
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowTroubleshoot((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#19A89B] bg-teal-50 px-3.5 py-2 text-xs font-bold text-[#14263D] hover:bg-teal-100 whitespace-nowrap"
            >
              <Wrench className="h-3.5 w-3.5 text-[#19A89B]" />
              <span>BUTUH BANTUAN?</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Ulangi</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600 tabular-nums">
          <span>
            Status Pengumpulan Praktik:{' '}
            <strong className={hasSubmittedCheckpoint ? 'text-emerald-700' : 'text-slate-700'}>
              {hasSubmittedCheckpoint ? 'Sudah Dikirim untuk Penilaian Guru' : 'Belum Dikirim'}
            </strong>
          </span>
          <span>
            Percobaan Uji Mandiri: <strong>{currentRecord.independentAttempts}</strong>
          </span>
        </div>
      </div>

      {showTroubleshoot && (
        <section className="rounded-xl border border-[#19A89B] bg-white p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-display text-base font-bold text-[#14263D]">
              Self-Troubleshooting Otomatis
            </h3>
            <button
              type="button"
              onClick={() => setShowTroubleshoot(false)}
              className="text-xs font-semibold text-slate-500 hover:text-[#14263D]"
            >
              Tutup
            </button>
          </div>
          {diagnostics.map((d, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3.5 text-xs ${
                d.severity === 'ok'
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <p className="font-bold text-[#14263D]">{d.area}</p>
              <p className="mt-0.5 text-slate-700">{d.diagnosis}</p>
              <p className="mt-1 font-semibold text-[#14263D]">
                Saran: {d.recommendation}
              </p>
            </div>
          ))}
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Reference & Guidance */}
        <aside className="space-y-4 lg:col-span-4">
          {config.caseFacts.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#3569B0]">
                Data Kasus Praktikum
              </h3>
              <dl className="mt-3 space-y-2 text-xs">
                {config.caseFacts.map((fact, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-none"
                  >
                    <dt className="text-slate-500">{fact.label}</dt>
                    <dd className="font-semibold text-[#14263D] text-right">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {mode === 'terpandu' ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-[#3569B0] tabular-nums">
                  {isReviewStep
                    ? 'RINGKASAN AKHIR'
                    : `TAHAP ${guidedStepIdx + 1} / ${totalSteps}`}
                </span>
                <span className="text-slate-500">Terpandu</span>
              </div>

              {currentStep ? (
                <>
                  <div>
                    <h3 className="font-display text-base font-bold text-[#14263D]">
                      {currentStep.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {currentStep.instruction}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#14263D]">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      <span>Petunjuk Bertingkat</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 2, 3].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => handleRevealHint(lvl)}
                          className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                            revealedHintLevel >= lvl
                              ? 'border-[#3569B0] bg-[#EAF3FF] text-[#14263D]'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          Hint {lvl}
                        </button>
                      ))}
                    </div>
                    {revealedHintLevel >= 1 && (
                      <p className="rounded-lg bg-[#F4F7FB] p-2.5 text-xs text-slate-700">
                        <strong>Lokasi:</strong> {currentStep.hint1Location || '—'}
                      </p>
                    )}
                    {revealedHintLevel >= 2 && (
                      <p className="rounded-lg bg-[#F4F7FB] p-2.5 text-xs text-slate-700">
                        <strong>Konsep:</strong> {currentStep.hint2Concept || '—'}
                      </p>
                    )}
                    {revealedHintLevel >= 3 && (
                      <p className="rounded-lg bg-teal-50 p-2.5 text-xs text-[#14263D]">
                        <strong>Solusi:</strong> {currentStep.hint3Solution || '—'}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  Semua tahapan sudah terisi. Periksa kembali ringkasan di sebelah kanan lalu
                  klik Konfirmasi &amp; Simpan Checkpoint.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#14263D]">
                <HelpCircle className="h-4 w-4 text-[#3569B0]" />
                <span>Uji Mandiri</span>
              </div>
              <p className="text-sm text-slate-600">
                Lengkapi seluruh isian praktik sesuai data kasus tanpa bantuan petunjuk bertingkat,
                lalu simpan ke Checkpoint.
              </p>
            </div>
          )}
        </aside>

        {/* Right Workspace */}
        <section className="space-y-4 lg:col-span-8">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between bg-[#14263D] px-5 py-3 text-white">
              <div className="flex items-center gap-2">
                <MonitorCheck className="h-4 w-4 text-[#19A89B]" />
                <span className="text-xs font-semibold">
                  Workspace Simulasi — {episode.title}
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-300">
                {totalSteps} Tahapan
              </span>
            </div>

            <div className="p-6 space-y-5">
              {mode === 'terpandu' ? (
                currentStep ? (
                  <div className="space-y-4">
                    <label
                      htmlFor={`dyn-step-${currentStep.id}`}
                      className="block text-sm font-bold text-[#14263D]"
                    >
                      {currentStep.fieldLabel}
                    </label>
                    {renderStepControl(currentStep, `dyn-step-${currentStep.id}`)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="font-display text-base font-bold text-[#14263D]">
                      Ringkasan Jawaban Anda
                    </h4>
                    <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                      {steps.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
                        >
                          <span className="text-slate-600">{s.fieldLabel}</span>
                          <span className="font-semibold text-[#14263D]">
                            {answers[s.id] || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {steps.map((s, idx) => (
                    <div key={s.id} className="space-y-1.5">
                      <label
                        htmlFor={`ind-dyn-${s.id}`}
                        className="block text-sm font-semibold text-[#14263D]"
                      >
                        {idx + 1}. {s.fieldLabel}
                      </label>
                      {renderStepControl(s, `ind-dyn-${s.id}`)}
                    </div>
                  ))}
                </div>
              )}

              {stepFeedback && (
                <div
                  className={`flex items-start gap-2.5 rounded-lg border p-4 text-sm ${
                    stepFeedback.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-red-200 bg-red-50 text-red-900'
                  }`}
                >
                  {stepFeedback.type === 'success' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>{stepFeedback.text}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                {mode === 'terpandu' ? (
                  <>
                    <button
                      type="button"
                      disabled={guidedStepIdx === 0}
                      onClick={() => {
                        setGuidedStepIdx((i) => Math.max(0, i - 1));
                        setRevealedHintLevel(0);
                        setStepFeedback(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#14263D] disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Langkah Sebelumnya</span>
                    </button>

                    {!isReviewStep ? (
                      <button
                        type="button"
                        onClick={handleGuidedNext}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#3569B0] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2a548e]"
                      >
                        <span>Periksa &amp; Lanjut</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConfirmCheckpoint}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#19A89B] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#148f84]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Konfirmasi &amp; Simpan Checkpoint</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="ml-auto">
                    <button
                      type="button"
                      onClick={handleConfirmCheckpoint}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#14263D] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1e3859]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Periksa &amp; Simpan Checkpoint</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {hasSubmittedCheckpoint && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-sm text-emerald-950">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <h3 className="font-display text-base font-bold">
                    Hasil Praktik &amp; Checkpoint Telah Dikirim
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-900">
                    Data praktik Anda sudah tersimpan. Penilaian detail dan otomatis (skor
                    ketepatan langkah, jumlah kesalahan, serta penggunaan hint) hanya dapat
                    diakses oleh guru melalui menu <strong>Mode Guru</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
