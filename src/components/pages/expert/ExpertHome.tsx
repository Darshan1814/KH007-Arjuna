'use client'

import { useAppStore } from '@/lib/store'
import { useNetworkStore } from '@/lib/networkStore'
import { motion } from 'framer-motion'
import { Users, MessageSquare, Banknote, Star, ShieldAlert, ArrowUpRight } from 'lucide-react'

export default function ExpertHome() {
  const { profile, setCurrentPage } = useAppStore()
  const { chatSessions, messages, allUsers } = useNetworkStore()

  // Calculate metrics
  const myChats = chatSessions.filter(c => c.expertId === profile.id || c.expertId === 'expert-1') // fallback to expert-1 for testing
  const totalStudents = myChats.length
  
  // Pending messages: messages sent by student in my chats that are unread
  const pendingMessages = messages.filter(m => 
    myChats.some(c => c.id === m.chatId) && 
    m.senderRole === 'student' && 
    !m.isRead
  ).length

  const thisWeekEarnings = 15000 // Mock value

  return (
    <div className="max-w-5xl space-y-6">
      {profile.kycStatus !== 'verified' && (
        <div className="card border-amber-500/30 bg-amber-500/5 flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 rounded-full text-amber-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-500">KYC Verification Pending</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--foreground-secondary)' }}>
              Your profile is currently hidden from students. Please complete your KYC verification to start accepting chat requests and earning.
            </p>
            <button onClick={() => setCurrentPage('expert-kyc')} className="mt-3 text-sm font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1">
              Complete KYC <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Welcome back, {profile.name.split(' ')[0]}</h2>
        <p className="mt-1" style={{ color: 'var(--foreground-secondary)' }}>Here's an overview of your expert network today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400"><Users className="w-5 h-5" /></div>
            <div className="text-sm font-medium text-foreground-secondary">Connected Students</div>
          </div>
          <div className="text-3xl font-bold text-foreground">{totalStudents}</div>
        </div>
        
        <div className="card" style={{ borderColor: pendingMessages > 0 ? 'var(--primary)' : undefined }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><MessageSquare className="w-5 h-5" /></div>
            <div className="text-sm font-medium text-foreground-secondary">Pending Messages</div>
          </div>
          <div className="text-3xl font-bold text-foreground">{pendingMessages}</div>
          {pendingMessages > 0 && (
            <button onClick={() => setCurrentPage('expert-chat')} className="text-xs text-primary mt-2 font-medium">Reply now →</button>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><Banknote className="w-5 h-5" /></div>
            <div className="text-sm font-medium text-foreground-secondary">This Week's Earnings</div>
          </div>
          <div className="text-3xl font-bold text-foreground">₹{thisWeekEarnings.toLocaleString()}</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400"><Star className="w-5 h-5" /></div>
            <div className="text-sm font-medium text-foreground-secondary">Average Rating</div>
          </div>
          <div className="text-3xl font-bold text-foreground">{profile.rating?.toFixed(1) || '4.9'} <span className="text-lg text-foreground-muted">/ 5.0</span></div>
        </div>
      </div>
    </div>
  )
}
