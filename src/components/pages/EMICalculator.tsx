'use client'

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
        </div>

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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
