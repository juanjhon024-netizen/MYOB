import { ModuleData, EpisodeContent } from '../types/lms';

export const BASE_CURRICULUM: ModuleData[] = [
  {
    id: 'modul-01',
    code: 'MODUL 01',
    title: 'SETUP DATA AWAL',
    description:
      'Mempersiapkan file data perusahaan baru, daftar akun, kode pajak, kartu pembantu, serta neraca saldo awal sebelum mencatat transaksi.',
    episodes: [
      {
        id: 'ep-1-1',
        moduleId: 'modul-01',
        code: '1.1',
        title: 'Membuat Data Perusahaan Baru',
        subtitle: 'Pengenalan Company File dan Pengaturan Identitas & Periode Akuntansi Awal',
        hasContent: true,
        hasVirtualLab: true,
        objectives: [
          'Mengenali informasi awal perusahaan dagang yang dibutuhkan sebelum membuka software akuntansi.',
          'Memulai proses pembuatan company file baru pada langkah awal MYOB Accounting v18.',
          'Mengatur identitas perusahaan, tahun buku, bulan akhir tahun buku, dan jumlah periode akuntansi dengan tepat.',
          'Memeriksa kesesuaian ringkasan data awal agar tidak terjadi kesalahan periode pencatatan.'
        ],
        caseStudy: {
          companyName: 'PT Maju Jaya',
          businessType: 'Perusahaan Dagang',
          fiscalYear: '2026',
          lastMonth: 'Desember',
          periodsPerYear: '12',
          address: 'Jl. Pendidikan Akuntansi No. 18, Jakarta',
          notes:
            'Gunakan data kasus PT Maju Jaya ini secara konsisten saat menjalankan Simulasi Terpandu maupun Uji Mandiri.'
        },
        materials: [
          {
            id: 'mat-1-1-1',
            title: '1. Pengertian Company File',
            body: 'Company file adalah berkas utama (berekstensi .myo pada MYOB Accounting v18) yang menyimpan seluruh basis data akuntansi suatu perusahaan, mulai dari identitas usaha, periode pembukuan, daftar akun, daftar pemasok dan pelanggan, persediaan, hingga seluruh jurnal transaksi dan laporan keuangan.',
            keyPoints: [
              'Satu file .myo mewakili satu entitas perusahaan.',
              'Disimpan secara terstruktur di folder kerja agar mudah dicadangkan (backup).',
              'Kesalahan pengaturan periode di awal pembuatan file tidak dapat diubah setelah file selesai dibuat.'
            ]
          },
          {
            id: 'mat-1-1-2',
            title: '2. Tujuan Pembuatan Data Perusahaan Baru',
            body: 'Pembuatan data perusahaan baru bertujuan memisahkan pencatatan keuangan secara rapi per entitas usaha dan menetapkan kerangka waktu akuntansi (accounting period) sehingga setiap transaksi masuk ke bulan dan tahun buku yang benar.',
            keyPoints: [
              'Menetapkan identitas resmi perusahaan yang akan tampil pada kop laporan keuangan.',
              'Menentukan batas tahun buku (Current Financial Year) sebagai acuan tutup buku.',
              'Menyiapkan struktur awal sebelum menyusun Chart of Accounts dan saldo awal.'
            ]
          },
          {
            id: 'mat-1-1-3',
            title: '3. Informasi Awal yang Diperlukan (Kasus PT Maju Jaya)',
            body: 'Sebelum menekan tombol Create pada jendela pembuka MYOB Accounting v18, siswa wajib menyiapkan data pokok perusahaan dari dokumen kebijakan akuntansi perusahaan.',
            keyPoints: [
              'Nama Perusahaan: PT Maju Jaya',
              'Jenis Usaha: Perusahaan Dagang (membeli dan menjual barang dagangan tanpa proses produksi)',
              'Tahun Buku (Current Financial Year): 2026',
              'Bulan Akhir Tahun Buku (Last Month of Financial Year): Desember',
              'Jumlah Periode Akuntansi (Number of Accounting Periods): 12 (Twelve)'
            ]
          },
          {
            id: 'mat-1-1-4',
            title: '4. Cara Memeriksa Kesesuaian Data Sebelum Konfirmasi',
            body: 'Pada tahap akhir wizard pembuatan company file, MYOB menampilkan ringkasan informasi akuntansi. Siswa harus membiasakan diri membaca ulang setiap baris ringkasan sebelum melanjutkan ke Command Centre.',
            keyPoints: [
              'Pastikan penulisan nama perusahaan sesuai dokumen resmi (PT Maju Jaya).',
              'Periksa ulang Tahun Buku: 2026 — bukan tahun berjalan komputer jika berbeda dengan soal.',
              'Pastikan Bulan Akhir adalah Desember dan Jumlah Periode adalah 12 (Januari s.d. Desember).',
              'Jika ada ketidakcocokan, gunakan tombol Back sebelum menyimpan file.'
            ]
          },
          {
            id: 'mat-1-1-5',
            title: '5. Kesalahan Umum Saat Pengaturan Awal',
            body: 'Sebagian besar kesalahan praktikum MYOB di kelas XI AKL terjadi pada tahap setup awal karena siswa terburu-buru menekan tombol Next tanpa memeriksa kolom periode akuntansi.',
            warningNote:
              'Perhatian: Tahun Buku dan Bulan Akhir Tahun Buku bersifat permanen setelah company file dibuat. Jika keliru, file harus dibuat ulang dari awal.',
            keyPoints: [
              'Salah memilih menu Open (membuka file lama) padahal seharusnya Create (membuat file baru).',
              'Mengisi Tahun Buku dengan tahun saat praktik berlangsung, bukan tahun buku pada soal (2026).',
              'Salah memilih jumlah periode (memilih 13 Thirteen ketika soal meminta 12 periode normal).',
              'Keliru memilih bulan akhir selain Desember sehingga awal periode bergeser.'
            ]
          }
        ],
        videoInfo: {
          title: 'Tutorial Praktik Dasar MYOB Accounting v18 — Alur Setup hingga Laporan',
          duration: '05:00',
          localPath: '/videos/tutorial-praktik-myob.mp4',
          description:
            'Demonstrasi ringkas berdurasi target 5 menit yang berfokus langsung pada langkah praktik dasar MYOB tanpa pengenalan menu yang panjang. Video ini merupakan demonstrasi ringkas alur kerja inti dan bukan klaim bahwa seluruh materi MYOB telah tercakup.',
          stepsSummary: [
            'Membuat data perusahaan baru (Company File) untuk PT Maju Jaya.',
            'Mengatur periode akuntansi (Tahun Buku 2026, Akhir Desember, 12 Periode).',
            'Mengatur daftar akun dasar perusahaan dagang.',
            'Memasukkan contoh transaksi pembelian barang dagangan.',
            'Memasukkan contoh transaksi penjualan barang dagangan.',
            'Menampilkan laporan keuangan hasil pencatatan.'
          ]
        },
        quizQuestions: [
          {
            id: 'q-1-1-1',
            question: 'Apa fungsi utama dari company file (file .myo) dalam MYOB Accounting v18?',
            options: [
              'Menyimpan seluruh basis data akuntansi satu perusahaan mulai dari identitas hingga laporan keuangan',
              'Menyimpan file installer program MYOB agar dapat dipindahkan ke komputer lain',
              'Hanya menyimpan gambar logo perusahaan untuk keperluan cetak faktur',
              'Menghubungkan komputer sekolah ke server pajak secara otomatis'
            ],
            correctIndex: 0,
            explanation:
              'Company file (.myo) adalah basis data utama yang menyimpan identitas perusahaan, daftar akun, kartu pembantu, jurnal transaksi, dan laporan keuangan untuk satu entitas usaha.'
          },
          {
            id: 'q-1-1-2',
            question:
              'Pada jendela pembuka MYOB Accounting v18, menu manakah yang harus dipilih untuk membuat data perusahaan baru PT Maju Jaya?',
            options: [
              'Open your company file',
              'Create a new company file',
              'Explore the sample company',
              'What’s New in this version'
            ],
            correctIndex: 1,
            explanation:
              'Menu "Create a new company file" digunakan untuk memulai wizard pembuatan data perusahaan baru, sedangkan "Open" dipakai untuk membuka file perusahaan yang sudah ada.'
          },
          {
            id: 'q-1-1-3',
            question:
              'Berdasarkan data kasus PT Maju Jaya, pengaturan tahun buku dan bulan akhir tahun buku yang benar adalah...',
            options: [
              'Tahun Buku 2025, Bulan Akhir Januari',
              'Tahun Buku 2026, Bulan Akhir Desember',
              'Tahun Buku 2026, Bulan Akhir Juni',
              'Tahun Buku 2024, Bulan Akhir Desember'
            ],
            correctIndex: 1,
            explanation:
              'Sesuai kebijakan akuntansi PT Maju Jaya, Tahun Buku (Current Financial Year) adalah 2026 dan Bulan Akhir Tahun Buku (Last Month of Financial Year) adalah Desember.'
          },
          {
            id: 'q-1-1-4',
            question:
              'Jika perusahaan menerapkan periode akuntansi bulanan standar dari Januari hingga Desember tanpa periode ke-13, berapakah jumlah periode akuntansi yang dipilih?',
            options: ['6 periode', '10 periode', '12 periode', '13 periode'],
            correctIndex: 2,
            explanation:
              'Periode akuntansi normal dalam satu tahun kalender terdiri atas 12 periode (Januari sampai Desember). Pilihan 13 hanya digunakan jika perusahaan membutuhkan periode khusus penyesuaian audit.'
          },
          {
            id: 'q-1-1-5',
            question:
              'Mengapa pemeriksaan ulang ringkasan data awal sangat penting sebelum menyelesaikan pembuatan company file?',
            options: [
              'Agar warna tampilan layar MYOB berubah menjadi lebih terang',
              'Karena tahun buku dan periode akuntansi tidak dapat diubah setelah file perusahaan selesai dibuat',
              'Agar komputer tidak perlu dimatikan setelah praktikum selesai',
              'Karena nama perusahaan hanya bisa dibaca jika hurufnya kapital semua'
            ],
            correctIndex: 1,
            explanation:
              'Pengaturan Current Financial Year dan Last Month of Financial Year bersifat permanen setelah file selesai dibuat. Memeriksa ringkasan data mencegah siswa harus mengulang pembuatan file dari awal.'
          }
        ]
      },
      {
        id: 'ep-1-2',
        moduleId: 'modul-01',
        code: '1.2',
        title: 'Daftar Akun',
        subtitle: 'Penyusunan dan Penyesuaian Chart of Accounts Perusahaan Dagang',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      },
      {
        id: 'ep-1-3',
        moduleId: 'modul-01',
        code: '1.3',
        title: 'Kode Pajak',
        subtitle: 'Pengaturan PPN dan Linked Accounts Pajak',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      },
      {
        id: 'ep-1-4',
        moduleId: 'modul-01',
        code: '1.4',
        title: 'Kartu Pembantu',
        subtitle: 'Pembuatan Card File Pelanggan, Pemasok, dan Karyawan',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      },
      {
        id: 'ep-1-5',
        moduleId: 'modul-01',
        code: '1.5',
        title: 'Saldo Awal',
        subtitle: 'Pengisian Neraca Saldo Awal, Saldo Piutang, dan Saldo Utang',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      }
    ]
  },
  {
    id: 'modul-02',
    code: 'MODUL 02',
    title: 'PEMBELIAN',
    description:
      'Pencatatan transaksi pembelian barang dagangan tunai maupun kredit, pajak masukan, serta pelunasan utang usaha.',
    episodes: [
      {
        id: 'ep-2-1',
        moduleId: 'modul-02',
        code: '2.1',
        title: 'Pembelian Tunai',
        subtitle: 'Pencatatan Faktur Pembelian Tunai pada Modul Purchases',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      },
      {
        id: 'ep-2-2',
        moduleId: 'modul-02',
        code: '2.2',
        title: 'Pembelian Kredit',
        subtitle: 'Pencatatan Pembelian Barang Dagangan dengan Syarat Kredit',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      },
      {
        id: 'ep-2-3',
        moduleId: 'modul-02',
        code: '2.3',
        title: 'PPN Masukan',
        subtitle: 'Perlakuan Pajak Pertambahan Nilai pada Transaksi Pembelian',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      },
      {
        id: 'ep-2-4',
        moduleId: 'modul-02',
        code: '2.4',
        title: 'Pembayaran Utang',
        subtitle: 'Pelunasan Utang Usaha melalui Fitur Pay Bills',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      }
    ]
  },
  {
    id: 'modul-03',
    code: 'MODUL 03',
    title: 'PENJUALAN',
    description:
      'Pengelolaan transaksi penjualan tunai, penjualan kredit, PPN keluaran, serta penerimaan pelunasan piutang pelanggan.',
    episodes: [
      {
        id: 'ep-3-1',
        moduleId: 'modul-03',
        code: '3.1',
        title: 'Penjualan Tunai',
        subtitle: 'Pencatatan Penjualan Tunai pada Modul Sales',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      },
      {
        id: 'ep-3-2',
        moduleId: 'modul-03',
        code: '3.2',
        title: 'Penjualan Kredit',
        subtitle: 'Penerbitan Faktur Penjualan Kredit Pelanggan',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      },
      {
        id: 'ep-3-3',
        moduleId: 'modul-03',
        code: '3.3',
        title: 'PPN Keluaran',
        subtitle: 'Pencatatan Pajak Pertambahan Nilai Keluaran atas Penjualan',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      },
      {
        id: 'ep-3-4',
        moduleId: 'modul-03',
        code: '3.4',
        title: 'Penerimaan Piutang',
        subtitle: 'Pencatatan Pelunasan Piutang melalui Receive Payments',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      }
    ]
  },
  {
    id: 'modul-04',
    code: 'MODUL 04',
    title: 'PERBANKAN',
    description:
      'Transaksi penerimaan dan pengeluaran kas/bank di luar aktivitas pembelian dan penjualan barang dagangan.',
    episodes: [
      {
        id: 'ep-4-1',
        moduleId: 'modul-04',
        code: '4.1',
        title: 'Penerimaan Kas/Bank',
        subtitle: 'Penggunaan Fitur Receive Money pada Modul Banking',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      },
      {
        id: 'ep-4-2',
        moduleId: 'modul-04',
        code: '4.2',
        title: 'Pengeluaran Kas/Bank',
        subtitle: 'Penggunaan Fitur Spend Money untuk Beban Operasional',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      }
    ]
  },
  {
    id: 'modul-05',
    code: 'MODUL 05',
    title: 'MEMORIAL DAN PENYESUAIAN',
    description:
      'Pencatatan transaksi memorial dan ayat jurnal penyesuaian akhir periode pada modul Accounts.',
    episodes: [
      {
        id: 'ep-5-1',
        moduleId: 'modul-05',
        code: '5.1',
        title: 'Jurnal Umum',
        subtitle: 'Input Transaksi Memorial melalui Record Journal Entry',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      },
      {
        id: 'ep-5-2',
        moduleId: 'modul-05',
        code: '5.2',
        title: 'Jurnal Penyesuaian',
        subtitle: 'Pencatatan Penyesuaian Akhir Periode Akuntansi',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      }
    ]
  },
  {
    id: 'modul-06',
    code: 'MODUL 06',
    title: 'LAPORAN KEUANGAN',
    description:
      'Menampilkan laporan keuangan utama, memeriksa keseimbangan neraca, dan menelusuri kesalahan pencatatan.',
    episodes: [
      {
        id: 'ep-6-1',
        moduleId: 'modul-06',
        code: '6.1',
        title: 'Menampilkan Laporan',
        subtitle: 'Menampilkan Neraca, Laba Rugi, dan Arus Kas',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      },
      {
        id: 'ep-6-2',
        moduleId: 'modul-06',
        code: '6.2',
        title: 'Memeriksa Hasil',
        subtitle: 'Verifikasi Kesesuaian Angka Laporan Keuangan',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      },
      {
        id: 'ep-6-3',
        moduleId: 'modul-06',
        code: '6.3',
        title: 'Menelusuri Kesalahan',
        subtitle: 'Audit Trail dan Penelusuran Selisih Jurnal di Transaction Journal',
        hasContent: false,
        objectives: [],
        materials: [],
        quizQuestions: []
      }
    ]
  }
];

export function mergeCurriculumWithOverrides(
  overrides: EpisodeContent[]
): ModuleData[] {
  const overrideMap = new Map<string, EpisodeContent>();
  for (const ep of overrides) {
    overrideMap.set(ep.id, ep);
  }

  const baseEpisodeIds = new Set<string>();
  const mergedModules: ModuleData[] = BASE_CURRICULUM.map((mod) => {
    const mergedEpisodes = mod.episodes.map((baseEp) => {
      baseEpisodeIds.add(baseEp.id);
      const custom = overrideMap.get(baseEp.id);
      if (!custom) return baseEp;
      return {
        ...baseEp,
        ...custom,
        hasVirtualLab: baseEp.hasVirtualLab ?? custom.hasVirtualLab,
        caseStudy: custom.caseStudy ?? baseEp.caseStudy
      };
    });

    const extraEpisodes = overrides.filter(
      (ep) => ep.moduleId === mod.id && !baseEpisodeIds.has(ep.id)
    );

    return {
      ...mod,
      episodes: [...mergedEpisodes, ...extraEpisodes]
    };
  });

  return mergedModules;
}

export function findEpisodeById(
  modules: ModuleData[],
  episodeId: string
): { module: ModuleData; episode: EpisodeContent } | null {
  for (const mod of modules) {
    const found = mod.episodes.find((ep) => ep.id === episodeId);
    if (found) {
      return { module: mod, episode: found };
    }
  }
  return null;
}
