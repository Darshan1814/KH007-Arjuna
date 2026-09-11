'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { 
  FileText, Upload, Shield, CheckCircle, AlertCircle, 
  Search, Eye, Trash2, Loader2, Sparkles, Database,
  FileCheck, Clock
} from 'lucide-react'

interface VaultDoc {
  id: string
  name: string
  type: string
  status: 'Verified' | 'Needs attention' | 'Expired'
  uploadedAt: string
  extractedData?: Record<string, string>
  category: string
}

const docCategories = [
  { id: 'academic', label: 'Academics', icon: FileText },
  { id: 'kyc', label: 'Identity/KYC', icon: Shield },
  { id: 'financial', label: 'Financials', icon: Database },
  { id: 'admission', label: 'Admissions', icon: FileCheck },
]

const requiredDocs = [
  'Passport', '10th Marksheet', '12th Marksheet', 'Undergrad Degree',
  'Transcripts', 'GRE Scorecard', 'IELTS/TOEFL Scorecard', 'Pan Card',
  'Aadhaar Card', 'Bank Statement', 'SOP'
]

export default function DocumentVault() {
  const { addXP, addBadge, addNotification } = useAppStore()
  const [docs, setDocs] = useState<VaultDoc[]>([])
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const simulateUpload = async (category: string) => {
    setUploading(true)
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1500))
    
    const newDoc: VaultDoc = {
      id: Math.random().toString(36).substring(7),
      name: `document_${Date.now()}.pdf`,
      type: 'PDF',
      status: 'Needs attention',
      uploadedAt: new Date().toISOString(),
      category: category
    }
    
    setDocs(prev => [newDoc, ...prev])
    setUploading(false)
    addXP(30)
    
    // Auto-trigger extraction simulation
    simulateExtraction(newDoc.id)
  }

  const simulateExtraction = async (id: string) => {
    setExtracting(id)
    await new Promise(r => setTimeout(r, 2000))
    
    setDocs(prev => prev.map(d => d.id === id ? {
      ...d,
      status: 'Verified',
      extractedData: {
        'Document Type': 'Academic Transcript',
        'Name Match': 'Verified',
        'Issue Date': '15/05/2024',
        'Institution': 'IIT Bombay',
        'CGPA Detected': '8.75'
      }
    } : d))
    
    setExtracting(null)
    addNotification({
      title: 'AI Data Extraction Complete',
      message: 'Successfully extracted fields from your document. Form auto-fill is now ready.',
      type: 'success'
    })
    
    if (docs.length + 1 >= 5) addBadge('Document Pro')
  }

  const deleteDoc = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  const healthScore = Math.round((docs.filter(d => d.status === 'Verified').length / requiredDocs.length) * 100)

  const filteredDocs = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Shield className="w-6 h-6" style={{ color: 'var(--primary)' }} />
            Document Vault
          </h2>
          <p className="mt-1" style={{ color: 'var(--foreground-secondary)' }}>Secure, AI-powered document management and auto-fill.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
            <input className="input-field pl-10 w-64" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar: Status & Upload */}
        <div className="space-y-6">
          <div className="card card-gradient">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Document Health</span>
              <span className="text-2xl font-bold" style={{ color: healthScore > 70 ? 'var(--success)' : 'var(--accent)' }}>{healthScore}%</span>
            </div>
            <div className="progress-bar mb-4"><div className="progress-bar-fill" style={{ width: `${healthScore}%` }} /></div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
              Upload all required documents to reach 100% health and speed up your visa and loan processing.
            </p>
          </div>

          <div className="card space-y-4">
            <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Quick Upload</h3>
            <div className="grid grid-cols-2 gap-2">
              {docCategories.map(cat => (
                <button key={cat.id} onClick={() => simulateUpload(cat.id)} disabled={uploading}
                  className="p-4 rounded-xl border border-white/5 bg-[#1f2135] hover:bg-white/5 transition-all text-center group">
                  <cat.icon className="w-6 h-6 mx-auto mb-2 text-white/20 group-hover:text-indigo-400 transition-all" />
                  <span className="text-xs font-medium" style={{ color: 'var(--foreground-secondary)' }}>{cat.label}</span>
                </button>
              ))}
            </div>
            <div className="p-4 border-2 border-dashed border-white/5 rounded-2xl text-center bg-white/[0.01]">
              <Upload className="w-8 h-8 mx-auto mb-2 text-[var(--foreground-muted)] opacity-30" />
              <div className="text-xs font-medium text-[var(--foreground-muted)] opacity-50">Drag and drop files here</div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--foreground)' }}>Required Checklist</h3>
            <div className="space-y-2">
              {requiredDocs.map(doc => {
                const isUploaded = docs.some(d => d.name.toLowerCase().includes(doc.toLowerCase()) || d.extractedData?.['Document Type']?.includes(doc))
                return (
                  <div key={doc} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/[0.02]">
                    <span style={{ color: isUploaded ? 'var(--success)' : 'var(--foreground-muted)' }}>{doc}</span>
                    {isUploaded ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Clock className="w-3 h-3 text-white/10" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Main: Document List */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredDocs.length === 0 ? (
              <div className="card text-center py-20">
                <FileText className="w-12 h-12 mx-auto mb-4 text-[var(--foreground-muted)] opacity-20" />
                <h3 className="text-lg font-bold text-[var(--foreground-muted)] opacity-40">No documents found</h3>
                <p className="text-sm text-[var(--foreground-muted)] opacity-30">Start by uploading your academic and identity proofs.</p>
              </div>
            ) : (
              filteredDocs.map(doc => (
                <motion.div key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="card group hover:border-white/10 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-[var(--foreground)] truncate">{doc.name}</h4>
                        <div className="flex gap-2">
                          <button className="p-2 rounded-lg hover:bg-white/5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => deleteDoc(doc.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--foreground-muted)] hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">{doc.category}</span>
                        <span className="text-[var(--foreground-muted)] opacity-30 text-[10px]">•</span>
                        <span className="text-[10px] text-[var(--foreground-muted)]">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        <div className={`ml-auto flex items-center gap-1 text-[10px] font-bold ${
                          doc.status === 'Verified' ? 'text-green-500' : 'text-amber-500'
                        }`}>
                          {doc.status === 'Verified' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {doc.status}
                        </div>
                      </div>

                      {/* AI Extraction Section */}
                      <div className="mt-4 pt-4 border-t border-white/5">
                        {extracting === doc.id ? (
                          <div className="flex items-center gap-2 text-xs text-indigo-400">
                            <Loader2 className="w-3 h-3 animate-spin" /> AI extracting data fields...
                          </div>
                        ) : doc.extractedData ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                              <Sparkles className="w-3 h-3" /> Extracted Insights
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {Object.entries(doc.extractedData).map(([k, v]) => (
                                <div key={k} className="p-2 rounded-lg bg-white/[0.02]">
                                  <div className="text-[9px] text-[var(--foreground-muted)] uppercase">{k}</div>
                                  <div className="text-xs font-medium text-[var(--foreground-secondary)]">{v}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => simulateExtraction(doc.id)} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                            Run AI Extraction
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
