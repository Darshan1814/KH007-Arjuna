import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import {
  GraduationCap,
  CheckCircle2,
  Wand2,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'

function Popup() {
  const [user, setUser] = useState<any>(null)
  const [toggling, setToggling] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)

  useEffect(() => {
    chrome.storage.local.get(['authData'], (result) => {
      const authData = result.authData as any
      if (authData?.user) setUser(authData.user)
    })
  }, [])

  const handleToggleOnPage = () => {
    setToggling(true)
    setToggleError(null)
    chrome.runtime.sendMessage({ type: 'TOGGLE_ON_ACTIVE_TAB' }, (response) => {
      setToggling(false)
      if (chrome.runtime.lastError) {
        setToggleError(chrome.runtime.lastError.message || 'Could not reach page')
        return
      }
      if (!response?.success) {
        setToggleError(response?.error || 'Failed to toggle')
        return
      }
      window.close()
    })
  }

  return (
    <div className="flex flex-col h-full bg-[#0b141a] text-gray-100 p-5 overflow-hidden">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/20">
          <img src={chrome.runtime.getURL('public/extension-logo.png')} alt="EduPilot" className="w-6 h-6 rounded-full object-contain" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400">
            EduPilot AI
          </h1>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            {user ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Synced with Dashboard
              </span>
            ) : (
              <span>Arjuna Sarathi AI is active.</span>
            )}
          </p>
        </div>
      </div>

      <button
        onClick={handleToggleOnPage}
        disabled={toggling}
        className="mb-4 w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2 text-sm border border-emerald-400/30 disabled:opacity-50"
      >
        {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {toggling ? 'Loading…' : 'Open AI Copilot on this page'}
      </button>

      {toggleError && (
        <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{toggleError}</span>
        </div>
      )}

      <div className="flex-1 bg-[#202c33] rounded-2xl p-5 border border-white/5 flex flex-col justify-center items-center text-center">
        <Sparkles className="w-9 h-9 text-emerald-400 mb-3 animate-pulse" />
        <h2 className="text-sm font-semibold mb-2">Ready to assist!</h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          Open any university or application page, then click the button
          above. EduPilot reads the page and walks you through filling out
          the form, step by step.
        </p>
      </div>

      <div className="mt-4">
        <button
          onClick={() => chrome.tabs.create({ url: 'http://localhost:3000' })}
          className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex justify-center items-center gap-2 text-sm border border-indigo-400/30"
        >
          <GraduationCap className="w-4 h-4" /> Open GradPilot Dashboard
        </button>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
)
