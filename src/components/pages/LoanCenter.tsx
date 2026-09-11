'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { formatINR } from '@/lib/utils'
import { DollarSign, Check, X, Award, Shield, ExternalLink, Building, Phone, Globe, ArrowRight } from 'lucide-react'

const realNBFCs = [
  {
    name: 'HDFC Credila',
    logo: '🏦',
    interestRate: { min: 9.0, max: 11.5 },
    maxLoan: 10000000,
    processing: '1% of loan amount',
    tenure: '15 years',
    moratorium: '6-12 months after course',
    collateral: 'Required for loans > ₹7.5L',
    minCGPA: 6.0,
    countries: ['US', 'UK', 'Canada', 'Australia', 'Germany', 'Singapore'],
    website: 'https://www.hdfccredila.com',
    phone: '1800-266-5050',
    applyLink: 'https://www.hdfccredila.com/apply-now.aspx',
    features: ['Tax benefit under Section 80E', 'No prepayment penalty', 'Door-step service', '100% financing for top universities'],
    bestFor: 'Secured loans with lowest rates',
    color: '#004d8d',
  },
  {
    name: 'Avanse Financial',
    logo: '🟡',
    interestRate: { min: 10.5, max: 13.5 },
    maxLoan: 7500000,
    processing: '1-2% of loan amount',
    tenure: '12 years',
    moratorium: 'Course duration + 6 months',
    collateral: 'Required for > ₹20L, waived for top universities',
    minCGPA: 6.5,
    countries: ['US', 'UK', 'Canada', 'Australia', 'Ireland', 'Germany', 'France'],
    website: 'https://www.avanse.com',
    phone: '1800-2100-262',
    applyLink: 'https://www.avanse.com/education-loan',
    features: ['Quick disbursement in 3 days', 'Collateral-free up to ₹20L', 'Part-time study loans', '48-hour approval'],
    bestFor: 'Fast approval & collateral-free options',
    color: '#f59e0b',
  },
  {
    name: 'Auxilo Finserve',
    logo: '🔵',
    interestRate: { min: 10.0, max: 12.5 },
    maxLoan: 10000000,
    processing: '1% of loan amount',
    tenure: '12 years',
    moratorium: 'Course duration + 12 months',
    collateral: 'Flexible — depends on university ranking',
    minCGPA: 6.0,
    countries: ['US', 'UK', 'Canada', 'Australia', 'Germany', 'Ireland', 'Singapore'],
    website: 'https://www.auxilo.com',
    phone: '1800-120-8060',
    applyLink: 'https://www.auxilo.com/education-loan',
    features: ['Up to ₹1 Cr without collateral for QS top 100', 'Transparent fees', 'Dedicated relationship manager', 'Pre-visa disbursement'],
    bestFor: 'High amount without collateral for top universities',
    color: '#2563eb',
  },
  {
    name: 'MPOWER Financing',
    logo: '🌐',
    interestRate: { min: 12.0, max: 14.5 },
    maxLoan: 5000000,
    processing: '0%',
    tenure: '10 years',
    moratorium: '6 months after graduation',
    collateral: 'No collateral, no cosigner required',
    minCGPA: 7.0,
    countries: ['US', 'Canada'],
    website: 'https://www.mpowerfinancing.com',
    phone: 'N/A (Online only)',
    applyLink: 'https://www.mpowerfinancing.com/get-started',
    features: ['No collateral needed', 'No cosigner required', 'Fixed interest rate', 'Pre-admission loan offer', 'Career services included'],
    bestFor: 'No-collateral international student loans',
    color: '#06b6d4',
  },
  {
    name: 'Prodigy Finance',
    logo: '🟢',
    interestRate: { min: 11.5, max: 15.0 },
    maxLoan: 7500000,
    processing: '0%',
    tenure: '10-15 years',
    moratorium: '6 months post-completion',
    collateral: 'No collateral, no co-signer',
    minCGPA: 7.0,
    countries: ['US', 'UK', 'Canada', 'Australia', 'Europe'],
    website: 'https://prodigyfinance.com',
    phone: 'N/A (Online only)',
    applyLink: 'https://prodigyfinance.com/apply',
    features: ['Covers 750+ schools globally', 'No collateral or co-signer', 'Community-funded model', 'Visa support letter'],
    bestFor: 'International students at top-ranked schools',
    color: '#10b981',
  },
  {
    name: 'InCred Education Loan',
    logo: '🟣',
    interestRate: { min: 11.0, max: 14.0 },
    maxLoan: 8000000,
    processing: '1-2%',
    tenure: '10 years',
    moratorium: 'Course duration + 6 months',
    collateral: 'Required for > ₹25L',
    minCGPA: 6.0,
    countries: ['US', 'UK', 'Canada', 'Australia', 'Germany', 'Singapore', 'Ireland'],
    website: 'https://www.incred.com',
    phone: '1860-258-8888',
    applyLink: 'https://www.incred.com/education-loan',
    features: ['AI-based instant eligibility', 'Collateral-free up to ₹25L', 'Digital-first process', 'Flexible EMI options'],
    bestFor: 'Digital-first instant approval',
    color: '#8b5cf6',
  },
]

export default function LoanCenter() {
  const { profile } = useAppStore()

  const evaluatedNBFCs = useMemo(() => {
    return realNBFCs.map(nbfc => {
      let eligible = true
      const reasons: string[] = []

      if (profile.cgpa < nbfc.minCGPA) {
        eligible = false
        reasons.push(`Min CGPA ${nbfc.minCGPA} required (yours: ${profile.cgpa})`)
      }

      const targetCountries = profile.targetCountry || []
      const hasCountry = targetCountries.length === 0 || targetCountries.some(c => nbfc.countries.includes(c))
      if (!hasCountry) {
        eligible = false
        reasons.push(`Not available for ${targetCountries.join(', ')}`)
      }

      const loanNeeded = Math.max(0, (profile.budgetLakhs - profile.savingsLakhs)) * 100000
      if (loanNeeded > nbfc.maxLoan) {
        reasons.push(`Max loan: ${formatINR(nbfc.maxLoan)} (you need: ${formatINR(loanNeeded)})`)
      }

      // Effective rate based on profile
      const effectiveRate = profile.cgpa >= 8.5
        ? nbfc.interestRate.min
        : profile.cgpa >= 7.5
        ? (nbfc.interestRate.min + nbfc.interestRate.max) / 2
        : nbfc.interestRate.max

      return {
        ...nbfc,
        eligible,
        reason: reasons.length > 0 ? reasons.join('. ') : 'Eligible based on your profile',
        effectiveRate: Math.round(effectiveRate * 10) / 10,
        maxAvailable: Math.min(nbfc.maxLoan, loanNeeded > 0 ? loanNeeded * 1.2 : nbfc.maxLoan),
      }
    }).sort((a, b) => (b.eligible ? 1 : 0) - (a.eligible ? 1 : 0) || a.effectiveRate - b.effectiveRate)
  }, [profile])

  const eligibleCount = evaluatedNBFCs.filter(n => n.eligible).length
  const loanNeeded = Math.max(0, profile.budgetLakhs - profile.savingsLakhs)

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
          <DollarSign className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          Education Loan Center
        </h2>
        <p className="mt-1" style={{ color: 'var(--foreground-secondary)' }}>
          Real eligibility across {realNBFCs.length} NBFCs with actual interest rates, links, and application portals.
        </p>
      </div>

      {/* Profile Summary */}
      <div className="card" style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.15)' }}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>CGPA</div>
            <div className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{profile.cgpa}/10</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Budget</div>
            <div className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>₹{profile.budgetLakhs}L</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Savings</div>
            <div className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>₹{profile.savingsLakhs}L</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Loan Needed</div>
            <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>₹{loanNeeded}L</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Eligible NBFCs</div>
            <div className="text-xl font-bold" style={{ color: 'var(--success)' }}>{eligibleCount}/{realNBFCs.length}</div>
          </div>
        </div>
      </div>

      {/* NBFC Cards */}
      <div className="space-y-4">
        {evaluatedNBFCs.map((nbfc, i) => (
          <motion.div key={nbfc.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`card relative overflow-hidden ${!nbfc.eligible ? 'opacity-60' : ''}`}>

            {i === 0 && nbfc.eligible && (
              <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold rounded-bl-lg"
                style={{ background: 'var(--success)', color: 'white' }}>
                <Award className="w-3 h-3 inline mr-1" />BEST MATCH
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-4">
              {/* Left: Name + Status */}
              <div className="flex items-start gap-4 lg:w-64">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${nbfc.color}15`, border: `1px solid ${nbfc.color}30` }}>
                  {nbfc.logo}
                </div>
                <div>
                  <div className="font-semibold" style={{ color: 'var(--foreground)' }}>{nbfc.name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {nbfc.eligible ? (
                      <><Check className="w-3 h-3" style={{ color: 'var(--success)' }} />
                        <span className="text-xs" style={{ color: 'var(--success)' }}>Eligible</span></>
                    ) : (
                      <><X className="w-3 h-3" style={{ color: 'var(--danger)' }} />
                        <span className="text-xs" style={{ color: 'var(--danger)' }}>Not Eligible</span></>
                    )}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: 'var(--foreground-muted)' }}>{nbfc.bestFor}</div>
                </div>
              </div>

              {/* Middle: Stats */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <div className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>Interest Rate</div>
                  <div className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                    {nbfc.interestRate.min}% — {nbfc.interestRate.max}%
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>
                    Your rate: ~{nbfc.effectiveRate}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>Max Loan</div>
                  <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{formatINR(nbfc.maxLoan)}</div>
                </div>
                <div>
                  <div className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>Tenure</div>
                  <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{nbfc.tenure}</div>
                </div>
                <div>
                  <div className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>Collateral</div>
                  <div className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>{nbfc.collateral}</div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-44 flex-shrink-0">
                {nbfc.eligible && (
                  <a href={nbfc.applyLink} target="_blank" rel="noopener noreferrer"
                    className="btn-primary text-sm flex items-center justify-center gap-2 py-2 flex-1">
                    Apply Now <ArrowRight className="w-4 h-4" />
                  </a>
                )}
                <a href={nbfc.website} target="_blank" rel="noopener noreferrer"
                  className="btn-secondary text-xs flex items-center justify-center gap-1 py-2 flex-1">
                  <Globe className="w-3 h-3" /> Website
                </a>
                {nbfc.phone !== 'N/A (Online only)' && (
                  <div className="flex items-center justify-center lg:justify-start gap-1 text-[10px]" style={{ color: 'var(--foreground-muted)' }}>
                    <Phone className="w-3 h-3" /> {nbfc.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="mt-4 flex flex-wrap gap-2">
              {nbfc.features.map(f => (
                <span key={f} className="text-[10px] px-2 py-1 rounded-full"
                  style={{ background: `${nbfc.color}10`, color: nbfc.color, border: `1px solid ${nbfc.color}20` }}>
                  ✓ {f}
                </span>
              ))}
            </div>

            {/* Reason if not eligible */}
            {!nbfc.eligible && (
              <div className="mt-3 text-xs p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.05)', color: 'var(--danger)' }}>
                {nbfc.reason}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="card overflow-x-auto">
        <div className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
          <Shield className="w-4 h-4" style={{ color: 'var(--info)' }} />
          Quick Comparison
        </div>
        <table className="w-full text-sm" style={{ minWidth: 700 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="text-left py-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>NBFC</th>
              <th className="text-right py-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>Rate Range</th>
              <th className="text-right py-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>Max Loan</th>
              <th className="text-right py-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>Tenure</th>
              <th className="text-center py-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>Collateral-Free</th>
              <th className="text-center py-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>Apply</th>
            </tr>
          </thead>
          <tbody>
            {evaluatedNBFCs.map(n => (
              <tr key={n.name} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="py-3 font-medium" style={{ color: 'var(--foreground)' }}>{n.name}</td>
                <td className="py-3 text-right" style={{ color: 'var(--accent)' }}>{n.interestRate.min}-{n.interestRate.max}%</td>
                <td className="py-3 text-right" style={{ color: 'var(--foreground)' }}>{formatINR(n.maxLoan)}</td>
                <td className="py-3 text-right" style={{ color: 'var(--foreground-secondary)' }}>{n.tenure}</td>
                <td className="py-3 text-center">
                  {n.collateral.includes('No') || n.collateral.includes('no') ? (
                    <span className="badge badge-success">✓</span>
                  ) : (
                    <span className="badge badge-warning">Partial</span>
                  )}
                </td>
                <td className="py-3 text-center">
                  <a href={n.applyLink} target="_blank" rel="noopener noreferrer"
                    className="loan-link text-xs flex items-center gap-1 justify-center">
                    Apply <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
