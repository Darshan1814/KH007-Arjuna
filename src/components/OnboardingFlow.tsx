'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { calculateDreamScore } from '@/lib/utils'
import {
  GraduationCap, User, BookOpen, Globe, DollarSign,
  ChevronRight, ChevronLeft, Sparkles, Check, Briefcase,
  Target, Shield, Mail, Calendar, TrendingUp, AlertCircle
} from 'lucide-react'

const steps = [
  { icon: User, title: 'Basic Info', subtitle: 'Personal details' },
  { icon: BookOpen, title: 'Academics', subtitle: 'Scores & exams' },
  { icon: Globe, title: 'Target', subtitle: 'Preferences' },
  { icon: Shield, title: 'Financials', subtitle: 'Budget & loans' },
  { icon: Target, title: 'Goals', subtitle: 'Career path' },
]

const countries = [
  'US', 'UK', 'Canada', 'Germany', 'Australia', 'Europe', 'Singapore', 'Japan', 'South Korea'
]

const intakes = ['Jan 2025', 'Sep 2025', 'Jan 2026', 'Sep 2026']

const budgetRanges = [
  { label: 'Under 30L', value: 25 },
  { label: '30-50L', value: 40 },
  { label: '50-80L', value: 65 },
  { label: '80L+', value: 90 },
]

const degrees = [
  'B.Tech/BE', 'BSc', 'BCA', 'BCom', 'BA', 'BBA', 'MBBS', 'Other'
]

const priorities = [
  { id: 'placement', label: 'Placement', icon: TrendingUp },
  { id: 'research', label: 'Research', icon: BookOpen },
  { id: 'cost', label: 'Cost', icon: DollarSign },
  { id: 'ranking', label: 'Ranking', icon: Star },
]

import { Star } from 'lucide-react'

export default function OnboardingFlow() {
  const { updateProfile, setOnboarded, setCurrentPage, profile } = useAppStore()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: profile.name || '',
    email: profile.email || '',
    yearOfStudy: profile.yearOfStudy || 4,
    currentDegree: profile.currentDegree || '',
    cgpa: profile.cgpa || 0,
    greScore: profile.greScore || 0,
    gmatScore: profile.gmatScore || 0,
    ieltsScore: profile.ieltsScore || 0,
    toeflScore: profile.toeflScore || 0,
    backlogs: profile.backlogs || 0,
    targetCountry: profile.targetCountry || [] as string[],
    budgetLakhs: profile.budgetLakhs || 30,
    targetIntake: profile.targetIntake || 'Sep 2025',
    familyIncome: profile.familyIncome || 1000000,
    hasCoApplicant: profile.hasCoApplicant ?? true,
    collateralType: profile.collateralType || 'none' as 'property' | 'FD' | 'none',
    existingLoans: profile.existingLoans || 0,
    careerInterest: profile.careerInterest || '',
    priority: profile.priority || 'placement' as 'placement' | 'research' | 'cost' | 'ranking',
  })

  const update = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const toggleCountry = (c: string) => {
    setForm(prev => ({
      ...prev,
      targetCountry: prev.targetCountry.includes(c)
        ? prev.targetCountry.filter(x => x !== c)
        : [...prev.targetCountry, c]
    }))
  }

  const finish = () => {
    const profileData = {
      ...form,
      workExpYears: 0,
      researchPapers: 0,
      extracurriculars: 2,
      sopComplete: false,
      lorCount: 0,
      loanEligible: true,
      currentUniversity: '',
      universitiesFinalized: 0,
      applicationsSubmitted: 0,
      visaDocsReady: false,
      streakDays: 1,
      xpPoints: 100,
      badges: ['First Step'],
      dreamScore: 0,
      savingsLakhs: 0,
      coBorrowerIncome: form.familyIncome,
    }
    profileData.dreamScore = calculateDreamScore(profileData)
    updateProfile(profileData)
    setOnboarded(true)
    setCurrentPage('dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0b14]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-[#161725] border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative z-10">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">EduFin<span className="text-indigo-400">AI</span></span>
          </div>
          
          <div className="flex justify-between relative overflow-x-auto pb-4 sm:pb-0 scrollbar-hide">
            <div className="absolute top-4 left-0 right-0 h-[2px] bg-white/5 -z-0 min-w-[400px]" />
            <div className="flex justify-between w-full min-w-[400px]">
              {steps.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-2 relative z-10">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                    i <= step ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'bg-[#1f2135] text-white/30'
                  }`}>
                    {i < step ? <Check className="w-5 h-5" /> : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium uppercase tracking-wider whitespace-nowrap ${i <= step ? 'text-indigo-400' : 'text-white/20'}`}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
              
              {step === 0 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-[var(--foreground)]">Basic Information</h2>
                    <p className="text-white/50">Let&apos;s start with the basics to build your profile.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2"><User className="w-4 h-4" /> Full Name</label>
                      <input className="input-field-onboarding" placeholder="Rahul Sharma" value={form.name}
                        onChange={e => update('name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2"><Mail className="w-4 h-4" /> Email Address</label>
                      <input className="input-field-onboarding" type="email" placeholder="rahul@example.com" value={form.email}
                        onChange={e => update('email', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2"><Calendar className="w-4 h-4" /> Current Year of Study</label>
                      <select className="input-field-onboarding" value={form.yearOfStudy} onChange={e => update('yearOfStudy', parseInt(e.target.value))}>
                        <option value={1}>1st Year</option>
                        <option value={2}>2nd Year</option>
                        <option value={3}>3rd Year</option>
                        <option value={4}>4th Year</option>
                        <option value={5}>Post Graduate / Finished</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Undergraduate Degree</label>
                      <select className="input-field-onboarding" value={form.currentDegree} onChange={e => update('currentDegree', e.target.value)}>
                        <option value="">Select Degree</option>
                        {degrees.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2">Current CGPA (out of 10)</label>
                    <input type="number" step="0.01" className="input-field-onboarding" placeholder="8.50" value={form.cgpa || ''}
                      onChange={e => update('cgpa', parseFloat(e.target.value))} />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-[var(--foreground)]">Academics & Scores</h2>
                    <p className="text-white/50">Your test scores help us evaluate your profile strength.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">Entrance Exams</h3>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/50">GRE Score (Optional)</label>
                        <input type="number" className="input-field-onboarding" placeholder="320" value={form.greScore || ''}
                          onChange={e => update('greScore', parseInt(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/50">GMAT Score (Optional)</label>
                        <input type="number" className="input-field-onboarding" placeholder="700" value={form.gmatScore || ''}
                          onChange={e => update('gmatScore', parseInt(e.target.value))} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">Language Proficiency</h3>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/50">IELTS Band (Optional)</label>
                        <input type="number" step="0.5" className="input-field-onboarding" placeholder="7.5" value={form.ieltsScore || ''}
                          onChange={e => update('ieltsScore', parseFloat(e.target.value))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/50">TOEFL Score (Optional)</label>
                        <input type="number" className="input-field-onboarding" placeholder="105" value={form.toeflScore || ''}
                          onChange={e => update('toeflScore', parseInt(e.target.value))} />
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <label className="text-sm font-medium text-white/70 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Number of Backlogs</label>
                    <input type="number" className="input-field-onboarding w-32" placeholder="0" value={form.backlogs}
                      onChange={e => update('backlogs', parseInt(e.target.value))} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-[var(--foreground)]">Target Details</h2>
                    <p className="text-white/50">Where and when do you plan to start your journey?</p>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-[var(--foreground)]">Preferred Countries</label>
                    <div className="flex flex-wrap gap-2">
                      {countries.map(c => (
                        <button key={c} onClick={() => toggleCountry(c)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            form.targetCountry.includes(c) ? 'bg-indigo-600 text-white' : 'bg-[#1f2135] text-white/50 hover:bg-white/5'
                          }`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-white/70">Budget Range (INR)</label>
                      <div className="space-y-2">
                        {budgetRanges.map(b => (
                          <button key={b.label} onClick={() => update('budgetLakhs', b.value)}
                            className={`w-full px-4 py-3 rounded-xl text-sm text-left transition-all ${
                              form.budgetLakhs === b.value ? 'bg-indigo-600 text-white' : 'bg-[#1f2135] text-white/50'
                            }`}>
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-white/70">Target Intake</label>
                      <div className="space-y-2">
                        {intakes.map(i => (
                          <button key={i} onClick={() => update('targetIntake', i)}
                            className={`w-full px-4 py-3 rounded-xl text-sm text-left transition-all ${
                              form.targetIntake === i ? 'bg-indigo-600 text-white' : 'bg-[#1f2135] text-white/50'
                            }`}>
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-[var(--foreground)]">Financial Profile</h2>
                    <p className="text-white/50">Essential for education loan assessment.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[var(--foreground)]">Family Annual Income (INR)</label>
                      <input type="number" className="input-field-onboarding" placeholder="12,00,000" value={form.familyIncome || ''}
                        onChange={e => update('familyIncome', parseInt(e.target.value))} />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-[#1f2135] rounded-2xl">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-[var(--foreground)]">Co-applicant Available?</div>
                        <div className="text-xs text-white/40">Father/Mother/Guardian with income proof</div>
                      </div>
                      <div className="flex bg-[#0a0b14] p-1 rounded-lg">
                        <button onClick={() => update('hasCoApplicant', true)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${form.hasCoApplicant ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/30'}`}>YES</button>
                        <button onClick={() => update('hasCoApplicant', false)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${!form.hasCoApplicant ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/30'}`}>NO</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70">Collateral Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['property', 'FD', 'none'].map(t => (
                          <button key={t} onClick={() => update('collateralType', t)}
                            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                              form.collateralType === t ? 'bg-indigo-600 text-white' : 'bg-[#1f2135] text-white/30'
                            }`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70">Any Existing Loans (INR)</label>
                      <input type="number" className="input-field-onboarding" placeholder="0" value={form.existingLoans}
                        onChange={e => update('existingLoans', parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-[var(--foreground)]">Your Goals</h2>
                    <p className="text-white/50">Final step to customize your career navigator.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2"><Briefcase className="w-4 h-4" /> Intended Career Field</label>
                      <input className="input-field-onboarding" placeholder="AI Research, Fintech, Product Management..." 
                        value={form.careerInterest} onChange={e => update('careerInterest', e.target.value)} />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[var(--foreground)]">What is your top priority?</label>
                      <div className="grid grid-cols-2 gap-3">
                        {priorities.map(p => (
                          <button key={p.id} onClick={() => update('priority', p.id)}
                            className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                              form.priority === p.id ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-[#1f2135] border-transparent text-white/50'
                            }`}>
                            <p.icon className={`w-5 h-5 ${form.priority === p.id ? 'text-indigo-400' : 'text-white/20'}`} />
                            <span className="font-semibold">{p.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                      <Check className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-[var(--foreground)]">Everything looks great!</h3>
                      <p className="text-sm text-white/40">You&apos;re about to unlock your personalized study abroad dashboard.</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-8 bg-[#1a1b2e] flex items-center justify-between">
          <button onClick={() => step === 0 ? setCurrentPage('landing') : setStep(s => s - 1)}
            className="text-white/40 hover:text-white flex items-center gap-2 font-medium transition-all">
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
          
          <button onClick={() => step === 4 ? finish() : setStep(s => s + 1)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all">
            {step === 4 ? 'Complete Profile' : 'Continue'} 
            {step === 4 ? <Sparkles className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </motion.div>

      <style jsx>{`
        .input-field-onboarding {
          width: 100%;
          background: #1f2135;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 1rem;
          padding: 1rem;
          color: white;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .input-field-onboarding:focus {
          outline: none;
          border-color: #6366f1;
          background: #252841;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.1);
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite;
        }
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
          70% { box-shadow: 0 0 0 20px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
      `}</style>
    </div>
  )
}
