'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { universities } from '@/lib/mock-data'
import { calculateDreamScore, getAdmissionProbability, formatINR, calculateEMI, parseBudgetToLakhs, parseNumber } from '@/lib/utils'
import {
  Target, TrendingUp, DollarSign, BookOpen, Shield,
  MessageCircle, ChevronRight, Bell, AlertTriangle,
  GraduationCap, Flame, Zap, ArrowUpRight, Trophy, Clock,
  Search, FileText, UserCheck, Gift, Award, User, Briefcase, Globe, Wallet
} from 'lucide-react'
import { calculateProfileCompleteness } from '../NudgeEngine'

const SnapshotCard = ({ title, icon: Icon, children }: any) => (
  <div className="card p-4 flex flex-col gap-2 bg-surface/50 border border-border/50 hover:border-primary/30 transition-colors">
    <div className="flex items-center gap-2 mb-1 text-primary-light">
      <Icon className="w-4 h-4" />
      <span className="font-semibold text-sm">{title}</span>
    </div>
    <div className="text-xs space-y-1 text-foreground-secondary">
      {children}
    </div>
  </div>
)

export default function DashboardHome() {
  const { profile, setCurrentPage, updateProfile, notifications } = useAppStore()

  const dreamScore = useMemo(() => calculateDreamScore(profile), [profile])

  // Update profile with calculated dream score
  useMemo(() => {
    if (dreamScore !== profile.dreamScore) {
      updateProfile({ dreamScore })
    }
  }, [dreamScore, profile.dreamScore, updateProfile])

  // Parse financials from the new onboarding schema or fallback to legacy
  const budgetLakhs = parseBudgetToLakhs(profile.expectedBudgetStr) || profile.budgetLakhs || 0
  const totalBudgetINR = budgetLakhs * 100000
  
  // If user typed a loan estimate string, try to parse it, otherwise calculate based on budget
  const userLoanEst = parseNumber(profile.loanEstimateStr, 0)
  const savingsLakhs = parseNumber(profile.savingsLakhs, 5) // default 5L buffer
  const loanNeededINR = userLoanEst > 0 ? userLoanEst : Math.max(0, totalBudgetINR - (savingsLakhs * 100000))
  const monthlyEMI = loanNeededINR > 0 ? calculateEMI(loanNeededINR, 10.5, 10) : 0

  const topMatches = useMemo(() => {
    return universities.slice(0, 6).map(u => ({
      ...u,
      admission: getAdmissionProbability(profile.undergradCgpa || profile.cgpa, profile.greScoreStr || profile.greScore, u.ranking),
      tuitionINR: u.tuitionUSD * 83.5,
      salaryINR: u.avgSalaryUSD * 83.5,
    }))
  }, [profile.undergradCgpa, profile.cgpa, profile.greScoreStr, profile.greScore])

  const nextBestAction = useMemo(() => {
    const completeness = calculateProfileCompleteness(profile)
    if (completeness < 70) return { text: 'Complete your profile to unlock loan rates', page: 'onboarding' as const, color: '#f59e0b' }
    if (profile.journeyStage === 'EXPLORER') return { text: 'Find universities for your profile', page: 'admission-predictor' as const, color: '#6366f1' }
    if (profile.journeyStage === 'RESEARCHER') return { text: 'Draft your SOP with AI Co-Pilot', page: 'sop-copilot' as const, color: '#ec4899' }
    if (profile.journeyStage === 'APPLICANT') return { text: 'Start your loan application', page: 'loan-apply' as const, color: '#10b981' }
    if (profile.journeyStage === 'LOAN_SEEKER') return { text: 'Check your application status', page: 'loan-apply' as const, color: '#8b5cf6' }
    return { text: 'Prepare for your visa interview', page: 'visa-simulator' as const, color: '#8b5cf6' }
  }, [profile])


  const quickActions = [
    { icon: Target, label: 'Find Universities', page: 'admission-predictor' as const, color: '#6366f1' },
    { icon: TrendingUp, label: 'Calculate ROI', page: 'roi-calculator' as const, color: '#10b981' },
    { icon: DollarSign, label: 'Check Loan', page: 'loan-center' as const, color: '#f59e0b' },
    { icon: Award, label: 'Scholarships', page: 'scholarship-hunter' as const, color: '#fbbf24' },
    { icon: BookOpen, label: 'Write SOP', page: 'sop-copilot' as const, color: '#ec4899' },
    { icon: Shield, label: 'Visa Prep', page: 'visa-simulator' as const, color: '#8b5cf6' },
  ]

  const targets = profile.targetCountries || profile.targetCountry || []

  return (
    <div className="max-w-6xl space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Welcome back, {profile.name || 'Student'}! 👋
        </h1>
        <p style={{ color: 'var(--foreground-secondary)' }}>
          Here&apos;s your personalized study abroad journey at a glance.
        </p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dream Score Ring */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="card card-gradient sm:row-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Dream Score™</span>
          </div>
          <div className="dream-score-ring mx-auto">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle cx="100" cy="100" r="85" fill="none" stroke="var(--background-secondary)" strokeWidth="12" />
              <circle cx="100" cy="100" r="85" fill="none"
                stroke="url(#scoreGrad)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${(dreamScore / 1000) * 534} 534`} />
              <defs>
                <linearGradient id="scoreGrad"><stop offset="0%" stopColor="var(--primary)" /><stop offset="100%" stopColor="var(--secondary)" /></linearGradient>
              </defs>
            </svg>
            <div className="score-value">
              <span className="text-3xl font-extrabold" style={{ color: 'var(--primary-light)' }}>{dreamScore}</span>
              <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>/1000</span>
            </div>
          </div>
          <div className="text-center mt-3">
            <div className="flex items-center justify-center gap-1 text-sm" style={{ color: 'var(--success)' }}>
              <ArrowUpRight className="w-4 h-4" /> Score Updated
            </div>
            <button onClick={() => setCurrentPage('career-navigator')}
              className="text-sm mt-2 flex items-center gap-1 mx-auto" style={{ color: 'var(--primary-light)' }}>
              Improve Score <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Academic */}
        <div className="stat-card">
          <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Academic</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            {profile.undergradCgpa || profile.cgpa || 'N/A'}<span className="text-sm font-normal">/10</span>
          </div>
          <div className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            GRE: {profile.greScoreStr || profile.greScore || 'N/A'}
          </div>
        </div>

        {/* Target */}
        <div className="stat-card">
          <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Target</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{targets.length} <span className="text-sm font-normal">countries</span></div>
          <div className="text-xs truncate" style={{ color: 'var(--foreground-secondary)' }}>{targets.join(', ') || 'Not set'}</div>
        </div>

        {/* Budget in INR */}
        <div className="stat-card">
          <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Est. Budget</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{totalBudgetINR > 0 ? formatINR(totalBudgetINR) : 'N/A'}</div>
          <div className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>{profile.expectedBudgetStr || 'No budget set'}</div>
        </div>

        {/* Loan & EMI */}
        <div className="stat-card">
          <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Loan Required</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{loanNeededINR > 0 ? formatINR(loanNeededINR) : 'N/A'}</div>
          <div className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            {monthlyEMI > 0 ? `Est EMI: ${formatINR(monthlyEMI)}/mo` : 'No loan needed'}
          </div>
        </div>

        {/* Gamification */}
        <div className="stat-card">
          <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Gamification</div>
          <div className="flex items-center gap-2">
            <span className="streak-fire"><Flame className="w-4 h-4" /> {profile.streakDays}d</span>
            <span className="badge badge-primary"><Zap className="w-3 h-3 mr-1" />{profile.xpPoints} XP</span>
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>{profile.badges?.length || 0} badges earned</div>
        </div>

        {/* Scholarships Matches */}
        <div className="stat-card cursor-pointer" onClick={() => setCurrentPage('scholarship-hunter')}>
          <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Scholarships</div>
          <div className="text-2xl font-bold text-amber-500">12+ <span className="text-sm font-normal">matches</span></div>
          <div className="text-xs flex items-center gap-1" style={{ color: 'var(--foreground-secondary)' }}>
            <Sparkles className="w-3 h-3 text-amber-400" /> ₹8.5L potential aid
          </div>
        </div>
      </div>

      {/* Profile Snapshot 9-Step Review */}
      <div className="mt-8">
        <div className="flex justify-between items-end mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <User className="w-4 h-4 text-primary" /> Your Profile Snapshot
          </h2>
          <button 
            onClick={() => setCurrentPage('onboarding')}
            className="text-xs text-primary hover:text-primary-light flex items-center gap-1"
          >
            Edit Profile <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SnapshotCard title="Identity & Academics" icon={User}>
            <p><strong>Education:</strong> {profile.educationLevel || 'N/A'}</p>
            <p><strong>College:</strong> {profile.undergradCollege || 'N/A'}</p>
            <p><strong>Degree:</strong> {profile.undergradDegree || 'N/A'}</p>
            <p><strong>CGPA:</strong> {profile.undergradCgpa || profile.cgpa || 'N/A'}</p>
          </SnapshotCard>
          <SnapshotCard title="Work Experience" icon={Briefcase}>
            <p><strong>Status:</strong> {profile.isWorkingProfessional || 'N/A'}</p>
            <p><strong>Company:</strong> {profile.companyName || 'N/A'}</p>
            <p><strong>Role:</strong> {profile.jobRole || 'N/A'}</p>
            <p><strong>Years Exp:</strong> {profile.yearsExperience || profile.workExpYears || '0'}</p>
          </SnapshotCard>
          <SnapshotCard title="Study Goals" icon={Globe}>
            <p><strong>Goal:</strong> {profile.studyGoal || 'N/A'}</p>
            <p><strong>Destinations:</strong> {targets.join(', ') || 'N/A'}</p>
            <p><strong>Degree:</strong> {profile.targetDegree || profile.targetProgram || 'N/A'}</p>
            <p><strong>Intake:</strong> {profile.intakeTarget || 'N/A'}</p>
          </SnapshotCard>
          <SnapshotCard title="Exams & Universities" icon={BookOpen}>
            <p><strong>GRE:</strong> {profile.greScoreStr || profile.greScore || 'N/A'} ({profile.greStatus || 'N/A'})</p>
            <p><strong>IELTS/TOEFL:</strong> {profile.ieltsScore || profile.toeflScore || 'N/A'} ({profile.ieltsStatus || 'N/A'})</p>
            <p className="truncate"><strong>Dream Unis:</strong> {(profile.dreamUniversities || []).join(', ') || 'None yet'}</p>
          </SnapshotCard>
          <SnapshotCard title="Financials" icon={Wallet}>
            <p><strong>Funding:</strong> {profile.fundingSource || 'N/A'}</p>
            <p><strong>Budget:</strong> {profile.expectedBudgetStr || 'N/A'}</p>
            <p><strong>Loan Est:</strong> {profile.loanEstimateStr || 'N/A'}</p>
            <p><strong>Collateral:</strong> {profile.collateralAvailableStr || 'N/A'}</p>
          </SnapshotCard>
          <SnapshotCard title="Documents" icon={FileText}>
            <p><strong>Passport:</strong> {profile.docPassport || 'N/A'}</p>
            <p><strong>Transcripts:</strong> {profile.docTranscripts || 'N/A'}</p>
            <p><strong>SOP:</strong> {profile.docSop || 'N/A'}</p>
            <p><strong>LORs:</strong> {profile.docLors || 'N/A'}</p>
          </SnapshotCard>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <motion.button key={action.label} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setCurrentPage(action.page)}
              className="card flex flex-col items-center gap-2 py-4 cursor-pointer text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${action.color}12`, border: `1px solid ${action.color}25` }}>
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Journey Stage & Next Action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card md:col-span-2 flex items-center justify-between p-6 overflow-hidden relative">
          <div className="relative z-10 space-y-1">
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Your Current Stage</div>
            <h3 className="text-xl font-bold text-[var(--foreground)]">{profile.journeyStage}</h3>
            <p className="text-xs text-white/40">Next Step: {nextBestAction.text}</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 relative z-10">
            {['EXPLORER', 'RESEARCHER', 'APPLICANT', 'LOAN_SEEKER', 'SUBMITTED'].map((s, i, arr) => {
              const active = arr.indexOf(profile.journeyStage) >= i
              return (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-white/20'
                  }`}>
                    {i + 1}
                  </div>
                  {i < arr.length - 1 && <div className={`w-4 sm:w-8 h-[2px] ${active ? 'bg-indigo-600' : 'bg-white/5'}`} />}
                </div>
              )
            })}
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
        </div>

        <motion.button whileHover={{ scale: 1.02 }} onClick={() => setCurrentPage(nextBestAction.page)}
          className="card border-indigo-500/30 bg-indigo-500/5 flex flex-col justify-center p-6 gap-2">
          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Next Best Action</div>
          <div className="text-sm font-bold text-[var(--foreground)] leading-tight">{nextBestAction.text}</div>
          <div className="flex items-center gap-1 text-indigo-400 text-xs font-medium">
            Start Now <ArrowUpRight className="w-3 h-3" />
          </div>
        </motion.button>
      </div>

      {/* Smart Nudges */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
          <Bell className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Smart Nudges
        </h2>
        <div className="space-y-2">
          {notifications.length > 0 ? (
            notifications.slice(0, 3).map((n, i) => (
              <motion.button key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => n.actionPage && setCurrentPage(n.actionPage)}
                className="card w-full text-left flex items-center gap-3 hover:bg-white/[0.02] transition-all" style={{ padding: '0.75rem 1rem' }}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  n.type === 'urgent' ? 'bg-red-500 animate-pulse' :
                  n.type === 'warning' ? 'bg-amber-500' :
                  n.type === 'success' ? 'bg-green-500' : 'bg-indigo-500'
                }`} />
                <span className="text-sm flex-1 font-medium" style={{ color: 'var(--foreground)' }}>{n.title}</span>
                <span className="text-xs hidden sm:block" style={{ color: 'var(--foreground-muted)' }}>{n.message.slice(0, 50)}...</span>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--foreground-muted)' }} />
              </motion.button>
            ))
          ) : (
            <div className="card text-center py-6 text-white/20 text-xs italic">
              Analyzing your journey for insights...
            </div>
          )}
        </div>
      </div>

      {/* University Matches */}
      <div>
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Top University Matches</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topMatches.slice(0, 3).map((u, i) => (
            <motion.div key={u.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="card glass glass-hover cursor-pointer"
              onClick={() => setCurrentPage('admission-predictor')}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <GraduationCap className="w-5 h-5 mb-1" style={{ color: 'var(--primary-light)' }} />
                  <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{u.name}</div>
                  <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>{u.city}, {u.country}</div>
                </div>
                <span className={`tag-${u.admission.category}`}>{u.admission.category}</span>
              </div>
              <div className="text-xs mb-1" style={{ color: 'var(--foreground-secondary)' }}>{u.program}</div>
              <div className="text-xs mb-2" style={{ color: 'var(--foreground-muted)' }}>
                Tuition: {formatINR(u.tuitionINR)}/yr • Avg Salary: {formatINR(u.salaryINR)}/yr
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{
                  color: u.admission.category === 'safety' ? '#10b981' : u.admission.category === 'match' ? '#f59e0b' : '#ef4444'
                }}>{u.admission.probability}% chance</span>
                <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>#{u.ranking} ranked</span>
              </div>
              <div className="progress-bar mt-2">
                <div className="h-full rounded-full" style={{
                  width: `${u.admission.probability}%`,
                  background: u.admission.category === 'safety' ? '#10b981' : u.admission.category === 'match' ? '#f59e0b' : '#ef4444'
                }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Sparkles(props: React.SVGProps<SVGSVGElement> & { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  )
}
