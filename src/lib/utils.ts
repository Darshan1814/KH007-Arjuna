import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatINR(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`
  }
  return `₹${amount.toLocaleString('en-IN')}`
}

export function formatUSD(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`
}

export function calculateEMI(principal: number, rate: number, tenure: number): number {
  const monthlyRate = rate / 12 / 100
  const n = tenure * 12
  if (monthlyRate === 0) return principal / n
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
  return Math.round(emi)
}

export function calculateDreamScore(profile: {
  cgpa: number
  greScore: number
  ieltsScore: number
  workExpYears: number
  sopComplete: boolean
  lorCount: number
  researchPapers: number
  extracurriculars: number
  loanEligible: boolean
  savingsLakhs: number
  coBorrowerIncome: number
  universitiesFinalized: number
  applicationsSubmitted: number
  visaDocsReady: boolean
}): number {
  // Academic Score (30%)
  const normalizedCGPA = Math.min(profile.cgpa / 10, 1)
  const normalizedGRE = Math.min(profile.greScore / 340, 1)
  const normalizedIELTS = Math.min(profile.ieltsScore / 9, 1)
  const academicScore = normalizedCGPA * 0.4 + normalizedGRE * 0.4 + normalizedIELTS * 0.2

  // Financial Score (25%)
  const loanEligibility = profile.loanEligible ? 1 : 0
  const savingsBuffer = Math.min(profile.savingsLakhs / 20, 1)
  const coBorrowerScore = Math.min(profile.coBorrowerIncome / 1500000, 1)
  const financialScore = loanEligibility * 0.5 + savingsBuffer * 0.3 + coBorrowerScore * 0.2

  // Profile Strength (25%)
  const sopScore = profile.sopComplete ? 1 : 0
  const lorScore = Math.min(profile.lorCount / 3, 1)
  const workExpScore = Math.min(profile.workExpYears / 5, 1)
  const researchScore = Math.min(profile.researchPapers / 3, 1)
  const extraScore = Math.min(profile.extracurriculars / 5, 1)
  const profileStrength = sopScore * 0.3 + lorScore * 0.3 + workExpScore * 0.2 + researchScore * 0.1 + extraScore * 0.1

  // Application Progress (20%)
  const uniProgress = Math.min(profile.universitiesFinalized / 5, 1)
  const appProgress = Math.min(profile.applicationsSubmitted / 5, 1)
  const visaProgress = profile.visaDocsReady ? 1 : 0
  const applicationProgress = uniProgress * 0.3 + appProgress * 0.5 + visaProgress * 0.2

  const totalScore = (
    academicScore * 0.30 +
    financialScore * 0.25 +
    profileStrength * 0.25 +
    applicationProgress * 0.20
  ) * 1000

  return Math.round(totalScore)
}

export function getAdmissionProbability(
  cgpa: number,
  greScore: number,
  universityRanking: number
): { probability: number; category: 'reach' | 'match' | 'safety' } {
  let score = 0
  
  // CGPA component (max 40)
  score += (cgpa / 10) * 40
  
  // GRE component (max 40)
  score += (greScore / 340) * 40
  
  // University ranking adjustment (max 20)
  if (universityRanking <= 20) score -= 15
  else if (universityRanking <= 50) score -= 8
  else if (universityRanking <= 100) score -= 3
  else score += 5
  
  // Normalize to 0-100
  const probability = Math.max(5, Math.min(95, score + 10))
  
  let category: 'reach' | 'match' | 'safety'
  if (probability < 35) category = 'reach'
  else if (probability < 65) category = 'match'
  else category = 'safety'
  
  return { probability: Math.round(probability), category }
}

export function getLoanEligibility(
  cgpa: number,
  familyIncome: number,
  hasCollateral: boolean,
  universityRanking: number,
  loanAmount: number
): {
  eligible: boolean
  maxAmount: number
  interestRate: number
  nbfc: string
  reason: string
}[] {
  const results = []
  
  // Avanse Rules
  const avanseMaxWithCollateral = hasCollateral ? 7500000 : 4000000
  const avanseRate = hasCollateral ? 10.5 : 12.5
  results.push({
    eligible: cgpa >= 6.0 && loanAmount <= avanseMaxWithCollateral,
    maxAmount: avanseMaxWithCollateral,
    interestRate: avanseRate,
    nbfc: 'Avanse Financial',
    reason: cgpa < 6.0 ? 'Minimum CGPA 6.0 required' : 'Eligible based on profile'
  })
  
  // Auxilo Rules
  const auxiloMax = hasCollateral ? 10000000 : 5000000
  const auxiloRate = hasCollateral ? 10.0 : 12.0
  results.push({
    eligible: cgpa >= 5.5 && familyIncome >= 300000,
    maxAmount: auxiloMax,
    interestRate: auxiloRate,
    nbfc: 'Auxilo Finserve',
    reason: cgpa < 5.5 ? 'Minimum CGPA 5.5 required' : familyIncome < 300000 ? 'Minimum family income ₹3L required' : 'Eligible based on profile'
  })
  
  // HDFC Credila Rules
  const hdfcMax = hasCollateral ? 10000000 : 3500000
  const hdfcRate = universityRanking <= 50 ? 9.5 : hasCollateral ? 10.5 : 13.0
  results.push({
    eligible: cgpa >= 6.5 && universityRanking <= 200,
    maxAmount: hdfcMax,
    interestRate: hdfcRate,
    nbfc: 'HDFC Credila',
    reason: cgpa < 6.5 ? 'Minimum CGPA 6.5 required' : universityRanking > 200 ? 'University must be in top 200' : 'Eligible based on profile'
  })
  
  // MPOWER (US/Canada only, no collateral needed)
  results.push({
    eligible: cgpa >= 6.0,
    maxAmount: 5000000,
    interestRate: 13.5,
    nbfc: 'MPOWER Financing',
    reason: cgpa < 6.0 ? 'Minimum CGPA 6.0 required' : 'No collateral/co-signer needed (US/Canada only)'
  })
  
  return results
}
