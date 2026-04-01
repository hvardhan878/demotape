'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChevronDown, ChevronUp, Key, AlertCircle, CheckCircle } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showExplainer, setShowExplainer] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/user/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claudeApiKey: apiKey.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save API key')
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            <span className="text-indigo-400">Demo</span>Forge
          </h1>
          <p className="text-white/40 text-sm">One last thing before we start</p>
        </div>

        <Card className="bg-white/[0.03] border-white/[0.08] rounded-2xl">
          <CardHeader>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <Key className="w-5 h-5" />
            </div>
            <CardTitle className="text-white text-lg">Enter your Claude API key</CardTitle>
            <CardDescription className="text-white/50">
              We use your Anthropic key to generate the video components.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-white/70 text-sm">
                  Claude API Key
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500 h-11"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Why do I need this? */}
              <div className="border border-white/[0.08] rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowExplainer(!showExplainer)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/50 hover:text-white/70 transition-colors"
                >
                  <span>Why do I need this?</span>
                  {showExplainer ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showExplainer && (
                  <div className="px-4 pb-4 text-sm text-white/50 leading-relaxed border-t border-white/[0.06] pt-3 space-y-2">
                    <p>
                      DemoForge uses your own Anthropic API key to generate your video components via Claude.
                      This means <strong className="text-white/70">you control your own usage and costs</strong> — we never rack up charges on a shared key.
                    </p>
                    <p>
                      Your key is encrypted with AES-256 before being stored. We never log it in plain text, and it is never used for anything other than generating your demos.
                    </p>
                    <div className="flex items-center gap-2 text-emerald-400 pt-1">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>Encrypted at rest · Never logged · Only used for your demos</span>
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !apiKey.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-11"
              >
                {loading ? 'Saving...' : 'Continue to Dashboard'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/30 mt-6">
          Don&apos;t have a key?{' '}
          <a
            href="https://console.anthropic.com/account/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300"
          >
            Get one from Anthropic →
          </a>
        </p>
      </div>
    </div>
  )
}
