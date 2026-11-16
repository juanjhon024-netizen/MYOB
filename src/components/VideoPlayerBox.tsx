import { useEffect, useState } from 'react';
import { Film, AlertCircle, CheckCircle2 } from 'lucide-react';
import { resolveMediaSource } from '../services/contentDb';

interface VideoPlayerBoxProps {
  localPath?: string;
  mediaAttachmentId?: string;
  title: string;
  onVideoInteracted?: () => void;
}

export function VideoPlayerBox({
  localPath,
  mediaAttachmentId,
  title,
  onVideoInteracted
}: VideoPlayerBoxProps) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>('');
  const [checking, setChecking] = useState<boolean>(true);
  const [loadFailed, setLoadFailed] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function resolveVideo() {
      setChecking(true);
      setLoadFailed(false);
      setVideoSrc(null);

      try {
        // 1. Check Server media attachment (or IndexedDB cache) first if present
        if (mediaAttachmentId) {
          const media = await resolveMediaSource(mediaAttachmentId);
          if (media && active) {
            if (media.isObjectUrl) objectUrl = media.url;
            setVideoSrc(media.url);
            setSourceLabel(`Video Unggahan Guru (${media.name})`);
            setChecking(false);
            return;
          }
        }

        // 2. Check static public/videos path via HEAD and strict video content-type
        if (localPath) {
          const res = await fetch(localPath, { method: 'HEAD' });
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.toLowerCase().startsWith('video/')) {
            if (active) {
              setVideoSrc(localPath);
              setSourceLabel(`Aset Server (${localPath})`);
              setChecking(false);
            }
            return;
          }
        }
      } catch {
        // Silent fallback to unavailable state
      }

      if (active) {
        setVideoSrc(null);
        setChecking(false);
      }
    }

    resolveVideo();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [localPath, mediaAttachmentId]);

  if (checking) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-[#F4F7FB] text-sm text-slate-500">
        Memeriksa ketersediaan file video MP4 lokal...
      </div>
    );
  }

  if (!videoSrc || loadFailed) {
    return (
      <div className="rounded-xl border border-slate-200 bg-[#14263D] p-8 text-center text-white">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <Film className="h-6 w-6 text-slate-300" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-white">
          Video tutorial belum tersedia.
        </h3>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-300">
          File video MP4 belum ditemukan pada folder aset{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">
            {localPath || '/videos/tutorial-praktik-myob.mp4'}
          </code>{' '}
          maupun penyimpanan unggahan server.
        </p>
        <div className="mx-auto mt-4 flex max-w-md items-start gap-2 rounded-lg bg-white/5 p-3 text-left text-xs text-slate-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#19A89B]" />
          <span>
            Guru dapat mengunggah file video MP4 secara langsung melalui menu{' '}
            <strong className="text-white">Mode Guru</strong> agar otomatis tersedia bagi seluruh
            siswa di perangkat masing-masing.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
        <video
          src={videoSrc}
          controls
          preload="metadata"
          aria-label={title}
          onPlay={() => onVideoInteracted?.()}
          onEnded={() => onVideoInteracted?.()}
          onError={() => setLoadFailed(true)}
          className="aspect-video w-full"
        >
          Browser Anda tidak mendukung pemutar video HTML5.
        </video>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Video tersedia · {sourceLabel}</span>
        </span>
        <span>Kontrol HTML5: Play, Pause, Volume, Seek, dan Layar Penuh</span>
      </div>
    </div>
  );
}
