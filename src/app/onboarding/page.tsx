import { redirect } from 'next/navigation'

// Legacy URL — API keys are configured in Settings.
export default function OnboardingPage() {
  redirect('/settings')
}
