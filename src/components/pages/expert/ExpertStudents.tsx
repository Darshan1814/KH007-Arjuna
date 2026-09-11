'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, MapPin, GraduationCap, Clock, MessageSquare, Users, BarChart2 } from 'lucide-react'
import { useNetworkStore } from '@/lib/networkStore'
import { useAppStore } from '@/lib/store'
import StudentInsightsPanel from './StudentInsightsPanel'
import { StudentProfile } from '@/lib/types'

export default function ExpertStudents() {
  const { profile, setCurrentPage } = useAppStore()
  const { chatSessions, allUsers, messages } = useNetworkStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)

  const myChats = chatSessions.filter(c => c.expertId === profile.id || c.expertId === 'expert-1')
  
  const students = myChats.map(chat => {
    const student = allUsers.find(u => u.id === chat.studentId) || {
      id: chat.studentId,
      name: 'Unknown Student',
      targetCountry: ['United States'],
      targetProgram: 'MS Computer Science',
      journeyStage: 'EXPLORER'
    }
    const chatMessages = messages.filter(m => m.chatId === chat.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return {
      chatId: chat.id,
      student,
      lastMessage: chatMessages[0]
    }
  })

  const filteredStudents = students.filter(s => 
    s.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student.targetProgram?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStageColor = (stage: string) => {
    switch(stage) {
      case 'EXPLORER': return 'text-blue-400 bg-blue-400/10'
      case 'RESEARCHER': return 'text-indigo-400 bg-indigo-400/10'
      case 'APPLICANT': return 'text-amber-400 bg-amber-400/10'
      case 'LOAN_SEEKER': return 'text-emerald-400 bg-emerald-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>My Students</h2>
        <p className="mt-1" style={{ color: 'var(--foreground-secondary)' }}>Manage your mentees and track their application progress.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
        <input
          type="text"
          placeholder="Search students by name or program..."
          className="input-field pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((item, idx) => (
          <motion.div key={item.chatId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="card flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <img src={`https://ui-avatars.com/api/?name=${item.student.name}`} alt="" className="w-10 h-10 rounded-full" />
                <div>
                  <h3 className="font-bold text-foreground">{item.student.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStageColor(item.student.journeyStage || 'EXPLORER')}`}>
                    {item.student.journeyStage?.replace('_', ' ') || 'EXPLORER'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4 flex-1">
              <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                <MapPin className="w-3.5 h-3.5" /> {(item.student.targetCountry as string[])?.join(', ') || 'Not set'}
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                <GraduationCap className="w-3.5 h-3.5" /> {item.student.targetProgram || 'Not set'}
              </div>
            </div>

            {item.lastMessage && (
              <div className="p-2 rounded bg-black/10 border border-white/5 mb-4">
                <div className="text-[10px] text-foreground-muted mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Last Message
                </div>
                <div className="text-xs text-foreground-secondary line-clamp-1">
                  <span className={item.lastMessage.senderRole === 'student' && !item.lastMessage.isRead ? 'font-bold text-primary-light' : ''}>
                    {item.lastMessage.senderRole === 'expert' ? 'You: ' : ''}{item.lastMessage.content}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setSelectedStudent(item.student as StudentProfile)} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-none">
                <BarChart2 className="w-4 h-4" /> Insights
              </button>
              <button onClick={() => setCurrentPage('expert-chat')} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4" /> Chat
              </button>
            </div>
          </motion.div>
        ))}

        {filteredStudents.length === 0 && (
          <div className="col-span-full py-12 text-center text-foreground-muted">
            <Users className="w-8 h-8 mx-auto mb-3 opacity-20" />
            No students found.
          </div>
        )}
      </div>

      {selectedStudent && (
        <StudentInsightsPanel 
          student={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
        />
      )}
    </div>
  )
}
