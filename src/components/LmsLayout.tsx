import React, { useState } from 'react';
import {
  LayoutDashboard,
  School,
  BookOpen,
  PlaySquare,
  MonitorCheck,
  ClipboardCheck,
  BarChart3,
  HelpCircle,
  Settings,
  Lock,
  Menu,
  X,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { NavPage, StudentProfile } from '../types/lms';

interface LmsLayoutProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  student: StudentProfile;
  onLogout: () => void;
  breadcrumbs: Array<{ label: string; onClick?: () => void }>;
  children: React.ReactNode;
}

interface NavItemConfig {
  id: NavPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STUDENT_NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'course_room', label: 'Ruang Pembelajaran', icon: School },
  { id: 'modules', label: 'Materi & Modul', icon: BookOpen },
  { id: 'videos', label: 'Video Tutorial', icon: PlaySquare },
  { id: 'virtual_lab', label: 'Laboratorium Virtual', icon: MonitorCheck },
  { id: 'quiz', label: 'Tugas & Kuis', icon: ClipboardCheck },
  { id: 'grades', label: 'Status & Progres', icon: BarChart3 }
];

const UTILITY_NAV_ITEMS: NavItemConfig[] = [
  { id: 'guide', label: 'Panduan Penggunaan', icon: HelpCircle },
  { id: 'settings', label: 'Pengaturan', icon: Settings }
];

export function LmsLayout({
  activePage,
  onNavigate,
  student,
  onLogout,
  breadcrumbs,
  children
}: LmsLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectNav = (page: NavPage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const isNavActive = (itemId: NavPage) => {
    if (itemId === 'modules' && activePage === 'episode') return true;
    return activePage === itemId;
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-[#14263D] text-white">
      {/* Brand Block */}
      <div className="border-b border-white/10 px-5 py-5">
        <p className="font-display text-lg font-extrabold tracking-tight text-white">
          SMART-GUIDE
        </p>
        <p className="mt-0.5 text-xs text-slate-300">
          E-Learning Akuntansi · XI AKL
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Navigasi LMS">
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Menu Belajar Siswa
          </p>
          <ul className="mt-2 space-y-1">
            {STUDENT_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#3569B0] text-white font-semibold'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Teacher-only Management Section */}
        <div className="border-t border-white/10 pt-4">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Khusus Guru
          </p>
          <ul className="mt-2 space-y-1">
            <li>
              <button
                type="button"
                onClick={() => handleSelectNav('content_manager')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                  activePage === 'content_manager'
                    ? 'bg-[#19A89B] text-white font-semibold'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Lock className="h-4 w-4 shrink-0" />
                <span className="truncate">Mode Guru (Materi &amp; Nilai)</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Guide & Settings */}
        <div className="border-t border-white/10 pt-4">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Bantuan &amp; Akun
          </p>
          <ul className="mt-2 space-y-1">
            {UTILITY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#3569B0] text-white font-semibold'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Active Student Footer */}
      <div className="border-t border-white/10 p-4">
        <div className="rounded-lg bg-white/5 px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-white">
            {student.fullName}
          </p>
          <p className="truncate text-xs text-slate-300 tabular-nums">
            {student.studentCode} · {student.className}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Ganti Siswa</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#14263D] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#14263D]/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu"
              className="absolute right-3 top-4 rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Buka menu navigasi"
                className="rounded-lg border border-slate-200 p-2 text-[#14263D] hover:bg-slate-50 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={`${crumb.label}-${idx}`}>
                      {idx > 0 && (
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      {crumb.onClick && !isLast ? (
                        <button
                          type="button"
                          onClick={crumb.onClick}
                          className="truncate font-medium text-slate-500 hover:text-[#3569B0] whitespace-nowrap"
                        >
                          {crumb.label}
                        </button>
                      ) : (
                        <span
                          className={`truncate whitespace-nowrap ${
                            isLast
                              ? 'font-semibold text-[#14263D]'
                              : 'font-medium text-slate-500'
                          }`}
                        >
                          {crumb.label}
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>
            </div>

            {activePage === 'content_manager' && (
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="rounded-lg bg-[#3569B0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2a548e] whitespace-nowrap shrink-0"
              >
                Kembali ke Tampilan Siswa
              </button>
            )}
          </div>
        </header>

        {/* Viewport Container */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
