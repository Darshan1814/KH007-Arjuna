'use client'

import { useState, useMemo } from 'react'
import { calculateEMI, formatINR } from '@/lib/utils'
import { Calculator, TrendingDown, Lightbulb } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function EMICalculator() {
  const [principal, setPrincipal] = useState(40)
  const [rate, setRate] = useState(11)
  const [tenure, setTenure] = useState(10)
  const [moratorium, setMoratorium] = useState(24)
  const [prepayment, setPrepayment] = useState(0)

  const emi = useMemo(() => calculateEMI(principal * 100000, rate, tenure), [principal, rate, tenure])
  const totalPaid = emi * tenure * 12
  const totalInterest = totalPaid - principal * 100000
  const interestSaved = prepayment > 0 ? Math.round(prepayment * 100000 * (rate / 100) * (tenure / 2)) : 0

  const yearlyData = useMemo(() => {
    const data = []
    let remaining = principal * 100000
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
  }, [principal, rate, tenure, emi])

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calculator className="w-6 h-6" style={{ color: 'var(--info)' }} />
          EMI & Repayment Simulator
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
            <input type="range" min="7" max="18" step="0.5" value={rate} onChange={e => setRate(+e.target.value)} className="w-full" />
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
