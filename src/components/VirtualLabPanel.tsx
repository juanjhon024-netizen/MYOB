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
  SimulationAttemptRecord,
  SimulationFormValues
} from '../types/lms';
import {
  EXPECTED_PT_MAJU_JAYA,
  GUIDED_STEPS,
  runSelfTroubleshooting,
  validateSimulationValues
} from '../services/simulationValidator';

interface VirtualLabPanelProps {
  episodeId: string;
  initialMode?: 'terpandu' | 'mandiri';
  attemptRecord?: SimulationAttemptRecord;
  onUpdateAttempt: (record: SimulationAttemptRecord) => void;
}

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

const BUSINESS_TYPES = [
  'Perusahaan Jasa',
  'Perusahaan Dagang',
  'Perusahaan Manufaktur',
  'Koperasi'
];

const INITIAL_VALUES: SimulationFormValues = {
  actionSelected: '',
  companyName: '',
  businessType: '',
  fiscalYear: '',
  lastMonth: '',
  periodsPerYear: ''
};

export function VirtualLabPanel({
  episodeId,
  initialMode = 'terpandu',
  attemptRecord,
  onUpdateAttempt
}: VirtualLabPanelProps) {
  const [mode, setMode] = useState<'terpandu' | 'mandiri'>(initialMode);
  const [values, setValues] = useState<SimulationFormValues>(
    attemptRecord?.lastSubmittedValues || INITIAL_VALUES
  );
  const [guidedStep, setGuidedStep] = useState<number>(1);
  const [revealedHintLevel, setRevealedHintLevel] = useState<number>(0);
  const [stepFeedback, setStepFeedback] = useState<{
    type: 'error' | 'success' | 'info';
    text: string;
  } | null>(null);

  const [showTroubleshoot, setShowTroubleshoot] = useState<boolean>(false);
  const [hasSubmittedCheckpoint, setHasSubmittedCheckpoint] = useState<boolean>(
    Boolean(attemptRecord?.lastFieldResults && attemptRecord.lastFieldResults.length > 0)
  );

  const currentRecord: SimulationAttemptRecord = attemptRecord || {
    episodeId,
    guidedCompleted: false,
    guidedHintsUsed: 0,
    guidedErrors: 0,
    independentAttempts: 0,
    independentErrors: 0,
    independentCompleted: false,
    checkpointStatus: 'belum'
  };

  const currentStepDef = GUIDED_STEPS[guidedStep - 1];

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

  const validateCurrentGuidedStep = (): boolean => {
    const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

    if (guidedStep === 1) {
      if (values.actionSelected !== 'create') {
        setStepFeedback({
          type: 'error',
          text:
            values.actionSelected === ''
              ? 'Anda belum memilih tindakan pada jendela pembuka.'
              : 'Pilihan tindakan belum tepat. Anda ingin membuat file perusahaan baru, bukan membuka atau melihat contoh.'
        });
        onUpdateAttempt({
          ...currentRecord,
          guidedErrors: currentRecord.guidedErrors + 1
        });
        return false;
      }
      return true;
    }

    if (guidedStep === 2) {
      if (norm(values.companyName) !== norm(EXPECTED_PT_MAJU_JAYA.companyName)) {
        setStepFeedback({
          type: 'error',
          text:
            'Nama perusahaan belum sesuai kasus. Pastikan tertulis "PT Maju Jaya".'
        });
        onUpdateAttempt({
          ...currentRecord,
          guidedErrors: currentRecord.guidedErrors + 1
        });
        return false;
      }
      return true;
    }

    if (guidedStep === 3) {
      if (
        norm(values.businessType) !== norm(EXPECTED_PT_MAJU_JAYA.businessType)
      ) {
        setStepFeedback({
          type: 'error',
          text:
            'Jenis usaha belum tepat. PT Maju Jaya bergerak di bidang Perusahaan Dagang.'
        });
        onUpdateAttempt({
          ...currentRecord,
          guidedErrors: currentRecord.guidedErrors + 1
        });
        return false;
      }
      return true;
    }

    if (guidedStep === 4) {
      if (values.fiscalYear.trim() !== EXPECTED_PT_MAJU_JAYA.fiscalYear) {
        setStepFeedback({
          type: 'error',
          text:
            'Tahun buku belum sesuai. Masukkan 2026 sesuai data awal PT Maju Jaya.'
        });
        onUpdateAttempt({
          ...currentRecord,
          guidedErrors: currentRecord.guidedErrors + 1
        });
        return false;
      }
      return true;
    }

    if (guidedStep === 5) {
      if (norm(values.lastMonth) !== norm(EXPECTED_PT_MAJU_JAYA.lastMonth)) {
        setStepFeedback({
          type: 'error',
          text:
            'Bulan akhir tahun buku belum sesuai. Pilih Desember.'
        });
        onUpdateAttempt({
          ...currentRecord,
          guidedErrors: currentRecord.guidedErrors + 1
        });
        return false;
      }
      return true;
    }

    if (guidedStep === 6) {
      if (
        values.periodsPerYear.trim() !== EXPECTED_PT_MAJU_JAYA.periodsPerYear
      ) {
        setStepFeedback({
          type: 'error',
          text:
            'Jumlah periode akuntansi tidak tepat. Gunakan 12 periode (Januari–Desember).'
        });
        onUpdateAttempt({
          ...currentRecord,
          guidedErrors: currentRecord.guidedErrors + 1
        });
        return false;
      }
      return true;
    }

    if (guidedStep === 7) {
      const check = validateSimulationValues(values);
      if (!check.isAllValid) {
        setStepFeedback({
          type: 'error',
          text: `Masih terdapat ${check.errorCount} bagian data yang perlu diperbaiki pada langkah sebelumnya.`
        });
        onUpdateAttempt({
          ...currentRecord,
          guidedErrors: currentRecord.guidedErrors + 1
        });
        return false;
      }
      return true;
    }

    return true;
  };

  const handleGuidedNext = () => {
    if (!validateCurrentGuidedStep()) return;

    setStepFeedback(null);
    setRevealedHintLevel(0);
    if (guidedStep < 8) {
      setGuidedStep(guidedStep + 1);
    }
  };

  const handleGuidedConfirmCheckpoint = () => {
    const check = validateSimulationValues(values);
    setHasSubmittedCheckpoint(true);

    const status = check.isAllValid ? 'berhasil' : 'perlu_diperbaiki';
    setStepFeedback({
      type: 'success',
      text: 'Hasil Simulasi Terpandu & Checkpoint telah dikirim. Penilaian detail dan otomatis hanya dapat diakses oleh guru melalui Mode Guru.'
    });

    onUpdateAttempt({
      ...currentRecord,
      guidedCompleted: check.isAllValid ? true : currentRecord.guidedCompleted,
      checkpointStatus: status,
      lastSubmittedValues: { ...values },
      lastFieldResults: check.results,
      lastUpdatedAt: new Date().toISOString()
    });
  };

  const handleIndependentSubmit = () => {
    const check = validateSimulationValues(values);
    setHasSubmittedCheckpoint(true);

    const status = check.isAllValid ? 'berhasil' : 'perlu_diperbaiki';
    const nextAttempts = currentRecord.independentAttempts + 1;
    const addedErrors =
      check.errorCount + (values.actionSelected !== 'create' ? 1 : 0);

    setStepFeedback({
      type: 'success',
      text: `Hasil Uji Mandiri (Percobaan ke-${nextAttempts}) telah dikirim dan disimpan. Penilaian detail otomatis hanya dapat diakses oleh guru melalui Mode Guru.`
    });

    onUpdateAttempt({
      ...currentRecord,
      independentAttempts: nextAttempts,
      independentErrors: currentRecord.independentErrors + addedErrors,
      independentCompleted: check.isAllValid
        ? true
        : currentRecord.independentCompleted,
      checkpointStatus: status,
      lastSubmittedValues: { ...values },
      lastFieldResults: check.results,
      lastUpdatedAt: new Date().toISOString()
    });
  };

  const handleResetPractice = () => {
    setValues(INITIAL_VALUES);
    setGuidedStep(1);
    setRevealedHintLevel(0);
    setStepFeedback(null);
    setHasSubmittedCheckpoint(false);
    setShowTroubleshoot(false);
  };

  const diagnostics = runSelfTroubleshooting(values);

  return (
    <div className="space-y-6">
      {/* Mandatory Disclaimer & Mode Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
              <span>Simulasi Pembelajaran — Bukan Aplikasi MYOB Resmi</span>
            </div>
            <h2 className="mt-2 font-display text-xl font-bold text-[#14263D]">
              MYOB Virtual Lab — Episode 1.1: Membuat Data Perusahaan Baru
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Praktikkan penyusunan company file untuk kasus{' '}
              <strong className="text-[#14263D]">PT Maju Jaya</strong> secara langsung di
              browser.
            </p>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-[#F4F7FB] p-1 border border-slate-200">
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
              onClick={() => setShowTroubleshoot((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#19A89B] bg-teal-50 px-3.5 py-2 text-xs font-bold text-[#14263D] hover:bg-teal-100 whitespace-nowrap"
            >
              <Wrench className="h-3.5 w-3.5 text-[#19A89B]" />
              <span>BUTUH BANTUAN?</span>
            </button>

            <button
              type="button"
              onClick={handleResetPractice}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Ulangi Praktik</span>
            </button>
          </div>
        </div>

        {/* Neutral Submission Status Bar (Detailed Grading Guru-Only) */}
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

      {/* Self-Troubleshooting Diagnostic Drawer */}
      {showTroubleshoot && (
        <section className="rounded-xl border border-[#19A89B] bg-white p-6">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-[#19A89B]" />
              <h3 className="font-display text-base font-bold text-[#14263D]">
                Self-Troubleshooting — Pemeriksaan Masalah Otomatis
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowTroubleshoot(false)}
              className="text-xs font-semibold text-slate-500 hover:text-[#14263D]"
            >
              Tutup
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {diagnostics.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-lg border p-4 text-sm ${
                  item.severity === 'ok'
                    ? 'border-emerald-200 bg-emerald-50/70'
                    : 'border-amber-200 bg-amber-50/70'
                }`}
              >
                <p className="font-bold text-[#14263D]">{item.area}</p>
                <p className="mt-1 text-xs text-slate-700">{item.diagnosis}</p>
                <p className="mt-1.5 text-xs font-semibold text-[#14263D]">
                  Saran Perbaikan: {item.recommendation}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Instructions / Case Brief / Hints */}
        <aside className="space-y-4 lg:col-span-4">
          {/* Case Data Reference */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#3569B0]">
              Data Kasus Praktikum
            </h3>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5">
                <dt className="text-slate-500">Nama Perusahaan</dt>
                <dd className="font-semibold text-[#14263D]">PT Maju Jaya</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5">
                <dt className="text-slate-500">Jenis Usaha</dt>
                <dd className="font-semibold text-[#14263D]">Perusahaan Dagang</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5">
                <dt className="text-slate-500">Tahun Buku</dt>
                <dd className="font-mono font-semibold text-[#14263D]">2026</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-slate-100 pb-1.5">
                <dt className="text-slate-500">Bulan Akhir Tahun Buku</dt>
                <dd className="font-semibold text-[#14263D]">Desember</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Jumlah Periode</dt>
                <dd className="font-mono font-semibold text-[#14263D]">12</dd>
              </div>
            </dl>
          </div>

          {mode === 'terpandu' ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#3569B0] tabular-nums">
                  TAHAP {guidedStep} / 8
                </span>
                <span className="text-xs text-slate-500">Mode Terpandu</span>
              </div>

              {/* 8-step mini progress bar */}
              <div className="grid grid-cols-8 gap-1">
                {GUIDED_STEPS.map((s) => (
                  <div
                    key={s.stepNumber}
                    className={`h-1.5 rounded-full ${
                      s.stepNumber <= guidedStep
                        ? 'bg-[#3569B0]'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              <div>
                <h3 className="font-display text-base font-bold text-[#14263D]">
                  {currentStepDef.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {currentStepDef.instruction}
                </p>
              </div>

              {/* 3-Level Progressive Hints */}
              <div className="border-t border-slate-100 pt-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#14263D]">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span>Petunjuk Bertingkat (3 Level)</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRevealHint(1)}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                      revealedHintLevel >= 1
                        ? 'border-[#3569B0] bg-[#EAF3FF] text-[#14263D]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Hint 1: Lokasi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevealHint(2)}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                      revealedHintLevel >= 2
                        ? 'border-[#3569B0] bg-[#EAF3FF] text-[#14263D]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Hint 2: Konsep
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevealHint(3)}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                      revealedHintLevel >= 3
                        ? 'border-[#19A89B] bg-teal-50 text-[#14263D]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Hint 3: Solusi
                  </button>
                </div>

                {revealedHintLevel >= 1 && (
                  <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-3 text-xs text-slate-700">
                    <strong>Hint 1 (Petunjuk Lokasi):</strong>{' '}
                    {currentStepDef.hint1Location}
                  </div>
                )}
                {revealedHintLevel >= 2 && (
                  <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-3 text-xs text-slate-700">
                    <strong>Hint 2 (Penjelasan Konsep):</strong>{' '}
                    {currentStepDef.hint2Concept}
                  </div>
                )}
                {revealedHintLevel >= 3 && (
                  <div className="rounded-lg border border-teal-200 bg-teal-50/70 p-3 text-xs text-[#14263D]">
                    <strong>Hint 3 (Solusi Bertahap):</strong>{' '}
                    {currentStepDef.hint3Solution}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#14263D]">
                <HelpCircle className="h-4 w-4 text-[#3569B0]" />
                <span>Instruksi Uji Mandiri</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                Pada mode ini, petunjuk bertingkat dinonaktifkan. Lengkapi tindakan awal,
                identitas perusahaan, dan pengaturan periode akuntansi untuk{' '}
                <strong className="text-[#14263D]">PT Maju Jaya</strong> secara mandiri, lalu
                tekan tombol <strong>Periksa &amp; Simpan Checkpoint</strong>.
              </p>
            </div>
          )}
        </aside>

        {/* Right: Interactive Simulation Workspace */}
        <section className="space-y-4 lg:col-span-8">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Simulated Setup Window Title Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#14263D] px-5 py-3 text-white">
              <div className="flex items-center gap-2">
                <MonitorCheck className="h-4 w-4 text-[#19A89B]" />
                <span className="text-xs font-semibold">
                  Workspace Simulasi — Asisten Pembuatan Company File
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-300">
                Simulasi Edukasi
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Guided Step Indicator or Independent Full Form */}
              {mode === 'terpandu' ? (
                <>
                  {/* Step 1: Welcome Action Selection */}
                  {guidedStep === 1 && (
                    <div className="space-y-4">
                      <h4 className="font-display text-lg font-bold text-[#14263D]">
                        Welcome to Company File Assistant (Simulasi)
                      </h4>
                      <p className="text-sm text-slate-600">
                        Pilih salah satu tindakan awal untuk memulai setup PT Maju Jaya:
                      </p>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {[
                          {
                            id: 'open',
                            label: 'Open your company file',
                            desc: 'Membuka file perusahaan yang sudah pernah dibuat sebelumnya'
                          },
                          {
                            id: 'create',
                            label: 'Create a new company file',
                            desc: 'Membuat file data perusahaan baru dari awal'
                          },
                          {
                            id: 'explore',
                            label: 'Explore the sample company',
                            desc: 'Membuka data perusahaan contoh bawaan'
                          },
                          {
                            id: 'whats_new',
                            label: 'What’s New in this version',
                            desc: 'Melihat catatan pembaruan versi aplikasi'
                          }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setValues((v) => ({
                                ...v,
                                actionSelected: opt.id as SimulationFormValues['actionSelected']
                              }));
                              setStepFeedback(null);
                            }}
                            className={`rounded-lg border p-4 text-left transition-colors ${
                              values.actionSelected === opt.id
                                ? 'border-[#3569B0] bg-[#EAF3FF] ring-2 ring-[#3569B0]/20'
                                : 'border-slate-200 bg-[#F4F7FB] hover:border-slate-300'
                            }`}
                          >
                            <p className="text-sm font-bold text-[#14263D]">
                              {opt.label}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Company Name */}
                  {guidedStep === 2 && (
                    <div className="space-y-4">
                      <h4 className="font-display text-lg font-bold text-[#14263D]">
                        Company Information — Identitas Perusahaan
                      </h4>
                      <div>
                        <label
                          htmlFor="sim-company-name"
                          className="block text-sm font-semibold text-[#14263D]"
                        >
                          Nama Perusahaan (Company Name)
                        </label>
                        <input
                          id="sim-company-name"
                          type="text"
                          value={values.companyName}
                          onChange={(e) => {
                            setValues((v) => ({ ...v, companyName: e.target.value }));
                            setStepFeedback(null);
                          }}
                          placeholder="Ketik nama perusahaan..."
                          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-[#14263D] focus:border-[#3569B0] focus:outline-none focus:ring-2 focus:ring-[#3569B0]/20"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 3: Business Type */}
                  {guidedStep === 3 && (
                    <div className="space-y-4">
                      <h4 className="font-display text-lg font-bold text-[#14263D]">
                        Klasifikasi Usaha Perusahaan
                      </h4>
                      <div>
                        <label
                          htmlFor="sim-business-type"
                          className="block text-sm font-semibold text-[#14263D]"
                        >
                          Jenis Usaha
                        </label>
                        <select
                          id="sim-business-type"
                          value={values.businessType}
                          onChange={(e) => {
                            setValues((v) => ({ ...v, businessType: e.target.value }));
                            setStepFeedback(null);
                          }}
                          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#14263D] focus:border-[#3569B0] focus:outline-none focus:ring-2 focus:ring-[#3569B0]/20"
                        >
                          <option value="">-- Pilih Jenis Usaha --</option>
                          {BUSINESS_TYPES.map((bt) => (
                            <option key={bt} value={bt}>
                              {bt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Fiscal Year */}
                  {guidedStep === 4 && (
                    <div className="space-y-4">
                      <h4 className="font-display text-lg font-bold text-[#14263D]">
                        Accounting Information — Tahun Buku
                      </h4>
                      <div>
                        <label
                          htmlFor="sim-fiscal-year"
                          className="block text-sm font-semibold text-[#14263D]"
                        >
                          Tahun Buku (Current Financial Year)
                        </label>
                        <input
                          id="sim-fiscal-year"
                          type="text"
                          inputMode="numeric"
                          value={values.fiscalYear}
                          onChange={(e) => {
                            setValues((v) => ({ ...v, fiscalYear: e.target.value }));
                            setStepFeedback(null);
                          }}
                          placeholder="Contoh: 2026"
                          className="mt-2 w-full max-w-xs rounded-lg border border-slate-300 px-4 py-2.5 font-mono text-sm text-[#14263D] focus:border-[#3569B0] focus:outline-none focus:ring-2 focus:ring-[#3569B0]/20"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 5: Last Month */}
                  {guidedStep === 5 && (
                    <div className="space-y-4">
                      <h4 className="font-display text-lg font-bold text-[#14263D]">
                        Accounting Information — Bulan Akhir Tahun Buku
                      </h4>
                      <div>
                        <label
                          htmlFor="sim-last-month"
                          className="block text-sm font-semibold text-[#14263D]"
                        >
                          Bulan Akhir Tahun Buku (Last Month of Financial Year)
                        </label>
                        <select
                          id="sim-last-month"
                          value={values.lastMonth}
                          onChange={(e) => {
                            setValues((v) => ({ ...v, lastMonth: e.target.value }));
                            setStepFeedback(null);
                          }}
                          className="mt-2 w-full max-w-xs rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#14263D] focus:border-[#3569B0] focus:outline-none focus:ring-2 focus:ring-[#3569B0]/20"
                        >
                          <option value="">-- Pilih Bulan --</option>
                          {MONTHS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Step 6: Periods per year */}
                  {guidedStep === 6 && (
                    <div className="space-y-4">
                      <h4 className="font-display text-lg font-bold text-[#14263D]">
                        Accounting Information — Jumlah Periode Akuntansi
                      </h4>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                          {
                            val: '12',
                            title: '12 (Twelve)',
                            desc: 'Periode bulanan standar dari Januari hingga Desember'
                          },
                          {
                            val: '13',
                            title: '13 (Thirteen)',
                            desc: 'Menambahkan periode ke-13 khusus jurnal penyesuaian audit'
                          }
                        ].map((p) => (
                          <button
                            key={p.val}
                            type="button"
                            onClick={() => {
                              setValues((v) => ({ ...v, periodsPerYear: p.val }));
                              setStepFeedback(null);
                            }}
                            className={`rounded-lg border p-4 text-left transition-colors ${
                              values.periodsPerYear === p.val
                                ? 'border-[#3569B0] bg-[#EAF3FF] ring-2 ring-[#3569B0]/20'
                                : 'border-slate-200 bg-[#F4F7FB] hover:border-slate-300'
                            }`}
                          >
                            <p className="font-mono text-sm font-bold text-[#14263D]">
                              {p.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">{p.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 7 & 8: Summary Review & Final Confirmation */}
                  {(guidedStep === 7 || guidedStep === 8) && (
                    <div className="space-y-4">
                      <h4 className="font-display text-lg font-bold text-[#14263D]">
                        {guidedStep === 7
                          ? 'Periksa Kesesuaian Data Company File'
                          : 'Konfirmasi Hasil & Simpan Checkpoint'}
                      </h4>
                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-left text-sm">
                          <tbody className="divide-y divide-slate-200">
                            <tr className="bg-[#F4F7FB]">
                              <th className="px-4 py-2.5 font-medium text-slate-600">
                                Tindakan Awal
                              </th>
                              <td className="px-4 py-2.5 font-semibold text-[#14263D]">
                                {values.actionSelected === 'create'
                                  ? 'Create a new company file'
                                  : values.actionSelected || '(Belum dipilih)'}
                              </td>
                            </tr>
                            <tr>
                              <th className="px-4 py-2.5 font-medium text-slate-600">
                                Nama Perusahaan
                              </th>
                              <td className="px-4 py-2.5 font-semibold text-[#14263D]">
                                {values.companyName || '—'}
                              </td>
                            </tr>
                            <tr className="bg-[#F4F7FB]">
                              <th className="px-4 py-2.5 font-medium text-slate-600">
                                Jenis Usaha
                              </th>
                              <td className="px-4 py-2.5 font-semibold text-[#14263D]">
                                {values.businessType || '—'}
                              </td>
                            </tr>
                            <tr>
                              <th className="px-4 py-2.5 font-medium text-slate-600">
                                Tahun Buku
                              </th>
                              <td className="px-4 py-2.5 font-mono font-semibold text-[#14263D]">
                                {values.fiscalYear || '—'}
                              </td>
                            </tr>
                            <tr className="bg-[#F4F7FB]">
                              <th className="px-4 py-2.5 font-medium text-slate-600">
                                Bulan Akhir Tahun Buku
                              </th>
                              <td className="px-4 py-2.5 font-semibold text-[#14263D]">
                                {values.lastMonth || '—'}
                              </td>
                            </tr>
                            <tr>
                              <th className="px-4 py-2.5 font-medium text-slate-600">
                                Jumlah Periode Akuntansi
                              </th>
                              <td className="px-4 py-2.5 font-mono font-semibold text-[#14263D]">
                                {values.periodsPerYear || '—'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Guided Feedback Banner */}
                  {stepFeedback && (
                    <div
                      className={`rounded-lg border p-4 text-sm flex items-start gap-2.5 ${
                        stepFeedback.type === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'border-red-200 bg-red-50 text-red-900'
                      }`}
                    >
                      {stepFeedback.type === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      )}
                      <span>{stepFeedback.text}</span>
                    </div>
                  )}

                  {/* Guided Navigation Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      disabled={guidedStep === 1}
                      onClick={() => {
                        setGuidedStep((s) => Math.max(1, s - 1));
                        setRevealedHintLevel(0);
                        setStepFeedback(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#14263D] disabled:opacity-40 hover:bg-slate-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Langkah Sebelumnya</span>
                    </button>

                    {guidedStep < 8 ? (
                      <button
                        type="button"
                        onClick={handleGuidedNext}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#3569B0] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2a548e]"
                      >
                        <span>
                          {guidedStep === 7 ? 'Periksa Data' : 'Periksa & Lanjut'}
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGuidedConfirmCheckpoint}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#19A89B] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#148f84]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Konfirmasi &amp; Simpan Checkpoint</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* MODE UJI MANDIRI */
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-[#14263D]">
                      1. Tindakan Awal Pembukaan MYOB
                    </label>
                    <select
                      value={values.actionSelected}
                      onChange={(e) => {
                        setValues((v) => ({
                          ...v,
                          actionSelected: e.target.value as SimulationFormValues['actionSelected']
                        }));
                        setStepFeedback(null);
                      }}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#14263D] focus:border-[#3569B0] focus:outline-none"
                    >
                      <option value="">-- Pilih Tindakan Awal --</option>
                      <option value="open">Open your company file</option>
                      <option value="create">Create a new company file</option>
                      <option value="explore">Explore the sample company</option>
                      <option value="whats_new">What’s New in this version</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="ind-company-name"
                        className="block text-sm font-semibold text-[#14263D]"
                      >
                        2. Nama Perusahaan
                      </label>
                      <input
                        id="ind-company-name"
                        type="text"
                        value={values.companyName}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, companyName: e.target.value }))
                        }
                        placeholder="Masukkan nama perusahaan..."
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-[#14263D]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ind-business-type"
                        className="block text-sm font-semibold text-[#14263D]"
                      >
                        3. Jenis Usaha
                      </label>
                      <select
                        id="ind-business-type"
                        value={values.businessType}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, businessType: e.target.value }))
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#14263D]"
                      >
                        <option value="">-- Pilih Jenis Usaha --</option>
                        {BUSINESS_TYPES.map((bt) => (
                          <option key={bt} value={bt}>
                            {bt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="ind-fiscal-year"
                        className="block text-sm font-semibold text-[#14263D]"
                      >
                        4. Tahun Buku
                      </label>
                      <input
                        id="ind-fiscal-year"
                        type="text"
                        inputMode="numeric"
                        value={values.fiscalYear}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, fiscalYear: e.target.value }))
                        }
                        placeholder="YYYY"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-mono text-sm text-[#14263D]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ind-last-month"
                        className="block text-sm font-semibold text-[#14263D]"
                      >
                        5. Bulan Akhir Tahun Buku
                      </label>
                      <select
                        id="ind-last-month"
                        value={values.lastMonth}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, lastMonth: e.target.value }))
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#14263D]"
                      >
                        <option value="">-- Pilih Bulan --</option>
                        {MONTHS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="ind-periods"
                      className="block text-sm font-semibold text-[#14263D]"
                    >
                      6. Jumlah Periode Akuntansi
                    </label>
                    <select
                      id="ind-periods"
                      value={values.periodsPerYear}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, periodsPerYear: e.target.value }))
                      }
                      className="mt-1.5 w-full max-w-xs rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm text-[#14263D]"
                    >
                      <option value="">-- Pilih Jumlah Periode --</option>
                      <option value="12">12 Periode (Twelve)</option>
                      <option value="13">13 Periode (Thirteen)</option>
                    </select>
                  </div>

                  {stepFeedback && (
                    <div
                      className={`rounded-lg border p-4 text-sm flex items-start gap-2.5 ${
                        stepFeedback.type === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'border-amber-200 bg-amber-50 text-amber-950'
                      }`}
                    >
                      {stepFeedback.type === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      )}
                      <span>{stepFeedback.text}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={handleIndependentSubmit}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#14263D] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3859]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Periksa &amp; Simpan Checkpoint</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Neutral Submission Confirmation Box (Detailed Rubric Hidden from Students) */}
          {hasSubmittedCheckpoint && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-sm text-emerald-950">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <h3 className="font-display text-base font-bold">
                    Hasil Praktik &amp; Checkpoint Telah Dikirim
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-900">
                    Data entri simulasi Anda telah tersimpan ke server. Penilaian detail dan
                    otomatis (ketepatan setiap kolom, jumlah kesalahan, dan penggunaan hint) hanya
                    dapat diakses oleh guru melalui menu <strong>Mode Guru</strong>.
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
