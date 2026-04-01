'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppNav from '@/components/AppNav'
import ApiKeyDialog from '@/components/ApiKeyDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, X, AlertCircle, ChevronLeft, KeyRound } from 'lucide-react'
import Link from 'next/link'

const VIDEO_STYLES = [
  { value: 'dark', label: 'Dark — deep blacks, neon accents' },
  { value: 'minimal', label: 'Minimal — clean whites, subtle shadows' },
  { value: 'bold', label: 'Bold — high contrast, punchy typography' },
  { value: 'gradient', label: 'Gradient — vibrant mesh backgrounds' },
]

type Props = {
  initialHasApiKey: boolean
}

export default function NewProjectClient({ initialHasApiKey }: Props) {
  const router = useRouter()
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey)
  const [keyDialogOpen, setKeyDialogOpen] = useState(!initialHasApiKey)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [features, setFeatures] = useState<string[]>([''])
  const [brandColour, setBrandColour] = useState('#6366f1')
  const [targetAudience, setTargetAudience] = useState('')
  const [videoStyle, setVideoStyle] = useState('dark')

  useEffect(() => {
    setHasApiKey(initialHasApiKey)
    if (initialHasApiKey) setKeyDialogOpen(false)
  }, [initialHasApiKey])

  const addFeature = () => {
    if (features.length < 5) setFeatures([...features, ''])
  }

  const removeFeature = (i: number) => {
    setFeatures(features.filter((_, idx) => idx !== i))
  }

  const updateFeature = (i: number, val: string) => {
    const updated = [...features]
    updated[i] = val
    setFeatures(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasApiKey) {
      setKeyDialogOpen(true)
      return
    }

    setLoading(true)
    setError('')

    const validFeatures = features.filter((f) => f.trim())

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName.trim(),
          description: description.trim(),
          features: validFeatures,
          brandColour,
          targetAudience: targetAudience.trim(),
          videoStyle,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create project')
      }

      const { id } = await res.json()
      router.push(`/projects/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const charCount = description.length

  return (
    <div className="min-h-screen bg-[#030303]">
      <ApiKeyDialog
        open={keyDialogOpen}
        onOpenChange={setKeyDialogOpen}
        onSaved={() => {
          setHasApiKey(true)
          router.refresh()
        }}
      />

      <AppNav />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {!hasApiKey && !keyDialogOpen && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-100/90">Add your Claude API key before creating a project.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-amber-500/40 text-amber-100 hover:bg-amber-500/10"
              onClick={() => setKeyDialogOpen(true)}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Enter API key
            </Button>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">New Project</h1>
          <p className="mt-1 text-sm text-white/40">
            Tell us about your product and we&apos;ll generate a cinematic demo video.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-base text-white">Product Details</CardTitle>
              <CardDescription className="text-sm text-white/40">
                The more detail you provide, the better the generated demo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="productName" className="text-sm text-white/70">
                  Product name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Acme AI CRM"
                  className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-white/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-sm text-white/70">
                    Describe your product <span className="text-red-400">*</span>
                  </Label>
                  <span className={`text-xs ${charCount > 450 ? 'text-amber-400' : 'text-white/30'}`}>
                    {charCount}/500
                  </span>
                </div>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="A WhatsApp-based AI business manager that connects to your tools and handles customer enquiries automatically"
                  className="min-h-[100px] resize-none border-white/10 bg-white/[0.05] text-white placeholder:text-white/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-white/70">
                  Key features to show <span className="text-white/30">(up to 5)</span>
                </Label>
                <div className="space-y-2">
                  {features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => updateFeature(i, e.target.value)}
                        placeholder={`Feature ${i + 1}, e.g. "AI replies to customer messages instantly"`}
                        className="h-10 border-white/10 bg-white/[0.05] text-white placeholder:text-white/20 focus:border-indigo-500"
                      />
                      {features.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFeature(i)}
                          className="shrink-0 text-white/30 transition-colors hover:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {features.length < 5 && (
                  <button
                    type="button"
                    onClick={addFeature}
                    className="mt-1 flex items-center gap-1.5 text-sm text-indigo-400 transition-colors hover:text-indigo-300"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add feature
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brandColour" className="text-sm text-white/70">
                    Brand colour
                  </Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-white/20"
                      style={{ backgroundColor: brandColour }}
                      onClick={() => document.getElementById('colourPicker')?.click()}
                    />
                    <Input
                      id="brandColour"
                      value={brandColour}
                      onChange={(e) => setBrandColour(e.target.value)}
                      placeholder="#6366f1"
                      className="h-10 border-white/10 bg-white/[0.05] font-mono text-sm text-white placeholder:text-white/20 focus:border-indigo-500"
                    />
                    <input
                      id="colourPicker"
                      type="color"
                      value={brandColour}
                      onChange={(e) => setBrandColour(e.target.value)}
                      className="sr-only"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-white/70">Video style</Label>
                  <Select value={videoStyle} onValueChange={(val) => setVideoStyle(val ?? 'dark')}>
                    <SelectTrigger className="h-10 border-white/10 bg-white/[0.05] text-white focus:ring-indigo-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#1a1a1a]">
                      {VIDEO_STYLES.map((s) => (
                        <SelectItem
                          key={s.value}
                          value={s.value}
                          className="text-white/80 focus:bg-white/10 focus:text-white"
                        >
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAudience" className="text-sm text-white/70">
                  Target audience <span className="text-white/30">(optional)</span>
                </Label>
                <Input
                  id="targetAudience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. UK mortgage brokers, early-stage startup founders"
                  className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-white/20 focus:border-indigo-500"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !productName.trim() || !description.trim()}
                className="h-11 w-full bg-indigo-600 text-base text-white hover:bg-indigo-500"
              >
                {loading ? 'Creating project...' : 'Create Project'}
              </Button>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  )
}
