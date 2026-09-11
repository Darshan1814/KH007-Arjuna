import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { Sparkles, Bot, GraduationCap, History, CheckCircle2, ChevronRight, Globe } from 'lucide-react'

function Popup() {
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    chrome.storage.local.get(['authData', 'analysisHistory'], (result) => {
      const authData = result.authData as any;
      const analysisHistory = result.analysisHistory as any[];
      if (authData && authData.user) {
        setUser(authData.user);
      }
      if (analysisHistory) {
        setHistory(analysisHistory);
      }
    });
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0b141a] text-gray-100 p-5 overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/20">
          <Bot className="w-6 h-6 text-indigo-400" />
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
      
      {history.length > 0 ? (
        <div className="flex-1 bg-[#202c33] rounded-2xl p-4 border border-white/5 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-3 text-emerald-400">
            <History className="w-4 h-4" />
            <h2 className="text-sm font-semibold">Recent Universities</h2>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
            {history.map((item, i) => (
              <button 
                key={i}
                onClick={() => chrome.tabs.create({ url: item.url })}
                className="w-full text-left p-3 rounded-xl bg-[#111b21] hover:bg-white/5 transition-colors border border-white/5 flex items-center gap-3 group"
              >
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-200 truncate">{item.title}</p>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5">{new URL(item.url).hostname}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-[#202c33] rounded-2xl p-5 border border-white/5 flex flex-col justify-center items-center text-center">
          <Sparkles className="w-10 h-10 text-emerald-400 mb-4 animate-pulse" />
          <h2 className="text-sm font-semibold mb-2">Ready to assist!</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            Open any university website to see the AI Copilot in action.
          </p>
        </div>
      )}

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
  </React.StrictMode>
)
