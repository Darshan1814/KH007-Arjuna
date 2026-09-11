'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useJourneyStore } from '@/lib/journeyStore'
import { CheckCircle2, AlertTriangle, Lightbulb, MapPin, Building, Target, PieChart, Banknote, FileText, Search, TrendingUp, ThumbsUp, ThumbsDown } from 'lucide-react'

export default function DecisionEngine() {
  const { answeredPhases, profileAnalysis, countryDecision, selectedCountry, setSelectedCountry, universityMatch, selectedUniversity, setSelectedUniversity, admissionChance, totalCost, affordability, loanEngine, documentReadiness, documentAcquisition, reviewIntelligence, actionRoadmap } = useJourneyStore()

  const phaseRenderers: Record<string, React.FC> = {
    PHASE_1_PROFILE: () => (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-surface border border-border flex flex-col items-center justify-center">
            <span className="text-sm text-foreground-muted mb-1">Academic Score</span>
            <span className="text-3xl font-bold text-primary">{profileAnalysis?.academicScore}/100</span>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border flex flex-col items-center justify-center">
            <span className="text-sm text-foreground-muted mb-1">Financial Score</span>
            <span className="text-3xl font-bold text-warning">{profileAnalysis?.financialScore}/100</span>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border flex flex-col items-center justify-center">
            <span className="text-sm text-foreground-muted mb-1">Admission Readiness</span>
            <span className="text-3xl font-bold text-success">{profileAnalysis?.admissionReadinessScore}/100</span>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <h4 className="font-semibold text-lg mb-2 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-warning"/> AI Reasoning</h4>
          <p className="text-foreground-muted leading-relaxed">{profileAnalysis?.reasoning}</p>
        </div>
      </div>
    ),
    PHASE_2_COUNTRY: () => (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {countryDecision?.recommendedCountries.map((c, i) => (
            <motion.div 
              key={i} 
              className={`p-5 rounded-xl border cursor-pointer transition-all ${selectedCountry === c.countryName ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border bg-surface hover:border-primary/50'}`}
              onClick={() => setSelectedCountry(c.countryName)}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg flex items-center gap-2"><MapPin className="w-4 h-4 text-primary"/> {c.countryName}</h3>
                <span className="text-xs font-semibold px-2 py-1 bg-success/20 text-success rounded-full">{c.matchScore}% Match</span>
              </div>
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between"><span className="text-foreground-muted">Cost</span> <span className="font-medium text-foreground">{c.expectedCost}</span></div>
                <div className="flex justify-between"><span className="text-foreground-muted">Job Market</span> <span className="font-medium text-foreground">{c.jobMarket}/100</span></div>
                <div className="flex justify-between"><span className="text-foreground-muted">Visa</span> <span className="font-medium text-foreground">{c.visaDifficulty}</span></div>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-success mb-1 flex items-center gap-1"><ThumbsUp className="w-3 h-3"/> Why Recommended</p>
                <p className="text-foreground-muted mb-2 text-xs leading-relaxed">{c.whyRecommended}</p>
                <p className="font-semibold text-destructive mb-1 flex items-center gap-1"><ThumbsDown className="w-3 h-3"/> Considerations</p>
                <p className="text-foreground-muted text-xs leading-relaxed">{c.whyNotRecommended}</p>
              </div>
            </motion.div>
          ))}
        </div>
        {!selectedCountry && <p className="text-sm text-warning animate-pulse text-center">Please select a country to continue.</p>}
      </div>
    ),
    PHASE_3_UNIVERSITY: () => (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {universityMatch?.bestMatchUniversities.map((u, i) => (
            <motion.div 
              key={i} 
              className={`p-5 rounded-xl border cursor-pointer transition-all ${selectedUniversity === u.name ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border bg-surface hover:border-primary/50'}`}
              onClick={() => setSelectedUniversity(u.name)}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2"><Building className="w-4 h-4 text-primary"/> {u.name}</h3>
                  <p className="text-sm text-foreground-muted">Rank #{u.ranking} • {u.country}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-foreground-muted">Admission Chance</p>
                    <p className="font-bold text-success text-lg">{u.admissionChance}%</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-foreground-muted">Tuition</p>
                    <p className="font-bold text-foreground text-lg">${u.tuition.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-background rounded-lg text-sm border border-border">
                <p className="font-semibold text-foreground flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-primary"/> AI Match Reasoning</p>
                <p className="text-foreground-muted leading-relaxed">{u.whyRecommended}</p>
              </div>
            </motion.div>
          ))}
        </div>
        {!selectedUniversity && <p className="text-sm text-warning animate-pulse text-center">Please select a university to continue.</p>}
      </div>
    ),
    PHASE_4_ADMISSION: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-surface border border-border">
          <h4 className="font-semibold mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-primary"/> Chance Breakdown</h4>
          <div className="mb-4">
            <div className="flex justify-between mb-1 text-sm"><span className="text-foreground-muted">Current Chance</span><span className="font-bold text-warning">{admissionChance?.currentChance}%</span></div>
            <div className="w-full bg-background rounded-full h-2"><div className="bg-warning h-2 rounded-full" style={{ width: `${admissionChance?.currentChance}%` }}></div></div>
          </div>
          <div className="mb-4">
            <div className="flex justify-between mb-1 text-sm"><span className="text-foreground-muted">Improved Chance</span><span className="font-bold text-success">{admissionChance?.improvedChanceAfterRecs}%</span></div>
            <div className="w-full bg-background rounded-full h-2"><div className="bg-success h-2 rounded-full" style={{ width: `${admissionChance?.improvedChanceAfterRecs}%` }}></div></div>
          </div>
          <p className="text-sm text-foreground-muted leading-relaxed">{admissionChance?.chanceBreakdown}</p>
        </div>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-success/10 border border-success/20">
            <h4 className="font-semibold text-success mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Positive Factors</h4>
            <ul className="text-sm text-foreground-muted space-y-1">
              {admissionChance?.positiveFactors.map((f, i) => <li key={i}>• {f}</li>)}
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Risk Factors</h4>
            <ul className="text-sm text-foreground-muted space-y-1">
              {admissionChance?.negativeFactors.map((f, i) => <li key={i}>• {f}</li>)}
            </ul>
          </div>
        </div>
      </div>
    ),
    PHASE_5_COST: () => (
      <div className="p-5 rounded-xl bg-surface border border-border">
        <h4 className="font-semibold mb-4 flex items-center gap-2"><Banknote className="w-5 h-5 text-primary"/> Total Cost Breakdown</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-background rounded-lg border border-border text-center">
            <p className="text-xs text-foreground-muted">Tuition</p>
            <p className="font-bold text-foreground">${totalCost?.tuition.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-background rounded-lg border border-border text-center">
            <p className="text-xs text-foreground-muted">Living</p>
            <p className="font-bold text-foreground">${totalCost?.living.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-background rounded-lg border border-border text-center">
            <p className="text-xs text-foreground-muted">Misc</p>
            <p className="font-bold text-foreground">${totalCost?.miscellaneous.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-center">
            <p className="text-xs font-semibold text-primary">Total</p>
            <p className="font-bold text-primary text-xl">${totalCost?.totalCost.toLocaleString()}</p>
          </div>
        </div>
      </div>
    ),
    PHASE_6_AFFORDABILITY: () => (
      <div className="space-y-4">
        <div className={`p-5 rounded-xl border ${affordability?.canAfford ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${affordability?.canAfford ? 'bg-success text-white' : 'bg-warning text-white'}`}>
              {affordability?.canAfford ? <CheckCircle2 className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
            </div>
            <h3 className="text-xl font-bold">{affordability?.canAfford ? 'Affordable' : 'Funding Gap Detected'}</h3>
          </div>
          <p className="text-foreground-muted leading-relaxed mb-4">{affordability?.reasoning}</p>
          
          {!affordability?.canAfford && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-background rounded-lg border border-border text-center">
                <p className="text-xs text-foreground-muted mb-1">Funding Gap</p>
                <p className="font-bold text-destructive text-lg">${affordability?.fundingGap.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-background rounded-lg border border-border text-center">
                <p className="text-xs text-foreground-muted mb-1">Self Capacity</p>
                <p className="font-bold text-success text-lg">${affordability?.selfFundingCapacity.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    PHASE_7_LOAN: () => (
      <div className="p-5 rounded-xl bg-surface border border-border">
        <h4 className="font-semibold mb-4 flex items-center gap-2"><Banknote className="w-5 h-5 text-primary"/> Recommended Loan Strategy</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-background rounded-lg border border-border text-center">
            <p className="text-xs text-foreground-muted mb-1">Required Loan</p>
            <p className="font-bold text-foreground text-xl">${loanEngine?.loanAmountRequired.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-background rounded-lg border border-border text-center">
            <p className="text-xs text-foreground-muted mb-1">Estimated EMI</p>
            <p className="font-bold text-warning text-xl">${loanEngine?.emi.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-background rounded-lg border border-border text-center">
            <p className="text-xs text-foreground-muted mb-1">Interest Rate</p>
            <p className="font-bold text-destructive text-xl">{loanEngine?.interest}%</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold mb-2">Recommended Lenders</p>
          <div className="flex gap-2 flex-wrap">
            {loanEngine?.recommendedLenders.map((l, i) => <span key={i} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">{l}</span>)}
          </div>
        </div>
      </div>
    ),
    PHASE_8_DOCUMENTS: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-surface border border-border">
          <h4 className="font-semibold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-primary"/> Required Documents</h4>
          <ul className="space-y-2">
            {documentReadiness?.requiredDocuments.map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-foreground-muted">
                {documentReadiness.missing.includes(d) ? <span className="w-2 h-2 rounded-full bg-destructive"></span> : <span className="w-2 h-2 rounded-full bg-success"></span>}
                {d}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-5 rounded-xl bg-surface border border-border">
          <h4 className="font-semibold mb-4 flex items-center gap-2 text-warning"><AlertTriangle className="w-5 h-5"/> Missing Action Items</h4>
          {documentReadiness?.missing.length === 0 ? (
            <p className="text-sm text-success font-medium">All documents ready!</p>
          ) : (
            <ul className="space-y-2">
              {documentReadiness?.missing.map((d, i) => <li key={i} className="text-sm font-medium text-foreground">{d}</li>)}
            </ul>
          )}
        </div>
      </div>
    ),
    PHASE_9_DOC_ACQUISITION: () => (
      <div className="space-y-4">
        {documentAcquisition?.guides.map((g, i) => (
          <div key={i} className="p-4 rounded-xl bg-surface border border-border">
            <h4 className="font-semibold mb-2 text-foreground">{g.documentName} Acquisition Guide</h4>
            <div className="space-y-2 pl-4 border-l-2 border-primary/20">
              {g.steps.map((s, idx) => (
                <div key={idx} className="relative">
                  <span className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">{idx + 1}</span>
                  <p className="text-sm text-foreground-muted">{s}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
    PHASE_10_REVIEWS: () => (
      <div className="p-5 rounded-xl bg-surface border border-border">
        <div className="flex justify-between items-start mb-6">
          <h4 className="font-semibold flex items-center gap-2"><Search className="w-5 h-5 text-primary"/> Live Review Intelligence</h4>
          <div className="text-right">
            <span className="text-xs text-foreground-muted block mb-1">Sentiment Score</span>
            <span className="px-3 py-1 bg-success/20 text-success font-bold rounded-full">{reviewIntelligence?.sentimentScore}/100</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-success mb-2">Student Pros</p>
            <ul className="text-sm text-foreground-muted space-y-1 list-disc pl-4">
              {reviewIntelligence?.pros.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-destructive mb-2">Student Cons</p>
            <ul className="text-sm text-foreground-muted space-y-1 list-disc pl-4">
              {reviewIntelligence?.cons.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        </div>
        <div className="mt-6 p-4 bg-background rounded-lg border border-border">
          <p className="text-sm font-semibold mb-1">Placement Insights</p>
          <p className="text-sm text-foreground-muted leading-relaxed">{reviewIntelligence?.placementInsights}</p>
        </div>
      </div>
    ),
    PHASE_11_ROADMAP: () => (
      <div className="space-y-4">
        <div className="p-5 rounded-xl bg-primary/10 border border-primary/20">
          <h4 className="font-bold text-primary mb-2 flex items-center gap-2"><TrendingUp className="w-5 h-5"/> Immediate Actions (Next 48 Hours)</h4>
          <ul className="space-y-2">
            {actionRoadmap?.immediateActions.map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="w-4 h-4 text-primary"/> {a}</li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-surface border border-border">
            <p className="font-semibold mb-2 text-sm text-foreground">7-Day Plan</p>
            <ul className="text-sm text-foreground-muted space-y-1 list-disc pl-4">
              {actionRoadmap?.day7Plan.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-surface border border-border">
            <p className="font-semibold mb-2 text-sm text-foreground">30-Day Plan</p>
            <ul className="text-sm text-foreground-muted space-y-1 list-disc pl-4">
              {actionRoadmap?.day30Plan.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-32">
      {answeredPhases.map((phase) => {
        const Renderer = phaseRenderers[phase]
        if (!Renderer) return null
        
        const phaseTitles: Record<string, string> = {
          PHASE_1_PROFILE: '1. Profile Analysis',
          PHASE_2_COUNTRY: '2. Country Decision',
          PHASE_3_UNIVERSITY: '3. University Match',
          PHASE_4_ADMISSION: '4. Admission Chance',
          PHASE_5_COST: '5. Total Cost',
          PHASE_6_AFFORDABILITY: '6. Affordability Analysis',
          PHASE_7_LOAN: '7. Loan Strategy',
          PHASE_8_DOCUMENTS: '8. Document Readiness',
          PHASE_9_DOC_ACQUISITION: '9. Document Acquisition',
          PHASE_10_REVIEWS: '10. Live Review Intelligence',
          PHASE_11_ROADMAP: '11. Execution Roadmap'
        }

        const questions: Record<string, string> = {
          PHASE_1_PROFILE: 'What does my profile look like to universities?',
          PHASE_2_COUNTRY: 'Which country should I choose?',
          PHASE_3_UNIVERSITY: 'Which university fits my profile?',
          PHASE_4_ADMISSION: 'What are my real admission chances?',
          PHASE_5_COST: 'How much will it really cost?',
          PHASE_6_AFFORDABILITY: 'Can I afford it?',
          PHASE_7_LOAN: 'Do I need a loan?',
          PHASE_8_DOCUMENTS: 'What documents are required?',
          PHASE_9_DOC_ACQUISITION: 'How do I obtain the missing documents?',
          PHASE_10_REVIEWS: 'What are real students saying about this university?',
          PHASE_11_ROADMAP: 'What should I do next?'
        }

        return (
          <motion.div 
            key={phase} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl mx-auto"
          >
            {/* User Question Bubble */}
            <div className="flex justify-end mb-4">
              <div className="bg-primary text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%] shadow-md">
                <p className="font-medium">{questions[phase]}</p>
              </div>
            </div>

            {/* AI Answer Bubble */}
            <div className="flex justify-start">
              <div className="bg-surface border border-border px-6 py-5 rounded-2xl rounded-tl-sm w-full shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl">🌟</span>
                  </div>
                  <h2 className="font-bold text-foreground">{phaseTitles[phase]}</h2>
                </div>
                <Renderer />
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
