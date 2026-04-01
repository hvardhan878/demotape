'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Key, Sparkles, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { WAITLIST_PRICE_OPTIONS } from '@/lib/waitlist-options'
import { JoinDiscordButton } from '@/components/JoinDiscordButton'

type Props = {
  hasKey: boolean
}

export default function SettingsClient({ hasKey }: Props) {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [keyLoading, setKeyLoading] = useState(false)
  const [keySuccess, setKeySuccess] = useState(false)
  const [keyError, setKeyError] = useState('')

  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [selectedPrice, setSelectedPrice] = useState('')
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistSuccess, setWaitlistSuccess] = useState(false)
  const [waitlistError, setWaitlistError] = useState('')

  const saveApiKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setKeyLoading(true)
    setKeyError('')
    setKeySuccess(false)
    try {
      const res = await fetch('/api/session/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claudeApiKey: apiKey.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update API key')
      }
      setKeySuccess(true)
      setApiKey('')
      router.refresh()
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Failed to update API key')
    } finally {
      setKeyLoading(false)
    }
  }

  const joinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!waitlistEmail.trim() || !selectedPrice) return
    setWaitlistLoading(true)
    setWaitlistError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail.trim(), willingToPay: selectedPrice }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to join waitlist')
      }
      setWaitlistSuccess(true)
      setWaitlistEmail('')
      setSelectedPrice('')
    } catch (err) {
      setWaitlistError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setWaitlistLoading(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/40 text-sm mt-1">API keys and waitlist</p>
      </div>

      {!hasKey && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-100/90">
          Add your Claude API key below to generate demo videos from the project page.
        </div>
      )}

      {/* Claude API Key */}
      <Card id="api-key" className="bg-white/[0.03] border-white/[0.08] rounded-2xl scroll-mt-24">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-white text-base">Claude API Key</CardTitle>
              <CardDescription className="text-white/40 text-sm">
                {hasKey ? 'A key is saved. Enter a new one to replace it.' : 'No key saved yet.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveApiKey} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newApiKey" className="text-white/60 text-sm">
                API Key
              </Label>
              <Input
                id="newApiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500 h-11"
                required
              />
            </div>
            {keySuccess && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle className="w-4 h-4" /> API key updated
              </div>
            )}
            {keyError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" /> {keyError}
              </div>
            )}
            <Button
              type="submit"
              disabled={keyLoading || !apiKey.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {keyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : hasKey ? 'Update key' : 'Save key'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pro Waitlist */}
      <Card className="bg-white/[0.03] border-white/[0.08] rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-white text-base">Join the Pro waitlist</CardTitle>
              <CardDescription className="text-white/40 text-sm">
                Unlimited projects, no watermark, priority rendering — coming soon.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {waitlistSuccess ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm py-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              You&apos;re on the list! We&apos;ll be in touch.
            </div>
          ) : (
            <form onSubmit={joinWaitlist} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="waitlistEmail" className="text-white/60 text-sm">
                  Email address
                </Label>
                <Input
                  id="waitlistEmail"
                  type="email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500 h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/60 text-sm">
                  How much would you pay per month?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {WAITLIST_PRICE_OPTIONS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPrice(p)}
                      className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                        selectedPrice === p
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-white/[0.04] border-white/10 text-white/60 hover:border-white/30 hover:text-white/90'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {waitlistError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" /> {waitlistError}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
                <Button
                  type="submit"
                  disabled={waitlistLoading || !waitlistEmail.trim() || !selectedPrice}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white sm:w-auto"
                >
                  {waitlistLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Join waitlist
                </Button>
                <JoinDiscordButton buttonClassName="border-white/[0.12] sm:min-w-[10rem]" />
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
