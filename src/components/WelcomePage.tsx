import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  MonitorCheck,
  ClipboardCheck,
  UserCheck,
  History,
  Info,
  Ban
} from 'lucide-react';
import { StudentProfile } from '../types/lms';
import {
  findProfileByCode,
  getSavedProfiles,
  isStudentCodeDisabled,
  lookupStudentRemote
} from '../services/storage';
import welcomeWorkspaceImg from '../assets/images/welcome_accounting_workspace_1794759942170.jpg';

interface WelcomePageProps {
  onEnterLms: (
    data: { studentCode: string; fullName: string; className: string },
    mode: 'resume' | 'new_or_update'
  ) => Promise<void> | void;
  sessionNotice?: string;
}

export function WelcomePage({ onEnterLms, sessionNotice }: WelcomePageProps) {
  const [showIdentityForm, setShowIdentityForm] = useState(Boolean(sessionNotice));
  const [studentCode, setStudentCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('XI AKL 1');
  const [formError, setFormError] = useState(sessionNotice || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const [remoteLookup, setRemoteLookup] = useState<{
    code: string;
    exists: boolean;
    isDisabled: boolean;
    profile: StudentProfile | null;
  } | null>(null);

  useEffect(() => {
    if (sessionNotice) {
      setShowIdentityForm(true);
      setFormError(sessionNotice);
    }
  }, [sessionNotice]);

  const activeSavedProfiles = useMemo(
    () =>
      getSavedProfiles().filter(
        (p) => !p.isDisabled && !isStudentCodeDisabled(p.studentCode)
      ),
    []
  );

  // Debounced server lookup when student enters Kode Siswa (cross-device resume & disable check)
  useEffect(() => {
    const trimmed = studentCode.trim();
    if (!trimmed) {
      setRemoteLookup(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await lookupStudentRemote(trimmed);
      if (!cancelled) {
        setRemoteLookup({
          code: trimmed.toLowerCase(),
          exists: res.exists,
          isDisabled: res.isDisabled,
          profile: res.profile
        });
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [studentCode]);

  const matchedProfile: StudentProfile | null = useMemo(() => {
    const trimmed = studentCode.trim();
    if (!trimmed) return null;
    if (remoteLookup && remoteLookup.code === trimmed.toLowerCase()) {
      return remoteLookup.profile;
    }
    return findProfileByCode(trimmed);
  }, [studentCode, remoteLookup]);

  const isMatchedDisabled = useMemo(() => {
    const trimmed = studentCode.trim();
    if (!trimmed) return false;
    if (remoteLookup && remoteLookup.code === trimmed.toLowerCase()) {
      return remoteLookup.isDisabled;
    }
    return isStudentCodeDisabled(trimmed);
  }, [studentCode, remoteLookup]);

  const handleSelectSavedProfile = async (profile: StudentProfile) => {
    if (profile.isDisabled || isStudentCodeDisabled(profile.studentCode)) {
      setFormError(
        'Akun siswa ini telah dinonaktifkan oleh guru. Hubungi guru pengampu untuk mengaktifkan kembali.'
      );
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      await onEnterLms(
        {
          studentCode: profile.studentCode,
          fullName: profile.fullName,
          className: profile.className
        },
        'resume'
      );
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Akun tidak dapat masuk. Periksa status akun di guru pengampu.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim()) {
      setFormError('Kode Siswa wajib diisi.');
      return;
    }
    if (isMatchedDisabled) {
      setFormError(
        'Akun siswa dengan kode ini sedang dinonaktifkan oleh guru dan tidak dapat masuk sementara waktu.'
      );
      return;
    }
    if (!fullName.trim() && !matchedProfile) {
      setFormError('Nama Lengkap wajib diisi.');
      return;
    }
    if (!className.trim() && !matchedProfile) {
      setFormError('Kelas wajib diisi.');
      return;
    }

    setFormError('');
    setIsSubmitting(true);
    try {
      await onEnterLms(
        {
          studentCode: studentCode.trim(),
          fullName: (fullName.trim() || matchedProfile?.fullName || '').trim(),
          className: (className.trim() || matchedProfile?.className || '').trim()
        },
        matchedProfile ? 'resume' : 'new_or_update'
      );
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Gagal masuk ke e-learning. Pastikan koneksi server aktif.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#14263D] flex flex-col">
      {/* Top Academic Bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
          <span className="font-display text-lg font-bold tracking-tight text-[#14263D] whitespace-nowrap shrink-0">
            SMART-GUIDE
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <span className="whitespace-nowrap shrink-0">SMK Kelas XI AKL</span>
            <span aria-hidden="true" className="text-slate-300">/</span>
            <span className="whitespace-nowrap shrink-0">MYOB Accounting v18</span>
            <span aria-hidden="true" className="text-slate-300">/</span>
            <span className="whitespace-nowrap shrink-0">Server Online Terpusat</span>
          </nav>
          <button
            type="button"
            onClick={() => setShowIdentityForm(true)}
            className="rounded-lg bg-[#14263D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e3859] whitespace-nowrap shrink-0"
          >
            Mulai Belajar
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-10 lg:py-14">
        {!showIdentityForm ? (
          <div className="grid w-full grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
            {/* Left Intro Column */}
            <div className="flex flex-col justify-center lg:col-span-7">
              <p className="text-sm font-semibold tracking-wide text-[#3569B0]">
                Program Keahlian Akuntansi dan Keuangan Lembaga
              </p>
              <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-[#14263D] sm:text-5xl text-balance">
                SMART-GUIDE
              </h1>
              <p className="mt-2 text-lg font-semibold text-[#19A89B]">
                Interactive Learning &amp; Independent Accounting Practice
              </p>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
                Platform pembelajaran digital untuk mempelajari MYOB Accounting v18 secara mandiri
                melalui materi, video tutorial, simulasi terpandu, dan evaluasi yang terhubung ke
                server pembelajaran.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowIdentityForm(true)}
                  className="inline-flex items-center gap-2.5 rounded-lg bg-[#3569B0] px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#2a548e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3569B0]"
                >
                  <span>MULAI BELAJAR</span>
                  <ArrowRight className="h-5 w-5" />
                </button>

                {activeSavedProfiles.length > 0 && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSelectSavedProfile(activeSavedProfiles[0])}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-[#14263D] transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    <History className="h-4 w-4 text-[#19A89B]" />
                    <span>Lanjutkan sebagai {activeSavedProfiles[0].fullName}</span>
                  </button>
                )}
              </div>

              <div className="mt-10 grid grid-cols-1 gap-4 border-t border-slate-200 pt-8 sm:grid-cols-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#14263D]">
                    <BookOpen className="h-4 w-4 text-[#3569B0]" />
                    <span>6 Modul Terstruktur</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Peta kurikulum lengkap dari Setup Data Awal hingga Laporan Keuangan.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#14263D]">
                    <MonitorCheck className="h-4 w-4 text-[#19A89B]" />
                    <span>Simulasi Terpandu</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Praktik bertahap yang disiapkan guru dengan petunjuk 3 tingkat dan Uji Mandiri.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#14263D]">
                    <ClipboardCheck className="h-4 w-4 text-[#3569B0]" />
                    <span>Sinkronisasi Server</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Progres belajar, kuis, dan checkpoint langsung tersimpan ke server untuk dinilai guru.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Visual Column */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {!imgFailed ? (
                  <img
                    src={welcomeWorkspaceImg}
                    alt="Suasana meja belajar akuntansi modern dengan buku besar dan laptop analisis keuangan"
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="h-72 w-full object-cover lg:h-full"
                  />
                ) : (
                  <div className="flex h-72 w-full flex-col items-center justify-center bg-[#14263D] p-8 text-white lg:h-full">
                    <BookOpen className="h-12 w-12 text-[#19A89B]" />
                    <p className="mt-3 font-display text-lg font-semibold">
                      Ruang Praktikum Akuntansi Digital
                    </p>
                    <p className="mt-1 text-sm text-slate-300 text-center">
                      MYOB Accounting v18 — SMK Kelas XI AKL
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl">
            <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#14263D]">
                    Identitas Siswa
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Masukkan kode siswa Anda untuk membuka atau melanjutkan progres belajar dari
                    server.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIdentityForm(false)}
                  className="text-sm font-medium text-slate-500 hover:text-[#14263D]"
                >
                  Kembali
                </button>
              </div>

              {activeSavedProfiles.length > 0 && (
                <div className="mt-6 rounded-lg border border-slate-200 bg-[#F4F7FB] p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <UserCheck className="h-4 w-4 text-[#19A89B]" />
                    <span>Identitas Tersimpan di Perangkat Ini</span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {activeSavedProfiles.map((prof) => (
                      <button
                        key={prof.studentCode}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSelectSavedProfile(prof)}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left transition-colors hover:border-[#3569B0] hover:bg-[#EAF3FF]/40 disabled:opacity-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#14263D]">
                            {prof.fullName}
                          </p>
                          <p className="truncate text-xs text-slate-500 tabular-nums">
                            {prof.studentCode} · {prof.className}
                          </p>
                        </div>
                        <span className="ml-2 shrink-0 text-xs font-semibold text-[#3569B0]">
                          Lanjutkan
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="studentCode"
                    className="block text-sm font-semibold text-[#14263D]"
                  >
                    1. Kode Siswa
                  </label>
                  <input
                    id="studentCode"
                    type="text"
                    value={studentCode}
                    onChange={(e) => {
                      setStudentCode(e.target.value);
                      setFormError('');
                    }}
                    placeholder="Contoh: AKL-11-001 atau NIS siswa"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#14263D] focus:border-[#3569B0] focus:outline-none focus:ring-2 focus:ring-[#3569B0]/20"
                  />
                </div>

                {isMatchedDisabled && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
                    <Ban className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div>
                      <p className="font-bold">Akun Siswa Dinonaktifkan oleh Guru</p>
                      <p className="mt-0.5">
                        Kode siswa <span className="font-mono font-semibold">{studentCode}</span>{' '}
                        sedang dinonaktifkan oleh guru. Hubungi guru pengampu untuk mengaktifkan
                        kembali melalui Mode Guru.
                      </p>
                    </div>
                  </div>
                )}

                {matchedProfile && !isMatchedDisabled && (
                  <div className="rounded-lg border border-[#19A89B]/40 bg-teal-50/70 p-4">
                    <p className="text-sm font-semibold text-[#14263D]">
                      Progres sebelumnya ditemukan untuk kode{' '}
                      <span className="font-mono">{matchedProfile.studentCode}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Nama: <strong>{matchedProfile.fullName}</strong> · Kelas:{' '}
                      <strong>{matchedProfile.className}</strong>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSelectSavedProfile(matchedProfile)}
                        className="rounded-lg bg-[#19A89B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#148f84] disabled:opacity-50"
                      >
                        Lanjutkan Progres Sebelumnya
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-semibold text-[#14263D]"
                  >
                    2. Nama Lengkap
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Siti Rahmawati"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#14263D] focus:border-[#3569B0] focus:outline-none focus:ring-2 focus:ring-[#3569B0]/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="className"
                    className="block text-sm font-semibold text-[#14263D]"
                  >
                    3. Kelas
                  </label>
                  <input
                    id="className"
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Contoh: XI AKL 1"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#14263D] focus:border-[#3569B0] focus:outline-none focus:ring-2 focus:ring-[#3569B0]/20"
                  />
                </div>

                {formError && (
                  <p className="text-sm font-medium text-red-600" role="alert">
                    {formError}
                  </p>
                )}

                <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
                  <Info className="h-4 w-4 shrink-0 text-[#3569B0] mt-0.5" />
                  <p>
                    Data identitas, progres belajar, jawaban kuis, dan simulasi otomatis
                    tersinkron ke server Smart-Guide sehingga dapat dilanjutkan dari perangkat lain
                    dan langsung terbaca oleh guru di Mode Guru.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3569B0] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#2a548e] disabled:opacity-60"
                  >
                    <span>
                      {isSubmitting ? 'MENGHUBUNGKAN KE SERVER...' : 'MASUK KE E-LEARNING'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-slate-500">
          <span>Smart-Guide · Media Pembelajaran Komputer Akuntansi SMK Kelas XI AKL</span>
          <span>Server Online Terpusat · Akses Lintas Perangkat</span>
        </div>
      </footer>
    </div>
  );
}
