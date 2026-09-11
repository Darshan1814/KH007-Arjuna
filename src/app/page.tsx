'use client'

import { useAppStore } from '@/lib/store'
import LandingPage from '@/components/LandingPage'
import OnboardingFlow from '@/components/OnboardingFlow'
import DashboardLayout from '@/components/DashboardLayout'

export default function Home() {
  const { currentPage, isOnboarded } = useAppStore()

  // Show landing page
  if (currentPage === 'landing') {
    return <LandingPage />
  }

  // Show onboarding if not completed
  if (currentPage === 'onboarding' || (!isOnboarded && (currentPage as string) !== 'landing')) {
    return <OnboardingFlow />
  }

  // Show dashboard with the selected page
  return <DashboardLayout />
}
