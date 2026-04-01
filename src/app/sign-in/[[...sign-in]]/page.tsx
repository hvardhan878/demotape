import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-1">
            <span className="text-indigo-400">Demo</span>Forge
          </h1>
          <p className="text-sm text-white/40">Sign in to your account</p>
        </div>
        <SignIn />
      </div>
    </div>
  )
}
