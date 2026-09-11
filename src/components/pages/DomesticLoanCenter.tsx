'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Domestic Loan Center
//
// Source of truth:
//   - .kiro/specs/domestic-track-mvp/requirements.md → Req 5 (loan tri-state),
//     Req 6 (CSIS preview), Req 16 (module isolation: net-new file; no edits
//     to LoanCenter.tsx).
//   - .kiro/specs/domestic-track-mvp/design.md → "Components and Interfaces"
//     row for DomesticLoanCenter, "Loan eligibility (pseudocode)", "CSIS
//     calculator (pseudocode)", and the Error Handling rows for loan/CSIS.
//
// Conventions:
//   - This is a Client Component (Zustand selector + local state for the
//     CSIS savings calculator inputs).
//   - Theme: only existing utility classes (`card`, `glass`, `glass-hover`,
//     `stat-card`, `badge`, `badge-success`, `badge-warning`, `badge-danger`,
//     `badge-primary`, `btn-primary`, `btn-secondary`, `input-field`) and
//     `var(--*)` tokens. NO hex literals — Req 15.
//   - Status color map (Req 5):
//       Eligible              → var(--success)
//       Conditionally_Eligible → var(--warning)
//       Not_Eligible          → var(--danger)
//   - Does NOT import `LoanCenter.tsx` (Req 16).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign,
  Check,
  X,
  AlertCircle,
  ArrowRight,
  Wallet,
  ShieldCheck,
  Loader2,
  Sparkles,
  ExternalLink,
  Star,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import {
  domesticLoanProducts,
  evaluateLoanProduct,
  parseFamilyIncome,
} from '@/lib/domesticLoan'
import { domesticUniversities } from '@/lib/mock-data'
import {
  computeCsisEligible,
  computeCsisSavings,
  type CsisReason,
} from '@/lib/csis'
import { formatINR } from '@/lib/utils'
import type {
  DomesticLoanProduct,
  DomesticLoanResult,
  LoanEligibility,
  PageType,
} from '@/lib/types'

// ───────────────────────────────────────────────────────────────────────────
// Static maps
// ───────────────────────────────────────────────────────────────────────────

/** Bank-name → emoji glyph used as the product card avatar. */
const BANK_EMOJI: Record<string, string> = {
  SBI: '🏦',
  'Bank of Baroda': '🟠',
  'Canara Bank': '🔴',
  PNB: '🟡',
  'HDFC Credila': '🏦',
  Avanse: '🟡',
  'Govt of India': '🇮🇳',
}

const STATUS_RANK: Record<LoanEligibility, number> = {
  Eligible: 0,
  Conditionally_Eligible: 1,
  Not_Eligible: 2,
}

const STATUS_LABEL: Record<LoanEligibility, string> = {
  Eligible: 'Eligible',
  Conditionally_Eligible: 'Conditional',
  Not_Eligible: 'Not eligible',
}

const STATUS_TOKEN: Record<LoanEligibility, string> = {
  Eligible: 'var(--success)',
  Conditionally_Eligible: 'var(--warning)',
  Not_Eligible: 'var(--danger)',
}

const STATUS_BADGE_CLASS: Record<LoanEligibility, string> = {
  Eligible: 'badge badge-success',
  Conditionally_Eligible: 'badge badge-warning',
  Not_Eligible: 'badge badge-danger',
}

const STATUS_GLYPH: Record<LoanEligibility, string> = {
  Eligible: '✓',
  Conditionally_Eligible: '⚠',
  Not_Eligible: '✗',
}

// ───────────────────────────────────────────────────────────────────────────
// Deep-link helpers
// ───────────────────────────────────────────────────────────────────────────

interface DeepLink {
  page: PageType
  step: number | null
  label: string
}

/**
 * Map a missing-criterion label produced by `evaluateLoanProduct` back to
 * the onboarding step (or page) that lets the user fill it in. Family income,
 * co-applicant, and collateral all live in onboarding Step 7. The premier-
 * institute selection is made from the Domestic Admission Predictor.
 */
function deepLinkForMissing(label: string): DeepLink {
  if (label.startsWith('Premier institute')) {
    return {
      page: 'domestic-admission-predictor',
      step: null,
      label: 'Pick a target institute',
    }
  }
  if (label.startsWith('Co-applicant')) {
    return { page: 'onboarding', step: 7, label: 'Add in onboarding Step 7' }
  }
  if (label.startsWith('Collateral')) {
    return { page: 'onboarding', step: 7, label: 'Add in onboarding Step 7' }
  }
  if (label.startsWith('Family income')) {
    return { page: 'onboarding', step: 7, label: 'Add in onboarding Step 7' }
  }
  // Fallback: profile editor.
  return { page: 'onboarding', step: null, label: 'Update profile' }
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function bankGlyph(bankName: string): string {
  return BANK_EMOJI[bankName] ?? '🏦'
}

function csisReasonCopy(reason: CsisReason): string {
  switch (reason) {
    case 'ok':
      return '✓ You qualify for CSIS'
    case 'income':
      return 'Income above ₹4.5 lakh threshold'
    case 'institute':
      return 'Target institute is not CSIS-notified'
    case 'both':
      return 'Both income and institute conditions fail'
    case 'missing-income':
      return 'Add your family income in onboarding Step 7'
    case 'missing-institute':
      return 'Select a target institute first'
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────

export default function DomesticLoanCenter({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const profile = useAppStore((s) => s.profile)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const setTargetOnboardingStep = useAppStore(
    (s) => s.setTargetOnboardingStep,
  )
  const selectedCollege = useAppStore((s) => s.selectedCollege)

  // ── Live, college-specific loan discovery (Serper + Gemini) ───────────────
  const [liveLoans, setLiveLoans] = useState<DomesticLoanResult[]>([])
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState('')
  const [liveSource, setLiveSource] = useState<'serper+gemini' | 'empty' | ''>('')

  const collegeIncome =
    profile.familyAnnualIncomeINR != null
      ? formatINR(profile.familyAnnualIncomeINR)
      : profile.familyIncomeStr || ''
  const collegeCoApplicant = profile.coApplicantStr ?? (profile.hasCoApplicant ? 'Yes' : '')
  const collegeCollateral =
    profile.collateralAvailableStr ?? (profile.collateralType && profile.collateralType !== 'none' ? 'Yes' : 'No')

  const selectedCollegeKey = selectedCollege
    ? `${selectedCollege.name}|${selectedCollege.city}|${selectedCollege.branch}`
    : ''

  useEffect(() => {
    if (!selectedCollege) {
      setLiveLoans([])
      setLiveSource('')
      return
    }
    let cancelled = false
    const run = async () => {
      setLiveLoading(true)
      setLiveError('')
      try {
        const res = await fetch('/api/domestic-loans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            college: {
              name: selectedCollege.name,
              city: selectedCollege.city,
              state: selectedCollege.state,
              collegeType: selectedCollege.collegeType,
              branch: selectedCollege.branch,
            },
            familyIncome: collegeIncome,
            coApplicant: collegeCoApplicant,
            collateral: collegeCollateral,
          }),
        })
        if (!res.ok) throw new Error('Failed to load loans')
        const data = await res.json()
        if (cancelled) return
        const list: DomesticLoanResult[] = Array.isArray(data.options) ? data.options : []
        setLiveLoans(list)
        setLiveSource(list.length > 0 ? 'serper+gemini' : 'empty')
        if (list.length === 0) setLiveError('No live loan products found for this college right now.')
      } catch {
        if (!cancelled) setLiveError('Could not load live loans. Showing the standard list below.')
      } finally {
        if (!cancelled) setLiveLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollegeKey])

  // CSIS savings calculator inputs (defaults per the design's example).
  const [principal, setPrincipal] = useState<number>(1_000_000)
  const [rate, setRate] = useState<number>(10)
  const [moratoriumMonths, setMoratoriumMonths] = useState<number>(12)

  // Resolve target institute name + CSIS-notified flag from the dataset.
  const targetInstitute = useMemo(
    () =>
      domesticUniversities.find((u) => u.id === profile.targetInstituteId),
    [profile.targetInstituteId],
  )

  // Numeric income: prefer explicit numeric field; fall back to bucket parse.
  const incomeNum =
    profile.familyAnnualIncomeINR ?? parseFamilyIncome(profile.familyIncomeStr)

  // CSIS eligibility (Req 6.1, 6.2, 6.6, 6.7)
  const csis = useMemo(
    () => computeCsisEligible(incomeNum, targetInstitute?.isNotifiedForCSIS),
    [incomeNum, targetInstitute?.isNotifiedForCSIS],
  )

  // Estimated moratorium-period interest savings (Req 6.3, 6.4, 6.8, 6.9)
  const savings = useMemo(
    () => computeCsisSavings(csis.eligible, principal, rate, moratoriumMonths),
    [csis.eligible, principal, rate, moratoriumMonths],
  )
  const savingsInvalid = Number.isNaN(savings)

  // Evaluate every loan product and sort by status.
  const evaluatedProducts = useMemo(() => {
    return domesticLoanProducts
      .map((product, originalIndex) => ({
        product,
        originalIndex,
        result: evaluateLoanProduct(profile, product),
      }))
      .sort((a, b) => {
        const sa = STATUS_RANK[a.result.status]
        const sb = STATUS_RANK[b.result.status]
        if (sa !== sb) return sa - sb
        return a.originalIndex - b.originalIndex
      })
  }, [profile])

  const goOnboardingStep = (step: number | null) => {
    if (step != null) setTargetOnboardingStep(step)
    setCurrentPage('onboarding')
  }

  const followDeepLink = (link: DeepLink) => {
    if (link.page === 'onboarding') {
      goOnboardingStep(link.step)
    } else {
      setCurrentPage(link.page)
    }
  }

  // ── Profile summary tile values ──────────────────────────────────────────
  const familyIncomeDisplay =
    profile.familyAnnualIncomeINR != null
      ? formatINR(profile.familyAnnualIncomeINR)
      : profile.familyIncomeStr || 'Not set'
  const coApplicantDisplay = profile.coApplicantStr ?? 'Not set'
  const collateralDisplay = profile.collateralAvailableStr ?? 'Not set'
  const targetInstituteDisplay =
    selectedCollege?.name ?? targetInstitute?.name ?? 'Not set'

  return (
    <div className="max-w-6xl space-y-6">
      {/* ── 1. Header ──────────────────────────────────────────────────── */}
      {!embedded && (
        <div>
          <h2
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: 'var(--foreground)' }}
          >
            <DollarSign
              className="w-6 h-6"
              style={{ color: 'var(--accent)' }}
            />
            Domestic Loan Center
          </h2>
          <p className="mt-1" style={{ color: 'var(--foreground-secondary)' }}>
            Eligibility against Indian PSU &amp; NBFC education loans, with CSIS
            preview.
          </p>
        </div>
      )}

      {/* ── 2. Profile summary tiles ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div
            className="text-xs"
            style={{ color: 'var(--foreground-muted)' }}
          >
            Family income
          </div>
          <div
            className="text-lg font-bold mt-1"
            style={{ color: 'var(--foreground)' }}
          >
            {familyIncomeDisplay}
          </div>
          <button
            type="button"
            onClick={() => goOnboardingStep(7)}
            className="loan-link text-xs mt-2 inline-flex items-center gap-1"
          >
            Edit <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="stat-card">
          <div
            className="text-xs"
            style={{ color: 'var(--foreground-muted)' }}
          >
            Co-applicant
          </div>
          <div
            className="text-lg font-bold mt-1"
            style={{ color: 'var(--foreground)' }}
          >
            {coApplicantDisplay}
          </div>
          <button
            type="button"
            onClick={() => goOnboardingStep(7)}
            className="loan-link text-xs mt-2 inline-flex items-center gap-1"
          >
            Edit <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="stat-card">
          <div
            className="text-xs"
            style={{ color: 'var(--foreground-muted)' }}
          >
            Collateral
          </div>
          <div
            className="text-lg font-bold mt-1"
            style={{ color: 'var(--foreground)' }}
          >
            {collateralDisplay}
          </div>
          <button
            type="button"
            onClick={() => goOnboardingStep(7)}
            className="loan-link text-xs mt-2 inline-flex items-center gap-1"
          >
            Edit <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="stat-card">
          <div
            className="text-xs"
            style={{ color: 'var(--foreground-muted)' }}
          >
            Target institute
          </div>
          <div
            className="text-lg font-bold mt-1 truncate"
            style={{ color: 'var(--foreground)' }}
            title={targetInstituteDisplay}
          >
            {targetInstituteDisplay}
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage('domestic-admission-predictor')}
            className="loan-link text-xs mt-2 inline-flex items-center gap-1"
          >
            Pick <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── 2b. Live, college-specific loans (Serper + Gemini) ─────────── */}
      {selectedCollege && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div
              className="text-base font-semibold flex items-center gap-2"
              style={{ color: 'var(--foreground)' }}
            >
              <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              Loans for {selectedCollege.name}
            </div>
            {liveLoading && (
              <span
                className="inline-flex items-center gap-2 text-xs"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding real loan
                options...
              </span>
            )}
            {!liveLoading && liveSource === 'serper+gemini' && (
              <span className="badge badge-primary inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Live web data
              </span>
            )}
          </div>

          {liveError && !liveLoading && (
            <div
              className="text-xs"
              style={{ color: 'var(--foreground-muted)' }}
            >
              {liveError}
            </div>
          )}

          {!liveLoading &&
            liveLoans.map((loan, i) => (
              <motion.div
                key={`${loan.applyUrl}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.04 }}
                className="card glass glass-hover"
              >
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="lg:w-64 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-semibold"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {loan.name}
                      </span>
                      {loan.collegeSpecific && (
                        <span className="badge badge-success inline-flex items-center gap-1">
                          <Star className="w-3 h-3" /> For this college
                        </span>
                      )}
                    </div>
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--foreground-muted)' }}
                    >
                      {loan.provider} · {loan.providerType}
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>
                        Interest rate
                      </div>
                      <div className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                        {loan.interestRate}
                      </div>
                    </div>
                    {loan.maxLoanINR > 0 && (
                      <div>
                        <div className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>
                          Max loan
                        </div>
                        <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                          {formatINR(loan.maxLoanINR)}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>
                        Moratorium
                      </div>
                      <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                        {loan.moratorium}
                      </div>
                    </div>
                  </div>
                </div>

                {loan.fitReason && (
                  <div
                    className="text-xs mt-3"
                    style={{ color: 'var(--foreground-secondary)' }}
                  >
                    {loan.fitReason}
                  </div>
                )}

                {loan.features.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {loan.features.slice(0, 6).map((f) => (
                      <span key={f} className="badge badge-primary">
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <a
                    href={loan.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary inline-flex items-center gap-1 text-xs"
                  >
                    Apply <ExternalLink className="w-3 h-3" />
                  </a>
                  {loan.sourceName && (
                    <a
                      href={loan.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="loan-link inline-flex items-center gap-1 text-xs"
                    >
                      Source: {loan.sourceName}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
        </div>
      )}

      {/* ── 3. Loan products list (standard eligibility matcher) ───────── */}
      <div className="space-y-4">
        {selectedCollege && liveLoans.length > 0 && (
          <div
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--foreground-muted)' }}
          >
            Standard eligibility check
          </div>
        )}
        {evaluatedProducts.map(({ product, result }, i) => (
          <LoanProductRow
            key={product.id}
            product={product}
            result={result}
            index={i}
            onMissingClick={followDeepLink}
          />
        ))}
      </div>

      {/* ── 4. CSIS Preview side panel ─────────────────────────────────── */}
      <div className="card glass">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck
            className="w-5 h-5"
            style={{ color: 'var(--info)' }}
          />
          <div
            className="text-base font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            Central Sector Interest Subsidy (CSIS) Preview
          </div>
        </div>

        {/* Eligibility status line */}
        <div
          className="text-sm mb-4"
          style={{
            color: csis.eligible ? 'var(--success)' : 'var(--foreground-secondary)',
          }}
        >
          {csisReasonCopy(csis.reason)}
        </div>

        {/* Deep links for missing inputs (Req 6.6, 6.7) */}
        {csis.reason === 'missing-income' && (
          <button
            type="button"
            onClick={() => goOnboardingStep(7)}
            className="btn-secondary text-xs mb-4 inline-flex items-center gap-1"
          >
            Open onboarding Step 7 <ArrowRight className="w-3 h-3" />
          </button>
        )}
        {csis.reason === 'missing-institute' && (
          <button
            type="button"
            onClick={() => setCurrentPage('domestic-admission-predictor')}
            className="btn-secondary text-xs mb-4 inline-flex items-center gap-1"
          >
            Open Domestic Admission Predictor <ArrowRight className="w-3 h-3" />
          </button>
        )}

        {/* Calculator inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <span
              className="text-xs"
              style={{ color: 'var(--foreground-muted)' }}
            >
              Principal (₹)
            </span>
            <input
              type="number"
              min={0}
              className="input-field mt-1"
              value={Number.isFinite(principal) ? principal : 0}
              onChange={(e) => setPrincipal(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span
              className="text-xs"
              style={{ color: 'var(--foreground-muted)' }}
            >
              Annual rate (%)
            </span>
            <input
              type="number"
              min={0}
              step={0.1}
              className="input-field mt-1"
              value={Number.isFinite(rate) ? rate : 0}
              onChange={(e) => setRate(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span
              className="text-xs"
              style={{ color: 'var(--foreground-muted)' }}
            >
              Moratorium (months)
            </span>
            <input
              type="number"
              min={0}
              className="input-field mt-1"
              value={
                Number.isFinite(moratoriumMonths) ? moratoriumMonths : 0
              }
              onChange={(e) => setMoratoriumMonths(Number(e.target.value))}
            />
          </label>
        </div>

        {/* Output */}
        <div className="mt-4 flex items-center gap-2">
          <Wallet
            className="w-4 h-4"
            style={{ color: 'var(--accent)' }}
          />
          {savingsInvalid ? (
            <div
              className="text-sm"
              style={{ color: 'var(--danger)' }}
            >
              Inputs must be non-negative numbers.
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--foreground)' }}>
              Estimated moratorium-period interest saved:{' '}
              <span
                className="font-semibold"
                style={{
                  color: csis.eligible
                    ? 'var(--success)'
                    : 'var(--foreground-secondary)',
                }}
              >
                {formatINR(savings)}
              </span>
            </div>
          )}
        </div>

        {!csis.eligible &&
          csis.reason !== 'missing-income' &&
          csis.reason !== 'missing-institute' &&
          !savingsInvalid && (
            <div
              className="text-xs mt-2"
              style={{ color: 'var(--foreground-muted)' }}
            >
              Savings shown as ₹0 because: {csisReasonCopy(csis.reason)}.
            </div>
          )}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// LoanProductRow — extracted for readability
// ───────────────────────────────────────────────────────────────────────────

interface LoanProductRowProps {
  product: DomesticLoanProduct
  result: ReturnType<typeof evaluateLoanProduct>
  index: number
  onMissingClick: (link: DeepLink) => void
}

function LoanProductRow({
  product,
  result,
  index,
  onMissingClick,
}: LoanProductRowProps) {
  const accent = STATUS_TOKEN[result.status]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card glass glass-hover"
    >
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: avatar + name + bank */}
        <div className="flex items-start gap-3 lg:w-64">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{
              background: 'var(--background-secondary)',
              border: '1px solid var(--border)',
            }}
            aria-hidden="true"
          >
            {bankGlyph(product.bankName)}
          </div>
          <div className="min-w-0">
            <div
              className="font-semibold truncate"
              style={{ color: 'var(--foreground)' }}
              title={product.productName}
            >
              {product.productName}
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: 'var(--foreground-muted)' }}
            >
              {product.bankName}
            </div>
            <div className="mt-1">
              <span
                className={STATUS_BADGE_CLASS[result.status]}
                aria-label={STATUS_LABEL[result.status]}
              >
                {STATUS_GLYPH[result.status]} {STATUS_LABEL[result.status]}
              </span>
            </div>
          </div>
        </div>

        {/* Middle: stats */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <div
              className="text-[10px]"
              style={{ color: 'var(--foreground-muted)' }}
            >
              Interest rate
            </div>
            <div
              className="text-sm font-bold"
              style={{ color: 'var(--accent)' }}
            >
              {product.interestRateMin}% – {product.interestRateMax}%
            </div>
          </div>
          <div>
            <div
              className="text-[10px]"
              style={{ color: 'var(--foreground-muted)' }}
            >
              Max loan
            </div>
            <div
              className="text-sm font-bold"
              style={{ color: 'var(--foreground)' }}
            >
              {formatINR(product.maxLoanINR)}
            </div>
          </div>
          <div>
            <div
              className="text-[10px]"
              style={{ color: 'var(--foreground-muted)' }}
            >
              Moratorium
            </div>
            <div
              className="text-sm font-bold"
              style={{ color: 'var(--foreground)' }}
            >
              {product.moratoriumMonths} months
            </div>
          </div>
        </div>

        {/* Right: status accent bar */}
        <div className="flex lg:flex-col items-center justify-end gap-2 lg:w-32 flex-shrink-0">
          <div
            className="text-xs font-semibold"
            style={{ color: accent }}
          >
            {STATUS_LABEL[result.status]}
          </div>
        </div>
      </div>

      {/* Criteria explanation */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Matched */}
        <div className="space-y-1">
          {result.matched.map((label) => (
            <div
              key={`m-${label}`}
              className="flex items-start gap-2 text-xs"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              <Check
                className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                style={{ color: 'var(--success)' }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Unmatched */}
        <div className="space-y-1">
          {result.unmatched.map((label) => (
            <div
              key={`u-${label}`}
              className="flex items-start gap-2 text-xs"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              <X
                className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                style={{ color: 'var(--danger)' }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Missing — each is a deep-link button */}
        <div className="space-y-1">
          {result.missing.map((label) => {
            const link = deepLinkForMissing(label)
            return (
              <button
                key={`x-${label}`}
                type="button"
                onClick={() => onMissingClick(link)}
                className="flex items-start gap-2 text-xs text-left w-full hover:underline"
                style={{ color: 'var(--foreground-secondary)' }}
              >
                <AlertCircle
                  className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--warning)' }}
                />
                <span>
                  {label}{' '}
                  <span style={{ color: 'var(--primary-light)' }}>
                    — {link.label}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {product.notes && (
        <div
          className="text-xs mt-3"
          style={{ color: 'var(--foreground-muted)' }}
        >
          {product.notes}
        </div>
      )}
    </motion.div>
  )
}
