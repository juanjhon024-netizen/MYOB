import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EpisodeContent,
  ModuleData,
  NavPage,
  QuizAttemptRecord,
  SimulationAttemptRecord,
  StudentProfile,
  StudentProgress
} from './types/lms';
import { findEpisodeById, mergeCurriculumWithOverrides } from './data/curriculum';
import {
  clearActiveStudentSession,
  getActiveStudent,
  getEpisodeStageStatuses,
  isStudentCodeDisabled,
  loadStudentProgress,
  resetStudentProgress,
  saveStudentProfile,
  saveStudentProgress
} from './services/storage';
import { getAllCustomEpisodes } from './services/contentDb';
import { WelcomePage } from './components/WelcomePage';
import { LmsLayout } from './components/LmsLayout';
import { DashboardPage } from './components/DashboardPage';
import { CourseRoomPage } from './components/CourseRoomPage';
import { ModulesPage } from './components/ModulesPage';
import { EpisodeActivityTab, EpisodePage } from './components/EpisodePage';
import { VideoLibraryPage } from './components/VideoLibraryPage';
import { VirtualLabPage } from './components/VirtualLabPage';
import { QuizPage } from './components/QuizPage';
import { GradesProgressPage } from './components/GradesProgressPage';
import { ContentManagerPage } from './components/ContentManagerPage';
import { GuidePage } from './components/GuidePage';
import { SettingsPage } from './components/SettingsPage';

export default function App() {
  const [student, setStudent] = useState<StudentProfile | null>(() =>
    getActiveStudent()
  );
  const [progress, setProgress] = useState<StudentProgress | null>(() => {
    const active = getActiveStudent();
    return active ? loadStudentProgress(active.studentCode) : null;
  });
  const [customEpisodes, setCustomEpisodes] = useState<EpisodeContent[]>([]);
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [activeEpisodeId, setActiveEpisodeId] = useState<string>('ep-1-1');
  const [episodeInitialTab, setEpisodeInitialTab] =
    useState<EpisodeActivityTab>('tujuan');

  const refreshCustomContent = useCallback(async () => {
    try {
      const stored = await getAllCustomEpisodes();
      setCustomEpisodes(stored);
    } catch {
      // Keep base curriculum if IndexedDB is unavailable
    }
  }, []);

  useEffect(() => {
    refreshCustomContent();
  }, [refreshCustomContent]);

  const modules: ModuleData[] = useMemo(
    () => mergeCurriculumWithOverrides(customEpisodes),
    [customEpisodes]
  );

  const handleEnterLms = (
    input: { studentCode: string; fullName: string; className: string },
    _mode: 'resume' | 'new_or_update'
  ) => {
    if (isStudentCodeDisabled(input.studentCode)) return;
    const saved = saveStudentProfile(input);
    const loadedProg = loadStudentProgress(saved.studentCode);
    setStudent(saved);
    setProgress(loadedProg);
    setActiveEpisodeId(loadedProg.lastOpenedEpisodeId || 'ep-1-1');
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    clearActiveStudentSession();
    setStudent(null);
    setProgress(null);
    setActivePage('dashboard');
  };

  const handleNavigate = (page: NavPage) => {
    if (activePage === 'content_manager' && page !== 'content_manager') {
      const stillValid = getActiveStudent();
      if (!stillValid) {
        handleLogout();
        return;
      }
    }
    setActivePage(page);
  };

  const updateProgress = (updater: (prev: StudentProgress) => StudentProgress) => {
    setProgress((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveStudentProgress(next);
      return next;
    });
  };

  const handleOpenEpisode = (
    episodeId: string,
    tab?: string
  ) => {
    setActiveEpisodeId(episodeId);
    setEpisodeInitialTab((tab as EpisodeActivityTab) || 'tujuan');
    setActivePage('episode');

    updateProgress((prev) => {
      const currentStages = getEpisodeStageStatuses(prev, episodeId);
      const nextMateriStatus =
        currentStages.materi === 'belum_dimulai'
          ? 'sedang_dipelajari'
          : currentStages.materi;
      return {
        ...prev,
        lastOpenedEpisodeId: episodeId,
        stageStatuses: {
          ...prev.stageStatuses,
          [episodeId]: {
            ...currentStages,
            materi: nextMateriStatus
          }
        }
      };
    });
  };

  const handleMarkMaterialRead = (episodeId: string) => {
    updateProgress((prev) => {
      const currentStages = getEpisodeStageStatuses(prev, episodeId);
      return {
        ...prev,
        materialsRead: { ...prev.materialsRead, [episodeId]: true },
        stageStatuses: {
          ...prev.stageStatuses,
          [episodeId]: { ...currentStages, materi: 'selesai' }
        }
      };
    });
  };

  const handleMarkVideoWatched = (episodeId: string) => {
    updateProgress((prev) => {
      const currentStages = getEpisodeStageStatuses(prev, episodeId);
      return {
        ...prev,
        videosWatched: { ...prev.videosWatched, [episodeId]: true },
        stageStatuses: {
          ...prev.stageStatuses,
          [episodeId]: { ...currentStages, video: 'selesai' }
        }
      };
    });
  };

  const handleUpdateSimulation = (
    episodeId: string,
    record: SimulationAttemptRecord
  ) => {
    updateProgress((prev) => {
      const currentStages = getEpisodeStageStatuses(prev, episodeId);
      const simStatus = record.guidedCompleted
        ? 'selesai'
        : record.guidedErrors > 0 || record.guidedHintsUsed > 0
          ? 'sedang_dipelajari'
          : currentStages.simulasi;
      const indStatus =
        record.checkpointStatus === 'berhasil'
          ? 'selesai'
          : record.independentAttempts > 0
            ? 'sedang_dipelajari'
            : currentStages.uji_mandiri;

      return {
        ...prev,
        simulations: { ...prev.simulations, [episodeId]: record },
        stageStatuses: {
          ...prev.stageStatuses,
          [episodeId]: {
            ...currentStages,
            simulasi: simStatus,
            uji_mandiri: indStatus
          }
        }
      };
    });
  };

  const handleSaveQuizResult = (
    episodeId: string,
    result: QuizAttemptRecord
  ) => {
    updateProgress((prev) => {
      const currentStages = getEpisodeStageStatuses(prev, episodeId);
      return {
        ...prev,
        quizResults: { ...prev.quizResults, [episodeId]: result },
        stageStatuses: {
          ...prev.stageStatuses,
          [episodeId]: { ...currentStages, kuis: 'selesai' }
        }
      };
    });
  };

  const handleUpdateProfile = (next: {
    studentCode: string;
    fullName: string;
    className: string;
  }) => {
    const updated = saveStudentProfile(next);
    setStudent(updated);
  };

  const handleResetProgress = () => {
    if (!student) return;
    const fresh = resetStudentProgress(student.studentCode);
    setProgress(fresh);
  };

  if (!student || !progress) {
    return <WelcomePage onEnterLms={handleEnterLms} />;
  }

  const activeEpInfo =
    findEpisodeById(modules, activeEpisodeId) ||
    findEpisodeById(modules, 'ep-1-1');

  const getBreadcrumbs = () => {
    const base = {
      label: 'Smart-Guide',
      onClick: () => setActivePage('dashboard')
    };

    switch (activePage) {
      case 'dashboard':
        return [base, { label: 'Dashboard' }];
      case 'course_room':
        return [base, { label: 'Ruang Pembelajaran' }];
      case 'modules':
        return [base, { label: 'Materi & Modul' }];
      case 'episode':
        return [
          base,
          { label: 'Materi & Modul', onClick: () => setActivePage('modules') },
          {
            label: activeEpInfo
              ? `Episode ${activeEpInfo.episode.code}`
              : 'Episode'
          }
        ];
      case 'videos':
        return [base, { label: 'Video Tutorial' }];
      case 'virtual_lab':
        return [base, { label: 'Laboratorium Virtual' }];
      case 'quiz':
        return [base, { label: 'Tugas & Kuis' }];
      case 'grades':
        return [base, { label: 'Status & Progres' }];
      case 'content_manager':
        return [base, { label: 'Mode Guru' }];
      case 'guide':
        return [base, { label: 'Panduan Penggunaan' }];
      case 'settings':
        return [base, { label: 'Pengaturan' }];
    }
  };

  return (
    <LmsLayout
      activePage={activePage}
      onNavigate={handleNavigate}
      student={student}
      onLogout={handleLogout}
      breadcrumbs={getBreadcrumbs()}
    >
      {activePage === 'dashboard' && (
        <DashboardPage
          student={student}
          modules={modules}
          progress={progress}
          onNavigate={handleNavigate}
          onOpenEpisode={(epId) => handleOpenEpisode(epId)}
        />
      )}

      {activePage === 'course_room' && (
        <CourseRoomPage
          modules={modules}
          progress={progress}
          onOpenEpisode={(epId, tab) => handleOpenEpisode(epId, tab)}
          onNavigate={handleNavigate}
        />
      )}

      {activePage === 'modules' && (
        <ModulesPage
          modules={modules}
          progress={progress}
          onOpenEpisode={(epId) => handleOpenEpisode(epId)}
        />
      )}

      {activePage === 'episode' && activeEpInfo && (
        <EpisodePage
          module={activeEpInfo.module}
          episode={activeEpInfo.episode}
          initialTab={episodeInitialTab}
          progress={progress}
          onBackToModules={() => setActivePage('modules')}
          onMarkMaterialRead={handleMarkMaterialRead}
          onMarkVideoWatched={handleMarkVideoWatched}
          onUpdateSimulation={handleUpdateSimulation}
          onSaveQuizResult={handleSaveQuizResult}
        />
      )}

      {activePage === 'videos' && (
        <VideoLibraryPage
          modules={modules}
          progress={progress}
          onMarkVideoWatched={handleMarkVideoWatched}
          onOpenEpisode={(epId) => handleOpenEpisode(epId)}
        />
      )}

      {activePage === 'virtual_lab' && (
        <VirtualLabPage
          modules={modules}
          progress={progress}
          onUpdateAttempt={handleUpdateSimulation}
        />
      )}

      {activePage === 'quiz' && (
        <QuizPage
          modules={modules}
          progress={progress}
          onSaveQuizResult={handleSaveQuizResult}
        />
      )}

      {activePage === 'grades' && (
        <GradesProgressPage
          student={student}
          modules={modules}
          progress={progress}
        />
      )}

      {activePage === 'content_manager' && (
        <ContentManagerPage
          modules={modules}
          onContentChanged={refreshCustomContent}
        />
      )}

      {activePage === 'guide' && <GuidePage />}

      {activePage === 'settings' && (
        <SettingsPage
          student={student}
          modules={modules}
          progress={progress}
          onUpdateProfile={handleUpdateProfile}
          onResetProgress={handleResetProgress}
        />
      )}
    </LmsLayout>
  );
}
