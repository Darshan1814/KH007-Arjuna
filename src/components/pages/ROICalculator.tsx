'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { universities } from '@/lib/mock-data'
import { formatINR, calculateEMI } from '@/lib/utils'
import { useTrack } from '@/lib/useTrack'
import type { Track } from '@/lib/useTrack'
import { TrendingUp, DollarSign, Calendar, ArrowUpRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

type Currency = 'INR' | 'USD'

function defaultCurrency(t: Track): Currency {
  return t === 'abroad' ? 'USD' : 'INR'
}

export default function ROICalculator({ embedded = false }: { embedded?: boolean } = {}) {
  const { profile } = useAppStore()
  const track = useTrack()
  const [currency, setCurrency] = useState<Currency>(defaultCurrency(track))
  const [selectedUni, setSelectedUni] = useState(universities[4]) // Georgia Tech default
  const [loanAmount, setLoanAmount] = useState(45)
  const [interestRate, setInterestRate] = useState(11)
  const [expectedSalary, setExpectedSalary] = useState(selectedUni.avgSalaryUSD)
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const exchangeRate = 83

  // Currency-aware formatter (Req 8.1, 8.2, 8.3, 8.4).
  // Underlying numbers are not transformed — only prefix/locale toggled per design.
  const fmt = (value: number): string =>
    currency === 'INR' ? formatINR(value) : `$${value.toLocaleString('en-US')}`

  // Validation: reject negative or non-numeric inputs (Req 8.5). Block NaN writes.
  const updateNumeric = (
    raw: string,
    field: string,
    setter: (n: number) => void,
  ) => {
    const n = parseFloat(raw)
    if (Number.isNaN(n) || n < 0) {
      setErrors((e) => ({ ...e, [field]: 'Enter a valid non-negative number.' }))
      return
    }
    setErrors((e) => ({ ...e, [field]: null }))
    setter(n)
  }

  const totalCost = useMemo(() => {
    const tuition = selectedUni.tuitionUSD * selectedUni.programDuration * exchangeRate
    const living = 18000 * selectedUni.programDuration * exchangeRate
    return tuition + living
  }, [selectedUni, exchangeRate])

  const monthlyEMI = useMemo(() =>
    calculateEMI(loanAmount * 100000, interestRate, 10), [loanAmount, interestRate])

  const roiData = useMemo(() => {
    const data = []
    let cumulativeEarnings = -totalCost
    const annualSalaryINR = expectedSalary * exchangeRate
    const annualEMI = monthlyEMI * 12
    const currentSalaryINR = 800000 // ₹8L baseline

    for (let year = 0; year <= 10; year++) {
      if (year <= selectedUni.programDuration) {
        cumulativeEarnings = -totalCost + (year > 0 ? 0 : 0)
      } else {
        const workYears = year - selectedUni.programDuration
        cumulativeEarnings = -totalCost + (annualSalaryINR * workYears) - (annualEMI * Math.min(workYears, 10))
      }
      const withoutDegree = currentSalaryINR * year
      data.push({
        year: `Year ${year}`,
        withDegree: Math.round(cumulativeEarnings),
        withoutDegree: Math.round(withoutDegree),
        netGain: Math.round(cumulativeEarnings - (-totalCost)),
      })
    }
    return data
  }, [totalCost, expectedSalary, monthlyEMI, selectedUni.programDuration, exchangeRate])

  const breakeven = roiData.findIndex(d => d.withDegree > 0)
  const npv = roiData[roiData.length - 1].withDegree

  const showCurrencySwitch = track !== 'abroad'
  const switchLocked = track === 'domestic'

  return (
    <div className="max-w-6xl space-y-6">
      {!embedded && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6" style={{ color: 'var(--success)' }} />
              ROI Calculator
            </h2>
            <p className="mt-1" style={{ color: 'var(--foreground-secondary)' }}>
              Is your education investment worth it? See the 10-year financial picture.
            </p>
          </div>
          {showCurrencySwitch && (
            <div
              role="group"
              aria-label="Currency"
              className="flex gap-2 items-center"
            >
              <button
                type="button"
                className={currency === 'INR' ? 'btn-primary' : 'btn-secondary'}
                onClick={() => !switchLocked && setCurrency('INR')}
                disabled={switchLocked}
                aria-pressed={currency === 'INR'}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                ₹ INR
              </button>
              <button
                type="button"
                className={currency === 'USD' ? 'btn-primary' : 'btn-secondary'}
                onClick={() => !switchLocked && setCurrency('USD')}
                disabled={switchLocked}
                aria-pressed={currency === 'USD'}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                $ USD
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="card">
            <label className="text-sm font-medium text-white block mb-2">Select University</label>
            <select className="input-field" value={selectedUni.id}
              onChange={e => { const u = universities.find(x => x.id === e.target.value); if (u) { setSelectedUni(u); setExpectedSalary(u.avgSalaryUSD) } }}>
              {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div className="card">
            <label className="text-sm font-medium text-white block mb-2">
              Loan Amount: <span style={{ color: 'var(--accent)' }}>
                {currency === 'INR' ? `₹${loanAmount}L` : `$${loanAmount}L`}
              </span>
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={loanAmount}
              onChange={e => updateNumeric(e.target.value, 'loanAmount', setLoanAmount)}
              className="w-full"
            />
            {errors.loanAmount && (
              <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.loanAmount}</p>
            )}
          </div>

          <div className="card">
            <label className="text-sm font-medium text-white block mb-2">
              Interest Rate: <span style={{ color: 'var(--accent)' }}>{interestRate}%</span>
            </label>
            <input
              type="range"
              min="8"
              max="16"
              step="0.5"
              value={interestRate}
              onChange={e => updateNumeric(e.target.value, 'interestRate', setInterestRate)}
              className="w-full"
            />
            {errors.interestRate && (
              <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.interestRate}</p>
            )}
          </div>

          <div className="card">
            <label className="text-sm font-medium text-white block mb-2">
              Expected Salary: <span style={{ color: 'var(--success)' }}>
                {currency === 'INR'
                  ? `${formatINR(expectedSalary * exchangeRate)}/yr`
                  : `$${expectedSalary.toLocaleString('en-US')}/yr`}
              </span>
            </label>
            <input
              type="range"
              min="40000"
              max="250000"
              step="5000"
              value={expectedSalary}
              onChange={e => updateNumeric(e.target.value, 'expectedSalary', setExpectedSalary)}
              className="w-full"
            />
            {errors.expectedSalary && (
              <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.expectedSalary}</p>
            )}
          </div>
        </div>

        {/* Chart + Stats */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card">
              <DollarSign className="w-4 h-4 mb-1" style={{ color: 'var(--accent)' }} />
              <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Total Cost</div>
              <div className="text-lg font-bold text-white">{fmt(totalCost)}</div>
            </motion.div>
            <div className="stat-card">
              <Calendar className="w-4 h-4 mb-1" style={{ color: 'var(--info)' }} />
              <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Monthly EMI</div>
              <div className="text-lg font-bold text-white">{fmt(monthlyEMI)}</div>
            </div>
            <div className="stat-card">
              <ArrowUpRight className="w-4 h-4 mb-1" style={{ color: 'var(--success)' }} />
              <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Breakeven</div>
              <div className="text-lg font-bold" style={{ color: 'var(--success)' }}>
                {breakeven > 0 ? `Year ${breakeven}` : '10+ yrs'}
              </div>
            </div>
            <div className="stat-card">
              <TrendingUp className="w-4 h-4 mb-1" style={{ color: npv > 0 ? 'var(--success)' : 'var(--danger)' }} />
              <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>10yr NPV</div>
              <div className="text-lg font-bold" style={{ color: npv > 0 ? 'var(--success)' : 'var(--danger)' }}>
                {fmt(Math.abs(npv))}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="card" style={{ padding: '1rem' }}>
            <div className="text-sm font-medium text-white mb-4">Cumulative Earnings Over 10 Years</div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={roiData}>
                <defs>
                  <linearGradient id="colorDegree" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorNoDegree" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1a1b2e', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8 }}
                  labelStyle={{ color: '#f1f5f9' }}
                  formatter={(v) => fmt(Number(v))}
                />
                <Area type="monotone" dataKey="withDegree" stroke="#6366f1" fill="url(#colorDegree)" strokeWidth={2} name="With Degree" />
                <Area type="monotone" dataKey="withoutDegree" stroke="#64748b" fill="url(#colorNoDegree)" strokeWidth={2} strokeDasharray="5 5" name="Without Degree" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Insight */}
          <div className="card" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
            <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              💡 <strong className="text-white">AI Insight:</strong> At {selectedUni.name} with a {currency === 'INR' ? `₹${loanAmount}L` : `$${loanAmount}L`} loan at {interestRate}%,
              your education investment {npv > 0 ? 'generates a positive return' : 'may take longer to break even'}.
              Monthly EMI of {fmt(monthlyEMI)} is {monthlyEMI < (expectedSalary * exchangeRate / 12) * 0.3 ? 'manageable' : 'significant'} relative to expected income.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
