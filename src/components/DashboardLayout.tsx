'use client'

import { useEffect, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { useTrack } from '@/lib/useTrack'
import { filterNavSections } from '@/lib/navVisibility'
import {
  GraduationCap, LayoutDashboard, Brain, Target, TrendingUp,
  DollarSign, Calculator, BookOpen, Shield, MessageCircle,
  Award, Users, Globe, Menu, X, Flame, Star, Zap, Newspaper,
  Sun, Moon, ClipboardList, Calendar, Trophy, UserCheck, Gift,
  PenTool, FileText, User, LogOut
} from 'lucide-react'
import type { PageType } from '@/lib/types'
import DashboardHome from './pages/DashboardHome'
import CareerNavigator from './pages/CareerNavigator'
import ROICalculator from './pages/ROICalculator'
import AdmissionPredictor from './pages/AdmissionPredictor'
import DomesticAdmissionPredictor from './pages/DomesticAdmissionPredictor'
import LoanCenter from './pages/LoanCenter'
import DomesticLoanCenter from './pages/DomesticLoanCenter'
import EMICalculator from './pages/EMICalculator'
import SOPCopilot from './pages/SOPCopilot'
import VisaSimulator from './pages/VisaSimulator'
import MentorChat from './pages/MentorChat'
import ScholarshipHunter from './pages/ScholarshipHunter'
import CloneJourney from './pages/CloneJourney'
import CurrencyRisk from './pages/CurrencyRisk'
import NewsPage from './pages/NewsPage'
import FormGuide from './pages/FormGuide'
import DocumentVault from './pages/DocumentVault'
import GrowthTools from './pages/GrowthTools'
import NotificationsDropdown from './NotificationsDropdown'
import NudgeEngine from './NudgeEngine'
import { calculateProfileCompleteness, calculateProfileScore } from '@/lib/profileCompleteness'
import ProfileCompletionGate from './ProfileCompletionGate'
import ProfileWarningBanner from './ProfileWarningBanner'
import GamificationPage from './pages/GamificationPage'
import TimelinePage from './pages/TimelinePage'
import InterviewPrep from './pages/InterviewPrep'
import ReferralPage from './pages/ReferralPage'
import ProfilePage from './pages/ProfilePage'
import ExpertDirectory from './pages/ExpertDirectory'
import UserExpertChat from './pages/UserExpertChat'
import AIEducationJourney from './pages/AIEducationJourney'
import CollegeMatch from './pages/CollegeMatch'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { usePresence } from '@/lib/usePresence'

const navSections: { label: string; items: { icon: typeof LayoutDashboard; label: string; page: PageType }[] }[] = [
  {
    label: 'Main',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', page: 'dashboard' },
      { icon: User, label: 'Profile', page: 'profile' },
      { icon: ClipboardList, label: 'Form Guide', page: 'form-guide' },
    ]
  },
  {
    label: 'Unique',
    items: [
      { icon: Calendar, label: 'Timeline', page: 'timeline' },
      { icon: MessageCircle, label: 'AI Mentor', page: 'mentor-chat' },
      { icon: Users, label: 'Expert Network', page: 'expert-directory' },
      { icon: MessageCircle, label: 'My Chats', page: 'user-expert-chat' },
    ]
  },
  {
    label: 'Explore',
    items: [
      { icon: Star, label: '⭐ AI Education Journey', page: 'ai-journey' },
      { icon: Users, label: 'Clone Journey', page: 'clone-journey' },
      { icon: Brain, label: 'Career Navigator', page: 'career-navigator' },
      { icon: Award, label: 'Scholarships', page: 'scholarship-hunter' },
      { icon: Newspaper, label: 'News', page: 'news' },
    ]
  },
  {
    label: 'Evaluate',
    items: [
      { icon: Target, label: 'Admission Predictor', page: 'admission-predictor' },
      { icon: GraduationCap, label: 'College Match', page: 'college-match' },
      { icon: Target, label: 'Domestic Predictor', page: 'domestic-admission-predictor' },
      { icon: TrendingUp, label: 'ROI Calculator', page: 'roi-calculator' },
      { icon: Globe, label: 'Currency Risk', page: 'currency-risk' },
    ]
  },
  {
    label: 'Prepare',
    items: [
      { icon: BookOpen, label: 'SOP Co-Pilot', page: 'sop-copilot' },
      { icon: Shield, label: 'Visa Simulator', page: 'visa-simulator' },
      { icon: UserCheck, label: 'Interview Prep', page: 'interview-prep' },
      { icon: FileText, label: 'Document Vault', page: 'document-vault' },
    ]
  },
  {
    label: 'Finance',
    items: [
      { icon: DollarSign, label: 'Loan Center', page: 'loan-center' },
      { icon: DollarSign, label: 'Domestic Loan Center', page: 'domestic-loan-center' },
      { icon: Calculator, label: 'EMI Calculator', page: 'emi-calculator' },
    ]
  },
  {
    label: 'Grow',
    items: [
      { icon: Trophy, label: 'Achievements', page: 'gamification' },
      { icon: Gift, label: 'Referrals', page: 'referrals' },
      { icon: PenTool, label: 'Growth Tools', page: 'growth-tools' },
    ]
  }
]

function PageContent({ page }: { page: PageType }) {
  switch (page) {
    case 'dashboard': return <DashboardHome />
    case 'ai-journey': return <AIEducationJourney />
    case 'career-navigator': return <CareerNavigator />
    case 'roi-calculator': return <ROICalculator />
    case 'admission-predictor': return <AdmissionPredictor />
    case 'college-match': return <CollegeMatch />
    case 'domestic-admission-predictor': return <DomesticAdmissionPredictor />
    case 'loan-center': return <LoanCenter />
    case 'domestic-loan-center': return <DomesticLoanCenter />
    case 'emi-calculator': return <EMICalculator />
    case 'sop-copilot': return <SOPCopilot />
    case 'visa-simulator': return <VisaSimulator />
    case 'mentor-chat': return <MentorChat />
    case 'scholarship-hunter': return <ScholarshipHunter />
    case 'clone-journey': return <CloneJourney />
    case 'currency-risk': return <CurrencyRisk />
    case 'news': return <NewsPage />
    case 'form-guide': return <FormGuide />
    case 'document-vault': return <DocumentVault />
    case 'gamification': return <GamificationPage />
    case 'timeline': return <TimelinePage />
    case 'interview-prep': return <InterviewPrep />
    case 'referrals': return <ReferralPage />
    case 'growth-tools': return <GrowthTools />
    case 'profile': return <ProfilePage />
    case 'expert-directory': return <ExpertDirectory />
    case 'user-expert-chat': return <UserExpertChat />
    default: return <DashboardHome />
  }
}

export default function DashboardLayout() {
  const { currentPage, setCurrentPage, sidebarOpen, toggleSidebar, profile, theme, toggleTheme } = useAppStore()
  const track = useTrack()
  const visibleNavSections = useMemo(() => filterNavSections(navSections, track), [track])

  // Keep profiles.status in sync with whether this student tab is open.
  usePresence(profile?.id)

  const profileScore = useMemo(() => calculateProfileScore(profile), [profile])
  const profilePct = profileScore.totalScore

  const handleLogout = async () => {
    const supabase = createClient()
    if (profile?.id) {
      try {
        await fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: profile.id, status: 'offline' }),
          keepalive: true,
        })
      } catch {}
    }
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    // page.tsx listener will handle redirection
  }

  // Initial URL check for persistence
  useEffect(() => {
    const page = new URLSearchParams(window.location.search).get('page') as PageType
    if (page && page !== currentPage) {
      setCurrentPage(page)
    }
  }, [])

  // Browser back/forward button support
  useEffect(() => {
    const handlePopState = () => {
      const page = new URLSearchParams(window.location.search).get('page') as PageType
      if (page) setCurrentPage(page)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [setCurrentPage])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('page', currentPage)
    if (window.location.search !== url.search.replace('?', '?page=') && window.location.search !== `?page=${currentPage}`) {
      window.history.pushState({ page: currentPage }, '', url.toString())
    }
  }, [currentPage])

  // Apply theme to HTML element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Realtime Chat Session Listener
  useEffect(() => {
    if (!profile.id) return

    const supabase = createClient()
    const channel = supabase.channel('global-chat-listener')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_sessions',
          filter: `student_id=eq.${profile.id}`
        },
        (payload) => {
          if (payload.new.status === 'active' && payload.old.status === 'pending') {
            toast.success('🎉 Expert accepted your connection request!', { duration: 5000 })
            setCurrentPage('user-expert-chat')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile.id, setCurrentPage])

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-[90] md:hidden" onClick={toggleSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} flex flex-col`}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>
              EduFin<span style={{ color: 'var(--secondary)' }}>AI</span>
            </span>
          </div>
          <button onClick={toggleSidebar} className="md:hidden" style={{ color: 'var(--foreground)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile mini */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'var(--gradient-primary)', color: 'white' }}>
              {profile.name ? profile.name[0].toUpperCase() : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{profile.name || 'Student'}</div>
              <div className="flex items-center gap-2">
                <span className="streak-fire"><Flame className="w-3 h-3" /> {profile.streakDays}d</span>
                <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>{profile.xpPoints} XP</span>
              </div>
            </div>
          </div>
          <div className="mt-3 p-2 rounded-lg" style={{ background: 'var(--background)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Profile Completeness</span>
              <span className="text-sm font-bold" style={{ color: profilePct >= 80 ? 'var(--success)' : 'var(--warning)' }}>{profilePct}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${profilePct}%`, background: profilePct >= 80 ? 'var(--success)' : 'var(--warning)' }} />
            </div>
          </div>
          <div className="mt-3 p-2 rounded-lg" style={{ background: 'var(--background)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Dream Score™</span>
              <span className="text-sm font-bold" style={{ color: 'var(--primary-light)' }}>{profile.dreamScore}/1000</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${(profile.dreamScore / 1000) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {visibleNavSections.map(section => (
            <div key={section.label} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--foreground-muted)', opacity: 0.5 }}>{section.label}</div>
              {section.items.map(item => (
                <button key={item.page} onClick={() => { setCurrentPage(item.page); if (window.innerWidth < 768) toggleSidebar() }}
                  className={`sidebar-link w-full ${currentPage === item.page ? 'active' : ''}`}>
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Theme Toggle + Badges */}
        <div className="p-4 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
          {/* Theme toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Theme</span>
            <button onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
              {theme === 'dark' ? (
                <><Moon className="w-3.5 h-3.5" style={{ color: 'var(--primary-light)' }} /><span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Dark</span></>
              ) : (
                <><Sun className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /><span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Light</span></>
              )}
            </button>
          </div>
          {/* Badges */}
          {profile.badges.length > 0 && (
            <div>
              <div className="text-xs mb-2" style={{ color: 'var(--foreground-muted)' }}>Badges</div>
              <div className="flex flex-wrap gap-1">
                {profile.badges.slice(0, 4).map(b => (
                  <span key={b} className="badge badge-primary text-[10px]">
                    <Star className="w-3 h-3 mr-1" />{b}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-[260px]">
        {/* Top bar */}
        <header className="sticky top-0 z-[80] flex items-center justify-between px-4 sm:px-6 py-3 glass"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="md:hidden" style={{ color: 'var(--foreground)' }}>
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              {navSections.flatMap(s => s.items).find(n => n.page === currentPage)?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="streak-fire hidden sm:flex"><Flame className="w-4 h-4" /> {profile.streakDays}d</div>
            <div className="badge badge-primary"><Zap className="w-3 h-3 mr-1" /> {profile.xpPoints} XP</div>
            <NotificationsDropdown />
            <button onClick={toggleTheme} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {theme === 'dark' ? <Sun className="w-5 h-5" style={{ color: 'var(--accent)' }} /> : <Moon className="w-5 h-5" style={{ color: 'var(--primary)' }} />}
            </button>
            <button onClick={handleLogout} title="Logout" className="w-10 h-10 rounded-xl flex items-center justify-center transition-all text-danger hover:bg-danger/10"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 sm:p-6">
          {(currentPage === 'ai-journey' && profilePct < 80) ? (
            <ProfileCompletionGate />
          ) : (
            <>
              {currentPage === 'ai-journey' && profilePct < 100 && (
                <div className="p-4 mb-4 rounded-xl text-sm font-medium" style={{ background: 'var(--warning)', color: '#000' }}>
                  Complete your profile for more accurate recommendations.
                </div>
              )}
              {currentPage !== 'ai-journey' && <ProfileWarningBanner />}
              <PageContent page={currentPage} />
            </>
          )}
        </div>
      </main>
      <NudgeEngine />
    </div>
  )
}
