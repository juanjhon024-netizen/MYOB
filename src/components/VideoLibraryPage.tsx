import { useEffect, useState } from 'react';
import { Clock, ListOrdered, PlaySquare, CheckCircle2, AlertCircle } from 'lucide-react';
import { EpisodeContent, ModuleData, StudentProgress } from '../types/lms';
import { VideoPlayerBox } from './VideoPlayerBox';
import { resolveMediaSource } from '../services/contentDb';

interface VideoLibraryPageProps {
  modules: ModuleData[];
  progress: StudentProgress;
  onMarkVideoWatched: (episodeId: string) => void;
  onOpenEpisode: (episodeId: string) => void;
}

interface VideoLibraryItem {
  module: ModuleData;
  episode: EpisodeContent;
}

export function VideoLibraryPage({
  modules,
  progress,
  onMarkVideoWatched,
  onOpenEpisode
}: VideoLibraryPageProps) {
  const videoItems: VideoLibraryItem[] = modules.flatMap((mod) =>
    mod.episodes
      .filter((ep) => ep.videoInfo || ep.videoAttachmentId)
      .map((ep) => ({ module: mod, episode: ep }))
  );

  const [selectedEpId, setSelectedEpId] = useState<string>(
    videoItems[0]?.episode.id || 'ep-1-1'
  );
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    async function checkAllAvailability() {
      const next: Record<string, boolean> = {};
      for (const item of videoItems) {
        let isAvail = false;
        if (item.episode.videoAttachmentId) {
          const media = await resolveMediaSource(item.episode.videoAttachmentId);
          if (media) {
            isAvail = true;
            if (media.isObjectUrl) {
              URL.revokeObjectURL(media.url);
            }
          }
        }
        if (!isAvail && item.episode.videoInfo?.localPath) {
          try {
            const res = await fetch(item.episode.videoInfo.localPath, {
              method: 'HEAD'
            });
            const ct = res.headers.get('content-type') || '';
            if (res.ok && ct.toLowerCase().startsWith('video/')) {
              isAvail = true;
            }
          } catch {
            isAvail = false;
          }
        }
        next[item.episode.id] = isAvail;
      }
      if (active) setAvailabilityMap(next);
    }

    checkAllAvailability();
    return () => {
      active = false;
    };
  }, [modules]);

  const activeItem =
    videoItems.find((v) => v.episode.id === selectedEpId) || videoItems[0];

  const isSelectedAvailable = activeItem
    ? availabilityMap[activeItem.episode.id] ?? false
    : false;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="font-display text-2xl font-bold text-[#14263D]">
          Perpustakaan Video Tutorial
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
          Kumpulan video demonstrasi praktik langsung MYOB Accounting v18. Pemutar video menggunakan
          aset MP4 lokal tanpa layanan streaming eksternal.
        </p>
      </div>

      {activeItem && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Player & Practice Summary */}
          <div className="space-y-6 lg:col-span-8">
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold text-[#3569B0]">
                    {activeItem.module.code} — {activeItem.module.title} · Episode{' '}
                    {activeItem.episode.code}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold text-[#14263D]">
                    {activeItem.episode.videoInfo?.title || activeItem.episode.title}
                  </h2>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-600 tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#3569B0]" />
                    <span>
                      Durasi: {activeItem.episode.videoInfo?.duration || '05:00'}
                    </span>
                  </span>
                  {isSelectedAvailable ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Tersedia</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Belum Tersedia</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <VideoPlayerBox
                  localPath={activeItem.episode.videoInfo?.localPath}
                  mediaAttachmentId={activeItem.episode.videoAttachmentId}
                  title={activeItem.episode.videoInfo?.title || activeItem.episode.title}
                  onVideoInteracted={() => onMarkVideoWatched(activeItem.episode.id)}
                />
              </div>

              {activeItem.episode.videoInfo?.description && (
                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                  {activeItem.episode.videoInfo.description}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => onMarkVideoWatched(activeItem.episode.id)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                    progress.videosWatched[activeItem.episode.id]
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-[#14263D] text-white hover:bg-[#1e3859]'
                  }`}
                >
                  {progress.videosWatched[activeItem.episode.id]
                    ? 'Sudah Ditandai Selesai Menonton'
                    : 'Tandai Video Sudah Dipelajari'}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenEpisode(activeItem.episode.id)}
                  className="text-xs font-semibold text-[#3569B0] hover:underline"
                >
                  Buka Halaman Episode {activeItem.episode.code}
                </button>
              </div>
            </section>

            {/* 6-Step Practice Summary */}
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-[#19A89B]" />
                <h3 className="font-display text-lg font-bold text-[#14263D]">
                  Ringkasan Langkah Praktik Video
                </h3>
              </div>
              <ol className="mt-4 space-y-2.5">
                {(activeItem.episode.videoInfo?.stepsSummary || []).map((step, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 bg-[#F4F7FB] px-4 py-3 text-sm text-[#14263D]"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#3569B0] font-mono text-xs font-bold text-white tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* Video Playlist Sidebar */}
          <aside className="lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-display text-base font-bold text-[#14263D]">
                Daftar Video Tutorial
              </h3>
              <div className="mt-4 space-y-2.5">
                {videoItems.map(({ module, episode }) => {
                  const selected = episode.id === activeItem.episode.id;
                  const avail = availabilityMap[episode.id] ?? false;
                  return (
                    <button
                      key={episode.id}
                      type="button"
                      onClick={() => setSelectedEpId(episode.id)}
                      className={`w-full rounded-lg border p-3.5 text-left transition-colors ${
                        selected
                          ? 'border-[#3569B0] bg-[#EAF3FF]/60'
                          : 'border-slate-200 bg-white hover:bg-[#F4F7FB]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#3569B0]">
                          {module.code} · Ep. {episode.code}
                        </span>
                        <span className="font-mono text-slate-500 tabular-nums">
                          {episode.videoInfo?.duration || '—'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-[#14263D]">
                        {episode.videoInfo?.title || episode.title}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 text-xs">
                        <PlaySquare className="h-3.5 w-3.5 text-slate-400" />
                        <span
                          className={
                            avail ? 'font-semibold text-emerald-700' : 'text-amber-700'
                          }
                        >
                          {avail ? 'Video Tersedia' : 'Belum Tersedia'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
