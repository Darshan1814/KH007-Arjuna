'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import {
  GraduationCap, Send, Bot, User, Loader2, CheckCircle,
  ChevronRight, AlertCircle, Shield, Star
} from 'lucide-react'

const modes = [
  { id: 'visa', label: 'Visa Interview', icon: Shield, desc: 'Practice F-1/Tier-4/Study Permit interviews', color: '#8b5cf6' },
  { id: 'university', label: 'University Interview', icon: GraduationCap, desc: 'University admissions interview prep', color: '#6366f1' },
]

const visaQuestionSets: Record<string, string[]> = {
  US: [
    "Why do you want to study in the United States?",
    "Which university have you been accepted to and what program?",
    "How will you finance your education?",
    "What are your plans after completing your degree?",
    "Do you have any relatives in the United States?",
    "Why did you choose this particular university?",
    "What is your current occupation?",
    "Have you traveled abroad before?",
    "How does this program align with your career goals?",
    "Why not study this in India?",
  ],
  UK: [
    "Why have you chosen to study in the UK?",
    "Tell me about your course and university.",
    "How are you funding your studies?",
    "What are your plans after your course ends?",
    "Why not study this course in your home country?",
    "Where will you be living during your studies?",
    "What is your English language proficiency?",
    "How long is your course?",
    "Have you visited the UK before?",
    "Do you have family in the UK?",
  ],
  Canada: [
    "Why do you want to study in Canada?",
    "Tell me about your program and institution.",
    "How will you pay for your education and living expenses?",
    "What will you do after completing your studies?",
    "Have you looked at similar programs in India?",
    "Where will you live in Canada?",
    "What is your academic background?",
    "Do you plan to work while studying?",
    "Why should we believe you will return to India?",
    "Do you have any ties to Canada?",
  ],
}

interface Answer {
  question: string; answer: string
  score: number; feedback: string; suggestion: string
}

export default function InterviewPrep() {
  const { profile, addXP, addBadge } = useAppStore()
  const [mode, setMode] = useState<string | null>(null)
  const [country, setCountry] = useState('US')
  const [universityName, setUniversityName] = useState('')
  const [questions, setQuestions] = useState<string[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answer, setAnswer] = useState('')
  const [answers, setAnswers] = useState<Answer[]>([])
  const [evaluating, setEvaluating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [complete, setComplete] = useState(false)

  const startVisa = () => {
    setQuestions(visaQuestionSets[country] || visaQuestionSets.US)
    setCurrentQ(0); setAnswers([]); setComplete(false)
  }

  const startUniversity = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate exactly 8 university admissions interview questions for ${universityName} for the ${profile.targetProgram || 'Masters'} program. Return ONLY a JSON array of strings, no explanation. Example: ["Question 1","Question 2",...]`,
          profile: { name: profile.name, targetProgram: profile.targetProgram },
          conversationHistory: [],
        }),
      })
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let content = ''
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          content += decoder.decode(value, { stream: true })
        }
      }
      const match = content.match(/\[[\s\S]*\]/)
      if (match) {
        setQuestions(JSON.parse(match[0]))
      } else {
        setQuestions(["Tell us about yourself.", "Why this program?", "What are your research interests?", "Where do you see yourself in 5 years?", "What makes you a strong candidate?", "Any questions for us?", "Describe a challenging project.", "How will you contribute to our community?"])
      }
    } catch {
      setQuestions(["Tell us about yourself.", "Why this program?", "What are your research interests?", "Where do you see yourself in 5 years?", "What makes you a strong candidate?", "Any questions for us?"])
    }
    setCurrentQ(0); setAnswers([]); setComplete(false); setLoading(false)
  }

  const submitAnswer = async () => {
    if (!answer.trim() || evaluating) return
    setEvaluating(true)

    let score = 6; let feedback = 'Decent response.'; let suggestion = ''
    try {
      const res = await fetch('/api/visa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country, question: questions[currentQ], answer,
          profile: { currentUniversity: profile.currentUniversity, targetProgram: profile.targetProgram, cgpa: profile.cgpa },
          questionNumber: currentQ + 1,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        score = data.score; feedback = data.feedback; suggestion = data.suggestion
      }
    } catch { /* use defaults */ }

    const newAnswer: Answer = { question: questions[currentQ], answer, score, feedback, suggestion }
    const updated = [...answers, newAnswer]
    setAnswers(updated)
    setAnswer('')

    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1)
    } else {
      setComplete(true)
      addXP(100); addBadge('Visa Ready')
    }
    setEvaluating(false)
  }

  const avgScore = answers.length > 0 ? answers.reduce((s, a) => s + a.score, 0) / answers.length : 0
  const weakAreas = answers.filter(a => a.score < 6).map(a => a.question)

  // Mode selection
  if (!mode) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <GraduationCap className="w-6 h-6" style={{ color: 'var(--primary)' }} />
            Interview Prep
          </h2>
          <p className="mt-1" style={{ color: 'var(--foreground-secondary)' }}>AI-powered mock interviews with real-time scoring.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modes.map(m => (
            <motion.button key={m.id} whileHover={{ scale: 1.02 }} onClick={() => setMode(m.id)}
              className="card glass glass-hover text-left">
              <m.icon className="w-10 h-10 mb-3" style={{ color: m.color }} />
              <div className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{m.label}</div>
              <div className="text-sm mt-1" style={{ color: 'var(--foreground-secondary)' }}>{m.desc}</div>
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  // Setup screen
  if (questions.length === 0) {
    return (
      <div className="max-w-4xl space-y-6">
        <button onClick={() => setMode(null)} className="btn-secondary text-sm">← Back</button>
        <div className="card text-center py-10">
          {mode === 'visa' ? (
            <>
              <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: '#8b5cf6' }} />
              <div className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Select Visa Type</div>
              <div className="flex justify-center gap-3 mb-6">
                {['US', 'UK', 'Canada'].map(c => (
                  <button key={c} onClick={() => setCountry(c)} className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: country === c ? 'var(--primary)' : 'var(--surface)', color: country === c ? 'white' : 'var(--foreground)', border: `1px solid ${country === c ? 'var(--primary)' : 'var(--border)'}` }}>
                    {c === 'US' ? '🇺🇸 US F-1' : c === 'UK' ? '🇬🇧 UK Tier-4' : '🇨🇦 Canada'}
                  </button>
                ))}
              </div>
              <button onClick={startVisa} className="btn-primary">Start Mock Interview</button>
            </>
          ) : (
            <>
              <GraduationCap className="w-12 h-12 mx-auto mb-4" style={{ color: '#6366f1' }} />
              <div className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>University Interview</div>
              <input className="input-field max-w-sm mx-auto mb-4" placeholder="Enter university name (e.g. MIT)"
                value={universityName} onChange={e => setUniversityName(e.target.value)} />
              <button onClick={startUniversity} disabled={!universityName.trim() || loading} className="btn-primary flex items-center gap-2 mx-auto">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {loading ? 'Generating Questions...' : 'Start Interview'}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // Interview complete
  if (complete) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="card card-gradient text-center py-8">
          <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--success)' }} />
          <div className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Interview Complete! 🎉</div>
          <div className="text-4xl font-extrabold mb-3" style={{ color: avgScore >= 7 ? '#10b981' : avgScore >= 5 ? '#f59e0b' : '#ef4444' }}>
            {avgScore.toFixed(1)}/10
          </div>
          <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            {avgScore >= 7 ? 'Excellent! You are well-prepared.' : avgScore >= 5 ? 'Good effort. Focus on weak areas.' : 'Keep practicing for improvement.'}
          </p>
          <div className="badge badge-success mt-3">+100 XP Earned!</div>
        </div>

        {weakAreas.length > 0 && (
          <div className="card">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
              <AlertCircle className="w-4 h-4" style={{ color: 'var(--danger)' }} /> Weak Areas
            </h4>
            <ul className="space-y-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              {weakAreas.map((q, i) => <li key={i}>• {q}</li>)}
            </ul>
          </div>
        )}

        {/* Transcript */}
        <div className="card">
          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Full Transcript</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {answers.map((a, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--background-secondary)' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--primary-light)' }}>Q{i + 1}: {a.question}</div>
                <div className="text-sm mb-2" style={{ color: 'var(--foreground)' }}>{a.answer}</div>
                <div className="flex items-center gap-2 text-xs">
                  <Star className="w-3 h-3" style={{ color: a.score >= 7 ? '#10b981' : '#f59e0b' }} />
                  <span style={{ color: a.score >= 7 ? '#10b981' : '#f59e0b' }}>{a.score}/10</span>
                  <span style={{ color: 'var(--foreground-muted)' }}>— {a.feedback}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => { setQuestions([]); setMode(null) }} className="btn-secondary">Try Another Interview</button>
      </div>
    )
  }

  // Active interview
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
          {mode === 'visa' ? `${country} Visa Interview` : `${universityName} Interview`}
        </h2>
        <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>Q{currentQ + 1}/{questions.length}</span>
      </div>
      <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${((currentQ) / questions.length) * 100}%` }} /></div>

      <div className="card space-y-4" style={{ padding: '1.5rem' }}>
        {/* Show current question */}
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <Bot className="w-4 h-4" style={{ color: '#ef4444' }} />
          </div>
          <div className="chat-bubble-ai"><div className="text-sm">{questions[currentQ]}</div></div>
        </div>

        {/* Previous answers */}
        {answers.slice(-2).map((a, i) => (
          <div key={i} className="ml-11 p-2 rounded-lg text-xs" style={{
            background: a.score >= 7 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${a.score >= 7 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
            color: 'var(--foreground-secondary)'
          }}>
            <span className="font-bold" style={{ color: a.score >= 7 ? '#10b981' : '#f59e0b' }}>{a.score}/10</span> — {a.feedback}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <input className="input-field flex-1" placeholder="Type your answer..."
          value={answer} onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitAnswer()} disabled={evaluating} />
        <button onClick={submitAnswer} className="btn-primary flex items-center gap-2" disabled={evaluating || !answer.trim()}>
          {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
