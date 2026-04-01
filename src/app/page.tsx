import { redirect } from 'next/navigation'

// Middleware already ensures a session cookie exists before we get here.
export default function RootPage() {
  redirect('/dashboard')
}
