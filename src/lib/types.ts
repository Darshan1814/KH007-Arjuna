export interface StudentProfile {
  id?: string
  name: string
  email?: string
  
  // Legacy fields (kept for backward compatibility with other components)
  cgpa: number
  greScore: number
  gmatScore?: number
  ieltsScore: number
  toeflScore?: number
  workExpYears: number
  targetCountry: string[]
  targetProgram: string
  budgetLakhs: number
  currentDegree: string
  currentUniversity: string
  researchPapers: number
  extracurriculars: number
  sopComplete: boolean
  lorCount: number
  loanEligible: boolean
  savingsLakhs: number
  coBorrowerIncome: number
  universitiesFinalized: number
  applicationsSubmitted: number
  visaDocsReady: boolean
  dreamScore: number
  streakDays: number
  xpPoints: number
  badges: string[]
  careerInterest?: string
  yearOfStudy?: number
  backlogs?: number
  targetIntake?: string
  familyIncome?: number
  hasCoApplicant?: boolean
  collateralType?: 'property' | 'FD' | 'none'
  existingLoans?: number
  priority?: 'placement' | 'research' | 'cost' | 'ranking'
  journeyStage: 'EXPLORER' | 'RESEARCHER' | 'APPLICANT' | 'LOAN_SEEKER' | 'SUBMITTED'

  // Roles & Permissions
  role?: 'student' | 'expert' | 'admin'

  // EXPERT SPECIFIC FIELDS
  expertSpecializations?: string[]
  expertCountries?: string[]
  kycStatus?: 'pending' | 'verified' | 'rejected'
  kycRejectionReason?: string
  rating?: number
  studentsHelped?: number
  responseTimeHrs?: number
  earningsThisMonth?: number
  sessionRate?: number
  linkedinUrl?: string
  bio?: string
  kycDocuments?: { type: string, url: string, name: string }[]
  avatar?: string

  // NEW ONBOARDING FIELDS
  mobile?: string
  dob?: string
  gender?: string
  city?: string
  state?: string
  educationLevel?: string
  
  // Step 2
  tenthMarks?: string
  twelfthMarks?: string
  twelfthStream?: string
  undergradCollege?: string
  undergradDegree?: string
  undergradSpecialization?: string
  undergradCgpa?: string
  undergradGradYear?: string
  hasBacklogs?: string
  hasResearchPapers?: string
  internshipsCount?: string
  extracurricularRoles?: string
  
  // Step 3
  isWorkingProfessional?: string
  companyName?: string
  industry?: string
  jobRole?: string
  yearsExperience?: string
  currentCtc?: string
  careerGap?: string
  
  // Step 4
  studyGoal?: string
  targetCountries?: string[]
  targetDegree?: string
  targetField?: string
  intakeTarget?: string
  applicationStage?: string
  
  // Step 5
  greStatus?: string
  greScoreStr?: string
  gmatStatus?: string
  gmatScoreStr?: string
  ieltsStatus?: string
  toeflStatus?: string
  gateStatus?: string
  gateScoreStr?: string
  catStatus?: string
  catScoreStr?: string
  neetStatus?: string
  examNextDate?: string
  
  // Step 6
  dreamUniversities?: string[]
  targetUniversitiesList?: string[]
  safeUniversities?: string[]
  preferenceFactors?: string[]
  topPreferenceFactor?: string
  universityResearchStage?: string
  
  // Step 7
  fundingSource?: string
  expectedBudgetStr?: string
  loanEstimateStr?: string
  collateralAvailableStr?: string
  familyIncomeStr?: string
  coApplicantStr?: string
  creditScoreStr?: string
  
  // Step 8
  docPassport?: string
  docTranscripts?: string
  docLors?: string
  docSop?: string
  docResume?: string
  docBankStatements?: string
  docVisa?: string
  
  // Step 9
  preferredLanguage?: string
  notificationPreference?: string
  contentInterest?: string[]
  hearAboutUs?: string
  referralCode?: string
  isOnboarded?: boolean
  created_at?: string
}

export interface University {
  id: string
  name: string
  country: string
  city: string
  ranking: number
  avgGRE: number
  avgCGPA: number
  tuitionUSD: number
  program: string
  acceptanceRate: number
  logoUrl?: string
  description: string
  avgSalaryUSD: number
  programDuration: number
}

export interface LoanOffer {
  nbfc: string
  eligible: boolean
  maxAmount: number
  interestRate: number
  processingFee: number
  moratoriumMonths: number
  prepaymentPenalty: string
  reason: string
  logo?: string
  bestFor?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ChatMessageAttachment {
  type: 'document' | 'image' | 'audio'
  url: string
  name: string
}

export interface ExpertMessage {
  id: string
  chatId: string
  senderId: string
  senderRole: 'student' | 'expert' | 'system'
  content: string
  timestamp: string
  isRead: boolean
  attachments?: ChatMessageAttachment[]
}

export interface ExpertChatSession {
  id: string
  studentId: string
  expertId: string
  lastMessageAt: string
  status: 'active' | 'closed'
}

export interface CareerPath {
  title: string
  description: string
  countries: string[]
  avgSalaryUSD: number
  growthRate: string
  universities: University[]
  skills: string[]
  icon: string
}

export interface Scholarship {
  id: string
  name: string
  provider: string
  amount: number
  currency: string
  country: string
  deadline: string
  eligibility: string
  matchScore: number
  field: string
  type: 'Merit' | 'Need' | 'Research' | 'Diversity'
}

export interface SuccessStory {
  id: string
  anonymizedName: string
  backgroundUniversity: string
  cgpa: number
  greScore: number
  workExp: number
  targetUniversity: string
  targetCountry: string
  program: string
  loanAmount: number
  nbfc: string
  currentSalaryUSD: number
  yearOfAdmission: number
  avatar: string
}

export interface Professor {
  id: string
  name: string
  university: string
  department: string
  researchAreas: string[]
  email: string
  hIndex: number
  recentPapers: string[]
  photoUrl?: string
}

export type PageType = 
  | 'landing' 
  | 'onboarding' 
  | 'dashboard' 
  | 'career-navigator' 
  | 'roi-calculator' 
  | 'admission-predictor' 
  | 'loan-center' 
  | 'emi-calculator' 
  | 'sop-copilot' 
  | 'visa-simulator' 
  | 'mentor-chat'
  | 'scholarship-hunter'
  | 'professor-match'
  | 'clone-journey'
  | 'ai-journey'
  | 'currency-risk'
  | 'living-cost'
  | 'news'
  | 'form-guide'
  | 'loan-apply'
  | 'timeline'
  | 'interview-prep'
  | 'referrals'
  | 'gamification'
  | 'document-vault'
  | 'growth-tools'
  | 'profile'
  
  // User Expert Network
  | 'expert-directory'
  | 'user-expert-chat'

  // Expert Dashboard
  | 'expert-home'
  | 'expert-students'
  | 'expert-chat'
  | 'expert-kyc'
  | 'expert-earnings'

  // Admin Dashboard
  | 'admin-analytics'
  | 'admin-kyc'
  | 'admin-users'
  | 'admin-experts'

// Loan Application types
export type LoanAppStep = 'eligibility' | 'documents' | 'form' | 'tracking'

export interface LoanDocument {
  id: string
  name: string
  category: 'kyc' | 'academic' | 'financial' | 'admission'
  required: boolean
  status: 'pending' | 'uploaded' | 'verified' | 'not-required'
  tip: string
}

export interface LoanApplication {
  id: string
  step: LoanAppStep
  eligibilityScore: number
  maxLoanAmount: number
  minLoanAmount: number
  interestRateMin: number
  interestRateMax: number
  selectedLender: string
  documents: LoanDocument[]
  formData: Record<string, string>
  formStrength: number
  status: 'draft' | 'submitted' | 'review' | 'verified' | 'assessment' | 'sanctioned'
  submittedAt?: string
  createdAt: string
}

// Gamification types
export type UserLevel = 'Explorer' | 'Aspirant' | 'Contender' | 'Scholar' | 'Champion'

export interface XPEvent {
  id: string
  action: string
  points: number
  timestamp: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'urgent'
  read: boolean
  timestamp: string
  actionPage?: PageType
}

export interface ReferralData {
  code: string
  referrals: { name: string; joinedAt: string; onboarded: boolean }[]
  coins: number
  tier: 'Bronze' | 'Silver' | 'Gold'
}

export interface TimelineMilestone {
  id: string
  title: string
  description: string
  phase: string
  weekNumber: number
  completed: boolean
  dueDate: string
}

export interface EventLog {
  id: string
  userId: string
  event: string
  metadata: Record<string, any>
  timestamp: string}

export type DecisionPhase = 
  | 'PHASE_1_PROFILE'
  | 'PHASE_2_COUNTRY'
  | 'PHASE_3_UNIVERSITY'
  | 'PHASE_4_ADMISSION'
  | 'PHASE_5_COST'
  | 'PHASE_6_AFFORDABILITY'
  | 'PHASE_7_LOAN'
  | 'PHASE_8_DOCUMENTS'
  | 'PHASE_9_DOC_ACQUISITION'
  | 'PHASE_10_REVIEWS'
  | 'PHASE_11_ROADMAP'

export interface DecisionEngineState {
  currentPhase: DecisionPhase
  answeredPhases: DecisionPhase[]
  
  // Phase 1
  profileAnalysis?: {
    academicScore: number
    financialScore: number
    admissionReadinessScore: number
    reasoning: string
  }
  
  // Phase 2
  countryDecision?: {
    recommendedCountries: {
      countryName: string
      matchScore: number
      whyRecommended: string
      whyNotRecommended: string
      expectedCost: string
      postStudyWork: string
      jobMarket: number
      visaDifficulty: string
    }[]
  }
  selectedCountry?: string
  
  // Phase 3
  universityMatch?: {
    bestMatchUniversities: {
      id: string
      name: string
      country: string
      admissionChance: number
      ranking: number
      tuition: number
      livingCost: number
      roi: number
      scholarshipAvailability: string
      whyRecommended: string
    }[]
  }
  selectedUniversity?: string
  
  // Phase 4
  admissionChance?: {
    currentChance: number
    chanceBreakdown: string
    positiveFactors: string[]
    negativeFactors: string[]
    missingRequirements: string[]
    improvedChanceAfterRecs: number
  }
  
  // Phase 5
  totalCost?: {
    tuition: number
    living: number
    insurance: number
    visa: number
    travel: number
    miscellaneous: number
    totalCost: number
    yearlyCost: number
    monthlyCost: number
  }
  
  // Phase 6
  affordability?: {
    canAfford: boolean
    fundingGap: number
    selfFundingCapacity: number
    savingsContribution: number
    familyContribution: number
    reasoning: string
  }
  
  // Phase 7
  loanEngine?: {
    loanAmountRequired: number
    emi: number
    interest: number
    recommendedLenders: string[]
  }
  
  // Phase 8
  documentReadiness?: {
    requiredDocuments: string[]
    available: string[]
    missing: string[]
    pending: string[]
  }
  
  // Phase 9
  documentAcquisition?: {
    guides: {
      documentName: string
      steps: string[]
    }[]
  }
  
  // Phase 10
  reviewIntelligence?: {
    pros: string[]
    cons: string[]
    placementInsights: string
    housingInsights: string
    studentSatisfaction: string
    sentimentScore: number
  }
  
  // Phase 11
  actionRoadmap?: {
    immediateActions: string[]
    day7Plan: string[]
    day30Plan: string[]
    day60Plan: string[]
    day90Plan: string[]
  }
}
