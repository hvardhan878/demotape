'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppNav from '@/components/AppNav'
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
import { Plus, X, AlertCircle, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

const VIDEO_STYLES = [
  { value: 'dark', label: 'Dark — deep blacks, neon accents' },
  { value: 'minimal', label: 'Minimal — clean whites, subtle shadows' },
  { value: 'bold', label: 'Bold — high contrast, punchy typography' },
  { value: 'gradient', label: 'Gradient — vibrant mesh backgrounds' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [features, setFeatures] = useState<string[]>([''])
  const [brandColour, setBrandColour] = useState('#6366f1')
  const [targetAudience, setTargetAudience] = useState('')
  const [videoStyle, setVideoStyle] = useState('dark')

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
      <AppNav />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">New Project</h1>
          <p className="text-white/40 text-sm mt-1">
            Tell us about your product and we&apos;ll generate a cinematic demo video.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="bg-white/[0.03] border-white/[0.08] rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white text-base">Product Details</CardTitle>
              <CardDescription className="text-white/40 text-sm">
                The more detail you provide, the better the generated demo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product name */}
              <div className="space-y-2">
                <Label htmlFor="productName" className="text-white/70 text-sm">
                  Product name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Acme AI CRM"
                  className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500 h-11"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="description" className="text-white/70 text-sm">
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
                  className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500 min-h-[100px] resize-none"
                  required
                />
              </div>

              {/* Key features */}
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">
                  Key features to show{' '}
                  <span className="text-white/30">(up to 5)</span>
                </Label>
                <div className="space-y-2">
                  {features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => updateFeature(i, e.target.value)}
                        placeholder={`Feature ${i + 1}, e.g. "AI replies to customer messages instantly"`}
                        className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500 h-10"
                      />
                      {features.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFeature(i)}
                          className="text-white/30 hover:text-red-400 transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {features.length < 5 && (
                  <button
                    type="button"
                    onClick={addFeature}
                    className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add feature
                  </button>
                )}
              </div>

              {/* Brand colour + Video style */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brandColour" className="text-white/70 text-sm">
                    Brand colour
                  </Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-lg border border-white/20 shrink-0 cursor-pointer"
                      style={{ backgroundColor: brandColour }}
                      onClick={() => document.getElementById('colourPicker')?.click()}
                    />
                    <Input
                      id="brandColour"
                      value={brandColour}
                      onChange={(e) => setBrandColour(e.target.value)}
                      placeholder="#6366f1"
                      className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500 h-10 font-mono text-sm"
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
                  <Label className="text-white/70 text-sm">Video style</Label>
                  <Select value={videoStyle} onValueChange={(val) => setVideoStyle(val ?? 'dark')}>
                    <SelectTrigger className="bg-white/[0.05] border-white/10 text-white h-10 focus:ring-indigo-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10">
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

              {/* Target audience */}
              <div className="space-y-2">
                <Label htmlFor="targetAudience" className="text-white/70 text-sm">
                  Target audience{' '}
                  <span className="text-white/30">(optional)</span>
                </Label>
                <Input
                  id="targetAudience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. UK mortgage brokers, early-stage startup founders"
                  className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500 h-11"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !productName.trim() || !description.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-11 text-base"
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
