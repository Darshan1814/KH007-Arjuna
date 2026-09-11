import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { motion } from 'framer-motion'
import { Bot, X, Sparkles, Send, Minimize2, Maximize2, Loader2 } from 'lucide-react'
import tailwindStyle from './index.css?inline'

// Sync Auth if we are on localhost:3000
const syncAuthWithBackground = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const sbStorageKey = 'sb-ecbqhlfguzkwffqbtbqz-auth-token';
    const authDataStr = localStorage.getItem(sbStorageKey);
    if (authDataStr) {
      try {
        const authData = JSON.parse(authDataStr);
        chrome.runtime.sendMessage({ type: 'SYNC_AUTH', payload: authData });
        console.log("EduPilot AI: Synced user auth to extension!");
      } catch (e) {}
    }
  }
}

// Content Extractor
const extractContext = () => {
  // Extract inputs and their labels context specifically for forms
  const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map((el: any) => {
    return `${el.name || el.id || el.type}: ${el.value}`
  }).join(' | ')

  return {
    url: window.location.href,
    title: document.title,
    text: `Visible Text: ${document.body.innerText.replace(/\s+/g, ' ').substring(0, 1500)} \n Form Fields: ${inputs}`
  }
}

function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(() => {
    return sessionStorage.getItem('edupilot-isOpen') === 'true';
  })
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>(() => {
    const saved = sessionStorage.getItem('edupilot-messages');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [{ role: 'ai', content: 'Hi! I am Arjuna Sarathi AI. I can read the page and guide you on what to fill out. Click "Analyze Page" or just ask me a question!' }];
  })
  const [input, setInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [chatting, setChatting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    syncAuthWithBackground();
  }, [])

  useEffect(() => {
    sessionStorage.setItem('edupilot-isOpen', isOpen.toString());
  }, [isOpen]);

  useEffect(() => {
    sessionStorage.setItem('edupilot-messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isMinimized, isOpen])

  useEffect(() => {
    const handleMessage = (msg: any) => {
      if (msg.type === 'TOGGLE_CHAT') {
        setIsOpen(prev => !prev);
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleAnalyzePage = () => {
    setAnalyzing(true)
    const context = extractContext()
    
    chrome.runtime.sendMessage({ type: 'ANALYZE_CONTEXT', payload: context }, (response) => {
      setAnalyzing(false)
      if (response?.success) {
        setMessages(prev => [...prev, { role: 'ai', content: response.analysis }])
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: `Error: ${response?.error || 'Unknown error occurred in background script.'}` }])
      }
    })
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || chatting) return
    
    const userMsg = input.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setChatting(true)
    
    const context = extractContext()
    
    chrome.runtime.sendMessage({ 
      type: 'CHAT', 
      payload: { context, history: messages, newMessage: userMsg } 
    }, (response) => {
      setChatting(false)
      if (response?.success) {
        setMessages(prev => [...prev, { role: 'ai', content: response.response }])
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: `Error: ${response?.error || 'Unknown chat error.'}` }])
      }
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
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-center cursor-grab active:cursor-grabbing z-[2147483647] border-2 border-white/20 backdrop-blur-xl"
        style={{ color: 'white' }}
      >
        <Bot className="w-8 h-8" />
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
      {/* Header (Drag Handle) */}
      <div className="p-4 bg-gradient-to-r from-indigo-900/40 to-emerald-900/40 border-b border-white/10 flex items-center justify-between cursor-grab active:cursor-grabbing text-white">
        <div className="flex items-center gap-2 pointer-events-none">
          <Bot className="w-5 h-5 text-emerald-400" />
          <span className="font-bold tracking-wide text-sm">Arjuna Sarathi AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Action Bar */}
          <div className="p-3 bg-[#111b21] border-b border-white/5 flex gap-2">
            <button 
              onClick={handleAnalyzePage}
              disabled={analyzing}
              className="flex-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 font-medium py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {analyzing ? 'Reading Page & Forms...' : 'Analyze Page Context'}
            </button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-white custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-emerald-600 rounded-tr-sm' 
                    : 'bg-[#202c33] border border-white/5 rounded-tl-sm text-gray-200'
                }`}>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {chatting && (
              <div className="flex justify-start">
                <div className="bg-[#202c33] border border-white/5 rounded-2xl rounded-tl-sm p-3 text-gray-400 text-xs flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Arjuna is typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-[#111b21] border-t border-white/10">
            <div className="flex items-center gap-2 bg-[#202c33] p-2 rounded-xl border border-white/5 focus-within:border-indigo-500/50 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me what to fill out..."
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

// Ensure it only injects once
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

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <FloatingAssistant />
    </React.StrictMode>
  )
}
