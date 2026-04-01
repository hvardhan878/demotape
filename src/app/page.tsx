'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Check, Zap, Play, ArrowRight, Sparkles, Film, Code2 } from 'lucide-react'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'DemoForge'

const FEATURES = [
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: 'AI-Generated Components',
    desc: 'Claude writes a pixel-perfect animated React component tailored to your product.',
  },
  {
    icon: <Film className="w-5 h-5" />,
    title: 'Cinematic Video Output',
    desc: 'Playwright records every frame at 1280×720, producing a crisp WebM in minutes.',
  },
  {
    icon: <Code2 className="w-5 h-5" />,
    title: 'Your API Key, Your Cost',
    desc: 'We use your Anthropic key so you stay in control of usage and spend.',
  },
]

const FREE_FEATURES = ['1 project', 'WebM video download', 'Watermarked output', 'Reprompt & refine']
const PRO_FEATURES = ['Unlimited projects', 'WebM video download', 'No watermark', 'Reprompt & refine', 'Priority rendering', 'Early access to new styles']

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-lg font-semibold tracking-tight">
          <span className="text-indigo-400">Demo</span>Forge
        </span>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
              Sign in
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
              Start for free
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <Badge
          variant="outline"
          className="mb-6 border-indigo-500/40 text-indigo-300 bg-indigo-500/10 px-3 py-1 text-xs"
        >
          <Zap className="w-3 h-3 mr-1.5" /> Powered by Claude + Playwright
        </Badge>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6 text-balance">
          Your product demo,{' '}
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            generated in minutes
          </span>
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 text-balance">
          Describe your product, and we&apos;ll generate a cinematic animated demo video — complete with UI scenes, smooth transitions, and your brand colours.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/sign-up">
            <Button
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 h-12 text-base gap-2"
            >
              Start for free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="border-white/20 text-white/80 hover:text-white hover:border-white/40 h-12 px-8 text-base gap-2"
          >
            <Play className="w-4 h-4 fill-current" /> Watch example
          </Button>
        </div>
      </section>

      {/* Example video placeholders */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { label: 'SaaS Dashboard Demo', duration: '0:24' },
            { label: 'Mobile App Walkthrough', duration: '0:18' },
          ].map((v) => (
            <div
              key={v.label}
              className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03] aspect-video flex items-center justify-center group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/20" />
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                </div>
                <p className="text-sm text-white/60">{v.label}</p>
              </div>
              <span className="absolute bottom-3 right-3 text-xs text-white/40 bg-black/40 px-2 py-0.5 rounded">
                {v.duration}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <Card key={f.title} className="bg-white/[0.03] border-white/[0.08] rounded-2xl">
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                  {f.icon}
                </div>
                <CardTitle className="text-base font-semibold text-white">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="max-w-6xl mx-auto bg-white/[0.06]" />

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-24" id="pricing">
        <h2 className="text-3xl font-bold text-center mb-3">Simple pricing</h2>
        <p className="text-center text-white/50 mb-12">Start free. Upgrade when you need more.</p>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <Card className="bg-white/[0.03] border-white/[0.08] rounded-2xl">
            <CardHeader className="pb-4">
              <Badge variant="outline" className="w-fit mb-2 border-white/20 text-white/50 text-xs">
                Free
              </Badge>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">£0</span>
                <span className="text-white/40">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {FREE_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  {f}
                </div>
              ))}
              <div className="pt-4">
                <Link href="/sign-up">
                  <Button
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                  >
                    Get started free
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Pro */}
          <Card className="bg-indigo-600/10 border-indigo-500/40 rounded-2xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
            <CardHeader className="pb-4">
              <Badge className="w-fit mb-2 bg-indigo-500/30 text-indigo-300 border-indigo-500/50 text-xs">
                Pro
              </Badge>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">£20</span>
                <span className="text-white/40">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {PRO_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                  {f}
                </div>
              ))}
              <div className="pt-4">
                <Link href="/sign-up">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white">
                    Upgrade to Pro
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-8 max-w-6xl mx-auto flex items-center justify-between text-sm text-white/30">
        <span>
          © {new Date().getFullYear()} {APP_NAME}
        </span>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-white/60 transition-colors">
            Privacy
          </Link>
          <Link href="#" className="hover:text-white/60 transition-colors">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  )
}
