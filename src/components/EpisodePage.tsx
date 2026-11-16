import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MonitorCheck,
  PlaySquare,
  Target,
  Download
} from 'lucide-react';
import {
  EpisodeContent,
  ModuleData,
  QuizAttemptRecord,
  SimulationAttemptRecord,
  StudentProgress
} from '../types/lms';
import { isEpisodeSimulationEnabled } from '../services/storage';
import { VideoPlayerBox } from './VideoPlayerBox';
import { VirtualLabPanel } from './VirtualLabPanel';
import { DynamicVirtualLabPanel } from './DynamicVirtualLabPanel';
import { QuizPanel } from './QuizPanel';
import { resolveMediaSource } from '../services/contentDb';

export type EpisodeActivityTab =
  | 'tujuan'
  | 'materi'
  | 'video'
  | 'simulasi'
  | 'uji_mandiri'
  | 'kuis';

const ACTIVITY_ORDER: Array<{ id: EpisodeActivityTab; label: string }> = [
  { id: 'tujuan', label: '1. Tujuan Pembelajaran' },
  { id: 'materi', label: '2. Materi Pembelajaran' },
  { id: 'video', label: '3. Video Tutorial' },
  { id: 'simulasi', label: '4. Simulasi Terpandu' },
  { id: 'uji_mandiri', label: '5. Uji Mandiri' },
  { id: 'kuis', label: '6. Kuis dan Checkpoint' }
];

interface EpisodePageProps {
  module: ModuleData;
  episode: EpisodeContent;
  initialTab?: EpisodeActivityTab;
  progress: StudentProgress;
  onBackToModules: () => void;
  onMarkMaterialRead: (episodeId: string) => void;
  onMarkVideoWatched: (episodeId: string) => void;
  onUpdateSimulation: (episodeId: string, rec: SimulationAttemptRecord) => void;
  onSaveQuizResult: (episodeId: string, res: QuizAttemptRecord) => void;
}

export function EpisodePage({
  module,
  episode,
  initialTab = 'tujuan',
  progress,
  onBackToModules,
  onMarkMaterialRead,
  onMarkVideoWatched,
  onUpdateSimulation,
  onSaveQuizResult
}: EpisodePageProps) {
  const [activeTab, setActiveTab] = useState<EpisodeActivityTab>(initialTab);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, episode.id]);

  useEffect(() => {
    let active = true;
    let url: string | null = null;
    async function loadPdf() {
      if (!episode.pdfAttachmentId) {
        setPdfUrl(null);
        setPdfName('');
        return;
      }
      const media = await resolveMediaSource(episode.pdfAttachmentId);
      if (media && active) {
        if (media.isObjectUrl) url = media.url;
        setPdfUrl(media.url);
        setPdfName(media.name);
      }
    }
    loadPdf();
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [episode.pdfAttachmentId]);

  const currentIdx = ACTIVITY_ORDER.findIndex((t) => t.id === activeTab);
  const simRecord = progress.simulations[episode.id];
  const quizRecord = progress.quizResults[episode.id];
  const isMaterialRead = Boolean(progress.materialsRead[episode.id]);
  const hasSimulation = isEpisodeSimulationEnabled(episode);
  const hasCustomSim = Boolean(
    episode.guidedSimulation?.enabled &&
      episode.guidedSimulation.steps.length > 0
  );

  const handlePrev = () => {
    if (currentIdx > 0) {
      setActiveTab(ACTIVITY_ORDER[currentIdx - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIdx < ACTIVITY_ORDER.length - 1) {
      setActiveTab(ACTIVITY_ORDER[currentIdx + 1].id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Episode Academic Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#3569B0]">
              {module.code} — {module.title}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#14263D]">
              EPISODE {episode.code} — {episode.title.toUpperCase()}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{episode.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onBackToModules}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#14263D] hover:bg-slate-50 shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>KEMBALI KE MODUL</span>
          </button>
        </div>

        {/* Top Progress Indicator */}
        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
            <span>
              Aktivitas {currentIdx + 1} dari {ACTIVITY_ORDER.length}:{' '}
              <strong className="text-[#14263D]">
                {ACTIVITY_ORDER[currentIdx].label}
              </strong>
            </span>
            <span>
              {Math.round(((currentIdx + 1) / ACTIVITY_ORDER.length) * 100)}% alur
              episode
            </span>
          </div>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {ACTIVITY_ORDER.map((step, idx) => (
              <div
                key={step.id}
                className={`h-2 rounded-full transition-colors ${
                  idx <= currentIdx ? 'bg-[#3569B0]' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 6 Activity Tabs */}
        <div className="mt-5 flex overflow-x-auto gap-2 border-t border-slate-100 pt-4">
          {ACTIVITY_ORDER.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#14263D] text-white'
                    : 'bg-[#F4F7FB] text-slate-700 hover:bg-[#EAF3FF] hover:text-[#14263D]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Activity Content */}
      {activeTab === 'tujuan' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
            <div className="flex items-center gap-2 text-[#3569B0]">
              <Target className="h-5 w-5" />
              <h2 className="font-display text-lg font-bold text-[#14263D]">
                Tujuan Pembelajaran
              </h2>
            </div>
            {episode.objectives.length > 0 ? (
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {episode.objectives.map((obj, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#19A89B]" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Tujuan pembelajaran belum ditambahkan pada episode ini.
              </p>
            )}
          </section>

          {episode.caseStudy && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
              <h2 className="font-display text-lg font-bold text-[#14263D]">
                Studi Kasus Praktikum
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                {episode.caseStudy.notes}
              </p>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Nama Perusahaan</dt>
                  <dd className="font-bold text-[#14263D]">
                    {episode.caseStudy.companyName}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Jenis Usaha</dt>
                  <dd className="font-semibold text-[#14263D]">
                    {episode.caseStudy.businessType}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Tahun Buku</dt>
                  <dd className="font-mono font-semibold text-[#14263D]">
                    {episode.caseStudy.fiscalYear}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Bulan Akhir Tahun Buku</dt>
                  <dd className="font-semibold text-[#14263D]">
                    {episode.caseStudy.lastMonth}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Jumlah Periode Akuntansi</dt>
                  <dd className="font-mono font-semibold text-[#14263D]">
                    {episode.caseStudy.periodsPerYear}
                  </dd>
                </div>
              </dl>
            </section>
          )}
        </div>
      )}

      {activeTab === 'materi' && (
        <div className="space-y-5">
          {episode.materials.length === 0 && !pdfUrl && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Materi bacaan teks belum ditambahkan pada episode ini.
            </div>
          )}

          {episode.materials.map((section) => (
            <article
              key={section.id}
              className="rounded-xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#3569B0]" />
                <h2 className="font-display text-lg font-bold text-[#14263D]">
                  {section.title}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {section.body}
              </p>

              {section.keyPoints && section.keyPoints.length > 0 && (
                <ul className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-[#F4F7FB] p-4 text-sm text-[#14263D]">
                  {section.keyPoints.map((kp, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#19A89B]" />
                      <span>{kp}</span>
                    </li>
                  ))}
                </ul>
              )}

              {section.warningNote && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <span>{section.warningNote}</span>
                </div>
              )}
            </article>
          ))}

          {pdfUrl && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#3569B0]" />
                  <div>
                    <h3 className="font-display text-base font-bold text-[#14263D]">
                      Lampiran Dokumen PDF
                    </h3>
                    <p className="text-xs text-slate-500">{pdfName}</p>
                  </div>
                </div>
                <a
                  href={pdfUrl}
                  download={pdfName || 'materi-smartguide.pdf'}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-[#14263D] hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Unduh PDF</span>
                </a>
              </div>
              <iframe
                src={pdfUrl}
                title={`Dokumen PDF ${pdfName}`}
                className="h-[460px] w-full rounded-lg border border-slate-200"
              />
            </section>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              {isMaterialRead
                ? 'Materi episode ini telah ditandai selesai dibaca.'
                : 'Tandai materi ini selesai setelah Anda memahami seluruh konsep di atas.'}
            </p>
            <button
              type="button"
              onClick={() => onMarkMaterialRead(episode.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold ${
                isMaterialRead
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'bg-[#19A89B] text-white hover:bg-[#148f84]'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {isMaterialRead
                  ? 'Materi Selesai Dibaca'
                  : 'Tandai Materi Selesai'}
              </span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'video' && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex items-center gap-2">
            <PlaySquare className="h-5 w-5 text-[#3569B0]" />
            <h2 className="font-display text-lg font-bold text-[#14263D]">
              {episode.videoInfo?.title || `Video Tutorial Episode ${episode.code}`}
            </h2>
          </div>

          <VideoPlayerBox
            localPath={episode.videoInfo?.localPath}
            mediaAttachmentId={episode.videoAttachmentId}
            title={episode.videoInfo?.title || episode.title}
            onVideoInteracted={() => onMarkVideoWatched(episode.id)}
          />

          {episode.videoInfo?.stepsSummary &&
            episode.videoInfo.stepsSummary.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Ringkasan Langkah Praktik
                </h3>
                <ol className="mt-2.5 space-y-1.5 text-sm text-[#14263D] list-decimal list-inside">
                  {episode.videoInfo.stepsSummary.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
        </section>
      )}

      {activeTab === 'simulasi' &&
        (hasSimulation ? (
          hasCustomSim && episode.guidedSimulation ? (
            <DynamicVirtualLabPanel
              key={`guided-${episode.id}`}
              episode={episode}
              config={episode.guidedSimulation}
              initialMode="terpandu"
              attemptRecord={simRecord}
              onUpdateAttempt={(rec) => onUpdateSimulation(episode.id, rec)}
            />
          ) : (
            <VirtualLabPanel
              key={`guided-${episode.id}`}
              episodeId={episode.id}
              initialMode="terpandu"
              attemptRecord={simRecord}
              onUpdateAttempt={(rec) => onUpdateSimulation(episode.id, rec)}
            />
          )
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Simulasi Terpandu untuk episode ini belum disiapkan oleh guru. Guru dapat mengaturnya
            pada menu <strong>Mode Guru</strong>.
          </div>
        ))}

      {activeTab === 'uji_mandiri' &&
        (hasSimulation ? (
          hasCustomSim && episode.guidedSimulation ? (
            <DynamicVirtualLabPanel
              key={`mandiri-${episode.id}`}
              episode={episode}
              config={episode.guidedSimulation}
              initialMode="mandiri"
              attemptRecord={simRecord}
              onUpdateAttempt={(rec) => onUpdateSimulation(episode.id, rec)}
            />
          ) : (
            <VirtualLabPanel
              key={`mandiri-${episode.id}`}
              episodeId={episode.id}
              initialMode="mandiri"
              attemptRecord={simRecord}
              onUpdateAttempt={(rec) => onUpdateSimulation(episode.id, rec)}
            />
          )
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Uji Mandiri akan aktif setelah guru menyiapkan Simulasi Terpandu pada episode ini.
          </div>
        ))}

      {activeTab === 'kuis' && (
        <div className="space-y-6">
          {hasSimulation && (
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <MonitorCheck className="mt-0.5 h-5 w-5 text-[#3569B0]" />
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#14263D]">
                      Status Pengumpulan Praktik Simulasi
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {simRecord?.lastFieldResults
                        ? 'Hasil praktik Laboratorium Virtual Anda sudah dikirim. Penilaian detail otomatis hanya dapat dilihat oleh guru di Mode Guru.'
                        : 'Anda belum mengirimkan hasil praktik Laboratorium Virtual untuk dinilai guru.'}
                    </p>
                  </div>
                </div>
                {simRecord?.lastFieldResults ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Sudah Dikirim</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('uji_mandiri')}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#3569B0] hover:bg-slate-50"
                  >
                    Buka Uji Mandiri
                  </button>
                )}
              </div>
            </section>
          )}

          <QuizPanel
            episode={episode}
            existingResult={quizRecord}
            onSaveResult={(res) => onSaveQuizResult(episode.id, res)}
            onFinish={onBackToModules}
          />

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
            <ClipboardCheck className="h-4 w-4 text-[#19A89B]" />
            <span>
              Status Kuis Episode {episode.code}:{' '}
              <strong className="text-[#14263D]">
                {quizRecord
                  ? `Sudah Dikumpulkan (Percobaan ke-${quizRecord.attempts}) — Penilaian oleh Guru`
                  : 'Belum dikumpulkan'}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Sequential Footer Navigation */}
      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <button
          type="button"
          disabled={currentIdx === 0}
          onClick={handlePrev}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#14263D] disabled:opacity-40 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>SEBELUMNYA</span>
        </button>

        {currentIdx === ACTIVITY_ORDER.length - 1 ? (
          <button
            type="button"
            onClick={onBackToModules}
            className="inline-flex items-center gap-2 rounded-lg bg-[#19A89B] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#148f84]"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>SELESAI</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 rounded-lg bg-[#3569B0] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2a548e]"
          >
            <span>SELANJUTNYA</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </footer>
    </div>
  );
}
