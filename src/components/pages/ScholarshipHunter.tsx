'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { formatINR } from '@/lib/utils'
import { 
  Award, Search, Calendar, Sparkles, 
  ExternalLink, Loader2, Filter, Globe,
  Briefcase, GraduationCap
} from 'lucide-react'

interface Scholarship {
  id: string
  name: string
  provider: string
  amount: number
  deadline: string
  link: string
  eligibility: string
  country: string
  matchScore: number
}

export default function ScholarshipHunter() {
  const { profile, addXP } = useAppStore()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Scholarship[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const searchScholarships = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query) return

    setLoading(true)
    setHasSearched(true)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: `scholarships for Indian students ${query} ${profile.targetProgram} in ${profile.targetCountry.join(' ')}` 
        })
      })
      const data = await res.json()
      
      // Use Groq to parse and rank results
      const groqRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Based on these search results: ${JSON.stringify(data.results)}, identify 5-8 real scholarships for a student wanting to study ${profile.targetProgram}. 
          Return ONLY a JSON array of objects with: id, name, provider, amount (in INR), deadline, link, eligibility, country, matchScore (0-100 based on profile).`,
          profile,
          conversationHistory: []
        })
      })

      const reader = groqRes.body?.getReader()
      const decoder = new TextDecoder()
      let content = ''
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          content += decoder.decode(value, { stream: true })
        }
      }

      // Extract JSON from response
      const jsonStr = content.match(/\[[\s\S]*\]/)?.[0]
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr)
        setResults(parsed)
        addXP(50)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  // Pre-fill query based on profile if empty
  useEffect(() => {
    if (!query && profile.targetProgram) {
      setQuery(`${profile.targetProgram} ${profile.targetCountry[0] || ''}`)
    }
  }, [profile, query])

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[var(--foreground)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Award className="w-6 h-6 text-amber-500" />
            </div>
            Scholarship Hunter
          </h2>
          <p className="mt-2" style={{ color: 'var(--foreground-secondary)' }}>Real-time scholarship discovery powered by Serper & Groq Intelligence.</p>
        </div>
        <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
          <GraduationCap className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold" style={{ color: 'var(--foreground-secondary)' }}>Matching: {profile.targetProgram || 'Any Program'}</span>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={searchScholarships} className="relative group">
        <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-[#161725] border border-[var(--foreground-muted)] rounded-2xl shadow-2xl">
          <div className="flex items-center flex-1">
            <Search className="w-5 h-5 ml-4 text-[var(--foreground-muted)]" />
            <input 
              className="flex-1 bg-transparent border-none outline-none py-4 px-2 text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] text-sm sm:text-lg"
              placeholder="Search (e.g. STEM women)..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-[var(--foreground)] px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span className="whitespace-nowrap">{loading ? 'Hunting...' : 'Find Scholarships'}</span>
          </button>
        </div>
      </form>

      {/* Results */}
      <div className="space-y-4">
        {!hasSearched ? (
          <div className="py-20 text-center space-y-6">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
              <Search className="w-10 h-10 text-white/10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white/30">Ready to find your funding?</h3>
              <p className="text-sm text-white/20 max-w-md mx-auto">Enter a specific query or use our AI recommended search based on your profile.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => { setQuery('Merit scholarships'); searchScholarships(); }} className="px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-white/50 hover:border-white/20 hover:text-white transition-all">Merit Based</button>
              <button onClick={() => { setQuery('Full ride'); searchScholarships(); }} className="px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-white/50 hover:border-white/20 hover:text-white transition-all">Full Ride</button>
              <button onClick={() => { setQuery('Underrepresented groups'); searchScholarships(); }} className="px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-white/50 hover:border-white/20 hover:text-white transition-all">Diversity</button>
            </div>
          </div>
        ) : loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <p className="text-indigo-400 font-medium animate-pulse">Scanning worldwide databases for matches...</p>
          </div>
        ) : results.length > 0 ? (
          <AnimatePresence>
            <div className="grid grid-cols-1 gap-4">
              {results.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  className="group bg-[#161725] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-6 transition-all hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col md:flex-row gap-6 items-start md:items-center">
                  
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 transition-all">
                    <Award className="w-8 h-8 text-indigo-400" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-bold text-[var(--foreground)] group-hover:text-indigo-400 transition-all truncate">{s.name}</h4>
                      <span className="px-2 py-1 rounded bg-white/5 text-[10px] font-bold text-white/40 uppercase tracking-widest">{s.country}</span>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>{s.provider}</p>
                    <div className="flex flex-wrap gap-4 pt-2">
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                        <Briefcase className="w-3.5 h-3.5" /> {s.eligibility.slice(0, 40)}...
                      </div>
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                        <Calendar className="w-3.5 h-3.5" /> Deadline: {s.deadline}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/5 gap-4">
                    <div className="text-left md:text-right flex-1 md:flex-none">
                      <div className="text-lg sm:text-xl font-black text-amber-500">₹{formatINR(s.amount)}</div>
                      <div className="text-[9px] sm:text-[10px] font-bold text-white/20 uppercase tracking-widest">Est. Reward</div>
                    </div>
                    
                    <div className="text-center">
                      <div className={`text-xl sm:text-2xl font-black ${s.matchScore >= 80 ? 'text-green-500' : s.matchScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                        {s.matchScore}%
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-bold text-white/20 uppercase tracking-widest">Match</div>
                    </div>
 
                    <a href={s.link} target="_blank" rel="noopener noreferrer"
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all text-[var(--foreground-muted)] group/btn">
                      <ExternalLink className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        ) : (
          <div className="py-20 text-center opacity-50">
            <Search className="w-12 h-12 mx-auto mb-4" />
            <p>No scholarships found for this criteria. Try a broader search.</p>
          </div>
        )}
      </div>
    </div>
  )
}
