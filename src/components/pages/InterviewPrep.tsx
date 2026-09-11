'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  GraduationCap,
  Newspaper,
  Loader2,
  Sparkles,
  Award,
  RotateCcw,
  Download,
  FileText,
  ExternalLink,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  Languages,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/lib/store'
import { downloadHTMLReport, downloadPDFReport, type InterviewReport } from '@/lib/interviewReport'

type InterviewType = 'visa' | 'university'
type CallStatus = 'idle' | 'connecting' | 'live' | 'ending' | 'ended'

interface NewsItem {
  title: string
  link: string
  snippet?: string
  source?: string
  date?: string
}

interface TranscriptLine {
  role: 'assistant' | 'user'
  text: string
  ts: number
}

interface LanguageOption {
  label: string
  code: string
  speechLocale: string
}

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { label: 'English', code: 'en', speechLocale: 'en-US' },
  { label: 'Hindi', code: 'hi', speechLocale: 'hi-IN' },
  { label: 'Tamil', code: 'ta', speechLocale: 'ta-IN' },
  { label: 'French', code: 'fr', speechLocale: 'fr-FR' },
  { label: 'Spanish', code: 'es', speechLocale: 'es-ES' },
  { label: 'German', code: 'de', speechLocale: 'de-DE' },
  { label: 'Arabic', code: 'ar', speechLocale: 'ar-SA' },
  { label: 'Portuguese', code: 'pt', speechLocale: 'pt-BR' },
  { label: 'Korean', code: 'ko', speechLocale: 'ko-KR' },
  { label: 'Vietnamese', code: 'vi', speechLocale: 'vi-VN' },
  { label: 'Turkish', code: 'tr', speechLocale: 'tr-TR' },
  { label: 'Malay', code: 'ms', speechLocale: 'ms-MY' },
  { label: 'Romanian', code: 'ro', speechLocale: 'ro-RO' },
  { label: 'Czech', code: 'cs', speechLocale: 'cs-CZ' },
  { label: 'Ukrainian', code: 'uk', speechLocale: 'uk-UA' },
  { label: 'Croatian', code: 'hr', speechLocale: 'hr-HR' },
  { label: 'Norwegian', code: 'no', speechLocale: 'nb-NO' },
  { label: 'Dutch', code: 'nl', speechLocale: 'nl-NL' },
]

const COUNTRY_OPTIONS = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'Ireland',
  'Singapore',
  'Netherlands',
  'France',
]

export default function InterviewPrep() {
  const { profile } = useAppStore()

  // Track & Country & Language
  const [interviewType, setInterviewType] = useState<InterviewType>('visa')
  const [country, setCountry] = useState<string>(
    (profile.targetCountries && profile.targetCountries[0]) ||
      (Array.isArray(profile.targetCountry) ? profile.targetCountry[0] : '') ||
      'United States',
  )
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(SUPPORTED_LANGUAGES[0])

  // Live News
  const [news, setNews] = useState<NewsItem[]>([])
  const [loadingNews, setLoadingNews] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadingNews(true)
    const q =
      interviewType === 'visa'
        ? `${country} student visa F-1 interview slots updates Indian students 2026`
        : `${country} university admission interview tips Indian students 2026`
    fetch(`/api/news?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setNews(Array.isArray(d?.news) ? d.news.slice(0, 5) : [])
      })
      .catch(() => !cancelled && setNews([]))
      .finally(() => !cancelled && setLoadingNews(false))
    return () => {
      cancelled = true
    }
  }, [country, interviewType])

  // Interview state
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [muted, setMuted] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [scoring, setScoring] = useState(false)
  const [report, setReport] = useState<InterviewReport | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // Voice playback & recording state
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const [isUserListening, setIsUserListening] = useState(false)
  const [currentSpeechInput, setCurrentSpeechInput] = useState('')
  const [manualText, setManualText] = useState('')

  const callStartRef = useRef<number>(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef<TranscriptLine[]>([])

  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  // Elapsed timer while live
  useEffect(() => {
    if (callStatus !== 'live') return
    callStartRef.current = Date.now()
    const id = setInterval(() => setElapsed(Math.round((Date.now() - callStartRef.current) / 1000)), 500)
    return () => clearInterval(id)
  }, [callStatus])

  const profileForApi = useMemo(
    () => ({
      name: profile.name,
      undergrad_cgpa: profile.undergradCgpa,
      target_field: profile.targetField,
      target_degree: profile.targetDegree,
      target_countries: profile.targetCountries || profile.targetCountry,
      intake_target: profile.intakeTarget,
      years_experience: profile.yearsExperience,
      gre_score: (profile as any).gre_score,
      gmat_score: (profile as any).gmat_score,
      ielts_score: profile.ieltsScore,
      toefl_score: profile.toeflScore,
      target_university:
        (profile.dreamUniversities || [])[0] || (profile.targetUniversitiesList || [])[0] || '',
      funding_source: profile.fundingSource,
    }),
    [profile],
  )

  // Stop any active audio and speech recognition
  const stopAudioAndRecognition = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      } catch {
        /* ignore */
      }
      audioRef.current = null
    }
    setIsAiSpeaking(false)

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null
        recognitionRef.current.onend = null
        recognitionRef.current.onerror = null
        recognitionRef.current.stop()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
    }
    setIsUserListening(false)
  }

  // Speak AI text using ElevenLabs TTS
  const speakText = async (text: string) => {
    stopAudioAndRecognition()
    setIsAiSpeaking(true)

    try {
      const res = await fetch('/api/interview/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        throw new Error('Could not synthesize speech')
      }

      const blob = await res.blob()
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsAiSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        if (callStatus === 'live' || callStatus === 'connecting') {
          startSpeechListening()
        }
      }

      audio.onerror = () => {
        setIsAiSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        if (callStatus === 'live' || callStatus === 'connecting') {
          startSpeechListening()
        }
      }

      await audio.play()
    } catch (e: any) {
      console.warn('[tts] Audio play failed, falling back to listening', e)
      setIsAiSpeaking(false)
      if (callStatus === 'live' || callStatus === 'connecting') {
        startSpeechListening()
      }
    }
  }

  // Start SpeechRecognition in browser
  const startSpeechListening = () => {
    if (typeof window === 'undefined') return
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in browser, manual input available')
      setIsUserListening(true)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = selectedLang.speechLocale || 'en-US'

      recognition.onstart = () => {
        setIsUserListening(true)
      }

      recognition.onresult = (event: any) => {
        let interim = ''
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptText = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            final += transcriptText
          } else {
            interim += transcriptText
          }
        }
        const combined = (final || interim).trim()
        if (combined) {
          setCurrentSpeechInput(combined)
        }
      }

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('[speech-recognition] error', event.error)
        }
      }

      recognition.onend = () => {
        // Automatically restart if still in live mode and AI is not speaking
        if (callStatus === 'live' && !isAiSpeaking && recognitionRef.current === recognition) {
          try {
            recognition.start()
          } catch {
            /* ignore */
          }
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      console.warn('[speech-recognition] start error', err)
      setIsUserListening(true)
    }
  }

  // Start the interview call
  const startCall = async () => {
    setCallStatus('connecting')
    setReport(null)
    setTranscript([])
    setCurrentSpeechInput('')
    setManualText('')

    try {
      // 1. Fetch initial opening question framed by Groq in chosen language
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewType,
          country,
          language: selectedLang.label,
          profile: profileForApi,
          messages: [],
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        const errMsg = typeof data?.error === 'string' ? data.error : 'Could not initialize interviewer'
        throw new Error(errMsg)
      }

      const questionText = data.text || 'Welcome to your interview. Let us begin.'
      const firstLine: TranscriptLine = { role: 'assistant', text: questionText, ts: Date.now() }

      setTranscript([firstLine])
      setCallStatus('live')

      // 2. Pronounce question with ElevenLabs TTS
      await speakText(questionText)
    } catch (e: any) {
      console.error('[interview] start failed', e)
      const msg = typeof e?.message === 'string' ? e.message : 'Could not start interview'
      toast.error(msg)
      setCallStatus('idle')
      stopAudioAndRecognition()
    }
  }

  // Submit student's spoken/written answer and get next question from Groq
  const handleAnswerSubmit = async (customAnswer?: string) => {
    const answer = (customAnswer !== undefined ? customAnswer : currentSpeechInput || manualText).trim()
    if (!answer) {
      toast.error('Please speak or type your answer before proceeding.')
      return
    }

    stopAudioAndRecognition()
    setCurrentSpeechInput('')
    setManualText('')

    const updatedTranscript: TranscriptLine[] = [
      ...transcriptRef.current,
      { role: 'user', text: answer, ts: Date.now() },
    ]
    setTranscript(updatedTranscript)

    try {
      // Call Groq to evaluate and frame next question
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewType,
          country,
          language: selectedLang.label,
          profile: profileForApi,
          messages: updatedTranscript,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Could not fetch next question')
      }

      const nextQuestion = data.text
      setTranscript([...updatedTranscript, { role: 'assistant', text: nextQuestion, ts: Date.now() }])

      // If AI flagged interview as finished, proceed to end call
      if (data.isFinished) {
        toast.success('Interview concluded! Generating your score report...')
        await speakText(nextQuestion)
        setTimeout(() => endCall(), 4000)
      } else {
        await speakText(nextQuestion)
      }
    } catch (e: any) {
      toast.error(typeof e?.message === 'string' ? e.message : 'Could not process answer')
      startSpeechListening()
    }
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    if (next) {
      stopAudioAndRecognition()
    } else {
      startSpeechListening()
    }
  }

  const endCall = async () => {
    setCallStatus('ending')
    stopAudioAndRecognition()
    setCallStatus('ended')
  }

  const restart = () => {
    stopAudioAndRecognition()
    setCallStatus('idle')
    setTranscript([])
    setReport(null)
    setMuted(false)
    setElapsed(0)
    setCurrentSpeechInput('')
    setManualText('')
  }

  // After the call ends, score the transcript
  useEffect(() => {
    if (callStatus !== 'ended') return
    if (report) return
    const userLines = transcript.filter((t) => t.role === 'user').length
    if (userLines === 0) return

    let cancelled = false
    setScoring(true)
    ;(async () => {
      try {
        const qa: { q: string; a: string }[] = []
        let pendingQ = ''
        for (const line of transcript) {
          if (line.role === 'assistant') pendingQ = pendingQ ? `${pendingQ} ${line.text}` : line.text
          else if (line.role === 'user' && pendingQ) {
            qa.push({ q: pendingQ.trim(), a: line.text.trim() })
            pendingQ = ''
          }
        }
        if (pendingQ && qa.length === 0) qa.push({ q: pendingQ.trim(), a: '' })

        const res = await fetch('/api/interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'score',
            interviewType,
            country,
            profile: profileForApi,
            qa: qa.length ? qa : transcript.map((t) => ({ q: t.role, a: t.text })),
          }),
        })
        const d = await res.json()
        if (cancelled) return
        if (d?.report) setReport(d.report as InterviewReport)
      } catch (e: any) {
        if (!cancelled) toast.error(typeof e?.message === 'string' ? e.message : 'Could not score interview')
      } finally {
        if (!cancelled) setScoring(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus])

  const fmtElapsed = useMemo(() => {
    const m = Math.floor(elapsed / 60)
    const s = elapsed % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }, [elapsed])

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6">
      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden border"
        style={{
          borderColor: 'var(--border)',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.85))',
          color: '#f8fafc',
        }}
      >
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }}
        />
        <div className="relative p-6 sm:p-8">
          <div className="text-[11px] uppercase tracking-widest font-bold" style={{ color: '#fcd34d' }}>
            Multilingual Voice Interview Prep
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">
            Real-time voice interview powered by Groq & ElevenLabs.
          </h1>
          <p className="text-sm mt-2 opacity-90 max-w-2xl">
            Questions framed dynamically by Groq, pronounced by ElevenLabs with natural human intonation in any language.
            Speak your answers, get scored across a comprehensive rubric, and download a professional PDF/HTML report.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            {/* Track Switcher */}
            <div
              className="inline-flex p-1 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              {(['visa', 'university'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setInterviewType(t)
                    if (callStatus !== 'idle') restart()
                  }}
                  disabled={callStatus !== 'idle'}
                  className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                  style={{
                    background: interviewType === t ? '#f59e0b' : 'transparent',
                    color: interviewType === t ? '#0f172a' : '#e2e8f0',
                  }}
                >
                  {t === 'visa' ? <ShieldCheck className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
                  {t === 'visa' ? 'Visa interview' : 'University interview'}
                </button>
              ))}
            </div>

            {/* Country Selector */}
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value)
                if (callStatus !== 'idle') restart()
              }}
              disabled={callStatus !== 'idle'}
              className="rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#f8fafc',
              }}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c} style={{ color: '#0f172a' }}>
                  {c}
                </option>
              ))}
            </select>

            {/* Multilingual Voice Language Picker */}
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-amber-400" />
              <select
                value={selectedLang.code}
                onChange={(e) => {
                  const found = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value)
                  if (found) setSelectedLang(found)
                  if (callStatus !== 'idle') restart()
                }}
                disabled={callStatus !== 'idle'}
                className="rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#f8fafc',
                }}
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} style={{ color: '#0f172a' }}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* NEWS STRIP */}
      <Card title={`Live updates · ${country}`} icon={Newspaper}>
        {loadingNews ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : news.length === 0 ? (
          <div className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
            No interview-related news found. Try another country.
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {news.map((n, i) => (
              <li key={i}>
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-xl p-3 transition-all"
                  style={{
                    background: 'var(--background-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(245,158,11,0.10)', color: '#d97706' }}
                  >
                    <Newspaper className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm leading-snug line-clamp-2" style={{ color: 'var(--foreground)' }}>
                      {n.title}
                    </div>
                    <div className="text-[11px] mt-1 truncate" style={{ color: 'var(--foreground-muted)' }}>
                      {n.source ||
                        (() => {
                          try {
                            return new URL(n.link).hostname
                          } catch {
                            return ''
                          }
                        })()}
                      {n.date ? ` · ${n.date}` : ''}
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* MAIN: idle / call / report */}
      <AnimatePresence mode="wait">
        {callStatus === 'idle' && !report && (
          <motion.div key="setup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card
              title={interviewType === 'visa' ? `${country} F-1 visa mock interview (${selectedLang.label})` : `${country} university mock interview (${selectedLang.label})`}
              icon={interviewType === 'visa' ? ShieldCheck : GraduationCap}
            >
              <p className="text-sm mb-4" style={{ color: 'var(--foreground-secondary)' }}>
                Click <span className="font-semibold">Start interview</span> and Arjuna will begin your interview in <span className="font-semibold text-amber-500">{selectedLang.label}</span>.
                Groq frames every question dynamically, ElevenLabs pronounces it with natural voice cadence, and your responses are evaluated against visa and admissions standards.
              </p>
              <ul className="text-xs grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
                {[
                  ['Language: ' + selectedLang.label, 'Arjuna will speak and understand ' + selectedLang.label + '.'],
                  ['Mic or Keyboard', 'Speak naturally, or type in the box if in a quiet room.'],
                  ['Comprehensive Report', 'Graded across clarity, confidence, relevance, and intent.'],
                ].map(([h, b]) => (
                  <li
                    key={h}
                    className="rounded-xl p-3"
                    style={{ background: 'var(--background-secondary)', border: '1px solid var(--border)' }}
                  >
                    <div className="font-bold mb-0.5" style={{ color: 'var(--foreground)' }}>
                      {h}
                    </div>
                    <div style={{ color: 'var(--foreground-muted)' }}>{b}</div>
                  </li>
                ))}
              </ul>
              <button onClick={startCall} className="btn-primary inline-flex items-center gap-2">
                <PhoneCall className="w-4 h-4" />
                Start {selectedLang.label} interview
              </button>
            </Card>
          </motion.div>
        )}

        {(callStatus === 'connecting' || callStatus === 'live' || callStatus === 'ending') && (
          <motion.div key="room" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card
              title="Interview Room"
              icon={Mic}
              right={
                <span
                  className="text-[11px] uppercase tracking-widest font-bold"
                  style={{ color: callStatus === 'live' ? '#10b981' : '#f59e0b' }}
                >
                  {callStatus === 'connecting'
                    ? '● Connecting'
                    : callStatus === 'live'
                    ? `● Live (${selectedLang.label}) · ${fmtElapsed}`
                    : '● Ending'}
                </span>
              }
            >
              {/* Caller card */}
              <div
                className="rounded-2xl p-6 flex flex-col items-center text-center mb-4 relative overflow-hidden"
                style={{ background: '#0f172a', color: '#f8fafc' }}
              >
                <div className="relative mb-3">
                  <motion.div
                    animate={{
                      scale: isAiSpeaking ? [1, 1.15, 1] : [1, 1.04, 1],
                      opacity: isAiSpeaking ? [0.8, 1, 0.8] : 0.8,
                    }}
                    transition={{ repeat: Infinity, duration: isAiSpeaking ? 0.8 : 2 }}
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{
                      background: isAiSpeaking
                        ? 'radial-gradient(circle, #f59e0b 0%, rgba(245,158,11,0.0) 70%)'
                        : 'rgba(245,158,11,0.18)',
                    }}
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg"
                      style={{ background: '#f59e0b', color: '#0f172a' }}
                    >
                      A
                    </div>
                  </motion.div>
                </div>

                <div className="font-bold text-lg">Arjuna</div>
                <div className="text-xs opacity-75">
                  AI {interviewType === 'visa' ? 'Visa Officer' : 'Admissions Interviewer'} · {country} ({selectedLang.label})
                </div>

                {/* Status Indicator */}
                <div className="mt-2 text-xs font-semibold flex items-center gap-1.5" style={{ color: isAiSpeaking ? '#f59e0b' : '#10b981' }}>
                  {isAiSpeaking ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                      Arjuna is speaking…
                    </>
                  ) : isUserListening ? (
                    <>
                      <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      Listening to you…
                    </>
                  ) : (
                    'Waiting for response…'
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={toggleMute}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: muted ? '#dc2626' : 'rgba(255,255,255,0.10)',
                      color: '#f8fafc',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                    title={muted ? 'Unmute' : 'Mute'}
                  >
                    {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={endCall}
                    className="px-5 h-12 rounded-full flex items-center gap-2 font-semibold shadow-lg hover:brightness-110 transition-all"
                    style={{ background: '#dc2626', color: '#f8fafc' }}
                  >
                    <PhoneOff className="w-4 h-4" /> End interview
                  </button>
                </div>
              </div>

              {/* Student Response Bar (Live speech + manual input fallback) */}
              <div
                className="rounded-2xl p-4 mb-4 border transition-all"
                style={{
                  background: 'var(--surface)',
                  borderColor: isUserListening ? '#10b981' : 'var(--border)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-foreground-secondary flex items-center gap-1.5">
                    <Mic className={`w-3.5 h-3.5 ${isUserListening ? 'text-emerald-500 animate-pulse' : 'text-foreground-muted'}`} />
                    Your Answer ({selectedLang.label}):
                  </span>
                  {currentSpeechInput && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Speech detected
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentSpeechInput || manualText}
                    onChange={(e) => {
                      setCurrentSpeechInput('')
                      setManualText(e.target.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAnswerSubmit()
                    }}
                    placeholder={isAiSpeaking ? 'Arjuna is speaking…' : `Speak into mic or type your answer in ${selectedLang.label}…`}
                    className="input-field flex-1 text-sm"
                    disabled={isAiSpeaking}
                  />
                  <button
                    onClick={() => handleAnswerSubmit()}
                    disabled={isAiSpeaking || (!currentSpeechInput && !manualText)}
                    className="btn-primary px-4 text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> Answer
                  </button>
                </div>
              </div>

              {/* Live transcript */}
              <div
                className="rounded-xl p-4 max-h-80 overflow-y-auto"
                style={{ background: 'var(--background-secondary)', border: '1px solid var(--border)' }}
              >
                {transcript.length === 0 ? (
                  <div className="py-6 text-center text-sm" style={{ color: 'var(--foreground-muted)' }}>
                    {callStatus === 'connecting'
                      ? 'Connecting to Arjuna…'
                      : 'Arjuna will start in a moment. Speak when you hear the question.'}
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {transcript.map((line, i) => (
                      <li key={i} className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm"
                          style={{
                            background: line.role === 'user' ? '#f59e0b' : 'var(--surface)',
                            color: line.role === 'user' ? '#0f172a' : 'var(--foreground)',
                            border: line.role === 'assistant' ? '1px solid var(--border)' : 'none',
                          }}
                        >
                          <div
                            className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                            style={{ color: line.role === 'user' ? '#78350f' : 'var(--foreground-muted)' }}
                          >
                            {line.role === 'user' ? 'You' : 'Arjuna'}
                          </div>
                          {line.text}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {callStatus === 'ended' && (scoring || !report) && (
          <motion.div key="scoring" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card title="Scoring your interview" icon={Sparkles}>
              <div className="py-8 flex flex-col items-center gap-3">
                {scoring ? (
                  <>
                    <Loader2 className="w-7 h-7 animate-spin text-primary" />
                    <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                      Analysing the conversation and grading every answer…
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-7 h-7" style={{ color: '#f59e0b' }} />
                    <div className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                      The call ended before we caught any answers. Click below to try again.
                    </div>
                    <button onClick={restart} className="btn-secondary text-sm inline-flex items-center gap-2 mt-2">
                      <RotateCcw className="w-4 h-4" /> Restart
                    </button>
                  </>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {report && (
          <motion.div key="report" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card
              title="Your interview report"
              icon={Award}
              right={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      downloadHTMLReport({
                        studentName: profile.name || 'Student',
                        interviewType,
                        country,
                        university: profileForApi.target_university,
                        program: profile.targetField || profile.targetDegree,
                        date: new Date().toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        }),
                        report,
                      })
                    }
                    className="btn-secondary text-xs inline-flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> HTML
                  </button>
                  <button
                    onClick={() =>
                      downloadPDFReport({
                        studentName: profile.name || 'Student',
                        interviewType,
                        country,
                        university: profileForApi.target_university,
                        program: profile.targetField || profile.targetDegree,
                        date: new Date().toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        }),
                        report,
                      })
                    }
                    className="btn-secondary text-xs inline-flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button onClick={restart} className="btn-secondary text-xs inline-flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" /> Restart
                  </button>
                </div>
              }
            >
              {/* Headline + verdict */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div className="card text-center" style={{ background: 'var(--background-secondary)' }}>
                  <div className="text-[11px] uppercase tracking-widest font-bold" style={{ color: 'var(--foreground-muted)' }}>
                    Overall
                  </div>
                  <div className="text-4xl font-bold mt-1" style={{ color: '#0f172a' }}>
                    {Math.round(report.overallScore)}
                    <span className="text-base text-foreground-muted">/100</span>
                  </div>
                  <div className="text-xs font-semibold mt-1" style={{ color: '#b45309' }}>
                    Grade {report.grade}
                  </div>
                </div>
                <div className="md:col-span-2 card" style={{ background: 'var(--background-secondary)' }}>
                  <div className="text-[11px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--foreground-muted)' }}>
                    Verdict
                  </div>
                  <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                    {report.summary}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {(['clarity', 'confidence', 'relevance', 'depth', 'intent'] as const).map((k) => {
                  const v = (report.rubric as any)[k] as number
                  return (
                    <div key={k} className="grid grid-cols-[110px_1fr_50px] gap-3 items-center">
                      <div className="text-[11px] uppercase tracking-widest font-bold" style={{ color: 'var(--foreground-muted)' }}>
                        {k}
                      </div>
                      <div className="h-2 rounded-full" style={{ background: 'var(--background-secondary)' }}>
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.max(0, v))}%`,
                            background: v >= 80 ? '#0f766e' : v >= 60 ? '#a16207' : '#b91c1c',
                          }}
                        />
                      </div>
                      <div
                        className="text-xs font-bold text-right"
                        style={{ color: v >= 80 ? '#0f766e' : v >= 60 ? '#a16207' : '#b91c1c' }}
                      >
                        {Math.round(v)}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                <Pill title="Strengths" items={report.strengths} accent="#047857" />
                <Pill title="Weaknesses" items={report.weaknesses} accent="#b91c1c" />
                {report.redFlags?.length ? <Pill title="Red flags" items={report.redFlags} accent="#b45309" /> : null}
                {report.nextSteps?.length ? <Pill title="Next steps" items={report.nextSteps} accent="#1d4ed8" /> : null}
              </div>

              <div className="space-y-3">
                {report.perAnswer.map((qa, i) => {
                  const color = qa.score >= 80 ? '#0f766e' : qa.score >= 60 ? '#a16207' : '#b91c1c'
                  return (
                    <div key={i} className="card" style={{ background: 'var(--background-secondary)' }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="font-semibold text-sm flex-1" style={{ color: 'var(--foreground)' }}>
                          {i + 1}. {qa.q}
                        </div>
                        <div
                          className="px-2.5 py-1 rounded-full text-xs font-bold text-white flex-shrink-0"
                          style={{ background: color }}
                        >
                          {Math.round(qa.score)}
                        </div>
                      </div>
                      <div
                        className="text-sm pl-3 border-l-2"
                        style={{
                          color: 'var(--foreground-secondary)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        {qa.a || '— no answer recorded —'}
                      </div>
                      <div className="text-sm mt-2" style={{ color: 'var(--foreground)' }}>
                        <span className="font-bold" style={{ color: '#b45309' }}>
                          Feedback:
                        </span>{' '}
                        {qa.feedback}
                      </div>
                      {qa.improvedAnswer && (
                        <div
                          className="rounded-lg p-3 mt-2 text-sm"
                          style={{
                            background: 'rgba(245,158,11,0.10)',
                            border: '1px solid rgba(245,158,11,0.25)',
                            color: 'var(--foreground)',
                          }}
                        >
                          <span className="font-bold" style={{ color: '#b45309' }}>
                            Suggested answer:
                          </span>{' '}
                            {qa.improvedAnswer}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Acknowledgement */}
              <div
                className="rounded-xl p-3 mt-5 inline-flex items-center gap-2 text-xs"
                style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46' }}
              >
                <CheckCircle2 className="w-4 h-4" /> Report ready. Save it as HTML or PDF using the buttons above.
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Card({
  title,
  icon: Icon,
  children,
  right,
}: {
  title: string
  icon: any
  children: any
  right?: any
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.10)', color: '#b45309' }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>
            {title}
          </h2>
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function Pill({ title, items, accent }: { title: string; items?: string[]; accent: string }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'var(--background-secondary)',
        borderLeft: `4px solid ${accent}`,
        border: '1px solid var(--border)',
      }}
    >
      <div className="text-[11px] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--foreground-muted)' }}>
        {title}
      </div>
      <ul className="text-sm space-y-1" style={{ color: 'var(--foreground)' }}>
        {(items && items.length ? items : ['—']).map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <span style={{ color: accent }}>•</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
