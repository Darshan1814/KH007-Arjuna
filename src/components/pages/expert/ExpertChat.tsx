'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, Paperclip, Mic, Check, CheckCheck, 
  FileText, Bot, Sparkles, User as UserIcon, X, ChevronRight, Menu
} from 'lucide-react'
import { useNetworkStore } from '@/lib/networkStore'
import { useAppStore } from '@/lib/store'
import { ExpertMessage, StudentProfile } from '@/lib/types'
import toast from 'react-hot-toast'

export default function ExpertChat() {
  const { profile } = useAppStore()
  const { allUsers, chatSessions, messages, sendMessage, markChatAsRead } = useNetworkStore()
  
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [showCopilot, setShowCopilot] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const myChats = chatSessions.filter(c => c.expertId === profile.id || c.expertId === 'expert-1')
  
  // Set default chat
  useEffect(() => {
    if (myChats.length > 0 && !activeChatId) {
      setActiveChatId(myChats[0].id)
    }
  }, [myChats, activeChatId])

  const activeChat = myChats.find(c => c.id === activeChatId)
  const student = allUsers.find(u => u.id === activeChat?.studentId) || {
    id: activeChat?.studentId, name: 'Student', targetCountry: ['USA'], targetProgram: 'MS CS', cgpa: 8.5, greScore: 320
  } as StudentProfile
  
  const chatMessages = messages.filter(m => m.chatId === activeChatId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (activeChatId) {
      const hasUnread = chatMessages.some(m => m.senderRole === 'student' && !m.isRead)
      if (hasUnread) {
        markChatAsRead(activeChatId, profile.id || 'expert-1')
      }
    }
  }, [chatMessages, activeChatId, markChatAsRead, profile.id])

  const handleSend = (content: string, type: 'text' | 'document' = 'text', url?: string) => {
    if (!content.trim() && type === 'text') return
    if (!activeChatId) return

    const msg: Omit<ExpertMessage, 'id' | 'timestamp' | 'isRead'> = {
      chatId: activeChatId,
      senderId: profile.id || 'expert-1',
      senderRole: 'expert',
      content,
    }
    if (type === 'document' && url) {
      msg.attachments = [{ type: 'document', url, name: content }]
      msg.content = 'Shared a document'
    }

    sendMessage(msg)
    setInputText('')
  }

  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Mock AI Copilot logic
  const lastStudentMsg = [...chatMessages].reverse().find(m => m.senderRole === 'student')
  const aiSuggestedReply = lastStudentMsg 
    ? "Thanks for sharing that! Based on your 8.5 CGPA and 320 GRE, Stanford is ambitious but possible. We need to work heavily on your SOP to highlight your research experience. Shall we set up a quick 15-min call to map out the strategy?"
    : "Hi! I've reviewed your profile and I'm ready to help you with your applications. What's your biggest priority right now?"

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl overflow-hidden shadow-2xl border border-border bg-background">
      
      {/* Sidebar - Chat List */}
      <div className="w-80 border-r border-border bg-[#111b21] flex flex-col hidden md:flex">
        <div className="p-4 bg-[#202c33] text-gray-200 font-bold text-lg flex items-center justify-between">
          Chats
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {myChats.map(chat => {
            const cStudent = allUsers.find(u => u.id === chat.studentId) || { name: 'Student' }
            const cMsgs = messages.filter(m => m.chatId === chat.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            const lastMsg = cMsgs[0]
            const unread = cMsgs.filter(m => m.senderRole === 'student' && !m.isRead).length
            
            return (
              <button key={chat.id} onClick={() => setActiveChatId(chat.id)}
                className={`w-full flex items-center gap-3 p-3 border-b border-[#202c33] hover:bg-[#202c33] transition-colors ${activeChatId === chat.id ? 'bg-[#2a3942]' : ''}`}>
                <img src={`https://ui-avatars.com/api/?name=${cStudent.name}`} className="w-12 h-12 rounded-full" alt="" />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-200 truncate">{cStudent.name}</span>
                    {lastMsg && <span className="text-[10px] text-gray-400">{formatTime(lastMsg.timestamp)}</span>}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 truncate w-4/5">{lastMsg?.content || 'No messages yet'}</span>
                    {unread > 0 && <span className="bg-[#00a884] text-[#111b21] text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>}
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
              <img src={`https://ui-avatars.com/api/?name=${student.name}`} className="w-10 h-10 rounded-full" alt="" />
              <div>
                <div className="font-semibold text-gray-100">{student.name}</div>
                <div className="text-xs text-gray-400 truncate max-w-xs">
                  Target: {(student.targetCountry as string[])?.join(', ')} • {student.targetProgram}
                </div>
              </div>
            </div>
            <button onClick={() => setShowCopilot(!showCopilot)} className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> <span className="text-xs font-bold hidden sm:inline">AI Co-pilot</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {chatMessages.map((msg) => {
              const isMine = msg.senderRole === 'expert'
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-2 px-3 shadow-sm relative group ${
                    isMine ? 'bg-[#005c4b] text-[#e9edef]' : 'bg-[#202c33] text-[#e9edef]'
                  }`} style={{ borderTopRightRadius: isMine ? '0' : '0.5rem', borderTopLeftRadius: !isMine ? '0' : '0.5rem' }}>
                    {msg.attachments?.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-black/20 p-2 rounded-md mb-2 cursor-pointer">
                        <div className="p-2 bg-red-500/20 rounded text-red-400"><FileText className="w-5 h-5" /></div>
                        <div className="text-sm truncate pr-4">{att.name}</div>
                      </div>
                    ))}
                    <div className="text-[14.5px] leading-relaxed break-words">{msg.content}</div>
                    <div className="flex items-center justify-end gap-1 mt-1 -mr-1">
                      <span className="text-[10px] text-white/50">{formatTime(msg.timestamp)}</span>
                      {isMine && (msg.isRead ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /> : <Check className="w-3.5 h-3.5 text-white/50" />)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 flex items-center gap-2 bg-[#202c33]">
            <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 bg-[#2a3942] rounded-lg flex items-center px-3">
              <input
                type="text"
                className="w-full bg-transparent border-none text-[#e9edef] placeholder-gray-400 text-[15px] focus:ring-0 py-2.5"
                placeholder="Type a message"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(inputText)}
              />
            </div>
            {inputText.trim() ? (
              <button onClick={() => handleSend(inputText)} className="p-2.5 bg-[#00a884] rounded-full text-white">
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            ) : (
              <button className="p-2.5 text-gray-400 hover:text-gray-200 transition-colors">
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#0b141a] text-gray-400">
          Select a chat to start messaging
        </div>
      )}

      {/* Right Side - AI Co-pilot Panel */}
      <AnimatePresence>
        {showCopilot && activeChatId && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            className="border-l border-border bg-[#111b21] flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <Sparkles className="w-5 h-5" /> AI Co-pilot
              </div>
              <button onClick={() => setShowCopilot(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              
              {/* Suggested Reply */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Suggested Reply</h4>
                <div className="bg-[#202c33] rounded-lg p-3 text-sm text-gray-300 border border-indigo-500/20">
                  {aiSuggestedReply}
                  <button onClick={() => setInputText(aiSuggestedReply)} className="mt-3 w-full py-1.5 rounded bg-indigo-500/20 text-indigo-400 text-xs font-bold hover:bg-indigo-500/30 transition-colors">
                    Click to Paste
                  </button>
                </div>
              </div>

              {/* Student Profile Snapshot */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" /> Profile Snapshot
                </h4>
                <div className="bg-[#202c33] rounded-lg p-3 space-y-2 text-sm text-gray-300">
                  <div className="flex justify-between"><span className="text-gray-500">CGPA</span> <span>{student.cgpa || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">GRE</span> <span>{student.greScore || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">IELTS</span> <span>{student.ieltsScore || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Work Exp</span> <span>{student.workExpYears || 0} years</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Budget</span> <span>₹{student.budgetLakhs || 0}L</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Stage</span> <span>{student.journeyStage?.replace('_', ' ') || 'EXPLORER'}</span></div>
                </div>
              </div>

              {/* Conversation Summary */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center gap-2">
                  <Bot className="w-4 h-4" /> Chat Summary
                </h4>
                <div className="bg-indigo-500/5 rounded-lg p-3 text-xs text-indigo-200/80 leading-relaxed border border-indigo-500/10">
                  Student is targeting US universities for MS CS. Primary concern is securing a scholarship and finalizing SOP. Currently waiting for your review on the draft they uploaded yesterday.
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
