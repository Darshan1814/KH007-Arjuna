'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, Paperclip, Mic, Check, CheckCheck, Video, Phone,
  FileText, Bot, Sparkles, User as UserIcon, X, Loader2, StopCircle
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import VideoCallModal from '@/components/VideoCallModal'

type CallState = 'idle' | 'calling' | 'incoming' | 'connected'

export default function ExpertChat() {
  const { profile } = useAppStore()
  const supabase = createClient()
  
  const [sessions, setSessions] = useState<any[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState('')
  const [showCopilot, setShowCopilot] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Call States
  const [callState, setCallState] = useState<CallState>('idle')
  const [isAudioOnly, setIsAudioOnly] = useState(false)
  const [webRTCSignal, setWebRTCSignal] = useState<any>(null)
  const channelRef = useRef<any>(null)

  // Update own last_seen presence
  useEffect(() => {
    if (profile?.id) {
      supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', profile.id).then()
    }
  }, [profile?.id, inputText])

  // Voice Note States
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<any>(null)
  
  // Copilot State
  const [copilotData, setCopilotData] = useState<{ suggestedReply?: string, profileSnapshot?: any } | null>(null)
  const [copilotLoading, setCopilotLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. Fetch active sessions for the expert
  useEffect(() => {
    if (!profile.id) return

    const fetchSessions = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('chat_sessions')
        .select(`
          id, status, created_at,
          student:profiles!chat_sessions_student_id_fkey(*)
        `)
        .eq('expert_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        setSessions(data)
        if (!activeChatId) setActiveChatId(data[0].id)
      }
      setLoading(false)
    }

    fetchSessions()
  }, [profile.id])

  // 2. Fetch messages & subscribe to realtime when activeChatId changes
  useEffect(() => {
    if (!activeChatId) return

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', activeChatId)
        .order('created_at', { ascending: true })
      
      if (data) {
        // Process signals that might have been missed if page was refreshed
        const signals = data.filter(m => m.document_name === 'call_signal')
        if (signals.length > 0) {
          const lastSignal = signals[signals.length - 1]
          if (lastSignal.sender_id !== profile.id && new Date(lastSignal.created_at).getTime() > Date.now() - 60000) {
            try {
              const sigData = JSON.parse(lastSignal.content)
              if (sigData.type === 'OFFER') {
                setIsAudioOnly(sigData.audioOnly)
                setCallState('incoming')
                setWebRTCSignal(sigData)
              } else if (sigData.type === 'ACCEPT') {
                setCallState('connected')
                setWebRTCSignal(sigData)
              }
            } catch (e) {}
          }
        }

        const filteredData = data.filter(m => m.document_name !== 'call_signal')
        setMessages(filteredData)
        triggerCopilotUpdate(filteredData)
      }
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }

    fetchMessages()

    const channel = supabase.channel(`chat_${activeChatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${activeChatId}`
      }, (payload) => {
        const newMsg = payload.new
        
        // Handle Call Signals encoded in messages
        if (newMsg.document_name === 'call_signal' && newMsg.sender_id !== profile.id) {
          try {
            const signal = JSON.parse(newMsg.content)
            if (signal.type === 'OFFER') {
              setIsAudioOnly(signal.audioOnly)
              setCallState('incoming')
              setWebRTCSignal(signal)
            } else if (signal.type === 'ACCEPT') {
              setCallState('connected')
              setWebRTCSignal(signal)
            } else if (signal.type === 'DECLINE' || signal.type === 'END') {
              setCallState('idle')
              setWebRTCSignal(null)
            } else if (signal.type === 'SDP' || signal.type === 'ICE') {
              setWebRTCSignal(signal)
            }
          } catch (e) {}
          return // Do not add signal messages to the UI state
        }

        // Only add normal messages to UI
        if (newMsg.document_name !== 'call_signal') {
          setMessages(prev => {
            const newMsgs = [...prev, newMsg]
            if (newMsg.sender_id !== profile.id) {
              triggerCopilotUpdate(newMsgs)
            }
            return newMsgs
          })
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeChatId])

  // Broadcast Call Signals via DB Inserts
  const sendSignal = async (signalData: any) => {
    await supabase.from('chat_messages').insert({
      session_id: activeChatId,
      sender_id: profile.id,
      document_name: 'call_signal',
      content: JSON.stringify(signalData)
    })
  }

  const handleStartCall = async (audioOnly: boolean) => {
    setIsAudioOnly(audioOnly)
    setCallState('calling')
    await sendSignal({ type: 'OFFER', audioOnly })
  }

  const handleAcceptCall = async () => {
    setCallState('connected')
    await sendSignal({ type: 'ACCEPT' })
  }

  const handleEndCall = async () => {
    setCallState('idle')
    await sendSignal({ type: 'END' })
  }

  const handleDeclineCall = async () => {
    setCallState('idle')
    await sendSignal({ type: 'DECLINE' })
  }

  // Voice Notes
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        await uploadVoiceNote(audioBlob)
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch (err) {
      toast.error('Microphone access denied')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(timerRef.current)
    }
  }

  const uploadVoiceNote = async (blob: Blob) => {
    setUploading(true)
    const fileName = `voice_${Date.now()}.webm`
    const filePath = `${activeChatId}/${fileName}`
    
    try {
      const { error } = await supabase.storage.from('chat_attachments').upload(filePath, blob)
      if (error) throw error
      
      const { data: { publicUrl } } = supabase.storage.from('chat_attachments').getPublicUrl(filePath)
      
      await supabase.from('chat_messages').insert({
        session_id: activeChatId,
        sender_id: profile.id,
        content: '🎤 Voice message',
        document_url: publicUrl,
        document_name: 'audio'
      })
    } catch (err) {
      toast.error('Failed to send voice note')
    }
    setUploading(false)
  }

  const triggerCopilotUpdate = async (currentMessages: any[]) => {
    if (currentMessages.length === 0) return
    setCopilotLoading(true)
    try {
      const formatted = currentMessages.slice(-10).map(m => ({
        role: m.sender_id === profile.id ? 'expert' : 'student',
        content: m.content
      }))
      const res = await fetch('/api/expert-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: formatted })
      })
      const data = await res.json()
      if (data.suggestedReply || data.profileSnapshot) {
        setCopilotData(data)
      }
    } catch (err) {
      console.error('Failed to update copilot', err)
    }
    setCopilotLoading(false)
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || !activeChatId || sending) return

    setSending(true)
    await supabase.from('chat_messages').insert({
      session_id: activeChatId,
      sender_id: profile.id,
      content: inputText.trim()
    })
    setInputText('')
    setSending(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeChatId) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    const filePath = `${activeChatId}/${fileName}`

    try {
      const { error: uploadError } = await supabase.storage.from('chat_attachments').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('chat_attachments').getPublicUrl(filePath)
      await supabase.from('chat_messages').insert({
        session_id: activeChatId,
        sender_id: profile.id,
        content: `Shared a document: ${file.name}`,
        document_url: publicUrl,
        document_name: file.name
      })
      toast.success('Document shared')
    } catch (err: any) {
      toast.error('Failed to upload document: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-[#0b141a]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  const getPresenceText = (lastSeen: string | undefined) => {
    if (!lastSeen) return 'Offline'
    const diff = Date.now() - new Date(lastSeen).getTime()
    if (diff < 5 * 60 * 1000) return 'Online'
    return `Last seen ${new Date(lastSeen).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
  }

  const activeSession = sessions.find(s => s.id === activeChatId)
  const student = activeSession?.student || { name: 'Student' }

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl overflow-hidden shadow-2xl border border-border bg-background">
      
      {/* Sidebar - Chat List */}
      <div className="w-80 border-r border-border bg-[#111b21] flex flex-col hidden md:flex">
        <div className="p-4 bg-[#202c33] text-gray-200 font-bold text-lg flex items-center justify-between border-b border-white/5">
          Active Chats
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm mt-4">
              No active chats. Check Connection Requests.
            </div>
          ) : sessions.map(chat => {
            const stu = chat.student || { name: 'Student' }
            const isActive = activeChatId === chat.id
            const presence = getPresenceText(stu.last_seen)
            
            return (
              <button key={chat.id} onClick={() => setActiveChatId(chat.id)}
                className={`w-full flex items-center gap-3 p-3 border-b border-[#202c33] hover:bg-[#202c33] transition-colors ${isActive ? 'bg-[#2a3942]' : ''}`}>
                <img src={stu.avatar_url || `https://ui-avatars.com/api/?name=${stu.name}`} className="w-12 h-12 rounded-full border border-white/10" alt="" />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-200 truncate">{stu.name || 'Unnamed Student'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs truncate w-4/5 font-medium flex items-center gap-1 ${presence === 'Online' ? 'text-emerald-500' : 'text-gray-500'}`}>
                      {presence === 'Online' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />} {presence}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeChatId ? (
        <div className="flex-1 flex flex-col relative" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'cover', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(11,20,26,0.95)' }}>
          
          <div className="flex items-center justify-between p-3 bg-[#202c33]">
            <div className="flex items-center gap-3">
              <img src={student.avatar_url || `https://ui-avatars.com/api/?name=${student.name}`} className="w-10 h-10 rounded-full border border-white/10" alt="" />
              <div>
                <div className="font-semibold text-gray-100">{student.name || 'Student'}</div>
                <div className={`text-xs font-medium ${getPresenceText(student.last_seen) === 'Online' ? 'text-emerald-500' : 'text-gray-400'}`}>
                  {getPresenceText(student.last_seen)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleStartCall(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-300 transition-colors">
                <Video className="w-5 h-5" />
              </button>
              <button onClick={() => handleStartCall(true)} className="p-2 hover:bg-white/10 rounded-full text-gray-300 transition-colors">
                <Phone className="w-4 h-4" />
              </button>
              <button onClick={() => setShowCopilot(!showCopilot)} className="p-2 ml-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> <span className="text-xs font-bold hidden sm:inline">AI Co-pilot</span>
              </button>
            </div>
          </div>

          <VideoCallModal 
            callState={callState} 
            onAccept={handleAcceptCall} 
            onDecline={handleDeclineCall}
            onEnd={handleEndCall}
            userName={student.name || 'Student'}
            isAudioOnly={isAudioOnly}
            isCaller={callState === 'calling'}
            sendWebRTCSignal={sendSignal}
            webRTCSignal={webRTCSignal}
          />

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.length === 0 && (
              <div className="text-center p-4 bg-white/5 rounded-lg text-sm text-gray-300 max-w-xs mx-auto border border-white/10">
                You are now connected! Messages and documents are end-to-end encrypted.
              </div>
            )}
            
            {messages.map((msg) => {
              const isMine = msg.sender_id === profile.id
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-2 px-3 shadow-sm relative group ${
                    isMine ? 'bg-[#005c4b] text-[#e9edef]' : 'bg-[#202c33] text-[#e9edef]'
                  }`} style={{ borderTopRightRadius: isMine ? '0' : '0.5rem', borderTopLeftRadius: !isMine ? '0' : '0.5rem' }}>
                    
                    {msg.document_url && msg.document_name === 'audio' ? (
                      <div className="mb-2">
                        <audio controls className="h-10 w-full max-w-[250px] outline-none">
                          <source src={msg.document_url} type="audio/webm" />
                        </audio>
                      </div>
                    ) : msg.document_url ? (
                      <a href={msg.document_url} target="_blank" rel="noopener noreferrer" 
                         className="flex items-center gap-3 bg-black/20 p-2 rounded-md mb-2 hover:bg-black/40 transition-colors border border-white/5">
                        <div className="p-2 bg-red-500/20 rounded text-red-400"><FileText className="w-5 h-5" /></div>
                        <div className="text-sm truncate pr-4">{msg.document_name}</div>
                      </a>
                    ) : null}
                    
                    <div className="text-[14.5px] leading-relaxed whitespace-pre-wrap font-sans">{msg.content}</div>
                    
                    <div className="flex items-center justify-end gap-1 mt-1 -mr-1">
                      <span className="text-[10px] text-white/50">{formatTime(msg.created_at)}</span>
                      {isMine && (msg.is_read ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /> : <Check className="w-3.5 h-3.5 text-white/50" />)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 flex items-center gap-2 bg-[#202c33]">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload} 
            />
            
            <button 
              type="button" 
              disabled={uploading || isRecording}
              onClick={() => fileInputRef.current?.click()} 
              className="p-3 text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-full transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
            </button>
            
            <div className="flex-1 bg-[#2a3942] rounded-xl flex items-center px-4 py-2 border border-white/5 overflow-hidden">
              {isRecording ? (
                <div className="flex-1 flex items-center gap-3 text-red-400 animate-pulse font-medium">
                  <Mic className="w-5 h-5" /> Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </div>
              ) : (
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-transparent outline-none text-gray-100 placeholder-gray-400 text-[15px]"
                />
              )}
            </div>
            
            {inputText.trim() ? (
              <button type="submit" disabled={sending} className="p-3 bg-[#00a884] text-white rounded-full hover:bg-[#008f6f] transition-colors shadow-lg">
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -ml-1" />}
              </button>
            ) : isRecording ? (
              <button type="button" onClick={stopRecording} className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
                <StopCircle className="w-5 h-5" />
              </button>
            ) : (
              <button type="button" onClick={startRecording} className="p-3 text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-full transition-colors">
                <Mic className="w-5 h-5" />
              </button>
            )}
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0b141a] text-gray-400">
          <Bot className="w-12 h-12 mb-4 opacity-20" />
          <p>Select a chat from the sidebar to start messaging.</p>
        </div>
      )}

      {/* Right Side - AI Co-pilot Panel */}
      <AnimatePresence>
        {showCopilot && activeChatId && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            className="border-l border-border bg-[#111b21] flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                {copilotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} AI Co-pilot
              </div>
              <button onClick={() => setShowCopilot(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              
              {/* Suggested Reply */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Suggested Reply</h4>
                <div className="bg-[#202c33] rounded-lg p-3 text-sm text-gray-300 border border-indigo-500/20">
                  {copilotData?.suggestedReply || "Hi! I've reviewed your profile and I'm ready to help you with your applications. What's your biggest priority right now?"}
                  {copilotData?.suggestedReply && (
                    <button onClick={() => setInputText(copilotData.suggestedReply!)} className="mt-3 w-full py-1.5 rounded bg-indigo-500/20 text-indigo-400 text-xs font-bold hover:bg-indigo-500/30 transition-colors">
                      Click to Paste
                    </button>
                  )}
                </div>
              </div>

              {/* Student Profile Snapshot */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" /> Live Profile Snapshot
                </h4>
                <div className="bg-[#202c33] rounded-lg p-3 space-y-2 text-sm text-gray-300">
                  <div className="flex justify-between"><span className="text-gray-500">CGPA</span> <span>{copilotData?.profileSnapshot?.cgpa || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">GRE</span> <span>{copilotData?.profileSnapshot?.gre || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">IELTS</span> <span>{copilotData?.profileSnapshot?.ielts || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Work Exp</span> <span>{copilotData?.profileSnapshot?.workExp || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Budget</span> <span>{copilotData?.profileSnapshot?.budget || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Stage</span> <span>{copilotData?.profileSnapshot?.stage || 'N/A'}</span></div>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 text-center">Extracted from chat context</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
