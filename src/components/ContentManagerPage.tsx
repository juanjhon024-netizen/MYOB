import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Film,
  HardDrive,
  Info,
  Lock,
  MonitorCheck,
  Plus,
  Save,
  Trash2,
  Unlock,
  Upload,
  HelpCircle,
  Edit3,
  KeyRound,
  BarChart3
} from 'lucide-react';
import { TeacherGradingPanel } from './TeacherGradingPanel';
import {
  ContentBackupPayload,
  EpisodeContent,
  GuidedSimulationConfig,
  GuidedSimulationStep,
  MaterialSection,
  ModuleData,
  QuizQuestion
} from '../types/lms';
import {
  checkStorageQuota,
  deleteCustomEpisode,
  deleteMediaById,
  exportContentBackup,
  formatBytes,
  importContentBackup,
  resolveMediaSource,
  saveCustomEpisode,
  saveMediaFile
} from '../services/contentDb';
import {
  triggerFileDownload,
  updateTeacherPinRemote,
  verifyTeacherPinRemote
} from '../services/storage';
import {
  getActiveTeacherPinSession,
  setActiveTeacherPinSession
} from '../services/api';

interface ContentManagerPageProps {
  modules: ModuleData[];
  onContentChanged: () => Promise<void>;
}

type ManagerTab =
  | 'info'
  | 'materi'
  | 'simulasi'
  | 'pdf'
  | 'video'
  | 'kuis'
  | 'preview';

function createEmptySimConfig(epTitle: string): GuidedSimulationConfig {
  return {
    enabled: false,
    title: `Simulasi Terpandu — ${epTitle}`,
    caseSummary:
      'Ikuti langkah-langkah berikut sesuai data transaksi atau studi kasus yang diberikan guru.',
    caseFacts: [
      { label: 'Nama Perusahaan', value: 'PT Maju Jaya' }
    ],
    steps: []
  };
}

export function ContentManagerPage({
  modules,
  onContentChanged
}: ContentManagerPageProps) {
  // Teacher Server PIN Gate
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() =>
    Boolean(getActiveTeacherPinSession())
  );
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [showPinEditor, setShowPinEditor] = useState<boolean>(false);
  const [teacherSection, setTeacherSection] = useState<
    'materi_simulasi' | 'penilaian_guru'
  >('materi_simulasi');

  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    modules[0]?.id || 'modul-01'
  );
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('ep-1-1');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ManagerTab>('info');

  // Draft episode state
  const [draft, setDraft] = useState<EpisodeContent | null>(null);
  const [objectivesText, setObjectivesText] = useState<string>('');

  // Pending file staging
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  const [pendingPdfUrl, setPendingPdfUrl] = useState<string | null>(null);
  const [savedPdfUrl, setSavedPdfUrl] = useState<string | null>(null);

  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [pendingVideoUrl, setPendingVideoUrl] = useState<string | null>(null);
  const [savedVideoUrl, setSavedVideoUrl] = useState<string | null>(null);

  // Material editor state
  const [editingMatId, setEditingMatId] = useState<string | null>(null);
  const [matTitle, setMatTitle] = useState('');
  const [matBody, setMatBody] = useState('');
  const [matPoints, setMatPoints] = useState('');
  const [matWarning, setMatWarning] = useState('');

  // Guided Simulation Step editor state
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepTitle, setStepTitle] = useState('');
  const [stepInstruction, setStepInstruction] = useState('');
  const [stepFieldLabel, setStepFieldLabel] = useState('');
  const [stepFieldType, setStepFieldType] = useState<
    GuidedSimulationStep['fieldType']
  >('text');
  const [stepOptionsText, setStepOptionsText] = useState('');
  const [stepExpected, setStepExpected] = useState('');
  const [stepHint1, setStepHint1] = useState('');
  const [stepHint2, setStepHint2] = useState('');
  const [stepHint3, setStepHint3] = useState('');

  // Case fact quick input
  const [factLabel, setFactLabel] = useState('');
  const [factValue, setFactValue] = useState('');

  // Quiz editor state
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [qText, setQText] = useState('');
  const [qOptA, setQOptA] = useState('');
  const [qOptB, setQOptB] = useState('');
  const [qOptC, setQOptC] = useState('');
  const [qOptD, setQOptD] = useState('');
  const [qCorrectIdx, setQCorrectIdx] = useState<number>(0);
  const [qExplanation, setQExplanation] = useState('');

  // Storage quota & feedback state
  const [quotaInfo, setQuotaInfo] = useState<{
    usageBytes: number;
    quotaBytes: number;
    availableBytes: number;
    usagePercent: number;
  } | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const currentModule =
    modules.find((m) => m.id === selectedModuleId) || modules[0];

  const refreshQuota = async () => {
    const q = await checkStorageQuota();
    setQuotaInfo(q);
  };

  useEffect(() => {
    refreshQuota();
  }, []);

  // Load selected episode into draft cleanly (fixing new-episode overwrite bug!)
  useEffect(() => {
    if (isCreatingNew) return;
    const mod = modules.find((m) => m.id === selectedModuleId);
    const ep = mod?.episodes.find((e) => e.id === selectedEpisodeId);
    if (ep) {
      setDraft(JSON.parse(JSON.stringify(ep)));
      setObjectivesText((ep.objectives || []).join('\n'));
      setPendingPdfFile(null);
      setPendingVideoFile(null);
    } else if (mod && mod.episodes.length > 0) {
      setSelectedEpisodeId(mod.episodes[0].id);
    }
  }, [selectedModuleId, selectedEpisodeId, modules, isCreatingNew]);

  // Resolve saved PDF & Video preview URLs
  useEffect(() => {
    let active = true;
    let pdfObj: string | null = null;
    let vidObj: string | null = null;

    async function loadSavedMedia() {
      if (draft?.pdfAttachmentId) {
        const rec = await resolveMediaSource(draft.pdfAttachmentId);
        if (rec && active) {
          if (rec.isObjectUrl) pdfObj = rec.url;
          setSavedPdfUrl(rec.url);
        } else if (active) {
          setSavedPdfUrl(null);
        }
      } else if (active) {
        setSavedPdfUrl(null);
      }

      if (draft?.videoAttachmentId) {
        const rec = await resolveMediaSource(draft.videoAttachmentId);
        if (rec && active) {
          if (rec.isObjectUrl) vidObj = rec.url;
          setSavedVideoUrl(rec.url);
        } else if (active) {
          setSavedVideoUrl(null);
        }
      } else if (active) {
        setSavedVideoUrl(null);
      }
    }

    loadSavedMedia();
    return () => {
      active = false;
      if (pdfObj) URL.revokeObjectURL(pdfObj);
      if (vidObj) URL.revokeObjectURL(vidObj);
    };
  }, [draft?.pdfAttachmentId, draft?.videoAttachmentId]);

  useEffect(() => {
    if (!pendingPdfFile) {
      setPendingPdfUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingPdfFile);
    setPendingPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPdfFile]);

  useEffect(() => {
    if (!pendingVideoFile) {
      setPendingVideoUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingVideoFile);
    setPendingVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingVideoFile]);

  const handleUnlockTeacherMode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setIsVerifyingPin(true);
    setPinError('');
    try {
      const ok = await verifyTeacherPinRemote(pinInput.trim());
      if (ok) {
        setIsUnlocked(true);
        setPinError('');
        setPinInput('');
      } else {
        setPinError('PIN Guru tidak sesuai. Periksa kembali PIN akses Mode Guru.');
      }
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.trim().length < 4) {
      setStatusBanner({
        type: 'error',
        text: 'PIN Guru minimal 4 karakter/angka.'
      });
      return;
    }
    try {
      await updateTeacherPinRemote(newPinInput.trim());
      setNewPinInput('');
      setShowPinEditor(false);
      setStatusBanner({
        type: 'success',
        text: 'PIN akses Mode Guru berhasil diperbarui di server untuk semua perangkat guru.'
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Gagal memperbarui PIN Guru di server.'
      });
    }
  };

  const handleCreateNewEpisode = () => {
    const mod = modules.find((m) => m.id === selectedModuleId);
    const modNum = selectedModuleId.replace('modul-', '').replace(/^0/, '');
    const nextIdx = (mod?.episodes.length ?? 0) + 1;
    const newId = `ep-custom-${Date.now()}`;
    const newEp: EpisodeContent = {
      id: newId,
      moduleId: selectedModuleId,
      code: `${modNum}.${nextIdx}`,
      title: 'Episode Baru',
      subtitle: 'Ringkasan kompetensi episode baru',
      hasContent: true,
      objectives: ['Siswa mampu memahami konsep dan praktik pada episode ini.'],
      materials: [],
      quizQuestions: [],
      guidedSimulation: createEmptySimConfig('Episode Baru'),
      isCustom: true
    };
    setIsCreatingNew(true);
    setDraft(newEp);
    setObjectivesText(newEp.objectives.join('\n'));
    setSelectedEpisodeId(newId);
    setActiveTab('info');
    setPendingPdfFile(null);
    setPendingVideoFile(null);
    setStatusBanner({
      type: 'warning',
      text: 'Draf episode baru dibuat. Lengkapi konten lalu klik "Simpan ke Server".'
    });
  };

  const handleSelectEpisode = (epId: string) => {
    setIsCreatingNew(false);
    setSelectedEpisodeId(epId);
  };

  // Guided Simulation Setup Handlers
  const ensureSimConfig = (): GuidedSimulationConfig => {
    if (!draft) return createEmptySimConfig('Simulasi');
    return draft.guidedSimulation || createEmptySimConfig(draft.title);
  };

  const updateSimConfig = (
    updater: (prev: GuidedSimulationConfig) => GuidedSimulationConfig
  ) => {
    if (!draft) return;
    const current = ensureSimConfig();
    setDraft({
      ...draft,
      hasContent: true,
      guidedSimulation: {
        ...updater(current),
        updatedAt: new Date().toISOString()
      }
    });
  };

  const handleAddCaseFact = () => {
    if (!factLabel.trim() || !factValue.trim()) return;
    updateSimConfig((sim) => ({
      ...sim,
      caseFacts: [
        ...sim.caseFacts,
        { label: factLabel.trim(), value: factValue.trim() }
      ]
    }));
    setFactLabel('');
    setFactValue('');
  };

  const handleRemoveCaseFact = (idx: number) => {
    updateSimConfig((sim) => ({
      ...sim,
      caseFacts: sim.caseFacts.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveSimStep = () => {
    if (!stepTitle.trim() || !stepFieldLabel.trim() || !stepExpected.trim()) {
      setStatusBanner({
        type: 'error',
        text: 'Judul langkah, label kolom input, dan jawaban benar wajib diisi.'
      });
      return;
    }

    const parsedOptions =
      stepFieldType === 'select' || stepFieldType === 'choice'
        ? stepOptionsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    if (
      (stepFieldType === 'select' || stepFieldType === 'choice') &&
      (!parsedOptions || parsedOptions.length < 2)
    ) {
      setStatusBanner({
        type: 'error',
        text: 'Untuk tipe Dropdown atau Kartu Pilihan, isi minimal 2 opsi (1 baris = 1 opsi).'
      });
      return;
    }

    const newStep: GuidedSimulationStep = {
      id: editingStepId || `step-${Date.now()}`,
      title: stepTitle.trim(),
      instruction: stepInstruction.trim() || `Lengkapi ${stepFieldLabel.trim()}.`,
      fieldLabel: stepFieldLabel.trim(),
      fieldType: stepFieldType,
      options: parsedOptions,
      expectedAnswer: stepExpected.trim(),
      hint1Location:
        stepHint1.trim() || `Periksa kolom "${stepFieldLabel.trim()}" di workspace simulasi.`,
      hint2Concept:
        stepHint2.trim() || 'Sesuaikan jawaban dengan data kasus yang diberikan guru.',
      hint3Solution:
        stepHint3.trim() || `Isi atau pilih: ${stepExpected.trim()}`
    };

    updateSimConfig((sim) => ({
      ...sim,
      enabled: true,
      steps: editingStepId
        ? sim.steps.map((s) => (s.id === editingStepId ? newStep : s))
        : [...sim.steps, newStep]
    }));

    setEditingStepId(null);
    setStepTitle('');
    setStepInstruction('');
    setStepFieldLabel('');
    setStepFieldType('text');
    setStepOptionsText('');
    setStepExpected('');
    setStepHint1('');
    setStepHint2('');
    setStepHint3('');
    setStatusBanner({
      type: 'warning',
      text: 'Tahap Simulasi Terpandu ditambahkan ke draf. Klik "Simpan ke Server" untuk menerapkannya ke seluruh siswa.'
    });
  };

  const handleEditSimStep = (s: GuidedSimulationStep) => {
    setEditingStepId(s.id);
    setStepTitle(s.title);
    setStepInstruction(s.instruction);
    setStepFieldLabel(s.fieldLabel);
    setStepFieldType(s.fieldType);
    setStepOptionsText((s.options || []).join('\n'));
    setStepExpected(s.expectedAnswer);
    setStepHint1(s.hint1Location);
    setStepHint2(s.hint2Concept);
    setStepHint3(s.hint3Solution);
  };

  const requestDeleteSimStep = (stepId: string, title: string) => {
    setConfirmAction({
      title: 'Hapus Tahap Simulasi?',
      message: `Tahap "${title}" akan dihapus dari Simulasi Terpandu episode ini.`,
      onConfirm: () => {
        updateSimConfig((sim) => ({
          ...sim,
          steps: sim.steps.filter((s) => s.id !== stepId)
        }));
        setConfirmAction(null);
      }
    });
  };

  const handleLoadModuleTemplate = () => {
    if (!draft) return;
    const modCode = currentModule?.code || 'MODUL';
    updateSimConfig(() => ({
      enabled: true,
      title: `Simulasi Terpandu ${modCode} — ${draft.title}`,
      caseSummary: `Praktik terpandu untuk materi ${draft.title}. Gunakan data kasus di panel kiri untuk mengisi setiap langkah dengan tepat.`,
      caseFacts: [
        { label: 'Perusahaan', value: 'PT Maju Jaya' },
        { label: 'Jenis Transaksi', value: draft.title },
        { label: 'Tanggal Bukti', value: '05 Januari 2026' },
        { label: 'Nominal Transaksi', value: 'Rp 5.000.000' }
      ],
      steps: [
        {
          id: `tpl-1-${Date.now()}`,
          title: 'Pilih Modul Command Centre',
          instruction: 'Tentukan menu utama MYOB yang digunakan untuk transaksi ini.',
          fieldLabel: 'Menu Command Centre',
          fieldType: 'choice',
          options: ['Accounts', 'Banking', 'Sales', 'Purchases'],
          expectedAnswer:
            draft.moduleId === 'modul-02'
              ? 'Purchases'
              : draft.moduleId === 'modul-03'
                ? 'Sales'
                : draft.moduleId === 'modul-04'
                  ? 'Banking'
                  : 'Accounts',
          hint1Location: 'Perhatikan 4 pilihan menu Command Centre di workspace.',
          hint2Concept:
            'Pembelian menggunakan Purchases, Penjualan menggunakan Sales, Kas/Bank non-dagang menggunakan Banking, dan Jurnal Umum menggunakan Accounts.',
          hint3Solution:
            draft.moduleId === 'modul-02'
              ? 'Pilih Purchases.'
              : draft.moduleId === 'modul-03'
                ? 'Pilih Sales.'
                : draft.moduleId === 'modul-04'
                  ? 'Pilih Banking.'
                  : 'Pilih Accounts.'
        },
        {
          id: `tpl-2-${Date.now()}`,
          title: 'Masukkan Nominal Transaksi',
          instruction: 'Ketik angka nominal transaksi sesuai bukti transaksi (angka saja).',
          fieldLabel: 'Nominal (Rp)',
          fieldType: 'number',
          expectedAnswer: '5000000',
          hint1Location: 'Isi kolom Nominal (Rp) pada formulir transaksi.',
          hint2Concept: 'Masukkan angka tanpa titik atau huruf Rp agar validasi seragam.',
          hint3Solution: 'Ketik: 5000000'
        }
      ]
    }));
    setStatusBanner({
      type: 'warning',
      text: 'Template contoh Simulasi Terpandu berhasil dimuat. Sesuaikan langkah dan kunci jawaban lalu klik "Simpan ke Server".'
    });
  };

  // PDF & Video handlers
  const handleStagePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      setStatusBanner({ type: 'error', text: 'File harus berformat PDF (.pdf).' });
      return;
    }

    if (file.size > 250 * 1024 * 1024) {
      setStatusBanner({
        type: 'error',
        text: `Ukuran file PDF (${formatBytes(file.size)}) melebihi batas unggahan server 250 MB.`
      });
      return;
    }

    setPendingPdfFile(file);
    setStatusBanner({
      type: 'warning',
      text: `PDF "${file.name}" siap dipratinjau. Klik "Simpan ke Server" untuk mengunggah.`
    });
  };

  const handleStageVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes('mp4') && !file.name.toLowerCase().endsWith('.mp4')) {
      setStatusBanner({ type: 'error', text: 'Video harus berformat MP4 (.mp4).' });
      return;
    }

    if (file.size > 250 * 1024 * 1024) {
      setStatusBanner({
        type: 'error',
        text: `Ukuran video MP4 (${formatBytes(file.size)}) melebihi batas unggahan server 250 MB.`
      });
      return;
    }

    setPendingVideoFile(file);
    setStatusBanner({
      type: 'warning',
      text: `Video "${file.name}" (${formatBytes(
        file.size
      )}) dimuat untuk preview. Klik "Simpan ke Server" untuk mengunggah.`
    });
  };

  // Material CRUD
  const handleSaveMaterialItem = () => {
    if (!draft || !matTitle.trim() || !matBody.trim()) {
      setStatusBanner({
        type: 'error',
        text: 'Judul dan isi materi wajib diisi.'
      });
      return;
    }

    const points = matPoints
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const newItem: MaterialSection = {
      id: editingMatId || `mat-${Date.now()}`,
      title: matTitle.trim(),
      body: matBody.trim(),
      keyPoints: points.length > 0 ? points : undefined,
      warningNote: matWarning.trim() || undefined
    };

    const nextMaterials = editingMatId
      ? draft.materials.map((m) => (m.id === editingMatId ? newItem : m))
      : [...draft.materials, newItem];

    setDraft({ ...draft, materials: nextMaterials, hasContent: true });
    setEditingMatId(null);
    setMatTitle('');
    setMatBody('');
    setMatPoints('');
    setMatWarning('');
    setStatusBanner({
      type: 'warning',
      text: 'Bagian materi diperbarui di draf. Klik "Simpan ke Server" untuk menerbitkan ke siswa.'
    });
  };

  const handleEditMaterialItem = (item: MaterialSection) => {
    setEditingMatId(item.id);
    setMatTitle(item.title);
    setMatBody(item.body);
    setMatPoints((item.keyPoints || []).join('\n'));
    setMatWarning(item.warningNote || '');
  };

  const requestDeleteMaterial = (matId: string, title: string) => {
    setConfirmAction({
      title: 'Hapus Bagian Materi?',
      message: `Bagian materi "${title}" akan dihapus dari draf episode ini.`,
      onConfirm: () => {
        if (!draft) return;
        setDraft({
          ...draft,
          materials: draft.materials.filter((m) => m.id !== matId)
        });
        setConfirmAction(null);
      }
    });
  };

  // Quiz CRUD
  const handleSaveQuizItem = () => {
    if (
      !draft ||
      !qText.trim() ||
      !qOptA.trim() ||
      !qOptB.trim() ||
      !qOptC.trim() ||
      !qOptD.trim()
    ) {
      setStatusBanner({
        type: 'error',
        text: 'Pertanyaan dan keempat opsi jawaban (A, B, C, D) wajib diisi.'
      });
      return;
    }

    const newQ: QuizQuestion = {
      id: editingQuizId || `q-${Date.now()}`,
      question: qText.trim(),
      options: [qOptA.trim(), qOptB.trim(), qOptC.trim(), qOptD.trim()],
      correctIndex: qCorrectIdx,
      explanation: qExplanation.trim() || 'Pembahasan belum ditambahkan.'
    };

    const nextQuestions = editingQuizId
      ? draft.quizQuestions.map((q) => (q.id === editingQuizId ? newQ : q))
      : [...draft.quizQuestions, newQ];

    setDraft({ ...draft, quizQuestions: nextQuestions, hasContent: true });
    setEditingQuizId(null);
    setQText('');
    setQOptA('');
    setQOptB('');
    setQOptC('');
    setQOptD('');
    setQCorrectIdx(0);
    setQExplanation('');
    setStatusBanner({
      type: 'warning',
      text: 'Soal pilihan ganda diperbarui di draf. Klik "Simpan ke Server" untuk menyimpan.'
    });
  };

  const handleEditQuizItem = (q: QuizQuestion) => {
    setEditingQuizId(q.id);
    setQText(q.question);
    setQOptA(q.options[0] || '');
    setQOptB(q.options[1] || '');
    setQOptC(q.options[2] || '');
    setQOptD(q.options[3] || '');
    setQCorrectIdx(q.correctIndex);
    setQExplanation(q.explanation);
  };

  const requestDeleteQuiz = (qId: string) => {
    setConfirmAction({
      title: 'Hapus Soal Pilihan Ganda?',
      message: 'Soal yang dihapus tidak akan muncul lagi pada kuis episode ini.',
      onConfirm: () => {
        if (!draft) return;
        setDraft({
          ...draft,
          quizQuestions: draft.quizQuestions.filter((q) => q.id !== qId)
        });
        setConfirmAction(null);
      }
    });
  };

  const handlePersistEpisode = async () => {
    if (!draft) return;
    if (!draft.title.trim() || !draft.code.trim()) {
      setStatusBanner({
        type: 'error',
        text: 'Kode dan Judul Episode wajib diisi sebelum menyimpan.'
      });
      return;
    }

    setIsSaving(true);
    try {
      let pdfId = draft.pdfAttachmentId;
      let pdfName = draft.pdfAttachmentName;
      let videoId = draft.videoAttachmentId;
      let videoName = draft.videoAttachmentName;

      if (pendingPdfFile) {
        const nextPdfId = `pdf-${draft.id}-${Date.now()}`;
        await saveMediaFile(
          nextPdfId,
          pendingPdfFile,
          pendingPdfFile.name,
          pendingPdfFile.type || 'application/pdf'
        );
        if (pdfId) await deleteMediaById(pdfId).catch(() => undefined);
        pdfId = nextPdfId;
        pdfName = pendingPdfFile.name;
      }

      if (pendingVideoFile) {
        const nextVidId = `vid-${draft.id}-${Date.now()}`;
        await saveMediaFile(
          nextVidId,
          pendingVideoFile,
          pendingVideoFile.name,
          pendingVideoFile.type || 'video/mp4'
        );
        if (videoId) await deleteMediaById(videoId).catch(() => undefined);
        videoId = nextVidId;
        videoName = pendingVideoFile.name;
      }

      const objectives = objectivesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const simActive = Boolean(
        draft.guidedSimulation?.enabled &&
          draft.guidedSimulation.steps.length > 0
      );

      const hasAnyContent =
        draft.materials.length > 0 ||
        draft.quizQuestions.length > 0 ||
        Boolean(pdfId) ||
        Boolean(videoId) ||
        objectives.length > 0 ||
        simActive ||
        Boolean(draft.hasVirtualLab);

      const updatedEp: EpisodeContent = {
        ...draft,
        objectives,
        hasContent: hasAnyContent,
        hasVirtualLab: draft.hasVirtualLab || simActive,
        pdfAttachmentId: pdfId,
        pdfAttachmentName: pdfName,
        videoAttachmentId: videoId,
        videoAttachmentName: videoName,
        videoInfo: videoId
          ? {
              title: draft.videoInfo?.title || `Video Tutorial — ${draft.title}`,
              duration: draft.videoInfo?.duration || 'Lokal MP4',
              description:
                draft.videoInfo?.description ||
                'Video tutorial yang diunggah melalui Mode Guru.',
              stepsSummary: draft.videoInfo?.stepsSummary || []
            }
          : draft.videoInfo
      };

      await saveCustomEpisode(updatedEp);
      setIsCreatingNew(false);
      setSelectedModuleId(updatedEp.moduleId);
      setSelectedEpisodeId(updatedEp.id);
      setPendingPdfFile(null);
      setPendingVideoFile(null);
      await onContentChanged();
      await refreshQuota();

      setStatusBanner({
        type: 'success',
        text: `Episode ${updatedEp.code} — "${updatedEp.title}" beserta materi & Simulasi Terpandu berhasil disimpan ke Server Online.`
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan saat menyimpan ke server.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const requestRemovePdf = () => {
    setConfirmAction({
      title: 'Hapus Lampiran PDF?',
      message: 'Dokumen PDF pada episode ini akan dihapus dari server.',
      onConfirm: async () => {
        if (!draft) return;
        if (draft.pdfAttachmentId) {
          await deleteMediaById(draft.pdfAttachmentId).catch(() => undefined);
        }
        const nextDraft = {
          ...draft,
          pdfAttachmentId: undefined,
          pdfAttachmentName: undefined
        };
        setDraft(nextDraft);
        setPendingPdfFile(null);
        await saveCustomEpisode(nextDraft);
        await onContentChanged();
        await refreshQuota();
        setConfirmAction(null);
      }
    });
  };

  const requestRemoveVideo = () => {
    setConfirmAction({
      title: 'Hapus Video MP4 Unggahan?',
      message: 'File video MP4 pada episode ini akan dihapus dari server.',
      onConfirm: async () => {
        if (!draft) return;
        if (draft.videoAttachmentId) {
          await deleteMediaById(draft.videoAttachmentId).catch(() => undefined);
        }
        const nextDraft = {
          ...draft,
          videoAttachmentId: undefined,
          videoAttachmentName: undefined
        };
        setDraft(nextDraft);
        setPendingVideoFile(null);
        await saveCustomEpisode(nextDraft);
        await onContentChanged();
        await refreshQuota();
        setConfirmAction(null);
      }
    });
  };

  const requestDeleteEpisode = () => {
    if (!draft) return;
    setConfirmAction({
      title: `Hapus Konten Episode ${draft.code}?`,
      message: draft.isCustom
        ? 'Episode tambahan ini beserta lampiran medianya akan dihapus permanen dari server.'
        : 'Perubahan khusus guru pada episode bawaan ini akan dihapus dan dikembalikan ke konten bawaan awal.',
      onConfirm: async () => {
        if (draft.pdfAttachmentId) {
          await deleteMediaById(draft.pdfAttachmentId).catch(() => undefined);
        }
        if (draft.videoAttachmentId) {
          await deleteMediaById(draft.videoAttachmentId).catch(() => undefined);
        }
        await deleteCustomEpisode(draft.id);
        setIsCreatingNew(false);
        await onContentChanged();
        await refreshQuota();
        setConfirmAction(null);
        setSelectedEpisodeId('ep-1-1');
        setStatusBanner({
          type: 'success',
          text: 'Konten episode di server berhasil dihapus/direset.'
        });
      }
    });
  };

  const handleExportBackup = async () => {
    try {
      const payload = await exportContentBackup();
      triggerFileDownload(
        `smart-guide-cadangan-materi-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(payload),
        'application/json;charset=utf-8'
      );
      setStatusBanner({
        type: 'success',
        text: `Cadangan server berhasil diekspor (${payload.episodes.length} episode dan ${payload.media.length} file media).`
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Gagal mengekspor cadangan materi.'
      });
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ContentBackupPayload;
      const res = await importContentBackup(parsed);
      await onContentChanged();
      await refreshQuota();
      setStatusBanner({
        type: 'success',
        text: `Impor berhasil: ${res.episodesImported} episode dan ${res.mediaImported} file pendukung dipulihkan ke Server Online.`
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'File cadangan tidak valid atau gagal diunggah ke server.'
      });
    } finally {
      e.target.value = '';
    }
  };

  const activePdfPreviewUrl = pendingPdfUrl || savedPdfUrl;
  const activeVideoPreviewUrl = pendingVideoUrl || savedVideoUrl;
  const simConfig = draft?.guidedSimulation || createEmptySimConfig(draft?.title || '');

  // PIN LOCK SCREEN (Only Guru accesses Content Manager & Simulasi Terpandu Setup)
  if (!isUnlocked) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#3569B0]">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-[#14263D]">
            Akses Khusus Guru
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Halaman pengelolaan materi, pengaturan{' '}
            <strong className="text-[#14263D]">Simulasi Terpandu</strong>, serta akses{' '}
            <strong className="text-[#14263D]">Penilaian Detail &amp; Otomatis</strong> siswa
            hanya dapat dibuka oleh guru pengampu.
          </p>

          <form onSubmit={handleUnlockTeacherMode} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="teacher-pin-input"
                className="block text-sm font-semibold text-[#14263D]"
              >
                Masukkan PIN Guru
              </label>
              <input
                id="teacher-pin-input"
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                placeholder="Masukkan PIN..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-2.5 font-mono text-sm text-[#14263D] focus:border-[#3569B0] focus:outline-none"
              />
            </div>

            {pinError && (
              <p className="text-xs font-semibold text-red-600" role="alert">
                {pinError}
              </p>
            )}

            <button
              type="submit"
              disabled={isVerifyingPin}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#14263D] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1e3859] disabled:opacity-60"
            >
              <Unlock className="h-4 w-4" />
              <span>{isVerifyingPin ? 'Memverifikasi...' : 'Buka Mode Guru'}</span>
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-slate-200 bg-[#F4F7FB] p-3.5 text-xs text-slate-600 space-y-1">
            <p>
              <strong>PIN Bawaan Awal:</strong>{' '}
              <span className="font-mono font-bold text-[#14263D]">1818</span> (dapat diubah
              setelah masuk ke Mode Guru).
            </p>
            <p>
              Verifikasi PIN dilakukan pada server Smart-Guide sehingga guru dapat mengakses panel
              ini dari perangkat mana saja.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Honest Local-Only Notice */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#19A89B]">
              Mode Guru · Materi, Simulasi Terpandu &amp; Penilaian Otomatis
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#14263D]">
              Panel Khusus Guru Smart-Guide
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Atur materi, Simulasi Terpandu, serta pantau{' '}
              <strong className="text-[#14263D]">penilaian detail dan otomatis</strong> seluruh
              siswa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPinEditor((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#14263D] hover:bg-slate-50"
            >
              <KeyRound className="h-3.5 w-3.5 text-slate-500" />
              <span>Ubah PIN</span>
            </button>

            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#14263D] hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5 text-[#3569B0]" />
              <span>Ekspor Cadangan</span>
            </button>

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#14263D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1e3859]">
              <Upload className="h-3.5 w-3.5" />
              <span>Impor Cadangan</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportBackup}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                setActiveTeacherPinSession('');
                setIsUnlocked(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Kunci Mode Guru</span>
            </button>
          </div>
        </div>

        {showPinEditor && (
          <form
            onSubmit={handleChangePin}
            className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-[#F4F7FB] p-4"
          >
            <div>
              <label className="block text-xs font-semibold text-[#14263D]">
                PIN Guru Baru (min. 4 digit/karakter)
              </label>
              <input
                type="password"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                placeholder="PIN baru..."
                className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#3569B0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2a548e]"
            >
              Simpan PIN
            </button>
          </form>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 lg:grid-cols-12">
          <div className="flex items-start gap-2.5 rounded-lg border border-[#3569B0]/30 bg-[#EAF3FF] p-3.5 text-xs text-[#14263D] lg:col-span-8">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#3569B0]" />
            <p>
              <strong>Server Online Terpusat:</strong> Materi, Simulasi Terpandu, PDF, dan video
              yang disimpan di sini langsung tersedia bagi seluruh siswa di perangkatnya
              masing-masing. Fitur <strong>Ekspor Cadangan (.json)</strong> tetap tersedia untuk
              arsip materi guru.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-3.5 text-xs lg:col-span-4">
            <div className="flex items-center justify-between font-semibold text-[#14263D]">
              <span className="inline-flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-[#3569B0]" />
                <span>Kapasitas Browser</span>
              </span>
              <span className="font-mono tabular-nums">
                {quotaInfo ? `${quotaInfo.usagePercent}%` : 'Tersedia'}
              </span>
            </div>
            {quotaInfo && (
              <>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      quotaInfo.usagePercent >= 80 ? 'bg-red-600' : 'bg-[#19A89B]'
                    }`}
                    style={{ width: `${Math.min(100, quotaInfo.usagePercent)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-600 tabular-nums">
                  Terpakai {formatBytes(quotaInfo.usageBytes)} · Sisa{' '}
                  {formatBytes(quotaInfo.availableBytes)}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {statusBanner && (
        <div
          role="status"
          className={`flex items-start justify-between gap-4 rounded-xl border p-4 text-sm ${
            statusBanner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : statusBanner.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-amber-200 bg-amber-50 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{statusBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs font-semibold underline shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14263D]/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <h3 className="font-display text-lg font-bold text-[#14263D]">
                  {confirmAction.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{confirmAction.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => confirmAction.onConfirm()}
                className="rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode Guru Section Switcher */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
        <button
          type="button"
          onClick={() => setTeacherSection('materi_simulasi')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap ${
            teacherSection === 'materi_simulasi'
              ? 'bg-[#14263D] text-white'
              : 'text-slate-600 hover:bg-[#F4F7FB] hover:text-[#14263D]'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Kelola Materi &amp; Simulasi Terpandu</span>
        </button>
        <button
          type="button"
          onClick={() => setTeacherSection('penilaian_guru')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap ${
            teacherSection === 'penilaian_guru'
              ? 'bg-[#3569B0] text-white'
              : 'text-slate-600 hover:bg-[#F4F7FB] hover:text-[#14263D]'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Penilaian Detail &amp; Otomatis (Guru)</span>
        </button>
      </div>

      {teacherSection === 'penilaian_guru' ? (
        <TeacherGradingPanel modules={modules} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <label
                htmlFor="cm-module-select"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                1. Pilih Modul Tujuan
              </label>
              <select
                id="cm-module-select"
                value={selectedModuleId}
                onChange={(e) => {
                  const nextModId = e.target.value;
                  setIsCreatingNew(false);
                  setSelectedModuleId(nextModId);
                  const mod = modules.find((m) => m.id === nextModId);
                  if (mod && mod.episodes.length > 0) {
                    setSelectedEpisodeId(mod.episodes[0].id);
                  }
                }}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#14263D]"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  2. Daftar Episode
                </p>
                <button
                  type="button"
                  onClick={handleCreateNewEpisode}
                  className="inline-flex items-center gap-1 rounded-md bg-[#19A89B] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#148f84]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Episode Baru</span>
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {currentModule?.episodes.map((ep) => {
                  const selected = !isCreatingNew && draft?.id === ep.id;
                  const hasSim = Boolean(
                    ep.guidedSimulation?.enabled || ep.hasVirtualLab
                  );
                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => handleSelectEpisode(ep.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? 'border-[#3569B0] bg-[#EAF3FF]'
                          : 'border-slate-200 bg-[#F4F7FB] hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-[#3569B0]">
                          Episode {ep.code}
                        </span>
                        <span
                          className={
                            ep.hasContent
                              ? 'font-semibold text-emerald-700'
                              : 'text-slate-500'
                          }
                        >
                          {ep.hasContent ? 'Aktif' : 'no content'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-bold text-[#14263D]">
                        {ep.title}
                      </p>
                      {hasSim && (
                        <p className="mt-1 text-[11px] font-semibold text-[#19A89B]">
                          Simulasi Terpandu Aktif
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {draft && (
          <section className="space-y-5 lg:col-span-8">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#14263D] px-6 py-4 text-white">
                <div>
                  <p className="text-xs text-[#19A89B] font-semibold">
                    Menyunting: {currentModule?.code} · Episode {draft.code}
                  </p>
                  <h2 className="font-display text-lg font-bold">{draft.title}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={requestDeleteEpisode}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/50 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-900/60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handlePersistEpisode}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#19A89B] px-4 py-2 text-xs font-bold text-white hover:bg-[#148f84] disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>
                      {isSaving ? 'Menyimpan...' : 'Simpan ke Server'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex overflow-x-auto border-b border-slate-200 px-4">
                {(
                  [
                    { id: 'info', label: 'Info Episode', icon: Edit3 },
                    { id: 'materi', label: 'Materi Teks', icon: BookOpen },
                    {
                      id: 'simulasi',
                      label: 'Setup Simulasi Terpandu',
                      icon: MonitorCheck
                    },
                    { id: 'pdf', label: 'Dokumen PDF', icon: FileText },
                    { id: 'video', label: 'Video MP4', icon: Film },
                    { id: 'kuis', label: 'Soal Kuis', icon: HelpCircle },
                    { id: 'preview', label: 'Preview', icon: Eye }
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-1.5 border-b-2 px-3.5 py-3 text-xs font-semibold whitespace-nowrap shrink-0 ${
                        active
                          ? 'border-[#3569B0] text-[#3569B0]'
                          : 'border-transparent text-slate-600 hover:text-[#14263D]'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-6">
                {/* 1. Info Episode */}
                {activeTab === 'info' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#14263D]">
                          Kode Episode
                        </label>
                        <input
                          type="text"
                          value={draft.code}
                          onChange={(e) =>
                            setDraft({ ...draft, code: e.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-[#14263D]">
                          Judul Episode
                        </label>
                        <input
                          type="text"
                          value={draft.title}
                          onChange={(e) =>
                            setDraft({ ...draft, title: e.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#14263D]">
                        Modul Tujuan
                      </label>
                      <select
                        value={draft.moduleId}
                        onChange={(e) =>
                          setDraft({ ...draft, moduleId: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        {modules.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.code} — {m.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#14263D]">
                        Subjudul / Ringkasan Singkat
                      </label>
                      <input
                        type="text"
                        value={draft.subtitle}
                        onChange={(e) =>
                          setDraft({ ...draft, subtitle: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#14263D]">
                        Tujuan Pembelajaran (1 baris = 1 tujuan)
                      </label>
                      <textarea
                        rows={4}
                        value={objectivesText}
                        onChange={(e) => setObjectivesText(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Materi Teks */}
                {activeTab === 'materi' && (
                  <div className="space-y-6">
                    <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4 space-y-3">
                      <h3 className="font-display text-sm font-bold text-[#14263D]">
                        {editingMatId
                          ? 'Edit Bagian Materi'
                          : 'Tambah Bagian Materi Baru'}
                      </h3>
                      <input
                        type="text"
                        placeholder="Judul bagian materi..."
                        value={matTitle}
                        onChange={(e) => setMatTitle(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                      <textarea
                        rows={4}
                        placeholder="Isi penjelasan materi untuk siswa SMK..."
                        value={matBody}
                        onChange={(e) => setMatBody(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                      <textarea
                        rows={3}
                        placeholder="Poin penting (opsional, 1 baris per poin)"
                        value={matPoints}
                        onChange={(e) => setMatPoints(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Catatan peringatan (opsional)"
                        value={matWarning}
                        onChange={(e) => setMatWarning(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSaveMaterialItem}
                          className="rounded-lg bg-[#3569B0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2a548e]"
                        >
                          {editingMatId ? 'Perbarui Bagian' : 'Tambah Bagian Materi'}
                        </button>
                        {editingMatId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMatId(null);
                              setMatTitle('');
                              setMatBody('');
                              setMatPoints('');
                              setMatWarning('');
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
                          >
                            Batal Edit
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-display text-sm font-bold text-[#14263D]">
                        Daftar Bagian Materi ({draft.materials.length})
                      </h3>
                      {draft.materials.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-[#14263D]">
                              {m.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                              {m.body}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditMaterialItem(m)}
                              className="rounded border border-slate-300 px-2.5 py-1 text-xs font-semibold text-[#3569B0]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDeleteMaterial(m.id, m.title)}
                              className="rounded border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. SETUP SIMULASI TERPANDU (Guru-Only Setup per Modul/Episode) */}
                {activeTab === 'simulasi' && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#3569B0]/30 bg-[#EAF3FF] p-4">
                      <div>
                        <p className="text-sm font-bold text-[#14263D]">
                          Pengaturan Simulasi Terpandu — {currentModule?.code} · Ep.{' '}
                          {draft.code}
                        </p>
                        <p className="text-xs text-slate-700">
                          Aktifkan dan susun langkah simulasi sesuai materi modul ini. Siswa akan
                          mengerjakannya di Laboratorium Virtual &amp; tab Simulasi Terpandu.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleLoadModuleTemplate}
                        className="rounded-lg border border-[#3569B0] bg-white px-3.5 py-2 text-xs font-semibold text-[#3569B0] hover:bg-slate-50 shrink-0"
                      >
                        Muat Contoh Template Modul Ini
                      </button>
                    </div>

                    {/* Enable Toggle & Basic Config */}
                    <div className="rounded-lg border border-slate-200 p-4 space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simConfig.enabled}
                          onChange={(e) =>
                            updateSimConfig((sim) => ({
                              ...sim,
                              enabled: e.target.checked
                            }))
                          }
                          className="h-4 w-4 rounded border-slate-300 text-[#3569B0]"
                        />
                        <span className="text-sm font-bold text-[#14263D]">
                          Aktifkan Simulasi Terpandu Kustom untuk Episode Ini
                        </span>
                      </label>

                      {draft.id === 'ep-1-1' && !simConfig.enabled && (
                        <p className="text-xs text-slate-600">
                          Catatan: Episode 1.1 menggunakan simulasi bawaan 8 langkah{' '}
                          <strong>PT Maju Jaya</strong> secara default. Centang opsi di atas jika
                          guru ingin menggantinya dengan langkah simulasi kustom.
                        </p>
                      )}

                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#14263D]">
                            Judul Simulasi
                          </label>
                          <input
                            type="text"
                            value={simConfig.title}
                            onChange={(e) =>
                              updateSimConfig((sim) => ({
                                ...sim,
                                title: e.target.value
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#14263D]">
                            Ringkasan Tugas Kasus untuk Siswa
                          </label>
                          <textarea
                            rows={2}
                            value={simConfig.caseSummary}
                            onChange={(e) =>
                              updateSimConfig((sim) => ({
                                ...sim,
                                caseSummary: e.target.value
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      {/* Case Facts Builder */}
                      <div className="border-t border-slate-200 pt-4 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Data Kasus Praktikum (Ditampilkan di Panel Kiri Siswa)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="text"
                            placeholder="Label (mis. Pemasok)"
                            value={factLabel}
                            onChange={(e) => setFactLabel(e.target.value)}
                            className="flex-1 min-w-[140px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Nilai (mis. PT Sumber Makmur)"
                            value={factValue}
                            onChange={(e) => setFactValue(e.target.value)}
                            className="flex-1 min-w-[140px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            onClick={handleAddCaseFact}
                            className="rounded-lg bg-[#14263D] px-3.5 py-1.5 text-xs font-semibold text-white"
                          >
                            Tambah Data
                          </button>
                        </div>

                        {simConfig.caseFacts.length > 0 && (
                          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                            {simConfig.caseFacts.map((f, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between px-3 py-2 text-xs"
                              >
                                <span>
                                  <strong className="text-[#14263D]">{f.label}:</strong>{' '}
                                  {f.value}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCaseFact(idx)}
                                  className="text-red-600 font-semibold hover:underline"
                                >
                                  Hapus
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Step Builder Form */}
                    <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4 space-y-3">
                      <h3 className="font-display text-sm font-bold text-[#14263D]">
                        {editingStepId
                          ? 'Edit Tahap Simulasi Terpandu'
                          : 'Tambah Tahap Simulasi Terpandu'}
                      </h3>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input
                          type="text"
                          placeholder="Judul Tahap (mis. Pilih Akun Kas)"
                          value={stepTitle}
                          onChange={(e) => setStepTitle(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Label Kolom Input (mis. Akun Pembayaran)"
                          value={stepFieldLabel}
                          onChange={(e) => setStepFieldLabel(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        />
                      </div>

                      <textarea
                        rows={2}
                        placeholder="Instruksi langkah untuk siswa..."
                        value={stepInstruction}
                        onChange={(e) => setStepInstruction(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-[#14263D]">
                            Tipe Input
                          </label>
                          <select
                            value={stepFieldType}
                            onChange={(e) =>
                              setStepFieldType(
                                e.target.value as GuidedSimulationStep['fieldType']
                              )
                            }
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="text">Teks Singkat</option>
                            <option value="number">Angka / Nominal</option>
                            <option value="select">Dropdown Pilihan</option>
                            <option value="choice">Kartu Pilihan</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#14263D]">
                            Kunci Jawaban Benar (Untuk Validasi Checkpoint)
                          </label>
                          <input
                            type="text"
                            placeholder="Jawaban persis yang diharapkan..."
                            value={stepExpected}
                            onChange={(e) => setStepExpected(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      {(stepFieldType === 'select' || stepFieldType === 'choice') && (
                        <div>
                          <label className="block text-xs font-semibold text-[#14263D]">
                            Daftar Opsi Pilihan (1 baris = 1 opsi)
                          </label>
                          <textarea
                            rows={3}
                            placeholder={'Purchases\nSales\nBanking\nAccounts'}
                            value={stepOptionsText}
                            onChange={(e) => setStepOptionsText(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <input
                          type="text"
                          placeholder="Hint 1: Petunjuk Lokasi"
                          value={stepHint1}
                          onChange={(e) => setStepHint1(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Hint 2: Penjelasan Konsep"
                          value={stepHint2}
                          onChange={(e) => setStepHint2(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Hint 3: Solusi Bertahap"
                          value={stepHint3}
                          onChange={(e) => setStepHint3(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSaveSimStep}
                          className="rounded-lg bg-[#3569B0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2a548e]"
                        >
                          {editingStepId ? 'Perbarui Tahap' : 'Tambah Tahap Simulasi'}
                        </button>
                        {editingStepId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStepId(null);
                              setStepTitle('');
                              setStepInstruction('');
                              setStepFieldLabel('');
                              setStepExpected('');
                              setStepOptionsText('');
                              setStepHint1('');
                              setStepHint2('');
                              setStepHint3('');
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
                          >
                            Batal Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Step List */}
                    <div className="space-y-2.5">
                      <h3 className="font-display text-sm font-bold text-[#14263D]">
                        Urutan Tahap Simulasi Terpandu ({simConfig.steps.length} langkah)
                      </h3>
                      {simConfig.steps.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          Belum ada tahap simulasi kustom. Tambahkan langkah di atas atau klik
                          "Muat Contoh Template Modul Ini".
                        </p>
                      ) : (
                        simConfig.steps.map((s, idx) => (
                          <div
                            key={s.id}
                            className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#3569B0]">
                                Tahap {idx + 1} · Tipe: {s.fieldType} · Kunci:{' '}
                                <span className="font-mono">{s.expectedAnswer}</span>
                              </p>
                              <p className="mt-0.5 text-sm font-bold text-[#14263D]">
                                {s.title} ({s.fieldLabel})
                              </p>
                              <p className="mt-0.5 text-xs text-slate-600">
                                {s.instruction}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditSimStep(s)}
                                className="rounded border border-slate-300 px-2.5 py-1 text-xs font-semibold text-[#3569B0]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDeleteSimStep(s.id, s.title)}
                                className="rounded border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Dokumen PDF */}
                {activeTab === 'pdf' && (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed border-slate-300 bg-[#F4F7FB] p-5">
                      <div>
                        <p className="text-sm font-bold text-[#14263D]">
                          Unggah Modul / Lembar Kerja PDF
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          File PDF dipratinjau di bawah sebelum diunggah ke server Smart-Guide.
                        </p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#3569B0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2a548e]">
                        <Upload className="h-4 w-4" />
                        <span>Pilih File PDF</span>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          onChange={handleStagePdf}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    {(pendingPdfFile || draft.pdfAttachmentName) && (
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 text-sm">
                        <p className="font-semibold text-[#14263D]">
                          {pendingPdfFile
                            ? `Siap Disimpan: ${pendingPdfFile.name} (${formatBytes(
                                pendingPdfFile.size
                              )})`
                            : `Tersimpan: ${draft.pdfAttachmentName}`}
                        </p>
                        <button
                          type="button"
                          onClick={requestRemovePdf}
                          className="inline-flex items-center gap-1 rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus PDF</span>
                        </button>
                      </div>
                    )}

                    {activePdfPreviewUrl ? (
                      <iframe
                        src={activePdfPreviewUrl}
                        title="Preview PDF"
                        className="h-96 w-full rounded-lg border border-slate-200"
                      />
                    ) : (
                      <p className="text-xs text-slate-500">
                        Belum ada dokumen PDF terpasang pada episode ini.
                      </p>
                    )}
                  </div>
                )}

                {/* 5. Video MP4 */}
                {activeTab === 'video' && (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed border-slate-300 bg-[#F4F7FB] p-5">
                      <div>
                        <p className="text-sm font-bold text-[#14263D]">
                          Unggah Video Tutorial MP4
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Disimpan di server Smart-Guide agar dapat diputar siswa dari perangkat masing-masing.
                        </p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#3569B0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2a548e]">
                        <Upload className="h-4 w-4" />
                        <span>Pilih Video MP4</span>
                        <input
                          type="file"
                          accept="video/mp4,.mp4"
                          onChange={handleStageVideo}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    {(pendingVideoFile || draft.videoAttachmentName) && (
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 text-sm">
                        <p className="font-semibold text-[#14263D]">
                          {pendingVideoFile
                            ? `Siap Disimpan: ${pendingVideoFile.name} (${formatBytes(
                                pendingVideoFile.size
                              )})`
                            : `Tersimpan: ${draft.videoAttachmentName}`}
                        </p>
                        <button
                          type="button"
                          onClick={requestRemoveVideo}
                          className="inline-flex items-center gap-1 rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus Video</span>
                        </button>
                      </div>
                    )}

                    {activeVideoPreviewUrl ? (
                      <video
                        src={activeVideoPreviewUrl}
                        controls
                        className="aspect-video w-full rounded-lg border border-slate-200 bg-black"
                      />
                    ) : (
                      <p className="text-xs text-slate-500">
                        Belum ada video MP4 unggahan lokal pada episode ini.
                      </p>
                    )}
                  </div>
                )}

                {/* 6. Soal Kuis */}
                {activeTab === 'kuis' && (
                  <div className="space-y-6">
                    <div className="rounded-lg border border-slate-200 bg-[#F4F7FB] p-4 space-y-3">
                      <h3 className="font-display text-sm font-bold text-[#14263D]">
                        {editingQuizId
                          ? 'Edit Soal Pilihan Ganda'
                          : 'Tambah Soal Pilihan Ganda Baru'}
                      </h3>
                      <textarea
                        rows={2}
                        placeholder="Tulis pertanyaan pilihan ganda..."
                        value={qText}
                        onChange={(e) => setQText(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          type="text"
                          placeholder="Opsi A"
                          value={qOptA}
                          onChange={(e) => setQOptA(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Opsi B"
                          value={qOptB}
                          onChange={(e) => setQOptB(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Opsi C"
                          value={qOptC}
                          onChange={(e) => setQOptC(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Opsi D"
                          value={qOptD}
                          onChange={(e) => setQOptD(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#14263D]">
                            Kunci Jawaban
                          </label>
                          <select
                            value={qCorrectIdx}
                            onChange={(e) => setQCorrectIdx(Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value={0}>Opsi A</option>
                            <option value={1}>Opsi B</option>
                            <option value={2}>Opsi C</option>
                            <option value={3}>Opsi D</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-[#14263D]">
                            Pembahasan Jawaban
                          </label>
                          <input
                            type="text"
                            placeholder="Jelaskan mengapa kunci jawaban tersebut benar..."
                            value={qExplanation}
                            onChange={(e) => setQExplanation(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSaveQuizItem}
                          className="rounded-lg bg-[#3569B0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2a548e]"
                        >
                          {editingQuizId ? 'Perbarui Soal' : 'Tambah Soal'}
                        </button>
                        {editingQuizId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuizId(null);
                              setQText('');
                              setQOptA('');
                              setQOptB('');
                              setQOptC('');
                              setQOptD('');
                              setQExplanation('');
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
                          >
                            Batal Edit
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-display text-sm font-bold text-[#14263D]">
                        Daftar Soal ({draft.quizQuestions.length})
                      </h3>
                      {draft.quizQuestions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#3569B0]">
                              Soal {idx + 1} · Kunci:{' '}
                              {String.fromCharCode(65 + q.correctIndex)}
                            </p>
                            <p className="mt-0.5 text-sm font-semibold text-[#14263D]">
                              {q.question}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditQuizItem(q)}
                              className="rounded border border-slate-300 px-2.5 py-1 text-xs font-semibold text-[#3569B0]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDeleteQuiz(q.id)}
                              className="rounded border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. Preview */}
                {activeTab === 'preview' && (
                  <div className="space-y-5">
                    <div className="rounded-lg border border-[#3569B0]/30 bg-[#EAF3FF] p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-[#14263D]">
                          Preview Tampilan Siswa Sebelum Disimpan
                        </p>
                        <p className="text-xs text-slate-700">
                          Periksa ringkasan materi, Simulasi Terpandu, lampiran, dan soal sebelum
                          menyimpan ke server Smart-Guide.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={handlePersistEpisode}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#19A89B] px-4 py-2 text-xs font-bold text-white hover:bg-[#148f84] shrink-0"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>Simpan Sekarang</span>
                      </button>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-5 space-y-4">
                      <div>
                        <p className="text-xs font-bold text-[#3569B0]">
                          {modules.find((m) => m.id === draft.moduleId)?.code} · Episode{' '}
                          {draft.code}
                        </p>
                        <h3 className="font-display text-xl font-bold text-[#14263D]">
                          {draft.title}
                        </h3>
                        <p className="text-sm text-slate-600">{draft.subtitle}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-xs">
                        <div className="rounded-lg bg-[#F4F7FB] p-3">
                          <span className="text-slate-500">Materi Teks</span>
                          <p className="mt-1 font-mono text-base font-bold text-[#14263D]">
                            {draft.materials.length}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#F4F7FB] p-3">
                          <span className="text-slate-500">Simulasi Terpandu</span>
                          <p className="mt-1 font-semibold text-[#14263D]">
                            {simConfig.enabled
                              ? `${simConfig.steps.length} Tahap`
                              : draft.hasVirtualLab
                                ? 'Bawaan 1.1'
                                : 'Nonaktif'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#F4F7FB] p-3">
                          <span className="text-slate-500">Lampiran PDF</span>
                          <p className="mt-1 font-semibold text-[#14263D] truncate">
                            {pendingPdfFile?.name ||
                              draft.pdfAttachmentName ||
                              'Tidak ada'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#F4F7FB] p-3">
                          <span className="text-slate-500">Video MP4</span>
                          <p className="mt-1 font-semibold text-[#14263D] truncate">
                            {pendingVideoFile?.name ||
                              draft.videoAttachmentName ||
                              'Tidak ada'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#F4F7FB] p-3">
                          <span className="text-slate-500">Soal Kuis</span>
                          <p className="mt-1 font-mono text-base font-bold text-[#14263D]">
                            {draft.quizQuestions.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
        </div>
      )}
    </div>
  );
}
