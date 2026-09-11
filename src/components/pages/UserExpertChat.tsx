'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, Paperclip, Mic, Video, MoreVertical, Check, CheckCheck, 
  FileText, ArrowLeft, Bot, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react'
import { useNetworkStore } from '@/lib/networkStore'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { ExpertMessage } from '@/lib/types'

export default function UserExpertChat() {
  const { profile, setCurrentPage } = useAppStore()
  const { allUsers, chatSessions, messages, sendMessage, markChatAsRead } = useNetworkStore()
  
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Find active chat for this user
  const activeChat = chatSessions.find(c => c.studentId === profile.id || c.studentId === 'current-user')
  const expert = allUsers.find(u => u.id === activeChat?.expertId)
  
  const chatMessages = messages.filter(m => m.chatId === activeChat?.id).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (activeChat) {
      const hasUnread = chatMessages.some(m => m.senderRole === 'expert' && !m.isRead)
      if (hasUnread) {
        markChatAsRead(activeChat.id, profile.id || 'current-user')
      }
    }
  }, [chatMessages, activeChat, markChatAsRead, profile.id])

  // Mock AI Suggestions
  const lastMessage = chatMessages[chatMessages.length - 1]
  const showSuggestions = lastMessage?.senderRole === 'expert'
  const aiSuggestions = [
    "Could you review my SOP draft?",
    "What's the best time to apply for the visa?",
    "Do I need to show liquid funds for I-20?"
  ]

  const handleSend = (content: string, type: 'text' | 'document' = 'text', url?: string) => {
    if (!content.trim() && type === 'text') return
    if (!activeChat) return

    const msg: Omit<ExpertMessage, 'id' | 'timestamp' | 'isRead'> = {
      chatId: activeChat.id,
      senderId: profile.id || 'current-user',
      senderRole: 'student',
      content,
    }

    if (type === 'document' && url) {
      msg.attachments = [{ type: 'document', url, name: content }]
      msg.content = 'Shared a document'
    }

    sendMessage(msg)
    setInputText('')

    // Mock expert typing & reply
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      sendMessage({
        chatId: activeChat.id,
        senderId: expert!.id!,
        senderRole: 'expert',
        content: "I've received your message. Let me look into your profile and get back to you shortly!"
      })
    }, 2500)
  }

  const handleDocumentUpload = () => {
    // Simulate document upload
    handleSend('SOP_Draft_v2.pdf', 'document', '#')
    toast.success('Document shared')
  }

  if (!activeChat || !expert) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <Bot className="w-8 h-8 text-foreground-muted" />
        </div>
        <h3 className="text-xl font-bold text-foreground">No Active Chats</h3>
        <p className="text-foreground-secondary mt-2 mb-6">Find an expert in the directory to start a conversation.</p>
        <button onClick={() => setCurrentPage('expert-directory')} className="btn-primary">
          Browse Experts
        </button>
      </div>
    )
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-border" style={{ background: '#0b141a' }}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3" style={{ background: '#202c33' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentPage('expert-directory')} className="p-2 hover:bg-white/10 rounded-full text-gray-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={expert.avatar || `https://ui-avatars.com/api/?name=${expert.name}`} alt={expert.name} className="w-10 h-10 rounded-full" />
          <div>
            <div className="font-semibold text-gray-100">{expert.name}</div>
            <div className="text-xs text-gray-400">
              {isTyping ? <span className="text-emerald-500 font-medium">typing...</span> : 'Usually replies in 2 hrs'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-white/10 rounded-full text-gray-300 transition-colors" title="Video Call">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-full text-gray-300 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* AI Summary Banner (every 10 msgs mock) */}
      {chatMessages.length > 0 && (
        <div className="mx-auto mt-2 w-[90%] z-10">
          <button onClick={() => setShowSummary(!showSummary)} 
            className="w-full flex items-center justify-between p-2 px-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" /> AI Conversation Summary
            </div>
            {showSummary ? <ChevronUp className="w-3.5 h-3.5 text-indigo-300" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-300" />}
          </button>
          <AnimatePresence>
            {showSummary && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="bg-indigo-500/5 border-x border-b border-indigo-500/20 rounded-b-lg p-3 text-xs text-indigo-200/80 leading-relaxed">
                You and {expert.name} discussed your target universities in the US. The expert suggested preparing your SOP before month-end to meet early deadlines. Waiting on your SOP draft.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'cover', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(11,20,26,0.9)' }}>
        
        <div className="text-center my-4">
          <span className="bg-[#182229] text-gray-400 text-[11px] px-3 py-1 rounded-lg uppercase tracking-wide">
            Today
          </span>
        </div>

        {chatMessages.map((msg, i) => {
          const isMine = msg.senderRole === 'student'
          const isSystem = msg.senderRole === 'system'

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center my-4">
                <span className="bg-[#182229] text-gray-400 text-[11px] px-3 py-1 rounded-lg italic">
                  {msg.content}
                </span>
              </div>
            )
          }

          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-2 px-3 shadow-sm relative group ${
                isMine ? 'bg-[#005c4b] text-[#e9edef]' : 'bg-[#202c33] text-[#e9edef]'
              }`} style={{ borderTopRightRadius: isMine ? '0' : '0.5rem', borderTopLeftRadius: !isMine ? '0' : '0.5rem' }}>
                
                {msg.attachments?.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-black/20 p-2 rounded-md mb-2 cursor-pointer hover:bg-black/30">
                    <div className="p-2 bg-red-500/20 rounded text-red-400"><FileText className="w-5 h-5" /></div>
                    <div className="text-sm truncate pr-4">{att.name}</div>
                  </div>
                ))}
                
                <div className="text-[14.5px] leading-relaxed break-words">{msg.content}</div>
                
                <div className="flex items-center justify-end gap-1 mt-1 -mr-1">
                  <span className="text-[10px] text-white/50">{formatTime(msg.timestamp)}</span>
                  {isMine && (
                    msg.isRead ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /> : <Check className="w-3.5 h-3.5 text-white/50" />
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* AI Suggested Replies */}
        {showSuggestions && !isTyping && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-indigo-400 mb-2 pl-1">
              <Sparkles className="w-3 h-3" /> AI Suggested Replies
            </div>
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map((sug, i) => (
                <button key={i} onClick={() => setInputText(sug)}
                  className="text-xs px-3 py-1.5 rounded-full bg-[#182229] border border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/20 transition-colors">
                  {sug}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 flex items-center gap-2" style={{ background: '#202c33' }}>
        <button onClick={handleDocumentUpload} className="p-2 text-gray-400 hover:text-gray-200 transition-colors" title="Attach Document">
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
          <button onClick={() => handleSend(inputText)} className="p-2.5 bg-[#00a884] rounded-full text-white hover:bg-[#008f6f] transition-colors">
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        ) : (
          <button className="p-2.5 text-gray-400 hover:text-gray-200 transition-colors" title="Voice Note">
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
