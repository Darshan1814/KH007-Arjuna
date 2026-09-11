'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { formatINR } from '@/lib/utils'
import {
  DollarSign, CheckCircle, Circle, FileText, ClipboardList,
  Send, Shield, ChevronRight, ChevronLeft, AlertCircle,
  TrendingUp, Building2, Upload, Clock, Sparkles, Info
} from 'lucide-react'

const LOAN_STORAGE_KEY = 'edufinai-loan-app'

interface LoanDoc {
  id: string; name: string; category: string
  required: boolean; status: string; tip: string
}

interface LoanApp {
  step: number; eligibilityScore: number; maxAmount: number; minAmount: number
  rateMin: number; rateMax: number; lender: string; docs: LoanDoc[]
  formData: Record<string, string>; formStrength: number
  status: string; appId: string; submittedAt: string
}

const steps = [
  { icon: Shield, title: 'Eligibility', desc: 'Check your loan eligibility' },
  { icon: FileText, title: 'Documents', desc: 'Upload required documents' },
  { icon: ClipboardList, title: 'Application', desc: 'Fill application form' },
  { icon: Send, title: 'Track', desc: 'Submit & track status' },
]

const lenders = [
  { name: 'HDFC Credila', rate: '9.5% - 11.5%', max: '₹1Cr', speed: '7-10 days', best: 'Top 100 universities', color: '#1a56db' },
  { name: 'Avanse Financial', rate: '10.5% - 13.0%', max: '₹75L', speed: '5-7 days', best: 'Quick processing', color: '#10b981' },
  { name: 'Auxilo Finserve', rate: '10.0% - 12.5%', max: '₹1Cr', speed: '10-14 days', best: 'Flexible collateral', color: '#f59e0b' },
]

function getDefaultDocs(hasCollateral: boolean): LoanDoc[] {
  return [
    { id: 'd1', name: 'Admission/Offer Letter', category: 'admission', required: true, status: 'pending', tip: 'Official unconditional offer letter from the university with course details and fees.' },
    { id: 'd2', name: 'Academic Transcripts', category: 'academic', required: true, status: 'pending', tip: 'All semester marksheets and consolidated marksheet from your university.' },
    { id: 'd3', name: 'Aadhaar Card', category: 'kyc', required: true, status: 'pending', tip: 'Clear copy of Aadhaar card (front and back) of applicant and co-applicant.' },
    { id: 'd4', name: 'PAN Card', category: 'kyc', required: true, status: 'pending', tip: 'PAN card copy of applicant and co-applicant for tax verification.' },
    { id: 'd5', name: 'Passport', category: 'kyc', required: true, status: 'pending', tip: 'Valid passport with at least 6 months validity remaining.' },
    { id: 'd6', name: 'Co-applicant Income Proof', category: 'financial', required: true, status: 'pending', tip: 'Latest 3 months salary slips OR ITR for last 2 years for self-employed.' },
    { id: 'd7', name: 'Bank Statements (6 months)', category: 'financial', required: true, status: 'pending', tip: 'Last 6 months bank statements of applicant and co-applicant.' },
    { id: 'd8', name: 'GRE/GMAT Scorecard', category: 'academic', required: false, status: 'pending', tip: 'Official score report from ETS/GMAC.' },
    { id: 'd9', name: 'IELTS/TOEFL Scorecard', category: 'academic', required: false, status: 'pending', tip: 'Official English proficiency test score report.' },
    { id: 'd10', name: 'Property Documents', category: 'financial', required: hasCollateral, status: hasCollateral ? 'pending' : 'not-required', tip: 'Property ownership docs, valuation report, encumbrance certificate.' },
    { id: 'd11', name: 'Statement of Purpose', category: 'admission', required: false, status: 'pending', tip: 'Your SOP submitted to the university (for lender reference).' },
    { id: 'd12', name: 'Letter of Recommendation', category: 'admission', required: false, status: 'pending', tip: 'LOR copies from professors or employers.' },
  ]
}

function loadApp(): LoanApp | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(LOAN_STORAGE_KEY) || 'null') } catch { return null }
}
function saveApp(app: LoanApp) { localStorage.setItem(LOAN_STORAGE_KEY, JSON.stringify(app)) }

export default function LoanApply() {
  const { profile, addXP, addBadge } = useAppStore()
  const [app, setApp] = useState<LoanApp>(() => loadApp() || {
    step: 0, eligibilityScore: 0, maxAmount: 0, minAmount: 0,
    rateMin: 0, rateMax: 0, lender: '', docs: getDefaultDocs(false),
    formData: {}, formStrength: 0, status: 'draft', appId: '', submittedAt: ''
  })

  const updateApp = useCallback((updates: Partial<LoanApp>) => {
    setApp(prev => { const n = { ...prev, ...updates }; saveApp(n); return n })
  }, [])

  // Eligibility calculation
  const eligibility = useMemo(() => {
    let score = 0
    if (profile.cgpa >= 8) score += 25; else if (profile.cgpa >= 6.5) score += 18; else if (profile.cgpa >= 5) score += 10
    if (profile.coBorrowerIncome >= 1000000) score += 20; else if (profile.coBorrowerIncome >= 500000) score += 12; else score += 5
    if (profile.savingsLakhs >= 10) score += 15; else if (profile.savingsLakhs >= 5) score += 10; else score += 3
    if (profile.greScore >= 310) score += 10; else if (profile.greScore >= 300) score += 6
    if (profile.ieltsScore >= 7) score += 10; else if (profile.ieltsScore >= 6) score += 5
    if (profile.workExpYears >= 2) score += 10; else if (profile.workExpYears >= 1) score += 5
    const targetUniBonus = profile.universitiesFinalized > 0 ? 10 : 0
    score += targetUniBonus
    score = Math.min(100, score)

    const maxAmt = score >= 70 ? 10000000 : score >= 50 ? 7500000 : score >= 30 ? 4000000 : 2000000
    const minAmt = Math.round(maxAmt * 0.4)
    const rateMin = score >= 70 ? 9.5 : score >= 50 ? 10.5 : 12.0
    const rateMax = rateMin + 3

    return { score, maxAmt, minAmt, rateMin, rateMax }
  }, [profile])

  const docProgress = useMemo(() => {
    const required = app.docs.filter(d => d.required)
    const done = required.filter(d => d.status === 'uploaded' || d.status === 'verified')
    return required.length > 0 ? Math.round((done.length / required.length) * 100) : 0
  }, [app.docs])

  const formFields = [
    { key: 'fullName', label: 'Full Name (as on passport)', val: profile.name },
    { key: 'email', label: 'Email Address', val: profile.email || '' },
    { key: 'phone', label: 'Phone Number', val: '' },
    { key: 'dob', label: 'Date of Birth', val: '' },
    { key: 'address', label: 'Permanent Address', val: '' },
    { key: 'university', label: 'Target University', val: '' },
    { key: 'program', label: 'Program Name', val: profile.targetProgram },
    { key: 'intake', label: 'Intake (e.g. Fall 2026)', val: '' },
    { key: 'loanAmount', label: 'Requested Loan Amount (₹)', val: '' },
    { key: 'coApplicantName', label: 'Co-Applicant Name', val: '' },
    { key: 'coApplicantRelation', label: 'Co-Applicant Relation', val: '' },
    { key: 'coApplicantIncome', label: 'Co-Applicant Annual Income (₹)', val: String(profile.coBorrowerIncome || '') },
  ]

  const formStrength = useMemo(() => {
    const filled = formFields.filter(f => (app.formData[f.key] || f.val || '').trim().length > 0)
    return Math.round((filled.length / formFields.length) * 100)
  }, [app.formData, formFields])

  const runEligibility = () => {
    updateApp({
      step: 0, eligibilityScore: eligibility.score,
      maxAmount: eligibility.maxAmt, minAmount: eligibility.minAmt,
      rateMin: eligibility.rateMin, rateMax: eligibility.rateMax,
      docs: getDefaultDocs(profile.savingsLakhs >= 10)
    })
    addXP(20); addBadge('Loan Seeker')
  }

  const toggleDoc = (docId: string) => {
    const docs = app.docs.map(d => d.id === docId
      ? { ...d, status: d.status === 'pending' ? 'uploaded' : d.status === 'uploaded' ? 'pending' : d.status }
      : d)
    updateApp({ docs })
    const uploaded = docs.filter(d => d.status === 'uploaded').length
    if (uploaded >= 5) addBadge('Document Pro')
  }

  const updateField = (key: string, value: string) => {
    updateApp({ formData: { ...app.formData, [key]: value } })
  }

  const submitApplication = () => {
    const id = `APP-2026-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    updateApp({ step: 3, status: 'submitted', appId: id, submittedAt: new Date().toISOString(), formStrength })
    addXP(200); addBadge('Application Filed')
  }

  const timelineSteps = [
    { label: 'Submitted', done: ['submitted','review','verified','assessment','sanctioned'].includes(app.status) },
    { label: 'Under Review', done: ['review','verified','assessment','sanctioned'].includes(app.status) },
    { label: 'Docs Verified', done: ['verified','assessment','sanctioned'].includes(app.status) },
    { label: 'Credit Check', done: ['assessment','sanctioned'].includes(app.status) },
    { label: 'Sanctioned', done: app.status === 'sanctioned' },
  ]

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
          <DollarSign className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          Education Loan Application
        </h2>
        <p className="mt-1" style={{ color: 'var(--foreground-secondary)' }}>
          AI-assisted 4-step loan application with real-time eligibility scoring.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-2">
        {steps.map((s, i) => (
          <button key={i} onClick={() => updateApp({ step: i })}
            className="flex-1 p-3 rounded-xl text-center transition-all"
            style={{
              background: app.step === i ? 'rgba(99,102,241,0.12)' : 'var(--surface)',
              border: `1px solid ${app.step === i ? 'var(--primary)' : 'var(--border)'}`,
            }}>
            <s.icon className="w-5 h-5 mx-auto mb-1" style={{ color: app.step === i ? 'var(--primary-light)' : i < app.step ? 'var(--success)' : 'var(--foreground-muted)' }} />
            <div className="text-xs font-semibold" style={{ color: app.step === i ? 'var(--primary-light)' : 'var(--foreground-secondary)' }}>{s.title}</div>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Eligibility */}
        {app.step === 0 && (
          <motion.div key="elig" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {app.eligibilityScore === 0 ? (
              <div className="card text-center py-10">
                <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--primary)' }} />
                <div className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Check Your Loan Eligibility</div>
                <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--foreground-secondary)' }}>
                  We&apos;ll analyze your profile to determine your eligibility score, loan range, and best lender match.
                </p>
                <button onClick={runEligibility} className="btn-primary flex items-center gap-2 mx-auto">
                  <Sparkles className="w-4 h-4" /> Run Eligibility Check
                </button>
              </div>
            ) : (
              <>
                {/* Score Card */}
                <div className="card card-gradient">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="text-center">
                      <div className="text-5xl font-extrabold" style={{
                        color: eligibility.score >= 70 ? 'var(--success)' : eligibility.score >= 40 ? 'var(--accent)' : 'var(--danger)'
                      }}>{eligibility.score}</div>
                      <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Eligibility Score</div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg" style={{ background: 'var(--background-secondary)' }}>
                          <div className="text-[10px] uppercase" style={{ color: 'var(--foreground-muted)' }}>Loan Range</div>
                          <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{formatINR(eligibility.minAmt)} — {formatINR(eligibility.maxAmt)}</div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ background: 'var(--background-secondary)' }}>
                          <div className="text-[10px] uppercase" style={{ color: 'var(--foreground-muted)' }}>Interest Rate</div>
                          <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{eligibility.rateMin}% — {eligibility.rateMax}% p.a.</div>
                        </div>
                      </div>
                      <div className="progress-bar" style={{ height: 8 }}>
                        <div className="progress-bar-fill" style={{ width: `${eligibility.score}%`, background: eligibility.score >= 70 ? 'var(--success)' : eligibility.score >= 40 ? 'var(--accent)' : 'var(--danger)' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Strength Tips */}
                <div className="card">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                    <TrendingUp className="w-4 h-4" style={{ color: 'var(--success)' }} /> Improve Your Rate
                  </h4>
                  <div className="space-y-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                    {profile.cgpa < 8 && <div className="flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} /> CGPA above 8.0 unlocks the best interest rates.</div>}
                    {profile.greScore < 310 && <div className="flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} /> GRE 310+ adds 10 points to eligibility.</div>}
                    {profile.coBorrowerIncome < 1000000 && <div className="flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} /> Higher co-borrower income significantly improves your loan terms.</div>}
                    {profile.savingsLakhs < 10 && <div className="flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} /> Collateral (property worth ₹10L+) can reduce rates by 2-3%.</div>}
                  </div>
                </div>

                {/* Lenders */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {lenders.map(l => (
                    <button key={l.name} onClick={() => updateApp({ lender: l.name })}
                      className="card text-left transition-all" style={{
                        borderColor: app.lender === l.name ? l.color : undefined,
                        boxShadow: app.lender === l.name ? `0 0 12px ${l.color}30` : undefined
                      }}>
                      <Building2 className="w-5 h-5 mb-2" style={{ color: l.color }} />
                      <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{l.name}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>Rate: {l.rate}</div>
                      <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Max: {l.max} • {l.speed}</div>
                      <div className="text-[10px] mt-2 px-2 py-0.5 rounded-full inline-block" style={{ background: `${l.color}15`, color: l.color }}>Best for: {l.best}</div>
                    </button>
                  ))}
                </div>

                <button onClick={() => updateApp({ step: 1 })} className="btn-primary flex items-center gap-2 ml-auto" disabled={!app.lender}>
                  Continue to Documents <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* STEP 2: Documents */}
        {app.step === 1 && (
          <motion.div key="docs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="card card-gradient">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Document Checklist</div>
                  <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>{docProgress}% complete</div>
                </div>
                <div className="text-2xl font-bold" style={{ color: docProgress === 100 ? 'var(--success)' : 'var(--primary-light)' }}>{docProgress}%</div>
              </div>
              <div className="progress-bar mt-2"><div className="progress-bar-fill" style={{ width: `${docProgress}%` }} /></div>
            </div>

            <div className="space-y-2">
              {app.docs.map(doc => (
                <div key={doc.id} className="card flex items-center gap-3" style={{ padding: '0.75rem 1rem',
                  borderColor: doc.status === 'uploaded' ? 'rgba(16,185,129,0.3)' : undefined,
                  background: doc.status === 'uploaded' ? 'rgba(16,185,129,0.03)' : doc.status === 'not-required' ? 'rgba(100,116,139,0.03)' : undefined
                }}>
                  <button onClick={() => toggleDoc(doc.id)} disabled={doc.status === 'not-required'}>
                    {doc.status === 'uploaded' ? <CheckCircle className="w-5 h-5" style={{ color: 'var(--success)' }} /> :
                     doc.status === 'not-required' ? <Circle className="w-5 h-5" style={{ color: 'var(--foreground-muted)' }} /> :
                     <Upload className="w-5 h-5" style={{ color: 'var(--primary-light)' }} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2" style={{ color: doc.status === 'not-required' ? 'var(--foreground-muted)' : 'var(--foreground)' }}>
                      {doc.name}
                      {doc.required && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>Required</span>}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-muted)' }}>{doc.tip}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button onClick={() => updateApp({ step: 0 })} className="btn-secondary flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Back</button>
              <button onClick={() => updateApp({ step: 2 })} className="btn-primary flex items-center gap-2">
                Continue to Form <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Application Form */}
        {app.step === 2 && (
          <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="card card-gradient">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Form Strength</span>
                <span className="text-xl font-bold" style={{ color: formStrength >= 80 ? 'var(--success)' : 'var(--accent)' }}>{formStrength}%</span>
              </div>
              <div className="progress-bar mt-2"><div className="progress-bar-fill" style={{ width: `${formStrength}%` }} /></div>
            </div>

            <div className="card space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formFields.map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--foreground-secondary)' }}>{f.label}</label>
                    <input className="input-field" value={app.formData[f.key] || f.val || ''}
                      onChange={e => updateField(f.key, e.target.value)} placeholder={f.label} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => updateApp({ step: 1 })} className="btn-secondary flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Back</button>
              <button onClick={submitApplication} className="btn-primary flex items-center gap-2" disabled={formStrength < 50}>
                <Send className="w-4 h-4" /> Submit Application
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Tracking */}
        {app.step === 3 && (
          <motion.div key="track" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="card card-gradient text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--success)' }} />
              <div className="text-xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>Application Submitted! 🎉</div>
              <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Application ID: <strong style={{ color: 'var(--primary-light)' }}>{app.appId}</strong>
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--foreground-muted)' }}>
                Lender: {app.lender} • Submitted: {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'N/A'}
              </div>
              <div className="badge badge-success mt-3">+200 XP Earned!</div>
            </div>

            {/* Timeline */}
            <div className="card">
              <div className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                <Clock className="w-4 h-4" style={{ color: 'var(--info)' }} /> Application Timeline
              </div>
              <div className="space-y-4">
                {timelineSteps.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                        background: s.done ? 'var(--success)' : 'var(--background-secondary)',
                        border: s.done ? 'none' : '2px solid var(--border)'
                      }}>
                        {s.done ? <CheckCircle className="w-4 h-4 text-white" /> : <Circle className="w-4 h-4" style={{ color: 'var(--foreground-muted)' }} />}
                      </div>
                      {i < timelineSteps.length - 1 && <div className="w-0.5 h-6" style={{ background: s.done ? 'var(--success)' : 'var(--border)' }} />}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: s.done ? 'var(--success)' : 'var(--foreground-secondary)' }}>{s.label}</div>
                      {i === 0 && s.done && <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Estimated: 7-14 business days</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card flex items-start gap-3" style={{ background: 'rgba(99,102,241,0.04)' }}>
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} />
              <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                A confirmation email has been sent. The lender will contact you within 2-3 business days to verify your documents. Keep your phone accessible.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
