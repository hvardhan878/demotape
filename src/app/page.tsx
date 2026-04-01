import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'

// No landing page — send authenticated users to the app, guests to sign-in
export default async function RootPage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')
  redirect('/sign-in')
}
