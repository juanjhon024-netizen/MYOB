import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Info,
  RotateCcw,
  Save,
  User
} from 'lucide-react';
import {
  ModuleData,
  StudentProfile,
  StudentProgress
} from '../types/lms';
import { exportStudentSubmissionJson } from '../services/storage';

interface SettingsPageProps {
  student: StudentProfile;
  modules: ModuleData[];
  progress: StudentProgress;
  onUpdateProfile: (next: {
    studentCode: string;
    fullName: string;
    className: string;
  }) => Promise<void> | void;
  onResetProgress: () => Promise<void> | void;
}

export function SettingsPage({
  student,
  modules,
  progress,
  onUpdateProfile,
  onResetProgress
}: SettingsPageProps) {
  const [fullName, setFullName] = useState(student.fullName);
  const [className, setClassName] = useState(student.className);
  const [saveMessage, setSaveMessage] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetDoneMsg, setResetDoneMsg] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !className.trim()) return;
    try {
      await onUpdateProfile({
        studentCode: student.studentCode,
        fullName: fullName.trim(),
        className: className.trim()
      });
      setSaveMessage('Profil siswa berhasil diperbarui dan disinkronkan ke server.');
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : 'Gagal memperbarui profil ke server.'
      );
    }
    setTimeout(() => setSaveMessage(''), 4000);
  };

  const handleConfirmReset = async () => {
    await onResetProgress();
    setShowResetConfirm(false);
    setResetDoneMsg('Progres belajar siswa untuk kode ini telah direset di server.');
    setTimeout(() => setResetDoneMsg(''), 5000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="font-display text-2xl font-bold text-[#14263D]">
          Pengaturan Akun &amp; Data
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Kelola identitas siswa aktif, cadangkan hasil belajar, atau atur ulang progres Anda di
          server Smart-Guide.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#3569B0]/30 bg-[#EAF3FF] p-5 text-sm text-[#14263D]">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#3569B0]" />
        <div>
          <p className="font-bold">Sinkronisasi Server Online (Smart-Guide)</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">
            Seluruh profil siswa, jawaban kuis, dan progres praktik tersimpan pada server
            Smart-Guide sehingga dapat diakses kembali dari perangkat lain dan langsung dipantau
            oleh guru. Tombol ekspor berkas pengumpulan di bawah tetap tersedia sebagai arsip
            cadangan pribadi Anda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#3569B0]" />
            <h2 className="font-display text-lg font-bold text-[#14263D]">
              Profil Siswa Aktif
            </h2>
          </div>

          <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600">
                Kode Siswa (Identitas Unik Lokal)
              </label>
              <input
                type="text"
                value={student.studentCode}
                disabled
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2 font-mono text-sm text-slate-600"
              />
            </div>

            <div>
              <label
                htmlFor="settings-fullname"
                className="block text-xs font-semibold text-[#14263D]"
              >
                Nama Lengkap
              </label>
              <input
                id="settings-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-[#14263D]"
              />
            </div>

            <div>
              <label
                htmlFor="settings-class"
                className="block text-xs font-semibold text-[#14263D]"
              >
                Kelas
              </label>
              <input
                id="settings-class"
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-[#14263D]"
              />
            </div>

            {saveMessage && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>{saveMessage}</span>
              </p>
            )}

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#3569B0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a548e]"
            >
              <Save className="h-4 w-4" />
              <span>Simpan Perubahan Profil</span>
            </button>
          </form>
        </section>

        <div className="space-y-6 lg:col-span-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-[#14263D]">
              Ekspor Berkas Pengumpulan Siswa
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Unduh berkas hasil belajar (.json) untuk diserahkan kepada guru agar dapat dinilai
              secara detail dan otomatis di Mode Guru.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => exportStudentSubmissionJson(student, progress)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#14263D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3859]"
              >
                <FileJson className="h-4 w-4" />
                <span>Unduh Berkas Pengumpulan (.json)</span>
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-red-200 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-red-900">
              Reset Progres Belajar
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Menghapus seluruh progres membaca materi, riwayat simulasi, nilai kuis, dan
              checkpoint untuk siswa <strong className="text-[#14263D]">{student.fullName}</strong>.
            </p>

            {resetDoneMsg && (
              <p className="mt-3 text-xs font-semibold text-emerald-700">
                {resetDoneMsg}
              </p>
            )}

            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-100"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset Progres Saya</span>
              </button>
            ) : (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 space-y-3">
                <div className="flex items-start gap-2 text-xs font-semibold text-red-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Konfirmasi: Yakin ingin menghapus seluruh nilai dan progres belajar untuk kode
                    siswa {student.studentCode}?
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800"
                  >
                    Ya, Hapus Progres
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
