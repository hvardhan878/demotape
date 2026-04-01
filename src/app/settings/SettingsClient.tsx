'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Key, CreditCard, AlertTriangle, CheckCircle, Loader2, Crown } from 'lucide-react'

type Props = {
  isPro: boolean
  hasKey: boolean
  stripeCustomerId: string | null
}

export default function SettingsClient({ isPro, hasKey, stripeCustomerId }: Props) {
  const router = useRouter()

  const [apiKey, setApiKey] = useState('')
  const [keyLoading, setKeyLoading] = useState(false)
  const [keySuccess, setKeySuccess] = useState(false)
  const [keyError, setKeyError] = useState('')

  const [billingLoading, setBillingLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const saveApiKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setKeyLoading(true)
    setKeyError('')
    setKeySuccess(false)

    try {
      const res = await fetch('/api/user/onboard', {
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
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Failed to update API key')
    } finally {
      setKeyLoading(false)
    }
  }

  const handleBilling = async () => {
    setBillingLoading(true)
    try {
      if (isPro && stripeCustomerId) {
        // Open customer portal
        const res = await fetch('/api/stripe/portal', { method: 'POST' })
        const { url } = await res.json()
        window.location.href = url
      } else {
        // Open checkout
        const res = await fetch('/api/stripe/checkout', { method: 'POST' })
        const { url } = await res.json()
        window.location.href = url
      }
    } catch {
      setBillingLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    setDeleteLoading(true)
    try {
      await fetch('/api/user/delete', { method: 'DELETE' })
      router.push('/')
    } catch {
      setDeleteLoading(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Manage your account and billing</p>
      </div>

      {/* Claude API Key */}
      <Card className="bg-white/[0.03] border-white/[0.08] rounded-2xl" id="api-key">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-white text-base">Claude API Key</CardTitle>
              <CardDescription className="text-white/40 text-sm">
                {hasKey ? 'A key is currently saved. Enter a new one to replace it.' : 'No key saved yet.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveApiKey} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newApiKey" className="text-white/60 text-sm">
                New API Key
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
                <CheckCircle className="w-4 h-4" />
                API key updated successfully
              </div>
            )}
            {keyError && (
              <p className="text-sm text-red-400">{keyError}</p>
            )}

            <Button
              type="submit"
              disabled={keyLoading || !apiKey.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {keyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Key'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card className="bg-white/[0.03] border-white/[0.08] rounded-2xl" id="billing">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-white text-base">Billing</CardTitle>
              <CardDescription className="text-white/40 text-sm">
                Manage your subscription
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div>
              <p className="text-sm font-medium text-white">Current plan</p>
              <p className="text-xs text-white/40 mt-0.5">
                {isPro ? 'Unlimited projects, no watermark' : '1 project, watermarked output'}
              </p>
            </div>
            <Badge
              className={
                isPro
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-white/10 text-white/50 border-white/20'
              }
            >
              {isPro ? (
                <><Crown className="w-3 h-3 mr-1" />Pro</>
              ) : (
                'Free'
              )}
            </Badge>
          </div>

          {isPro ? (
            <Button
              variant="outline"
              className="border-white/20 text-white/70 hover:text-white"
              onClick={handleBilling}
              disabled={billingLoading}
            >
              {billingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Manage subscription
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 text-sm text-indigo-200">
                Upgrade to <strong>Pro at £20/mo</strong> to unlock unlimited projects, remove the watermark, and get priority rendering.
              </div>
              <Button
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                onClick={handleBilling}
                disabled={billingLoading}
              >
                {billingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                Upgrade to Pro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="bg-red-950/20 border-red-500/20 rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-white text-base">Danger Zone</CardTitle>
              <CardDescription className="text-white/40 text-sm">
                Irreversible actions — proceed with care
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Separator className="bg-white/[0.06] mb-4" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Delete account</p>
              <p className="text-xs text-white/40 mt-0.5">
                Permanently removes your account and all projects
              </p>
            </div>
            <Button
              variant="outline"
              className={`border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 ${
                deleteConfirm ? 'border-red-500 bg-red-500/20' : ''
              }`}
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : deleteConfirm ? (
                'Click again to confirm'
              ) : (
                'Delete account'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
