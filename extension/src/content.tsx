import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { motion } from 'framer-motion'
import { Bot, X, Sparkles, Send, Minimize2, Maximize2, Loader2, Wand2, Volume2, VolumeX, RotateCcw, Square } from 'lucide-react'
import tailwindStyle from './index.css?inline'

// Resolved at runtime so it works no matter how the bundler fingerprints
// the file. Falls back to the inline <Bot> icon if the resource isn't
// declared in the manifest's web_accessible_resources.
const LOGO_URL = (() => {
  try {
    return chrome.runtime.getURL('public/extension-logo.png')
  } catch {
    return ''
  }
})()

// ---------- Top-level runtime listener ----------
// Registered immediately on script load so the popup's first TOGGLE_CHAT
// never hits "receiving end does not exist". The listener bridges into the
// React tree via a window CustomEvent that <FloatingAssistant /> subscribes
// to. Acks every message synchronously so the channel closes cleanly.
try {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'TOGGLE_CHAT') {
      window.dispatchEvent(new CustomEvent('edupilot:toggle'))
      sendResponse({ ok: true })
      return false
    }
    return false
  })
} catch {
  /* extension context invalidated, page reload needed — handled below */
}
// chrome.runtime.* throws "Extension context invalidated" when the user
// reloads/updates the extension while old content scripts are still alive
// in open tabs. Surface a friendly hint instead of a raw error.
//
// Each in-flight request is tracked under a generation id so the user can
// hit "Stop" and have the late response (when it eventually arrives) be
// dropped on the floor.
let inFlightGeneration = 0
const activeGenerations = new Set<number>()

function bumpGenerationAndStop() {
  inFlightGeneration++
  activeGenerations.clear()
}

function safeSendMessage<T = any>(
  payload: any,
  opts: { timeoutMs?: number } = {},
): Promise<T | null> {
  const timeoutMs = opts.timeoutMs ?? 60_000
  const gen = inFlightGeneration
  activeGenerations.add(gen)

  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      activeGenerations.delete(gen)
      resolve(null)
    }, timeoutMs)

    const finish = (resp: T | null) => {
      if (settled) return
      // Cancelled by Stop button: drop the response.
      if (!activeGenerations.has(gen)) {
        settled = true
        clearTimeout(timer)
        resolve(null)
        return
      }
      settled = true
      clearTimeout(timer)
      activeGenerations.delete(gen)
      resolve(resp)
    }

    try {
      chrome.runtime.sendMessage(payload, (resp) => {
        if (chrome.runtime.lastError) {
          const m = chrome.runtime.lastError.message || ''
          if (m.includes('context invalidated')) showStaleContextToast()
          finish(null)
          return
        }
        finish(resp as T)
      })
    } catch (err: any) {
      if (String(err?.message || err).includes('context invalidated')) {
        showStaleContextToast()
      }
      finish(null)
    }
  })
}

let staleToastEl: HTMLDivElement | null = null
function showStaleContextToast() {
  if (staleToastEl) return
  staleToastEl = document.createElement('div')
  Object.assign(staleToastEl.style, {
    position: 'fixed',
    bottom: '6.5rem',
    right: '1.5rem',
    zIndex: '2147483647',
    padding: '12px 16px',
    borderRadius: '12px',
    background: '#7f1d1d',
    color: '#fee2e2',
    font: '600 13px/1.4 -apple-system, system-ui, sans-serif',
    boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    maxWidth: '320px',
  })
  staleToastEl.textContent =
    '⚠️ EduPilot was reloaded or removed. Cleaning up — refresh the page if you reinstalled it.'
  document.body.appendChild(staleToastEl)
  setTimeout(() => {
    staleToastEl?.remove()
    staleToastEl = null
    // Tear ourselves down so the broken bubble doesn't keep floating after
    // the extension is gone or reloaded.
    try {
      ;(window as any).__edupilotTeardown?.()
    } catch { /* ignore */ }
  }, 4000)
}

// ---------- Auth sync (only fires on the GradPilot dashboard origin) ----------
const syncAuthWithBackground = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const sbStorageKey = 'sb-ecbqhlfguzkwffqbtbqz-auth-token'
    const authDataStr = localStorage.getItem(sbStorageKey)
    if (authDataStr) {
      try {
        const authData = JSON.parse(authDataStr)
        try {
          chrome.runtime.sendMessage({ type: 'SYNC_AUTH', payload: authData })
        } catch { /* extension reloaded */ }
      } catch {
        /* ignore */
      }
    }
  }
}

// ---------- Page snapshot for chat / analyze ----------
const extractContext = () => {
  const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
    .map((el: any) => `${el.name || el.id || el.type}: ${el.value}`)
    .join(' | ')
  return {
    url: window.location.href,
    title: document.title,
    text: `Visible Text: ${document.body.innerText.replace(/\s+/g, ' ').substring(0, 1500)} \n Form Fields: ${inputs}`,
  }
}

// =====================================================================
// Form harvester / autofill applier
// =====================================================================

type HarvestedField = {
  key: string
  type: string
  tag: 'input' | 'textarea' | 'select'
  label: string
  placeholder?: string
  options?: string[]
  required?: boolean
}

let HARVEST_KEY_COUNTER = 0

const closestLabel = (el: HTMLElement): string => {
  const id = el.getAttribute('id')
  if (id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`)
    if (lbl?.textContent) return lbl.textContent.trim()
  }
  const wrappingLabel = el.closest('label')
  if (wrappingLabel?.textContent) return wrappingLabel.textContent.trim()
  const aria = el.getAttribute('aria-label')
  if (aria) return aria.trim()
  const ariaBy = el.getAttribute('aria-labelledby')
  if (ariaBy) {
    const node = document.getElementById(ariaBy)
    if (node?.textContent) return node.textContent.trim()
  }
  const placeholder = el.getAttribute('placeholder')
  if (placeholder) return placeholder.trim()
  let cursor: HTMLElement | null = el
  for (let i = 0; i < 4 && cursor; i++) {
    cursor = cursor.parentElement
    if (!cursor) break
    const legend = cursor.querySelector('legend, dt')
    if (legend?.textContent) return legend.textContent.trim()
  }
  return ''
}

const harvestFields = (): HarvestedField[] => {
  const out: HarvestedField[] = []
  const nodes = document.querySelectorAll<HTMLElement>('input, textarea, select')
  nodes.forEach((node) => {
    const tagName = node.tagName.toLowerCase() as 'input' | 'textarea' | 'select'
    const typeAttr = (node.getAttribute('type') || tagName).toLowerCase()
    if (
      typeAttr === 'hidden' ||
      typeAttr === 'submit' ||
      typeAttr === 'button' ||
      typeAttr === 'reset' ||
      typeAttr === 'file' ||
      typeAttr === 'image'
    )
      return
    const cs = window.getComputedStyle(node)
    if (cs.display === 'none' || cs.visibility === 'hidden') return

    let key =
      node.getAttribute('data-edupilot-key') ||
      node.getAttribute('id') ||
      node.getAttribute('name') ||
      ''
    if (!key) {
      key = `edupilot-${++HARVEST_KEY_COUNTER}`
      node.setAttribute('data-edupilot-key', key)
    }

    const field: HarvestedField = {
      key,
      type: typeAttr,
      tag: tagName,
      label: closestLabel(node),
      placeholder: node.getAttribute('placeholder') || undefined,
      required: node.hasAttribute('required'),
    }

    if (tagName === 'select') {
      field.options = Array.from((node as HTMLSelectElement).options)
        .map((o) => o.text.trim())
        .filter(Boolean)
    } else if (typeAttr === 'radio') {
      const name = node.getAttribute('name')
      if (name) {
        const dupe = out.find((f) => f.type === 'radio' && f.key === `radio:${name}`)
        if (dupe) {
          dupe.options = dupe.options || []
          dupe.options.push(
            (node as HTMLInputElement).value || node.getAttribute('aria-label') || closestLabel(node),
          )
          return
        }
        field.key = `radio:${name}`
        field.options = [
          (node as HTMLInputElement).value || node.getAttribute('aria-label') || closestLabel(node),
        ]
      }
    }

    out.push(field)
  })
  return out
}

const setNativeValue = (
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) => {
  const proto = Object.getPrototypeOf(el)
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  const baseSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  if (setter && setter !== baseSetter) setter.call(el, value)
  else if (baseSetter) baseSetter.call(el, value)
  else (el as any).value = value
}

const findFieldByKey = (key: string) =>
  document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    `[data-edupilot-key="${CSS.escape(key)}"]`,
  ) ||
  document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    `[id="${CSS.escape(key)}"]`,
  ) ||
  document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    `[name="${CSS.escape(key)}"]`,
  )

const applyAutofill = (
  fillMap: Record<string, string>,
): { filled: number; skipped: number; filledKeys: string[] } => {
  let filled = 0
  let skipped = 0
  const filledKeys: string[] = []

  Object.entries(fillMap).forEach(([key, rawValue]) => {
    const value = String(rawValue ?? '').trim()
    if (!value) {
      skipped++
      return
    }

    if (key.startsWith('radio:')) {
      const name = key.slice('radio:'.length)
      const radios = document.querySelectorAll<HTMLInputElement>(
        `input[type="radio"][name="${CSS.escape(name)}"]`,
      )
      const match = Array.from(radios).find(
        (r) => (r.value || closestLabel(r)).toLowerCase() === value.toLowerCase(),
      )
      if (match) {
        match.checked = true
        match.dispatchEvent(new Event('input', { bubbles: true }))
        match.dispatchEvent(new Event('change', { bubbles: true }))
        filled++
        filledKeys.push(key)
      } else {
        skipped++
      }
      return
    }

    const el = findFieldByKey(key)
    if (!el) {
      skipped++
      return
    }

    if (el.tagName === 'SELECT') {
      const select = el as HTMLSelectElement
      const opt = Array.from(select.options).find(
        (o) =>
          o.value.toLowerCase() === value.toLowerCase() ||
          o.text.trim().toLowerCase() === value.toLowerCase(),
      )
      if (!opt) {
        skipped++
        return
      }
      select.value = opt.value
      select.dispatchEvent(new Event('input', { bubbles: true }))
      select.dispatchEvent(new Event('change', { bubbles: true }))
      filled++
      filledKeys.push(key)
      return
    }

    const inputType = (el.getAttribute('type') || '').toLowerCase()
    if (inputType === 'checkbox') {
      const truthy = ['true', 'yes', 'on', '1', 'checked'].includes(value.toLowerCase())
      ;(el as HTMLInputElement).checked = truthy
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      filled++
      filledKeys.push(key)
      return
    }

    setNativeValue(el as HTMLInputElement, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    filled++
    filledKeys.push(key)
  })

  return { filled, skipped, filledKeys }
}

// =====================================================================
// Voice + typo monitor
// =====================================================================
//
// `startTypoMonitor(profile)` watches every visible text input on the page.
// When the user blurs a field we compare what they typed to a small set of
// "expected" profile values. If the typed value is clearly a partial /
// typo of one of those (e.g. "Darshan pat" vs "Darshan Patil") we speak a
// correction and surface a toast with an "Apply correction" button.

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, '')

// Levenshtein distance up to a small cap, used to spot typos.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const m: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) m[i][0] = i
  for (let j = 0; j <= b.length; j++) m[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = Math.min(
        m[i - 1][j] + 1,
        m[i][j - 1] + 1,
        m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
  }
  return m[a.length][b.length]
}

let voiceEnabled = true
let voicePrimed = false
let preferredVoice: SpeechSynthesisVoice | null = null

// Some browsers populate `getVoices()` asynchronously. Cache the best
// English voice as soon as the list is available.
const pickEnglishVoice = () => {
  try {
    const voices = window.speechSynthesis?.getVoices?.() || []
    if (!voices.length) return
    preferredVoice =
      voices.find((v) => /en[-_]US/i.test(v.lang) && /Google|Samantha|Microsoft/i.test(v.name)) ||
      voices.find((v) => /en[-_]US/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      voices[0] ||
      null
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickEnglishVoice()
  window.speechSynthesis.onvoiceschanged = pickEnglishVoice
}

// Browsers (especially Chrome on macOS) gate speechSynthesis behind an
// explicit user gesture. Calling this from a click/keypress handler unlocks
// audio for the rest of the session.
function primeVoice() {
  if (voicePrimed) return
  try {
    if (!('speechSynthesis' in window)) return
    const silent = new SpeechSynthesisUtterance(' ')
    silent.volume = 0
    silent.rate = 1
    if (preferredVoice) silent.voice = preferredVoice
    window.speechSynthesis.speak(silent)
    voicePrimed = true
  } catch {
    /* ignore */
  }
}

// Capture-phase listeners on the document so any user click/keypress on
// the host page primes the voice engine — important because the typo
// monitor fires on `blur`, which Chrome doesn't always treat as a fresh
// user gesture for audio playback.
if (typeof document !== 'undefined') {
  const onAnyInteraction = () => primeVoice()
  document.addEventListener('pointerdown', onAnyInteraction, true)
  document.addEventListener('keydown', onAnyInteraction, true)
}

const speak = (text: string) => {
  if (!voiceEnabled) return
  try {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.0
    u.pitch = 1.0
    u.volume = 1.0
    if (preferredVoice) u.voice = preferredVoice
    u.onerror = (e) => console.warn('[EduPilot] TTS error:', e)
    window.speechSynthesis.speak(u)
  } catch (err) {
    console.warn('[EduPilot] TTS speak failed:', err)
  }
}

let monitorInstalled = false
let monitorProfile: any = null

const profileExpectations = (profile: any): { value: string; label: string }[] => {
  if (!profile) return []
  const out: { value: string; label: string }[] = []
  const push = (label: string, value: any) => {
    if (value == null) return
    const s = String(value).trim()
    if (s.length >= 2) out.push({ value: s, label })
  }
  push('name', profile.name)
  push('email', profile.email)
  push('mobile', profile.mobile)
  push('city', profile.city)
  push('state', profile.state)
  push('undergrad college', profile.undergrad_college)
  push('undergrad degree', profile.undergrad_degree)
  push('undergrad specialization', profile.undergrad_specialization)
  push('CGPA', profile.undergrad_cgpa)
  push('graduation year', profile.undergrad_grad_year)
  push('target degree', profile.target_degree)
  return out
}

const looksLikeTypo = (
  typed: string,
  expectations: { value: string; label: string }[],
): { expected: string; label: string } | null => {
  const t = norm(typed)
  if (t.length < 2) return null
  for (const exp of expectations) {
    const e = norm(exp.value)
    if (!e || e === t) continue
    // Accept as a typo if the typed value is a strict prefix of the expected
    // (truncated entry, e.g. "Darshan pat" -> "Darshan Patil").
    if (e.startsWith(t) && t.length >= Math.max(3, e.length - 6)) {
      return { expected: exp.value, label: exp.label }
    }
    // Accept if Levenshtein distance is small relative to length.
    const dist = levenshtein(t, e)
    const tolerance = e.length <= 8 ? 1 : e.length <= 16 ? 2 : 3
    if (dist > 0 && dist <= tolerance) {
      return { expected: exp.value, label: exp.label }
    }
  }
  return null
}

let correctionToastEl: HTMLDivElement | null = null
function showCorrectionToast(args: { message: string; onApply?: () => void }) {
  if (correctionToastEl) correctionToastEl.remove()
  correctionToastEl = document.createElement('div')
  Object.assign(correctionToastEl.style, {
    position: 'fixed',
    bottom: '6.5rem',
    right: '1.5rem',
    zIndex: '2147483647',
    padding: '12px 16px',
    borderRadius: '12px',
    background: 'rgba(11,20,26,0.96)',
    color: '#e9edef',
    font: '500 13px/1.4 -apple-system, system-ui, sans-serif',
    boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    maxWidth: '340px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  })
  const text = document.createElement('div')
  text.textContent = args.message
  correctionToastEl.appendChild(text)
  if (args.onApply) {
    const row = document.createElement('div')
    Object.assign(row.style, { display: 'flex', gap: '8px', justifyContent: 'flex-end' })
    const apply = document.createElement('button')
    apply.textContent = 'Apply correction'
    Object.assign(apply.style, {
      background: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      padding: '6px 10px',
      fontSize: '12px',
      cursor: 'pointer',
      fontWeight: '600',
    })
    apply.onclick = () => {
      args.onApply?.()
      correctionToastEl?.remove()
      correctionToastEl = null
    }
    const dismiss = document.createElement('button')
    dismiss.textContent = 'Dismiss'
    Object.assign(dismiss.style, {
      background: 'transparent',
      color: '#aebac1',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '8px',
      padding: '6px 10px',
      fontSize: '12px',
      cursor: 'pointer',
    })
    dismiss.onclick = () => {
      correctionToastEl?.remove()
      correctionToastEl = null
    }
    row.append(dismiss, apply)
    correctionToastEl.appendChild(row)
  }
  document.body.appendChild(correctionToastEl)
  setTimeout(() => {
    if (correctionToastEl) {
      correctionToastEl.remove()
      correctionToastEl = null
    }
  }, 9000)
}

function handleFieldBlur(e: Event) {
  const target = e.target as HTMLInputElement | HTMLTextAreaElement | null
  if (!target) return
  if (!('value' in target)) return
  const tag = target.tagName.toLowerCase()
  if (tag !== 'input' && tag !== 'textarea') return
  const t = (target.getAttribute('type') || 'text').toLowerCase()
  if (!['text', 'email', 'tel', 'search', 'url', 'textarea'].includes(t)) return
  const typed = (target as HTMLInputElement).value
  if (!typed || typed.length < 2) return

  const expectations = profileExpectations(monitorProfile)
  const hit = looksLikeTypo(typed, expectations)
  if (!hit) return

  const phrase = `Heads up. You typed ${typed}. The correct ${hit.label} is ${hit.expected}.`
  speak(phrase)
  showCorrectionToast({
    message: `⚠️ "${typed}" looks off. Your ${hit.label} on file is "${hit.expected}".`,
    onApply: () => {
      setNativeValue(target as HTMLInputElement, hit.expected)
      target.dispatchEvent(new Event('input', { bubbles: true }))
      target.dispatchEvent(new Event('change', { bubbles: true }))
      speak(`${hit.label} corrected.`)
    },
  })
}

function startTypoMonitor(profile: any) {
  monitorProfile = profile
  if (monitorInstalled) return
  monitorInstalled = true
  document.addEventListener('blur', handleFieldBlur, true)
  // Watch dynamically inserted forms (SPA pages).
  const obs = new MutationObserver(() => {
    /* nothing — `blur` listens on capture, so new fields are auto-covered. */
  })
  obs.observe(document.body, { subtree: true, childList: true })
}

// =====================================================================
// Floating bubble
// =====================================================================

type ChatMsg =
  | { role: 'user' | 'ai'; content: string }
  | {
      role: 'ai-question'
      content: string
      fieldKey: string
      fieldLabel: string
    }
  | {
      role: 'ai-picker'
      content: string
      profiles: { id: string; name?: string; email?: string; role?: string; avatar_url?: string }[]
    }

function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(() => sessionStorage.getItem('edupilot-isOpen') === 'true')
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    const saved = sessionStorage.getItem('edupilot-messages')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        /* ignore */
      }
    }
    return [
      {
        role: 'ai',
        content:
          'Hi! I am Arjuna Sarathi AI. I can read this page, walk you through the form, or auto-fill it from your GradPilot profile. Click "Auto-fill" to begin, or just ask me anything.',
      } as ChatMsg,
    ]
  })
  const [input, setInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [chatting, setChatting] = useState(false)
  const [autoFilling, setAutoFilling] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Pending follow-up questions for fields the AI couldn't fill.
  const pendingQueueRef = useRef<{ key: string; label: string; hint: string }[]>([])
  const activeQuestionRef = useRef<{ key: string; label: string } | null>(null)
  // Stash of harvested fields kept across the profile-picker round-trip.
  const pendingFieldsRef = useRef<HarvestedField[]>([])

  useEffect(() => {
    syncAuthWithBackground()
    // First-open behavior: if no profile is cached, immediately surface the
    // picker so the user picks who we're filling for. Otherwise just hand
    // the cached profile to the typo monitor.
    safeSendMessage<{ profile?: any }>({ type: 'GET_PROFILE' }).then((res) => {
      if (res?.profile) {
        startTypoMonitor(res.profile)
      } else {
        promptForProfilePick([])
      }
    })
  }, [])

  useEffect(() => {
    sessionStorage.setItem('edupilot-isOpen', isOpen.toString())
  }, [isOpen])
  useEffect(() => {
    sessionStorage.setItem('edupilot-messages', JSON.stringify(messages))
  }, [messages])
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isMinimized, isOpen])

  useEffect(() => {
    voiceEnabled = voiceOn
  }, [voiceOn])

  useEffect(() => {
    const handleToggle = () => setIsOpen((p) => !p)
    window.addEventListener('edupilot:toggle', handleToggle as any)
    return () => window.removeEventListener('edupilot:toggle', handleToggle as any)
  }, [])

  const handleStop = () => {
    bumpGenerationAndStop()
    setAutoFilling(false)
    setAnalyzing(false)
    setChatting(false)
    pendingQueueRef.current = []
    activeQuestionRef.current = null
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
    appendAi('⏹️ Stopped.')
  }

  const handleResetChat = () => {
    // Clear in-flight Q&A and any cached fields so the next Auto-fill
    // starts from scratch.
    pendingQueueRef.current = []
    pendingFieldsRef.current = []
    activeQuestionRef.current = null
    setInput('')
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
    setMessages([
      {
        role: 'ai',
        content:
          'Chat cleared. Ready to start fresh. Click Auto-fill to begin or ask me anything about this page.',
      } as ChatMsg,
    ])
  }

  const appendAi = (content: string) => setMessages((p) => [...p, { role: 'ai', content }])
  const appendUser = (content: string) => setMessages((p) => [...p, { role: 'user', content }])

  const askNextMissing = () => {
    const next = pendingQueueRef.current.shift()
    if (!next) {
      activeQuestionRef.current = null
      appendAi('All set! Anything that needed your input has been filled. Review the form before submitting.')
      speak('All required information is filled in.')
      return
    }
    activeQuestionRef.current = { key: next.key, label: next.label }
    setMessages((p) => [
      ...p,
      {
        role: 'ai-question',
        content: next.hint || `What should I put for "${next.label}"?`,
        fieldKey: next.key,
        fieldLabel: next.label,
      },
    ])
  }

  const runAutofillFlow = (fields: HarvestedField[]) => {
    appendAi(`🤖 Mapping ${fields.length} fields to your profile (this can take 5–10s)…`)
    safeSendMessage<{
      success: boolean
      fill?: Record<string, string>
      missing?: { key: string; label: string; hint: string }[]
      profile?: any
      error?: string
    }>({
      type: 'PLAN_AUTOFILL',
      payload: { fields, url: window.location.href, title: document.title },
    }).then((res) => {
      setAutoFilling(false)
      if (!res?.success) {
        appendAi(`⚠️ ${res?.error || 'Could not get a fill plan.'}`)
        return
      }
      if (res.profile) startTypoMonitor(res.profile)

      const fill: Record<string, string> = res.fill || {}
      const result = applyAutofill(fill)
      appendAi(
        `✅ Filled ${result.filled} ${result.filled === 1 ? 'field' : 'fields'} from your profile${
          result.skipped ? `, skipped ${result.skipped}` : ''
        }.`,
      )
      speak(`Filled ${result.filled} fields from your profile.`)

      const missing: { key: string; label: string; hint: string }[] = res.missing || []
      if (missing.length === 0) {
        appendAi('Looks like nothing else needs your input. Review and submit.')
        return
      }
      appendAi(
        `I need a bit more info for ${missing.length} ${missing.length === 1 ? 'field' : 'fields'}. Answer them below and I'll fill them in.`,
      )
      pendingQueueRef.current = missing
      askNextMissing()
    })
  }

  const promptForProfilePick = (fields: HarvestedField[]) => {
    const isInitial = !fields.length
    appendAi(
      isInitial
        ? 'Hi! Pick the student profile you want me to assist for today.'
        : 'I need a profile to fill from. Loading profiles…',
    )
    safeSendMessage<{ success: boolean; profiles?: any[]; error?: string }>({
      type: 'LIST_PROFILES',
    }).then((res) => {
      if (!res?.success) {
        if (!isInitial) setAutoFilling(false)
        appendAi(`⚠️ ${res?.error || "Couldn't load profiles."}`)
        return
      }
      const profiles: any[] = res.profiles || []
      if (!profiles.length) {
        if (!isInitial) setAutoFilling(false)
        appendAi("No profiles found yet. Sign in on the GradPilot dashboard once and try again.")
        return
      }
      pendingFieldsRef.current = fields
      setMessages((p) => [
        ...p,
        {
          role: 'ai-picker',
          content: isInitial
            ? `Showing ${profiles.length} profile${profiles.length === 1 ? '' : 's'}. Click one to start.`
            : 'Pick the profile you want me to fill from:',
          profiles,
        } as ChatMsg,
      ])
    })
  }

  const handleAutoFill = async () => {
    if (autoFilling) return
    primeVoice()
    setAutoFilling(true)
    appendAi('🔎 Reading the form on this page…')

    const fields = harvestFields()
    if (!fields.length) {
      appendAi("I couldn't see any form fields on this page.")
      setAutoFilling(false)
      return
    }

    // Do we already have a profile? If not, ask the user to pick one.
    safeSendMessage<{ profile?: any }>({ type: 'GET_PROFILE' }).then((res) => {
      if (res?.profile) {
        runAutofillFlow(fields)
      } else {
        promptForProfilePick(fields)
      }
    })
  }

  const handlePickProfile = (id: string, name?: string, preview?: any) => {
    appendUser(`Use profile: ${name || id}`)
    safeSendMessage<{ success: boolean; profile?: any; error?: string }>({
      type: 'PICK_PROFILE',
      payload: { id, preview },
    }).then((res) => {
      if (!res?.success || !res.profile) {
        setAutoFilling(false)
        appendAi(`⚠️ ${res?.error || 'Could not load that profile.'}`)
        return
      }
      startTypoMonitor(res.profile)
      const profileName = res.profile.name || name || 'this student'

      // If we picked because Auto-fill needed it, the autofill flow had
      // already harvested fields — proceed with the autofill.
      if (pendingFieldsRef.current.length) {
        const fields = pendingFieldsRef.current
        pendingFieldsRef.current = []
        runAutofillFlow(fields)
        return
      }

      // Initial-pick (bubble just opened): just confirm and stand by.
      setAutoFilling(false)
      appendAi(
        `Got it — I'll work with ${profileName}'s profile. ` +
          `Click Auto-fill on any application form, ask me about admission chances, or just type a question.`,
      )
      speak(`Working with ${profileName}'s profile.`)
    })
  }

  const handleAnalyzePage = () => {
    primeVoice()
    setAnalyzing(true)
    safeSendMessage<{ success: boolean; analysis?: string; error?: string }>({
      type: 'ANALYZE_CONTEXT',
      payload: extractContext(),
    }).then((response) => {
      setAnalyzing(false)
      if (response?.success) appendAi(response.analysis || '')
      else appendAi(`Error: ${response?.error || 'Unknown error.'}`)
    })
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || chatting) return
    const userMsg = input.trim()
    setInput('')

    // If we're in the middle of a missing-field Q&A, treat the user's
    // reply as the answer instead of forwarding to the chat model.
    if (activeQuestionRef.current) {
      const target = activeQuestionRef.current
      appendUser(userMsg)
      const result = applyAutofill({ [target.key]: userMsg })
      if (result.filled) {
        appendAi(`✓ Filled "${target.label}" with "${userMsg}".`)
      } else {
        appendAi(
          `Hmm, I couldn't put "${userMsg}" into "${target.label}" automatically. Please type it manually if needed.`,
        )
      }
      askNextMissing()
      return
    }

    appendUser(userMsg)
    setChatting(true)
    safeSendMessage<{ success: boolean; response?: string; error?: string }>({
      type: 'CHAT',
      payload: {
        context: extractContext(),
        history: messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'ai',
          content: 'content' in m ? m.content : '',
        })),
        newMessage: userMsg,
      },
    }).then((response) => {
      setChatting(false)
      if (response?.success) appendAi(response.response || '')
      else appendAi(`Error: ${response?.error || 'Unknown chat error.'}`)
    })
  }

  if (!isOpen) {
    return (
      <motion.button
        drag
        dragElastic={0.1}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          primeVoice()
          setIsOpen(true)
        }}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-center cursor-grab active:cursor-grabbing z-[2147483647] border-2 border-white/20 backdrop-blur-xl"
        style={{ color: 'white' }}
      >
        {LOGO_URL ? (
          <img src={LOGO_URL} alt="EduPilot" className="w-10 h-10 rounded-full object-contain" />
        ) : (
          <Bot className="w-8 h-8" />
        )}
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#111b21] animate-pulse" />
      </motion.button>
    )
  }

  return (
    <motion.div
      drag={!isMinimized}
      dragConstraints={{ left: -window.innerWidth + 400, right: 0, top: -window.innerHeight + 600, bottom: 0 }}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`fixed bottom-6 right-6 z-[2147483647] flex flex-col bg-[#0b141a]/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : 'w-[400px] h-[600px]'
      }`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="p-4 bg-gradient-to-r from-indigo-900/40 to-emerald-900/40 border-b border-white/10 flex items-center justify-between cursor-grab active:cursor-grabbing text-white">
        <div className="flex items-center gap-2 pointer-events-none">
          {LOGO_URL ? (
            <img src={LOGO_URL} alt="" className="w-5 h-5 rounded-full object-contain" />
          ) : (
            <Bot className="w-5 h-5 text-emerald-400" />
          )}
          <span className="font-bold tracking-wide text-sm">Arjuna Sarathi AI</span>
        </div>
        <div className="flex items-center gap-1">
          {(autoFilling || analyzing || chatting) && (
            <button
              onClick={handleStop}
              title="Stop"
              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer text-red-300"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          )}
          <button
            onClick={handleResetChat}
            title="Reset chat"
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              primeVoice()
              const next = !voiceOn
              setVoiceOn(next)
              if (next) {
                // Force a primed sample so the user hears whether voice
                // actually works on this machine.
                speak('Voice on. I will speak corrections out loud.')
              } else {
                try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
              }
            }}
            title={voiceOn ? 'Voice on (click to mute)' : 'Voice off (click to unmute)'}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            title="Hide bubble"
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="p-3 bg-[#111b21] border-b border-white/5 flex gap-2">
            <button
              onClick={handleAutoFill}
              disabled={autoFilling}
              className="flex-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 font-medium py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {autoFilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {autoFilling ? 'Filling…' : 'Auto-fill'}
            </button>
            <button
              onClick={handleAnalyzePage}
              disabled={analyzing}
              className="flex-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 font-medium py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {analyzing ? 'Reading…' : 'Analyze Page'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-white custom-scrollbar">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user'
              const isQuestion = msg.role === 'ai-question'
              const isPicker = msg.role === 'ai-picker'
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[90%] p-3 rounded-2xl ${
                      isUser
                        ? 'bg-emerald-600 rounded-tr-sm'
                        : isQuestion
                        ? 'bg-amber-500/15 border border-amber-500/30 rounded-tl-sm text-amber-100'
                        : isPicker
                        ? 'bg-indigo-500/10 border border-indigo-500/30 rounded-tl-sm text-indigo-100'
                        : 'bg-[#202c33] border border-white/5 rounded-tl-sm text-gray-200'
                    }`}
                  >
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {isQuestion && (
                      <p className="text-[11px] text-amber-300/80 mt-1">Field: {(msg as any).fieldLabel}</p>
                    )}
                    {isPicker && (
                      <div className="mt-2 flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                        {(msg as any).profiles.map((p: any) => (
                          <button
                            key={p.id}
                            onClick={() => handlePickProfile(p.id, p.name, p)}
                            className="flex items-center gap-2 text-left bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-lg px-2.5 py-1.5 transition-colors"
                          >
                            <img
                              src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || p.email || '?')}&background=312e81&color=fff`}
                              alt=""
                              className="w-6 h-6 rounded-full flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-semibold text-white truncate">{p.name || 'Unnamed'}</div>
                              <div className="text-[10px] text-indigo-200/70 truncate">{p.email || p.role || ''}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {chatting && (
              <div className="flex justify-start">
                <div className="bg-[#202c33] border border-white/5 rounded-2xl rounded-tl-sm p-3 text-gray-400 text-xs flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Arjuna is typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-[#111b21] border-t border-white/10">
            <div className="flex items-center gap-2 bg-[#202c33] p-2 rounded-xl border border-white/5 focus-within:border-indigo-500/50 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  activeQuestionRef.current
                    ? `Answer for ${activeQuestionRef.current.label}…`
                    : 'Ask me what to fill out...'
                }
                className="flex-1 bg-transparent text-white outline-none px-2 text-[13px] placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || chatting}
                className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </>
      )}
    </motion.div>
  )
}

// Inject once. Shadow DOM keeps the page's CSS from leaking into our UI.
if (!document.getElementById('edupilot-ai-root')) {
  const container = document.createElement('div')
  container.id = 'edupilot-ai-root'
  document.body.appendChild(container)

  const shadowRoot = container.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = tailwindStyle
  shadowRoot.appendChild(style)

  const root = document.createElement('div')
  shadowRoot.appendChild(root)

  const reactRoot = ReactDOM.createRoot(root)
  reactRoot.render(
    <React.StrictMode>
      <FloatingAssistant />
    </React.StrictMode>,
  )

  // Best-effort: fetch the profile early so the voice-monitor catches typos
  // even before the user clicks Auto-fill.
  safeSendMessage<{ profile?: any }>({ type: 'GET_PROFILE' }).then((res) => {
    if (res?.profile) startTypoMonitor(res.profile)
  })

  // Self-destruct when the extension is uninstalled, disabled, or reloaded.
  // Chrome leaves the previously injected script alive in open tabs and only
  // invalidates `chrome.runtime`. Without this teardown the ghost bubble keeps
  // floating with broken buttons. We poll the runtime id every 5s; the moment
  // it's gone we yank the DOM root and stop the typo monitor.
  let teardownDone = false
  const teardown = () => {
    if (teardownDone) return
    teardownDone = true
    try {
      reactRoot.unmount()
    } catch { /* ignore */ }
    try {
      container.remove()
    } catch { /* ignore */ }
    try {
      document.removeEventListener('blur', handleFieldBlur, true)
    } catch { /* ignore */ }
    try {
      window.speechSynthesis?.cancel()
    } catch { /* ignore */ }
    if (heartbeat) clearInterval(heartbeat)
    if (correctionToastEl) {
      correctionToastEl.remove()
      correctionToastEl = null
    }
    if (staleToastEl) {
      staleToastEl.remove()
      staleToastEl = null
    }
  }

  const heartbeat = setInterval(() => {
    try {
      // chrome.runtime.id becomes undefined the instant the extension is
      // uninstalled, disabled, or reloaded.
      if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
        teardown()
      }
    } catch {
      teardown()
    }
  }, 5000)

  // Expose the teardown so showStaleContextToast can also tear us down on
  // first failed message instead of waiting for the next heartbeat.
  ;(window as any).__edupilotTeardown = teardown
}
