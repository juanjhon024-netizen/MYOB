import {
  LogIn,
  BookOpen,
  PlaySquare,
  MonitorCheck,
  ClipboardCheck,
  BarChart3,
  RotateCcw,
  Download,
  Lock
} from 'lucide-react';

const GUIDE_SECTIONS = [
  {
    icon: LogIn,
    title: '1. Cara Masuk ke LMS',
    steps: [
      'Pada halaman pembuka Smart-Guide, klik tombol MULAI BELAJAR.',
      'Isi Kode Siswa (NIS/kode absen), Nama Lengkap, dan Kelas Anda.',
      'Klik MASUK KE E-LEARNING. Jika kode siswa yang sama pernah digunakan, Anda dapat langsung memilih Lanjutkan Progres Sebelumnya dari perangkat mana saja.'
    ]
  },
  {
    icon: BookOpen,
    title: '2. Cara Membuka Modul & Episode',
    steps: [
      'Pilih menu Ruang Pembelajaran atau Materi & Modul di sidebar sebelah kiri.',
      'Pilih modul yang ingin dipelajari (Modul 01 hingga Modul 06).',
      'Klik Buka Episode pada episode yang tersedia. Gunakan tombol SEBELUMNYA atau SELANJUTNYA di bagian bawah untuk berpindah aktivitas.'
    ]
  },
  {
    icon: PlaySquare,
    title: '3. Cara Menonton Video Tutorial',
    steps: [
      'Buka menu Video Tutorial di sidebar atau tab 3. Video Tutorial di dalam episode.',
      'Jika video MP4 lokal sudah dipasang atau diunggah guru, gunakan kontrol play, pause, volume, seek, dan fullscreen untuk menyimak praktik.'
    ]
  },
  {
    icon: MonitorCheck,
    title: '4. Cara Menggunakan Simulasi Terpandu & Lab Virtual',
    steps: [
      'Buka menu Laboratorium Virtual atau tab Simulasi Terpandu / Uji Mandiri pada episode.',
      'Gunakan Mode Coba Terpandu untuk berlatih langkah demi langkah dengan bantuan Hint 3 tingkat, atau Mode Uji Mandiri untuk pemeriksaan Checkpoint.',
      'Jika mengalami kendala, tekan tombol BUTUH BANTUAN? untuk menjalankan pemeriksaan kesalahan otomatis.'
    ]
  },
  {
    icon: ClipboardCheck,
    title: '5. Cara Mengerjakan Kuis',
    steps: [
      'Masuk ke menu Tugas & Kuis atau tab 6. Kuis dan Checkpoint di dalam episode.',
      'Pilih satu jawaban pada tiap soal lalu klik Kumpulkan Jawaban. Jawaban akan tersimpan untuk dinilai secara otomatis oleh guru.'
    ]
  },
  {
    icon: BarChart3,
    title: '6. Cara Melihat Status & Progres',
    steps: [
      'Buka menu Status & Progres di sidebar kiri untuk memantau penyelesaian materi, video, praktik simulasi, dan pengumpulan kuis.',
      'Penilaian detail dan otomatis (skor, kunci jawaban, dan analisis kesalahan) hanya dapat diakses oleh guru melalui Mode Guru.'
    ]
  },
  {
    icon: RotateCcw,
    title: '7. Cara Mengulangi Praktik & Kuis',
    steps: [
      'Di Laboratorium Virtual, klik tombol Ulangi Praktik untuk mencoba ulang dari awal.',
      'Di halaman Kuis setelah mengumpulkan jawaban, klik tombol Ulangi Kuis untuk mengerjakan kembali.'
    ]
  },
  {
    icon: Download,
    title: '8. Pengumpulan & Arsip Hasil Belajar',
    steps: [
      'Hasil kuis, simulasi, dan progres belajar Anda otomatis tersinkron ke server Smart-Guide sehingga langsung dapat diperiksa guru.',
      'Jika diminta arsip cadangan, buka menu Status & Progres lalu klik Unduh Berkas Pengumpulan (.json).'
    ]
  }
];

export function GuidePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="font-display text-2xl font-bold text-[#14263D]">
          Panduan Penggunaan Smart-Guide
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
          Petunjuk ringkas bagi siswa SMK Kelas XI AKL dan guru pengampu agar dapat menggunakan
          seluruh fitur pembelajaran dengan mudah.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {GUIDE_SECTIONS.map((sec) => {
          const Icon = sec.icon;
          return (
            <section
              key={sec.title}
              className="rounded-xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#3569B0]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-display text-base font-bold text-[#14263D]">
                  {sec.title}
                </h2>
              </div>
              <ol className="mt-4 space-y-2 text-sm leading-relaxed text-slate-600 list-decimal list-inside">
                {sec.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-[#19A89B]" />
          <h2 className="font-display text-base font-bold text-[#14263D]">
            Khusus Guru: Materi, Simulasi Terpandu &amp; Penilaian Detail Otomatis
          </h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Menu <strong>Mode Guru (Materi &amp; Nilai)</strong> dilindungi PIN akses server (standar
          awal: <span className="font-mono font-bold text-[#14263D]">1818</span>, dapat diubah di
          dalam Mode Guru). Hanya guru yang dapat menambah/mengubah materi, PDF, video MP4, soal
          kuis, mengatur tahapan <strong>Simulasi Terpandu</strong>, mengelola akun siswa, serta
          membuka <strong>Penilaian Detail &amp; Otomatis</strong> dan ekspor rekap nilai Excel CSV.
        </p>
      </section>
    </div>
  );
}
