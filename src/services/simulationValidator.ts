import {
  FieldValidationResult,
  GuidedSimulationConfig,
  SimulationFormValues
} from '../types/lms';

export const EXPECTED_PT_MAJU_JAYA: SimulationFormValues = {
  actionSelected: 'create',
  companyName: 'PT Maju Jaya',
  businessType: 'Perusahaan Dagang',
  fiscalYear: '2026',
  lastMonth: 'Desember',
  periodsPerYear: '12'
};

export interface StepHint {
  stepNumber: number;
  title: string;
  instruction: string;
  hint1Location: string;
  hint2Concept: string;
  hint3Solution: string;
}

export const GUIDED_STEPS: StepHint[] = [
  {
    stepNumber: 1,
    title: 'Pilih Tindakan Awal MYOB',
    instruction:
      'Pada jendela pembuka simulasi MYOB, pilih menu untuk membuat file data perusahaan baru.',
    hint1Location:
      'Lihat daftar pilihan tindakan pada panel tengah jendela pembuka.',
    hint2Concept:
      'Untuk kasus perusahaan baru yang belum memiliki file .myo, Anda tidak memilih Open atau Explore, melainkan Create.',
    hint3Solution:
      'Klik tombol "Create a new company file" lalu tekan tombol "Periksa & Lanjut".'
  },
  {
    stepNumber: 2,
    title: 'Isi Nama Perusahaan',
    instruction:
      'Masukkan nama resmi perusahaan sesuai kasus praktikum yaitu PT Maju Jaya.',
    hint1Location:
      'Temukan kolom teks berlabel "Nama Perusahaan (Company Name)".',
    hint2Concept:
      'Nama perusahaan harus ditulis tepat sesuai dokumen sumber karena akan dicetak otomatis di setiap header laporan keuangan.',
    hint3Solution: 'Ketik persis: PT Maju Jaya.'
  },
  {
    stepNumber: 3,
    title: 'Tentukan Jenis Usaha',
    instruction:
      'Pilih kategori jenis usaha yang sesuai dengan aktivitas PT Maju Jaya.',
    hint1Location:
      'Periksa pilihan dropdown "Jenis Usaha" di area workspace simulasi.',
    hint2Concept:
      'Perusahaan yang membeli barang jadi untuk dijual kembali tanpa proses produksi termasuk kategori Perusahaan Dagang.',
    hint3Solution: 'Pilih opsi "Perusahaan Dagang" pada daftar pilihan.'
  },
  {
    stepNumber: 4,
    title: 'Masukkan Tahun Buku',
    instruction:
      'Isi Current Financial Year (Tahun Buku berjalan) sesuai data PT Maju Jaya.',
    hint1Location:
      'Lihat kolom input angka berlabel "Tahun Buku (Current Financial Year)".',
    hint2Concept:
      'Tahun Buku adalah tahun periode pelaporan transaksi perusahaan pada soal, bukan selalu tahun kalender komputer saat ini.',
    hint3Solution: 'Ketik angka tahun: 2026.'
  },
  {
    stepNumber: 5,
    title: 'Pilih Bulan Akhir Tahun Buku',
    instruction:
      'Tentukan bulan penutupan tahun buku perusahaan (Last Month of Financial Year).',
    hint1Location:
      'Cari dropdown "Bulan Akhir Tahun Buku" di area workspace simulasi.',
    hint2Concept:
      'Di Indonesia, sebagian besar perusahaan dagang menutup tahun buku pada akhir tahun kalender.',
    hint3Solution: 'Pilih "Desember" dari daftar bulan.'
  },
  {
    stepNumber: 6,
    title: 'Tentukan Jumlah Periode Akuntansi',
    instruction:
      'Pilih jumlah periode akuntansi dalam satu tahun buku (Number of Accounting Periods).',
    hint1Location:
      'Periksa pilihan kartu "12 (Twelve)" dan "13 (Thirteen)".',
    hint2Concept:
      'Satu tahun kalender standar dari Januari sampai Desember memiliki 12 periode bulanan normal.',
    hint3Solution: 'Pilih "12 (Twelve)".'
  },
  {
    stepNumber: 7,
    title: 'Periksa Ringkasan Data',
    instruction:
      'Tinjau seluruh data yang telah Anda masukkan pada panel ringkasan sebelum melakukan konfirmasi akhir.',
    hint1Location:
      'Baca tabel Ringkasan Pengaturan Company File di bagian tengah layar simulasi.',
    hint2Concept:
      'Di MYOB asli, tahun buku dan bulan akhir tahun buku tidak dapat diubah setelah file selesai dibuat, sehingga pengecekan ulang wajib dilakukan.',
    hint3Solution:
      'Pastikan kelima data sesuai kasus PT Maju Jaya (PT Maju Jaya, Perusahaan Dagang, 2026, Desember, 12), lalu klik "Periksa Data".'
  },
  {
    stepNumber: 8,
    title: 'Konfirmasi Hasil & Checkpoint',
    instruction:
      'Selesaikan proses simulasi dan kirim hasil kerja Anda ke pemeriksaan Checkpoint.',
    hint1Location:
      'Klik tombol utama "Konfirmasi & Simpan Checkpoint" di bagian bawah panel ringkasan.',
    hint2Concept:
      'Checkpoint akan menyimpan hasil praktik Anda untuk dinilai secara detail dan otomatis oleh guru di Mode Guru.',
    hint3Solution:
      'Klik "Konfirmasi & Simpan Checkpoint" untuk mengirimkan hasil praktik Anda.'
  }
];

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function validateSimulationValues(
  values: SimulationFormValues
): {
  isAllValid: boolean;
  results: FieldValidationResult[];
  errorCount: number;
} {
  const companyValid =
    normalizeText(values.companyName) ===
    normalizeText(EXPECTED_PT_MAJU_JAYA.companyName);
  const businessValid =
    normalizeText(values.businessType) ===
    normalizeText(EXPECTED_PT_MAJU_JAYA.businessType);
  const yearValid = values.fiscalYear.trim() === EXPECTED_PT_MAJU_JAYA.fiscalYear;
  const monthValid =
    normalizeText(values.lastMonth) ===
    normalizeText(EXPECTED_PT_MAJU_JAYA.lastMonth);
  const periodsValid =
    values.periodsPerYear.trim() === EXPECTED_PT_MAJU_JAYA.periodsPerYear;

  const results: FieldValidationResult[] = [
    {
      field: 'companyName',
      label: 'Nama Perusahaan',
      expected: EXPECTED_PT_MAJU_JAYA.companyName,
      actual: values.companyName.trim() || '(Kosong)',
      isValid: companyValid,
      message: companyValid
        ? 'Nama perusahaan sesuai (PT Maju Jaya).'
        : 'Nama perusahaan tidak sesuai. Seharusnya diisi "PT Maju Jaya".'
    },
    {
      field: 'businessType',
      label: 'Jenis Usaha',
      expected: EXPECTED_PT_MAJU_JAYA.businessType,
      actual: values.businessType.trim() || '(Belum dipilih)',
      isValid: businessValid,
      message: businessValid
        ? 'Jenis usaha sesuai (Perusahaan Dagang).'
        : 'Jenis usaha belum tepat. PT Maju Jaya bergerak di bidang Perusahaan Dagang.'
    },
    {
      field: 'fiscalYear',
      label: 'Tahun Buku',
      expected: EXPECTED_PT_MAJU_JAYA.fiscalYear,
      actual: values.fiscalYear.trim() || '(Kosong)',
      isValid: yearValid,
      message: yearValid
        ? 'Tahun buku sesuai (2026).'
        : 'Tahun buku keliru. Kasus PT Maju Jaya menggunakan Tahun Buku 2026.'
    },
    {
      field: 'lastMonth',
      label: 'Bulan Akhir Tahun Buku',
      expected: EXPECTED_PT_MAJU_JAYA.lastMonth,
      actual: values.lastMonth.trim() || '(Belum dipilih)',
      isValid: monthValid,
      message: monthValid
        ? 'Bulan akhir tahun buku sesuai (Desember).'
        : 'Bulan akhir tahun buku belum sesuai. Pilih Desember sebagai bulan penutupan tahun buku.'
    },
    {
      field: 'periodsPerYear',
      label: 'Jumlah Periode Akuntansi',
      expected: EXPECTED_PT_MAJU_JAYA.periodsPerYear,
      actual: values.periodsPerYear.trim() || '(Belum dipilih)',
      isValid: periodsValid,
      message: periodsValid
        ? 'Jumlah periode akuntansi sesuai (12 periode).'
        : 'Jumlah periode akuntansi tidak tepat. Gunakan 12 periode (Januari–Desember).'
    }
  ];

  const errorCount = results.filter((r) => !r.isValid).length;
  return {
    isAllValid: errorCount === 0 && values.actionSelected === 'create',
    results,
    errorCount
  };
}

export interface DiagnosticItem {
  area: string;
  severity: 'error' | 'ok';
  diagnosis: string;
  recommendation: string;
}

export function runSelfTroubleshooting(
  values: SimulationFormValues
): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];

  if (values.actionSelected !== 'create') {
    items.push({
      area: 'Tindakan Awal Company File',
      severity: 'error',
      diagnosis:
        values.actionSelected === ''
          ? 'Anda belum memilih tindakan pada jendela pembuka MYOB.'
          : 'Tindakan awal yang dipilih bukan pembuatan data baru.',
      recommendation:
        'Arahkan kembali ke Langkah 1 dan pilih "Create a new company file" karena PT Maju Jaya baru pertama kali dibuat.'
    });
  }

  if (
    normalizeText(values.companyName) !==
    normalizeText(EXPECTED_PT_MAJU_JAYA.companyName)
  ) {
    items.push({
      area: 'Identitas Perusahaan (Nama Perusahaan)',
      severity: 'error',
      diagnosis: values.companyName.trim()
        ? `Nama perusahaan saat ini "${values.companyName}" belum sesuai dengan dokumen kasus.`
        : 'Kolom Nama Perusahaan masih kosong.',
      recommendation:
        'Periksa kembali kolom identitas perusahaan dan masukkan nama lengkap resmi: PT Maju Jaya.'
    });
  }

  if (
    normalizeText(values.businessType) !==
    normalizeText(EXPECTED_PT_MAJU_JAYA.businessType)
  ) {
    items.push({
      area: 'Klasifikasi Jenis Usaha',
      severity: 'error',
      diagnosis: values.businessType
        ? `Anda memilih "${values.businessType}".`
        : 'Jenis usaha belum dipilih.',
      recommendation:
        'PT Maju Jaya membeli dan menjual barang dagangan jadi. Ubah jenis usaha menjadi "Perusahaan Dagang".'
    });
  }

  if (values.fiscalYear.trim() !== EXPECTED_PT_MAJU_JAYA.fiscalYear) {
    items.push({
      area: 'Pengaturan Periode — Tahun Buku',
      severity: 'error',
      diagnosis: values.fiscalYear.trim()
        ? `Tahun buku tertulis "${values.fiscalYear}", tidak sesuai dengan kebijakan kasus (2026).`
        : 'Tahun buku belum diisi.',
      recommendation:
        'Periksa pengaturan periode akuntansi pada bagian Current Financial Year dan ubah menjadi 2026.'
    });
  }

  if (
    normalizeText(values.lastMonth) !==
    normalizeText(EXPECTED_PT_MAJU_JAYA.lastMonth)
  ) {
    items.push({
      area: 'Pengaturan Periode — Bulan Akhir Tahun Buku',
      severity: 'error',
      diagnosis: values.lastMonth
        ? `Bulan akhir saat ini "${values.lastMonth}". Jika bukan Desember, awal periode akan bergeser.`
        : 'Bulan akhir tahun buku belum dipilih.',
      recommendation:
        'Buka pengaturan periode dan pilih "Desember" agar periode pembukuan berjalan Januari–Desember.'
    });
  }

  if (values.periodsPerYear.trim() !== EXPECTED_PT_MAJU_JAYA.periodsPerYear) {
    items.push({
      area: 'Konsep Periode Akuntansi (Jumlah Periode)',
      severity: 'error',
      diagnosis: values.periodsPerYear
        ? `Jumlah periode terisi "${values.periodsPerYear}".`
        : 'Jumlah periode akuntansi belum ditentukan.',
      recommendation:
        'Satu tahun buku normal terdiri dari 12 bulan (Januari s.d. Desember). Pilih "12" kecuali soal secara khusus meminta periode ke-13 untuk penyesuaian audit.'
    });
  }

  if (items.length === 0) {
    items.push({
      area: 'Seluruh Pengaturan Awal',
      severity: 'ok',
      diagnosis:
        'Tidak ditemukan ketidaksesuaian pada identitas perusahaan maupun periode akuntansi.',
      recommendation:
        'Data Anda sudah lengkap dan benar untuk kasus PT Maju Jaya. Anda siap melakukan Konfirmasi & Checkpoint.'
    });
  }

  return items;
}

export function validateCustomSimulation(
  config: GuidedSimulationConfig,
  answers: Record<string, string>
): {
  isAllValid: boolean;
  results: FieldValidationResult[];
  errorCount: number;
} {
  const results: FieldValidationResult[] = config.steps.map((step) => {
    const actualRaw = answers[step.id] ?? '';
    const isValid =
      normalizeText(actualRaw) === normalizeText(step.expectedAnswer);

    return {
      field: step.id,
      label: step.fieldLabel || step.title,
      expected: step.expectedAnswer,
      actual: actualRaw.trim() || '(Kosong)',
      isValid,
      message: isValid
        ? `${step.fieldLabel || step.title} sesuai.`
        : `Belum sesuai. ${step.hint2Concept || `Periksa kembali isian ${step.fieldLabel || step.title}.`}`
    };
  });

  const errorCount = results.filter((r) => !r.isValid).length;
  return {
    isAllValid: errorCount === 0 && config.steps.length > 0,
    results,
    errorCount
  };
}

export function runCustomTroubleshooting(
  config: GuidedSimulationConfig,
  answers: Record<string, string>
): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];
  for (const step of config.steps) {
    const actual = answers[step.id] ?? '';
    if (normalizeText(actual) !== normalizeText(step.expectedAnswer)) {
      items.push({
        area: step.title,
        severity: 'error',
        diagnosis: actual.trim()
          ? `Isian saat ini "${actual}" belum sesuai target materi.`
          : `Kolom "${step.fieldLabel}" masih kosong.`,
        recommendation:
          step.hint2Concept ||
          step.hint1Location ||
          `Periksa kembali data kasus untuk langkah "${step.title}".`
      });
    }
  }

  if (items.length === 0) {
    items.push({
      area: 'Seluruh Langkah Simulasi',
      severity: 'ok',
      diagnosis: 'Semua langkah sudah sesuai dengan pengaturan materi guru.',
      recommendation: 'Anda dapat langsung menyimpan hasil ke Checkpoint.'
    });
  }
  return items;
}
