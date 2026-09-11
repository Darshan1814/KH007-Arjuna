'use client'

<<<<<<< HEAD
// ─────────────────────────────────────────────────────────────────────────────
// LOAN INTELLIGENCE ENGINE
// Replaces the original EMI Calculator. Pulls the user's actual profile,
// fetches live salary + tuition data (Gemini + Serper) with 24h localStorage
// caching, and lets the user explore conservative/smart/full coverage plans
// with rich what-if scenarios. Design tokens (colors, fonts, surfaces) are
// reused exactly as defined globally — no theming changes.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { formatINR, calculateEMI as calcEMI } from '@/lib/utils'
import {
  budgetToINR, buildScenarios, calculate80ESaving, calculateROIScore, computeEMI,
  courseDurationYears, detectCountry, detectCourse, detectUniversity, FX, FX_USD_INR,
  personalizedRate, readCache, writeCache,
} from '@/lib/loanIntel'
import {
  Calculator, Sparkles, Share2, Edit, AlertCircle, ExternalLink, Loader2, Lightbulb,
  CheckCircle, TrendingUp, MapPin, GraduationCap, Calendar, Wallet, Star, ShieldCheck,
  Clock, BadgeCheck, ArrowRight, Download, Copy, Globe2, Info, Table as TableIcon, BarChart3,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Line, ComposedChart, ReferenceLine,
} from 'recharts'

// ─────────────────────────────────────────────────────────────────────────────
// Local types for fetched intel
// ─────────────────────────────────────────────────────────────────────────────
interface SalaryIntel { min: number; avg: number; top: number; currency: string }
interface CountryIntel {
  avgSalaryLocal: number; avgSalaryINR: number; currency: string
  visaSummary: string; recommendedMaxLoanINR: number; recommendedReason: string
  risks: string[]; moneyTip: string
}
interface TuitionIntel {
  tuitionUSD: number; tuitionINR: number; source: string; sourceUrl: string; note: string
}

// Country flag emojis for the share card / hero strip.
const COUNTRY_FLAGS: Record<string, string> = {
  USA: '🇺🇸', UK: '🇬🇧', CANADA: '🇨🇦', AUSTRALIA: '🇦🇺', GERMANY: '🇩🇪',
  IRELAND: '🇮🇪', SINGAPORE: '🇸🇬', NETHERLANDS: '🇳🇱', FRANCE: '🇫🇷', NEWZEALAND: '🇳🇿',
}
const flagOf = (country: string) => COUNTRY_FLAGS[String(country || '').toUpperCase().replace(/\s+/g, '')] || '🌍'

// Cheap skeleton block that matches the existing surface tokens.
const Skeleton = ({ h = 16, w = '100%' }: { h?: number; w?: string | number }) => (
  <div className="rounded-md animate-pulse" style={{ height: h, width: w as any, background: 'var(--background-secondary)' }} />
)

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LoanIntelligenceEngine() {
  const { profile, setCurrentPage } = useAppStore()

  // Profile-derived defaults
  const country = useMemo(() => detectCountry(profile), [profile])
  const course = useMemo(() => detectCourse(profile), [profile])
  const university = useMemo(() => detectUniversity(profile), [profile])
  const duration = useMemo(() => courseDurationYears(profile), [profile])
  const intake = profile.intakeTarget || 'Fall 2026'
  const familyIncome = profile.familyIncomeStr || 'Not set'

  // ── Live intel state ──────────────────────────────────────────────────────
  const [salary, setSalary] = useState<SalaryIntel | null>(null)
  const [salaryLoading, setSalaryLoading] = useState(true)
  const [salarySource, setSalarySource] = useState<'gemini' | 'fallback' | ''>('')

  const [tuition, setTuition] = useState<TuitionIntel | null>(null)
  const [tuitionLoading, setTuitionLoading] = useState(true)
  const [tuitionSource, setTuitionSource] = useState<'serper' | 'fallback' | ''>('')

  const [countryIntel, setCountryIntel] = useState<CountryIntel | null>(null)
  const [countryLoading, setCountryLoading] = useState(true)

  // Fires the three live calls in parallel; localStorage caches them for 24h.
  useEffect(() => {
    let cancelled = false

    const cacheSalary = `salary.${country}.${course}`
    const cacheTuition = `tuition.${country}.${university}.${course}`
    const cacheCountry = `country.${country}.${course}`

    const cachedSalary = readCache<{ data: SalaryIntel; source: 'gemini' | 'fallback' }>(cacheSalary)
    const cachedTuition = readCache<{ data: TuitionIntel; source: 'serper' | 'fallback' }>(cacheTuition)
    const cachedCountry = readCache<{ data: CountryIntel; source: string }>(cacheCountry)

    if (cachedSalary) { setSalary(cachedSalary.data); setSalarySource(cachedSalary.source); setSalaryLoading(false) }
    if (cachedTuition) { setTuition(cachedTuition.data); setTuitionSource(cachedTuition.source); setTuitionLoading(false) }
    if (cachedCountry) { setCountryIntel(cachedCountry.data); setCountryLoading(false) }

    if (!cachedSalary) {
      fetch('/api/loan-intel/salary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ course, country }) })
        .then(r => r.json()).then(j => {
          if (cancelled || !j?.data) return
          setSalary(j.data); setSalarySource(j.source); setSalaryLoading(false)
          writeCache(cacheSalary, { data: j.data, source: j.source })
        }).catch(() => setSalaryLoading(false))
    }

    if (!cachedTuition) {
      fetch('/api/loan-intel/tuition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ university, course, country }) })
        .then(r => r.json()).then(j => {
          if (cancelled || !j?.data) return
          setTuition(j.data); setTuitionSource(j.source); setTuitionLoading(false)
          writeCache(cacheTuition, { data: j.data, source: j.source })
        }).catch(() => setTuitionLoading(false))
    }

    if (!cachedCountry) {
      const loanGuess = budgetToINR(profile) || 4000000
      fetch('/api/loan-intel/country', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country, course, loanAmountINR: loanGuess }) })
        .then(r => r.json()).then(j => {
          if (cancelled || !j?.data) return
          setCountryIntel(j.data); setCountryLoading(false)
          writeCache(cacheCountry, { data: j.data, source: j.source })
        }).catch(() => setCountryLoading(false))
    }
    return () => { cancelled = true }
  }, [country, course, university, profile])

  // ── Cost & scenarios (computed from live data when present) ───────────────
  const livingPerYearINR = 1200000  // ~₹12L/yr default living estimate
  const tuitionPerYearINR = tuition?.tuitionINR || (budgetToINR(profile) ? budgetToINR(profile) / Math.max(1, duration) : 35000 * FX_USD_INR)
  const totalProgrammeCostINR = (tuitionPerYearINR + livingPerYearINR) * duration
  const totalProgrammeCostLakhs = totalProgrammeCostINR / 100000

  const scenarios = useMemo(() => buildScenarios(totalProgrammeCostLakhs), [totalProgrammeCostLakhs])

  // ── Selected plan + sliders ───────────────────────────────────────────────
  const [selectedPlan, setSelectedPlan] = useState<'conservative' | 'smart' | 'full'>('smart')
  const initialPrincipalLakhs = scenarios[selectedPlan].loanLakhs

  const [principalLakhs, setPrincipalLakhs] = useState(initialPrincipalLakhs)
  const [ratePct, setRatePct] = useState(personalizedRate(profile))
  const [tenureYears, setTenureYears] = useState(10)
  const [moratoriumMonths, setMoratoriumMonths] = useState(Math.min(duration * 12 + 6, 24))
  const [prepayLakhs, setPrepayLakhs] = useState(0)
  const [scholarshipLakhs, setScholarshipLakhs] = useState(0)
  const [partTimeMonthly, setPartTimeMonthly] = useState(0)

  // When the user picks a different scenario card, push that plan into the sliders.
  const applyPlan = (k: 'conservative' | 'smart' | 'full') => {
    setSelectedPlan(k)
    setPrincipalLakhs(scenarios[k].loanLakhs)
  }

  // Recompute scenarios when underlying tuition data resolves.
  useEffect(() => {
    setPrincipalLakhs(scenarios[selectedPlan].loanLakhs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tuition?.tuitionINR])

  // ── Calculations ──────────────────────────────────────────────────────────
  const loan = useMemo(() => computeEMI({
    principalLakhs, ratePct, tenureYears, moratoriumMonths, prepayLakhs, scholarshipLakhs,
  }), [principalLakhs, ratePct, tenureYears, moratoriumMonths, prepayLakhs, scholarshipLakhs])

  // Salary in INR per year + per month (using live FX or fallback)
  const fxRate = FX[salary?.currency || 'USD'] || FX_USD_INR
  const salaryAvgINRYear = (salary?.avg || 80000) * fxRate
  const salaryMinINRYear = (salary?.min || 60000) * fxRate
  const salaryTopINRYear = (salary?.top || 110000) * fxRate
  const salaryMonthlyINR = salaryAvgINRYear / 12

  // Adjust effective EMI for part-time income (lowers burden ratio used in gauge).
  const effectiveEMIBurdenINR = Math.max(0, loan.emi - partTimeMonthly)
  const burdenPctAvg = salaryMonthlyINR > 0 ? (effectiveEMIBurdenINR / salaryMonthlyINR) * 100 : 0
  const burdenPctMin = salaryMonthlyINR > 0 ? (effectiveEMIBurdenINR / (salaryMinINRYear / 12)) * 100 : 0
  const burdenPctTop = salaryMonthlyINR > 0 ? (effectiveEMIBurdenINR / (salaryTopINRYear / 12)) * 100 : 0

  const annualInterest = Math.round(loan.totalInterest / Math.max(1, loan.payoffYear))

  // ── Share card state ──────────────────────────────────────────────────────
  const [showShare, setShowShare] = useState(false)
  const shareCardRef = useRef<HTMLDivElement>(null)

  // ── Profile completeness hint ─────────────────────────────────────────────
  const missingFields: string[] = []
  if (!university) missingFields.push('Target University')
  if (!country) missingFields.push('Target Country')
  if (!profile.intakeTarget) missingFields.push('Target Intake')
  if (!profile.familyIncomeStr) missingFields.push('Family Income')

  // ── 80E tax calculator state ──────────────────────────────────────────────
  const [taxBracket, setTaxBracket] = useState<20 | 30>(30)
  const taxSaving = calculate80ESaving(annualInterest, taxBracket)

  // ── Yearly chart toggle ───────────────────────────────────────────────────
  const [chartView, setChartView] = useState<'chart' | 'table'>('chart')

  return (
    <div className="max-w-7xl space-y-6">
      {/* ───── SECTION 1: HERO HEADER ───── */}
      <div className="card card-gradient">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
              <Calculator className="w-6 h-6" style={{ color: 'var(--primary)' }} />
              Loan Intelligence Engine
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Your complete financial picture — powered by AI, personalized to your profile.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary flex items-center gap-2 text-sm"
              onClick={() => {
                // Triggers a refetch by clearing the cache keys and re-mounting effects.
                ['salary', 'tuition', 'country'].forEach(k => {
                  Object.keys(localStorage).filter(key => key.startsWith(`gradpilot.loanIntel.${k}.`)).forEach(key => localStorage.removeItem(key))
                })
                window.location.reload()
              }}
            >
              <Sparkles className="w-4 h-4" /> Analyze My Profile
            </button>
            <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => setShowShare(true)}>
              <Share2 className="w-4 h-4" /> Share My Plan
            </button>
          </div>
        </div>
      </div>

      {/* ───── SECTION 2: PROFILE STRIP ───── */}
      <div className="card" style={{ padding: '0.85rem 1.1rem' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <Chip icon={<GraduationCap className="w-3.5 h-3.5" />} label="University" value={university || '—'} />
          <Chip icon={<MapPin className="w-3.5 h-3.5" />} label="Country" value={`${flagOf(country)} ${country}`} />
          <Chip icon={<Clock className="w-3.5 h-3.5" />} label="Duration" value={`${duration} yrs`} />
          <Chip icon={<Calendar className="w-3.5 h-3.5" />} label="Intake" value={intake} />
          <Chip icon={<Wallet className="w-3.5 h-3.5" />} label="Family Income" value={familyIncome} />
          <button onClick={() => setCurrentPage('profile')}
            className="ml-auto text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1 transition-all"
            style={{ background: 'var(--background-secondary)', color: 'var(--foreground-secondary)', border: '1px solid var(--border)' }}>
            <Edit className="w-3 h-3" /> Edit
          </button>
=======
import { useState, useMemo } from 'react'
import { calculateEMI, formatINR } from '@/lib/utils'
import { useTrack } from '@/lib/useTrack'
import { useAppStore } from '@/lib/store'
import { domesticUniversities } from '@/lib/mock-data'
import { parseFamilyIncome } from '@/lib/domesticLoan'
import {
  computeCsisEligible,
  effectiveEmi,
  type CsisReason,
} from '@/lib/csis'
import { Calculator, TrendingDown, Lightbulb, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Map a CSIS failing condition into the friendly message used by the inline
// banner shown next to the toggle (Req 9.4 / 6.4 / 6.6 / 6.7).
function csisReasonText(reason: CsisReason): string {
  switch (reason) {
    case 'income':
      return 'Family income is at or above the ₹4.5L CSIS ceiling.'
    case 'institute':
      return 'Your selected institute is not notified for CSIS.'
    case 'both':
      return 'Family income is at or above ₹4.5L and the selected institute is not notified for CSIS.'
    case 'missing-income':
      return 'Add your family annual income in onboarding to check CSIS eligibility.'
    case 'missing-institute':
      return 'Pick a target institute in the Domestic Admission Predictor to check CSIS eligibility.'
    case 'ok':
    default:
      return ''
  }
}

export default function EMICalculator() {
  const track = useTrack()
  const profile = useAppStore((s) => s.profile)

  // Track-driven default interest-rate range for the slider (Req 9.1, 9.5).
  // Domestic / both → Indian retail loan band; abroad keeps the wider band.
  const interestRange =
    track === 'abroad' ? { min: 5.0, max: 14.0 } : { min: 8.5, max: 12.0 }

  // CSIS toggle is shown only on the domestic and both tracks (Req 9.2, 9.5).
  const showCsisToggle = track === 'domestic' || track === 'both'

  const [principal, setPrincipal] = useState(40)
  const [rate, setRate] = useState(11)
  const [tenure, setTenure] = useState(10)
  const [moratorium, setMoratorium] = useState(24)
  const [prepayment, setPrepayment] = useState(0)
  const [csisOn, setCsisOn] = useState<boolean>(false)

  // Resolve CSIS context inline so we can render the eligibility banner and
  // the dual-column EMI without pulling more state into the store.
  const inst = useMemo(
    () =>
      profile.targetInstituteId
        ? domesticUniversities.find((u) => u.id === profile.targetInstituteId)
        : undefined,
    [profile.targetInstituteId],
  )
  const incomeNum =
    profile.familyAnnualIncomeINR ?? parseFamilyIncome(profile.familyIncomeStr)
  const csis = useMemo(
    () => computeCsisEligible(incomeNum, inst?.isNotifiedForCSIS),
    [incomeNum, inst?.isNotifiedForCSIS],
  )

  const principalINR = principal * 100000
  const tenureMonths = tenure * 12

  const emi = useMemo(
    () => calculateEMI(principalINR, rate, tenure),
    [principalINR, rate, tenure],
  )

  // Dual-column figures — only consumed when the toggle is on AND eligible.
  const emiWithoutCsis = useMemo(
    () => effectiveEmi(principalINR, rate, tenureMonths, false, true, moratorium),
    [principalINR, rate, tenureMonths, moratorium],
  )
  const emiWithCsis = useMemo(
    () => effectiveEmi(principalINR, rate, tenureMonths, true, true, moratorium),
    [principalINR, rate, tenureMonths, moratorium],
  )

  const totalPaid = emi * tenure * 12
  const totalInterest = totalPaid - principalINR
  const interestSaved = prepayment > 0 ? Math.round(prepayment * 100000 * (rate / 100) * (tenure / 2)) : 0

  const yearlyData = useMemo(() => {
    const data = []
    let remaining = principalINR
    for (let y = 1; y <= tenure; y++) {
      const yearlyPrincipal = Math.min(remaining, emi * 12 - remaining * (rate / 100))
      const yearlyInterest = emi * 12 - yearlyPrincipal
      remaining = Math.max(0, remaining - yearlyPrincipal)
      data.push({
        year: `Y${y}`,
        principal: Math.round(Math.max(0, yearlyPrincipal)),
        interest: Math.round(Math.max(0, yearlyInterest)),
      })
    }
    return data
  }, [principalINR, rate, tenure, emi])

  const showDualColumn = showCsisToggle && csisOn && csis.eligible
  const showCsisBanner = showCsisToggle && csisOn && !csis.eligible

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calculator className="w-6 h-6" style={{ color: 'var(--info)' }} />
          EMI &amp; Repayment Simulator
        </h2>
        <p className="mt-1" style={{ color: 'var(--foreground-secondary)' }}>
          Visualize your loan repayment with interactive sliders. See the real cost of your education loan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sliders */}
        <div className="space-y-4">
          <div className="card">
            <label className="text-sm font-medium text-white block mb-2">
              Loan Amount: <span style={{ color: 'var(--accent)' }}>₹{principal}L</span>
            </label>
            <input type="range" min="5" max="100" value={principal} onChange={e => setPrincipal(+e.target.value)} className="w-full" />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--foreground-muted)' }}><span>₹5L</span><span>₹1Cr</span></div>
          </div>
          <div className="card">
            <label className="text-sm font-medium text-white block mb-2">
              Interest Rate: <span style={{ color: 'var(--accent)' }}>{rate}%</span>
            </label>
            <input
              type="range"
              min={interestRange.min}
              max={interestRange.max}
              step="0.5"
              value={rate}
              onChange={e => setRate(+e.target.value)}
              className="w-full"
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--foreground-muted)' }}>
              <span>{interestRange.min}%</span><span>{interestRange.max}%</span>
            </div>
          </div>
          <div className="card">
            <label className="text-sm font-medium text-white block mb-2">
              Tenure: <span style={{ color: 'var(--accent)' }}>{tenure} years</span>
            </label>
            <input type="range" min="3" max="20" value={tenure} onChange={e => setTenure(+e.target.value)} className="w-full" />
          </div>
          <div className="card">
            <label className="text-sm font-medium text-white block mb-2">
              Moratorium: <span style={{ color: 'var(--info)' }}>{moratorium} months</span>
            </label>
            <input type="range" min="0" max="36" step="6" value={moratorium} onChange={e => setMoratorium(+e.target.value)} className="w-full" />
          </div>
          <div className="card">
            <label className="text-sm font-medium text-white block mb-2">
              Prepayment in Year 3: <span style={{ color: 'var(--success)' }}>₹{prepayment}L</span>
            </label>
            <input type="range" min="0" max="20" value={prepayment} onChange={e => setPrepayment(+e.target.value)} className="w-full" />
          </div>
>>>>>>> anuj
        </div>
        {missingFields.length > 0 && (
          <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--warning)' }}>
            <AlertCircle className="w-3 h-3" /> Complete your profile for better accuracy ({missingFields.join(', ')}) →
          </p>
        )}
      </div>

<<<<<<< HEAD
      {/* ───── SECTION 3: THREE SCENARIO CARDS ───── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['conservative', 'smart', 'full'] as const).map((k) => {
          const s = scenarios[k]
          const e = computeEMI({ principalLakhs: s.loanLakhs, ratePct, tenureYears, moratoriumMonths })
          const isRec = k === 'smart'
          const selected = selectedPlan === k
          return (
            <motion.div key={k} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}
              className="card" style={{
                borderColor: selected ? 'var(--primary)' : isRec ? 'rgba(99,102,241,0.35)' : 'var(--border)',
                boxShadow: selected ? '0 0 0 2px rgba(99,102,241,0.18)' : isRec ? 'var(--shadow-glow)' : 'none',
                background: selected ? 'rgba(99,102,241,0.04)' : 'var(--surface)',
              }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>{k === 'conservative' ? 'Conservative' : k === 'smart' ? 'Smart' : 'Full Coverage'}</span>
                {isRec && <span className="badge badge-primary"><Star className="w-3 h-3 mr-1" /> Recommended</span>}
=======
        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {showCsisToggle && (
            <div className="card flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={csisOn}
                  onChange={(e) => setCsisOn(e.target.checked)}
                  className="w-4 h-4"
                  aria-label="Toggle Central Sector Interest Subsidy"
                />
                <span className="text-sm font-medium text-white">
                  Apply Central Sector Interest Subsidy (CSIS)
                </span>
                {csisOn && csis.eligible && (
                  <span className="badge badge-success">Eligible</span>
                )}
                {csisOn && !csis.eligible && (
                  <span className="badge badge-warning">Not eligible</span>
                )}
              </label>
              {showCsisBanner && (
                <div
                  className="flex items-start gap-2 text-xs"
                  style={{ color: 'var(--foreground-secondary)' }}
                >
                  <AlertTriangle
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    style={{ color: 'var(--warning)' }}
                  />
                  <span>{csisReasonText(csis.reason)}</span>
                </div>
              )}
            </div>
          )}

          {showDualColumn ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="stat-card text-center">
                <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Monthly EMI · Without CSIS</div>
                <div className="text-xl font-bold text-white">{formatINR(Math.round(emiWithoutCsis))}</div>
              </div>
              <div className="stat-card text-center">
                <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Monthly EMI · With CSIS</div>
                <div className="text-xl font-bold" style={{ color: 'var(--success)' }}>
                  {formatINR(Math.round(emiWithCsis))}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--success)' }}>
                  <TrendingDown className="w-3 h-3 inline mr-1" />
                  Save {formatINR(Math.round(emiWithoutCsis - emiWithCsis))}/mo
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat-card text-center">
                <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Monthly EMI</div>
                <div className="text-xl font-bold" style={{ color: 'var(--primary-light)' }}>{formatINR(emi)}</div>
              </div>
              <div className="stat-card text-center">
                <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Total Payable</div>
                <div className="text-xl font-bold text-white">{formatINR(totalPaid)}</div>
              </div>
              <div className="stat-card text-center">
                <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Total Interest</div>
                <div className="text-xl font-bold" style={{ color: 'var(--danger)' }}>{formatINR(totalInterest)}</div>
              </div>
              <div className="stat-card text-center">
                <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Prepay Savings</div>
                <div className="text-xl font-bold" style={{ color: 'var(--success)' }}>{formatINR(interestSaved)}</div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="text-sm font-medium text-white mb-4">Yearly Breakup: Principal vs Interest</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tickFormatter={v => formatINR(v)} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1a1b2e', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8 }}
                  formatter={(v) => formatINR(Number(v))} />
                <Bar dataKey="principal" fill="#6366f1" radius={[4, 4, 0, 0]} name="Principal" />
                <Bar dataKey="interest" fill="#ef4444" radius={[4, 4, 0, 0]} name="Interest" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {prepayment > 0 && (
            <div className="card flex items-start gap-3" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
              <Lightbulb className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
              <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                <strong className="text-white">Prepayment Tip:</strong> By paying ₹{prepayment}L extra in Year 3,
                you save approximately <strong style={{ color: 'var(--success)' }}>{formatINR(interestSaved)}</strong> in interest and
                could reduce your loan tenure by {Math.ceil(prepayment / 3)} months!
>>>>>>> anuj
              </div>
              <p className="text-sm mb-3" style={{ color: 'var(--foreground-secondary)' }}>{s.label}</p>
              <div className="text-3xl font-extrabold mb-1" style={{ color: 'var(--foreground)' }}>₹{s.loanLakhs}L</div>
              <p className="text-xs mb-4" style={{ color: 'var(--foreground-muted)' }}>{k === 'conservative' ? '70% of programme cost' : k === 'smart' ? '90% of programme cost' : '100% tuition + living'}</p>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <Stat label="EMI" value={formatINR(e.emi)} />
                <Stat label="Total Pay" value={formatINR(e.totalPaid)} />
                <Stat label="Payoff Yr" value={`Y${e.payoffYear}`} />
              </div>

              <button onClick={() => applyPlan(k)}
                className={selected ? 'btn-primary w-full text-sm' : 'btn-secondary w-full text-sm'}>
                {selected ? '✓ Selected' : 'Select This Plan'}
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* ───── SECTION 4: ADJUSTMENT SLIDERS (secondary) ───── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Sparkles className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Fine-tune Your Plan
          </h3>
          <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Profile auto-fills these — adjust as needed.</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Slider label="Loan Amount" value={`₹${principalLakhs}L`} min={5} max={100} step={1} v={principalLakhs} onChange={setPrincipalLakhs} />
          <Slider label="Interest Rate" value={`${ratePct}%`} min={8} max={16} step={0.1} v={ratePct} onChange={setRatePct} />
          <Slider label="Tenure" value={`${tenureYears} yrs`} min={5} max={15} step={1} v={tenureYears} onChange={setTenureYears} />
          <Slider label="Moratorium" value={`${moratoriumMonths} mo`} min={0} max={36} step={1} v={moratoriumMonths} onChange={setMoratoriumMonths} />
          <Slider label="Prepay (Y3)" value={`₹${prepayLakhs}L`} min={0} max={20} step={1} v={prepayLakhs} onChange={setPrepayLakhs} />
          <Slider label="Scholarship" value={`₹${scholarshipLakhs}L`} min={0} max={30} step={1} v={scholarshipLakhs} onChange={setScholarshipLakhs} />
          <Slider label="Part-time Income / mo" value={formatINR(partTimeMonthly)} min={0} max={100000} step={1000} v={partTimeMonthly} onChange={setPartTimeMonthly} />
        </div>
      </div>

      {/* ───── SECTION 5: SALARY VS EMI INTELLIGENCE ───── */}
      <div className="card card-gradient">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <TrendingUp className="w-5 h-5" style={{ color: 'var(--success)' }} /> Salary vs EMI Intelligence
          </h3>
          {salarySource && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded" style={{ background: 'var(--background-secondary)', color: 'var(--foreground-muted)' }}>
              {salarySource === 'gemini' ? 'Live Gemini AI' : 'Estimate'}
            </span>
          )}
        </div>

        {salaryLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton h={180} /><Skeleton h={180} /><Skeleton h={180} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gauge */}
            <div className="flex flex-col items-center justify-center">
              <BurdenGauge percent={burdenPctAvg} />
              <p className="text-sm text-center mt-2" style={{ color: 'var(--foreground-secondary)' }}>
                Your <strong style={{ color: 'var(--foreground)' }}>{formatINR(loan.emi)}</strong> EMI = <strong style={{ color: 'var(--primary-light)' }}>{burdenPctAvg.toFixed(1)}%</strong> of your expected <strong style={{ color: 'var(--foreground)' }}>{formatINR(salaryMonthlyINR)}</strong> monthly salary
              </p>
            </div>

            {/* Three salary scenarios */}
            <div className="lg:col-span-2 space-y-3">
              <SalaryRow label="Minimum Salary" amount={salaryMinINRYear} burden={burdenPctMin} />
              <SalaryRow label="Average Salary" amount={salaryAvgINRYear} burden={burdenPctAvg} highlight />
              <SalaryRow label="Top 25% Salary" amount={salaryTopINRYear} burden={burdenPctTop} />
              <p className="text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
                Salary range from {salary?.currency} → INR @ ~{fxRate}. Comfortable: &lt;20% · Manageable: 20–35% · Caution: &gt;35%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ───── SECTION 6: COUNTRY INTELLIGENCE ───── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Globe2 className="w-5 h-5" style={{ color: 'var(--info)' }} /> {flagOf(country)} {country} Intelligence
          </h3>
        </div>
        {countryLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton h={140} /><Skeleton h={140} />
          </div>
        ) : countryIntel ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg" style={{ background: 'var(--background-secondary)', border: '1px solid var(--border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Average Starting Salary</p>
              <p className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                {countryIntel.currency} {countryIntel.avgSalaryLocal.toLocaleString()} <span className="text-sm font-normal" style={{ color: 'var(--foreground-muted)' }}>(~{formatINR(countryIntel.avgSalaryINR)})</span>
              </p>
              <p className="text-xs mt-3 mb-1" style={{ color: 'var(--foreground-muted)' }}>Visa Situation</p>
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>{countryIntel.visaSummary}</p>
            </div>
            <div className="p-4 rounded-lg" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>AI Recommended Max Loan</p>
              <p className="text-xl font-bold" style={{ color: 'var(--success)' }}>{formatINR(countryIntel.recommendedMaxLoanINR)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>{countryIntel.recommendedReason}</p>
              <p className="text-xs mt-3 mb-1 flex items-center gap-1" style={{ color: 'var(--foreground-muted)' }}>
                <Lightbulb className="w-3 h-3" /> Money-saving tip
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{countryIntel.moneyTip}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs mb-2" style={{ color: 'var(--foreground-muted)' }}>Top financial risks</p>
              <div className="flex flex-wrap gap-2">
                {countryIntel.risks.map((r, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1"
                    style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle className="w-3 h-3" /> {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>AI analysis unavailable — showing estimates.</p>
        )}
      </div>

      {/* ───── SECTION 7: WHAT-IF GRID ───── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WhatIfCard title="What if I get a scholarship?" hint={`Saves ₹${scholarshipLakhs}L from principal · New loan: ₹${Math.max(0, principalLakhs - scholarshipLakhs)}L`}>
          <Slider label="Scholarship" value={`₹${scholarshipLakhs}L`} min={0} max={30} step={1} v={scholarshipLakhs} onChange={setScholarshipLakhs} compact />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Stat label="New EMI" value={formatINR(loan.emi)} />
            <Stat label="Money Saved" value={formatINR(scholarshipLakhs * 100000)} />
          </div>
        </WhatIfCard>

        <WhatIfCard title="What if I work part-time?" hint={`Reduces monthly burden by ${formatINR(partTimeMonthly)}`}>
          <Slider label="Part-time / mo" value={formatINR(partTimeMonthly)} min={0} max={80000} step={1000} v={partTimeMonthly} onChange={setPartTimeMonthly} compact />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Stat label="Effective EMI" value={formatINR(effectiveEMIBurdenINR)} />
            <Stat label="Burden vs avg" value={`${burdenPctAvg.toFixed(1)}%`} />
          </div>
        </WhatIfCard>

        <WhatIfCard title="What if I prepay early?" hint={prepayLakhs > 0 ? `You save ${formatINR(loan.interestSavedFromPrepay)} by prepaying ₹${prepayLakhs}L in Year 3` : 'Move the slider to see savings.'} highlight={prepayLakhs > 0}>
          <Slider label="Prepay in Year 3" value={`₹${prepayLakhs}L`} min={0} max={20} step={1} v={prepayLakhs} onChange={setPrepayLakhs} compact />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Stat label="Interest Saved" value={formatINR(loan.interestSavedFromPrepay)} good />
            <Stat label="Months Cut" value={`${loan.monthsSavedFromPrepay} mo`} good />
          </div>
        </WhatIfCard>

        <SwitchCountryCard
          baseCountry={country} baseProgramCostINR={totalProgrammeCostINR} baseLoanLakhs={principalLakhs}
          baseEMI={loan.emi} baseSalaryAvgINR={salaryAvgINRYear}
        />
      </div>

      {/* ───── SECTION 8: YEARLY BREAKUP ───── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Yearly Breakup: Principal vs Interest</h3>
          <div className="flex items-center gap-1 p-1 rounded-md" style={{ background: 'var(--background-secondary)', border: '1px solid var(--border)' }}>
            <button onClick={() => setChartView('chart')}
              className="text-xs px-3 py-1 rounded flex items-center gap-1"
              style={{ background: chartView === 'chart' ? 'var(--surface)' : 'transparent', color: chartView === 'chart' ? 'var(--foreground)' : 'var(--foreground-muted)' }}>
              <BarChart3 className="w-3 h-3" /> Chart
            </button>
            <button onClick={() => setChartView('table')}
              className="text-xs px-3 py-1 rounded flex items-center gap-1"
              style={{ background: chartView === 'table' ? 'var(--surface)' : 'transparent', color: chartView === 'table' ? 'var(--foreground)' : 'var(--foreground-muted)' }}>
              <TableIcon className="w-3 h-3" /> Table
            </button>
          </div>
        </div>

        {chartView === 'chart' ? (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={loan.yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--foreground-secondary)', fontSize: 12 }} />
              <YAxis tickFormatter={v => formatINR(Number(v))} tick={{ fill: 'var(--foreground-secondary)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)' }}
                formatter={(v: any) => formatINR(Number(v))} />
              {moratoriumMonths >= 12 && <ReferenceLine x={`Y${Math.ceil(moratoriumMonths / 12)}`} stroke="var(--warning)" strokeDasharray="4 4" label={{ value: 'Moratorium ends', fill: 'var(--warning)', fontSize: 10, position: 'top' }} />}
              {prepayLakhs > 0 && <ReferenceLine x="Y3" stroke="var(--success)" strokeDasharray="4 4" label={{ value: 'Prepay here', fill: 'var(--success)', fontSize: 10, position: 'top' }} />}
              <Bar dataKey="principal" fill="#6366f1" radius={[4, 4, 0, 0]} name="Principal" />
              <Bar dataKey="interest" fill="#ef4444" radius={[4, 4, 0, 0]} name="Interest" />
              <Line type="monotone" dataKey="cumInterest" stroke="#f59e0b" strokeWidth={2} dot={false} name="Cumulative Interest" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-2 text-xs uppercase" style={{ color: 'var(--foreground-muted)' }}>Year</th>
                  <th className="text-right py-2 text-xs uppercase" style={{ color: 'var(--foreground-muted)' }}>Principal</th>
                  <th className="text-right py-2 text-xs uppercase" style={{ color: 'var(--foreground-muted)' }}>Interest</th>
                  <th className="text-right py-2 text-xs uppercase" style={{ color: 'var(--foreground-muted)' }}>Cum. Interest</th>
                  <th className="text-right py-2 text-xs uppercase" style={{ color: 'var(--foreground-muted)' }}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {loan.yearly.map((y) => (
                  <tr key={y.year} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2" style={{ color: 'var(--foreground)' }}>{y.year}</td>
                    <td className="py-2 text-right" style={{ color: 'var(--primary-light)' }}>{formatINR(y.principal)}</td>
                    <td className="py-2 text-right" style={{ color: 'var(--danger)' }}>{formatINR(y.interest)}</td>
                    <td className="py-2 text-right" style={{ color: 'var(--accent)' }}>{formatINR(y.cumInterest)}</td>
                    <td className="py-2 text-right" style={{ color: 'var(--foreground-secondary)' }}>{formatINR(y.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ───── SECTION 9: PERSONALIZED LOAN MATCH ───── */}
      <PoonawallaMatch profile={profile} principalLakhs={principalLakhs} ratePct={ratePct} country={country} />

      {/* ───── SECTION 11: 80E TAX BENEFIT ───── */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <ShieldCheck className="w-5 h-5" style={{ color: 'var(--success)' }} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--foreground)' }}>Section 80E Tax Benefit</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--foreground-secondary)' }}>
              Interest paid on education loans is fully deductible from taxable income under Section 80E.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                Annual interest: <strong style={{ color: 'var(--foreground)' }}>{formatINR(annualInterest)}</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Tax bracket:</span>
                <select className="input-field text-xs" style={{ width: 80, padding: '0.4rem 0.6rem' }} value={taxBracket} onChange={(e) => setTaxBracket(parseInt(e.target.value) as 20 | 30)}>
                  <option value={20}>20%</option>
                  <option value={30}>30%</option>
                </select>
              </div>
              <div className="text-sm font-bold ml-auto" style={{ color: 'var(--success)' }}>
                You save {formatINR(taxSaving)} in taxes annually
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tuition source footer */}
      {tuition && (
        <p className="text-[11px] flex items-center gap-1" style={{ color: 'var(--foreground-muted)' }}>
          <Info className="w-3 h-3" /> Tuition: {tuitionSource === 'serper' ? 'Live data from' : 'Estimate via'} {tuition.source}
          {tuition.sourceUrl && (
            <a href={tuition.sourceUrl} target="_blank" rel="noopener noreferrer" className="loan-link inline-flex items-center gap-1 ml-1">
              source <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </p>
      )}

      {/* Share modal */}
      <AnimatePresence>
        {showShare && (
          <ShareModal
            cardRef={shareCardRef}
            onClose={() => setShowShare(false)}
            profile={profile}
            country={country}
            university={university}
            tuitionINR={tuitionPerYearINR * duration}
            livingINR={livingPerYearINR * duration}
            loanLakhs={principalLakhs}
            emi={loan.emi}
            salaryAnnualINR={salaryAvgINRYear}
            payoffYear={loan.payoffYear}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS — kept in this file to avoid breaking unrelated pages
// ─────────────────────────────────────────────────────────────────────────────

function Chip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md"
      style={{ background: 'var(--background-secondary)', border: '1px solid var(--border)', color: 'var(--foreground-secondary)' }}>
      <span style={{ color: 'var(--primary-light)' }}>{icon}</span>
      <span style={{ color: 'var(--foreground-muted)' }}>{label}:</span>
      <strong style={{ color: 'var(--foreground)' }}>{value}</strong>
    </span>
  )
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="p-2 rounded-md text-center" style={{ background: 'var(--background-secondary)' }}>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--foreground-muted)' }}>{label}</div>
      <div className="text-sm font-bold" style={{ color: good ? 'var(--success)' : 'var(--foreground)' }}>{value}</div>
    </div>
  )
}

function Slider({ label, value, min, max, step, v, onChange, compact }: {
  label: string; value: string; min: number; max: number; step: number;
  v: number; onChange: (n: number) => void; compact?: boolean
}) {
  return (
    <div className={compact ? '' : 'card'} style={compact ? {} : undefined}>
      <label className="text-xs font-medium block mb-1.5 flex items-center justify-between" style={{ color: 'var(--foreground-secondary)' }}>
        <span>{label}</span>
        <span className="font-bold" style={{ color: 'var(--primary-light)' }}>{value}</span>
      </label>
      <input type="range" min={min} max={max} step={step} value={v}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  )
}

function BurdenGauge({ percent }: { percent: number }) {
  const pct = Math.max(0, Math.min(100, percent))
  // Color zones: <20 success, 20-35 warning, >35 danger
  const color = pct < 20 ? 'var(--success)' : pct < 35 ? 'var(--warning)' : 'var(--danger)'
  const label = pct < 20 ? 'Comfortable Zone' : pct < 35 ? 'Manageable Zone' : 'Caution Zone'
  // Half-doughnut gauge using SVG arcs
  const r = 80
  const circ = Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div className="relative w-[220px] h-[140px]">
      <svg viewBox="0 0 200 120" className="w-full h-full">
        <path d={`M 20 110 A ${r} ${r} 0 0 1 180 110`} fill="none" stroke="var(--background-secondary)" strokeWidth="14" strokeLinecap="round" />
        <path d={`M 20 110 A ${r} ${r} 0 0 1 180 110`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div className="absolute inset-x-0 bottom-2 flex flex-col items-center">
        <span className="text-3xl font-extrabold" style={{ color }}>{pct.toFixed(1)}%</span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
      </div>
    </div>
  )
}

function SalaryRow({ label, amount, burden, highlight }: { label: string; amount: number; burden: number; highlight?: boolean }) {
  const color = burden < 20 ? 'var(--success)' : burden < 35 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div className="flex items-center justify-between p-3 rounded-lg" style={{
      background: highlight ? 'rgba(99,102,241,0.06)' : 'var(--background-secondary)',
      border: highlight ? '1px solid rgba(99,102,241,0.25)' : '1px solid var(--border)',
    }}>
      <div>
        <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>{label} (annual)</div>
        <div className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{formatINR(amount)}</div>
      </div>
      <div className="text-right">
        <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>EMI burden</div>
        <div className="text-base font-bold" style={{ color }}>{burden.toFixed(1)}%</div>
      </div>
    </div>
  )
}

function WhatIfCard({ title, hint, highlight, children }: {
  title: string; hint: string; highlight?: boolean; children: React.ReactNode
}) {
  return (
    <div className="card" style={{ borderColor: highlight ? 'rgba(16,185,129,0.35)' : undefined, background: highlight ? 'rgba(16,185,129,0.04)' : undefined }}>
      <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--foreground)' }}>{title}</h4>
      <p className="text-xs mb-3" style={{ color: 'var(--foreground-secondary)' }}>{hint}</p>
      {children}
    </div>
  )
}

function SwitchCountryCard({ baseCountry, baseProgramCostINR, baseLoanLakhs, baseEMI, baseSalaryAvgINR }: {
  baseCountry: string; baseProgramCostINR: number; baseLoanLakhs: number; baseEMI: number; baseSalaryAvgINR: number
}) {
  const [alt, setAlt] = useState<string>('GERMANY')
  const altCountries = ['USA', 'UK', 'CANADA', 'AUSTRALIA', 'GERMANY', 'IRELAND', 'SINGAPORE'].filter(c => c !== baseCountry.toUpperCase())

  // Cheap relative model so this is instant: each country has a cost / salary multiplier vs baseline.
  const COST_MULT: Record<string, number> = { USA: 1.0, UK: 0.85, CANADA: 0.7, AUSTRALIA: 0.78, GERMANY: 0.35, IRELAND: 0.7, SINGAPORE: 0.75 }
  const SAL_MULT:  Record<string, number> = { USA: 1.0, UK: 0.6,  CANADA: 0.62, AUSTRALIA: 0.7,  GERMANY: 0.55, IRELAND: 0.6, SINGAPORE: 0.65 }
  const baseMult = { cost: COST_MULT[baseCountry.toUpperCase()] ?? 1, sal: SAL_MULT[baseCountry.toUpperCase()] ?? 1 }
  const altMult  = { cost: COST_MULT[alt] ?? 0.7, sal: SAL_MULT[alt] ?? 0.7 }

  const altCost = baseProgramCostINR * (altMult.cost / baseMult.cost)
  const altLoanLakhs = Math.round(baseLoanLakhs * (altMult.cost / baseMult.cost))
  const altEMI = calcEMI(altLoanLakhs * 100000, 11, 10)
  const altSalary = baseSalaryAvgINR * (altMult.sal / baseMult.sal)

  return (
    <div className="card">
      <h4 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
        <Globe2 className="w-4 h-4" style={{ color: 'var(--info)' }} /> What if I switch countries?
      </h4>
      <p className="text-xs mb-3" style={{ color: 'var(--foreground-secondary)' }}>
        Compare {flagOf(baseCountry)} {baseCountry} with another option (rough estimate, instant).
      </p>
      <select className="input-field text-sm mb-3" value={alt} onChange={(e) => setAlt(e.target.value)}>
        {altCountries.map(c => <option key={c} value={c}>{flagOf(c)} {c}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <CompareCol title={`${flagOf(baseCountry)} ${baseCountry}`} cost={baseProgramCostINR} loan={baseLoanLakhs * 100000} emi={baseEMI} salary={baseSalaryAvgINR} />
        <CompareCol title={`${flagOf(alt)} ${alt}`} cost={altCost} loan={altLoanLakhs * 100000} emi={altEMI} salary={altSalary} alt />
      </div>
    </div>
  )
}

function CompareCol({ title, cost, loan, emi, salary, alt }: { title: string; cost: number; loan: number; emi: number; salary: number; alt?: boolean }) {
  return (
    <div className="p-2 rounded-md" style={{ background: 'var(--background-secondary)', border: alt ? '1px solid rgba(6,182,212,0.3)' : '1px solid var(--border)' }}>
      <div className="font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>{title}</div>
      <div className="flex justify-between"><span style={{ color: 'var(--foreground-muted)' }}>Cost</span><strong style={{ color: 'var(--foreground)' }}>{formatINR(cost)}</strong></div>
      <div className="flex justify-between"><span style={{ color: 'var(--foreground-muted)' }}>Loan</span><strong style={{ color: 'var(--foreground)' }}>{formatINR(loan)}</strong></div>
      <div className="flex justify-between"><span style={{ color: 'var(--foreground-muted)' }}>EMI</span><strong style={{ color: 'var(--accent)' }}>{formatINR(emi)}</strong></div>
      <div className="flex justify-between"><span style={{ color: 'var(--foreground-muted)' }}>Salary</span><strong style={{ color: 'var(--success)' }}>{formatINR(salary)}</strong></div>
    </div>
  )
}

function PoonawallaMatch({ profile, principalLakhs, ratePct, country }: { profile: any; principalLakhs: number; ratePct: number; country: string }) {
  const collateralNeeded = profile.collateralAvailableStr === 'Yes' ? false : principalLakhs > 25
  const moratoriumMonths = 12
  const processingTime = '72 hours'

  return (
    <div className="card card-gradient">
      <div className="flex items-center gap-2 mb-3">
        <BadgeCheck className="w-5 h-5" style={{ color: 'var(--primary)' }} />
        <h3 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Your Personalized Loan Match</h3>
        <span className="badge badge-success ml-auto">Pre-qualified</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Loan Amount" value={`₹${principalLakhs}L`} />
        <Stat label="Your Rate" value={`${ratePct}% p.a.`} />
        <Stat label="Collateral" value={collateralNeeded ? 'Required' : 'Not Needed'} />
        <Stat label="Moratorium" value={`${moratoriumMonths} mo`} />
      </div>

      <div className="flex flex-wrap gap-2">
        <TrustBadge icon={<ShieldCheck className="w-3 h-3" />} text="No Hidden Charges" />
        <TrustBadge icon={<Sparkles className="w-3 h-3" />} text="100% Digital Process" />
        <TrustBadge icon={<Clock className="w-3 h-3" />} text={`Approval in ${processingTime}`} />
      </div>
    </div>
  )
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
      style={{ background: 'var(--background-secondary)', border: '1px solid var(--border)', color: 'var(--foreground-secondary)' }}>
      <span style={{ color: 'var(--success)' }}>{icon}</span> {text}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARE MODAL — generates a downloadable summary card
// ─────────────────────────────────────────────────────────────────────────────
function ShareModal(props: {
  cardRef: React.RefObject<HTMLDivElement | null>
  onClose: () => void
  profile: any
  country: string
  university: string
  tuitionINR: number
  livingINR: number
  loanLakhs: number
  emi: number
  salaryAnnualINR: number
  payoffYear: number
}) {
  const { onClose, profile, country, university, tuitionINR, livingINR, loanLakhs, emi, salaryAnnualINR, payoffYear } = props
  const totalInvestmentINR = tuitionINR + livingINR
  const totalLoanRepaidINR = emi * 12 * payoffYear
  const roi = calculateROIScore(salaryAnnualINR, totalLoanRepaidINR)
  const url = typeof window !== 'undefined' ? window.location.origin : 'https://gradpilot.app'
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}&color=6366F1&bgcolor=141425`

  const shareText = `My EduFinAI Plan: ${university || country} · Loan ₹${loanLakhs}L · EMI ${formatINR(emi)} · ROI ${roi}/10`

  const copyLink = () => {
    navigator.clipboard.writeText(`${shareText}\n${url}`)
  }

  const downloadPNG = async () => {
    // Lightweight DOM-to-image fallback using SVG foreignObject if html2canvas
    // is unavailable in the host project. We snapshot the rendered card's HTML.
    const node = document.getElementById('share-card-render')
    if (!node) return
    const w = node.offsetWidth || 480
    const h = node.offsetHeight || 600
    const xml = new XMLSerializer().serializeToString(node)
    const html = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${xml}</div></foreignObject></svg>`
    const blob = new Blob([html], { type: 'image/svg+xml;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `EduFinAI-Plan-${(profile?.name || 'student').replace(/\s+/g, '-')}.svg`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <motion.div
        initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }}
        className="relative max-w-md w-full"
        onClick={(e) => e.stopPropagation()}>

        {/* The actual card the user shares */}
        <div id="share-card-render" className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', fontFamily: 'inherit' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold tracking-widest opacity-90">EDUFINAI · STUDY PLAN</div>
            <Star className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold mb-1">{profile.name || 'Student'}</div>
          <div className="text-sm opacity-90 mb-4">{flagOf(country)} {university || country}</div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="text-[10px] opacity-80 uppercase">Total Investment</div>
              <div className="text-lg font-bold">{formatINR(totalInvestmentINR)}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="text-[10px] opacity-80 uppercase">Loan</div>
              <div className="text-lg font-bold">₹{loanLakhs}L</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="text-[10px] opacity-80 uppercase">Monthly EMI</div>
              <div className="text-lg font-bold">{formatINR(emi)}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="text-[10px] opacity-80 uppercase">Expected Salary</div>
              <div className="text-lg font-bold">{formatINR(salaryAnnualINR)}/yr</div>
            </div>
          </div>

          <div className="rounded-xl p-3 mb-4 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <div>
              <div className="text-[10px] opacity-80 uppercase">ROI Score</div>
              <div className="text-3xl font-extrabold">{roi}<span className="text-lg opacity-70">/10</span></div>
            </div>
            <div className="text-right">
              <div className="text-[10px] opacity-80 uppercase">Payoff Year</div>
              <div className="text-2xl font-extrabold">Y{payoffYear}</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[10px] opacity-90">Powered by EduFinAI</div>
            <img src={qr} alt="qr" className="w-12 h-12 rounded" />
          </div>
        </div>

        {/* Action bar */}
        <div className="mt-3 card flex flex-wrap items-center gap-2">
          <button onClick={downloadPNG} className="btn-primary text-xs flex items-center gap-1"><Download className="w-3 h-3" /> Download</button>
          <button onClick={copyLink} className="btn-secondary text-xs flex items-center gap-1"><Copy className="w-3 h-3" /> Copy Link</button>
          <a target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`} className="btn-secondary text-xs">WhatsApp</a>
          <a target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} className="btn-secondary text-xs">LinkedIn</a>
          <a target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + ' ' + url)}`} className="btn-secondary text-xs">X</a>
          <button onClick={onClose} className="text-xs ml-auto px-3 py-2" style={{ color: 'var(--foreground-muted)' }}>Close</button>
        </div>
      </motion.div>
    </motion.div>
  )
}
