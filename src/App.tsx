import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  deleteStudentData,
  enterStudentSessionRemote,
  fetchStudentProgressRemote,
  getActiveStudent,
  getEpisodeStageStatuses,
  loadStudentProgress,
  resetStudentProgressRemote,
  saveStudentProgress,
  syncProgressToServer
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
  const [sessionNotice, setSessionNotice] = useState<string>('');
  const [customEpisodes, setCustomEpisodes] = useState<EpisodeContent[]>([]);
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [activeEpisodeId, setActiveEpisodeId] = useState<string>('ep-1-1');
  const [episodeInitialTab, setEpisodeInitialTab] =
    useState<EpisodeActivityTab>('tujuan');

  const studentRef = useRef<StudentProfile | null>(student);
  studentRef.current = student;

  const refreshCustomContent = useCallback(async () => {
    try {
      const stored = await getAllCustomEpisodes();
      setCustomEpisodes(stored);
    } catch {
      // Keep base curriculum if server/IndexedDB is unavailable
    }
  }, []);

  useEffect(() => {
    refreshCustomContent();
  }, [refreshCustomContent]);

  const handleForceLogout = useCallback((noticeMessage?: string) => {
    clearActiveStudentSession();
    setStudent(null);
    setProgress(null);
    setActivePage('dashboard');
    if (noticeMessage) {
      setSessionNotice(noticeMessage);
    }
  }, []);

  const verifyAndSyncActiveStudent = useCallback(async () => {
    const current = studentRef.current;
    if (!current) return;
    const remote = await fetchStudentProgressRemote(current.studentCode);
    if (remote.status === 'disabled') {
      handleForceLogout(
        'Akun Anda telah dinonaktifkan oleh guru melalui Mode Guru.'
      );
      return;
    }
    if (remote.status === 'deleted') {
      deleteStudentData(current.studentCode);
      handleForceLogout(
        'Data akun siswa Anda telah dihapus oleh guru pengampu.'
      );
      return;
    }
    if (remote.status === 'ok') {
      setStudent(remote.profile);
      setProgress((prev) => {
        if (!prev) return remote.progress;
        // Prefer whichever record is newer
        return remote.progress.updatedAt >= prev.updatedAt
          ? remote.progress
          : prev;
      });
    }
  }, [handleForceLogout]);

  // Verify active student & pull latest curriculum on mount and window focus
  useEffect(() => {
    if (!student?.studentCode) return;
    verifyAndSyncActiveStudent();
  }, [student?.studentCode, verifyAndSyncActiveStudent]);

  useEffect(() => {
    const onFocus = () => {
      refreshCustomContent();
      if (studentRef.current) {
        verifyAndSyncActiveStudent();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshCustomContent, verifyAndSyncActiveStudent]);

  const modules: ModuleData[] = useMemo(
    () => mergeCurriculumWithOverrides(customEpisodes),
    [customEpisodes]
  );

  const handleEnterLms = async (
    input: { studentCode: string; fullName: string; className: string },
    _mode: 'resume' | 'new_or_update'
  ) => {
    setSessionNotice('');
    const { profile, progress: loadedProg } = await enterStudentSessionRemote(input);
    setStudent(profile);
    setProgress(loadedProg);
    setActiveEpisodeId(loadedProg.lastOpenedEpisodeId || 'ep-1-1');
    setActivePage('dashboard');
    refreshCustomContent();
  };

  const handleLogout = () => {
    setSessionNotice('');
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
    if (page !== 'content_manager') {
      refreshCustomContent();
    }
  };

  const updateProgress = (updater: (prev: StudentProgress) => StudentProgress) => {
    setProgress((prev) => {
      if (!prev) return prev;
      const next = {
        ...updater(prev),
        updatedAt: new Date().toISOString()
      };
      saveStudentProgress(next);
      const currentStudent = studentRef.current;
      if (currentStudent) {
        syncProgressToServer(currentStudent, next).then((status) => {
          if (status === 'disabled') {
            handleForceLogout(
              'Akun Anda telah dinonaktifkan oleh guru melalui Mode Guru.'
            );
          }
        });
      }
      return next;
    });
  };

  const handleOpenEpisode = (episodeId: string, tab?: string) => {
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

  const handleUpdateProfile = async (next: {
    studentCode: string;
    fullName: string;
    className: string;
  }) => {
    const { profile } = await enterStudentSessionRemote(next);
    setStudent(profile);
  };

  const handleResetProgress = async () => {
    if (!student) return;
    const fresh = await resetStudentProgressRemote(student.studentCode);
    setProgress(fresh);
  };

  if (!student || !progress) {
    return (
      <WelcomePage
        onEnterLms={handleEnterLms}
        sessionNotice={sessionNotice}
      />
    );
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
          onFinishQuiz={() => setActivePage('modules')}
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
