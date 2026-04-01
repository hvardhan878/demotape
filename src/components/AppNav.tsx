'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, Settings, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Projects', icon: LayoutDashboard },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-white/[0.06] bg-[#030303]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-base font-semibold tracking-tight shrink-0">
            <span className="text-indigo-400">Demo</span>Forge
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'gap-2 text-sm h-8',
                    pathname === href || pathname.startsWith(href + '/')
                      ? 'text-white bg-white/[0.08]'
                      : 'text-white/50 hover:text-white/80'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/projects/new">
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 h-8 text-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </Button>
          </Link>
          <UserButton />
        </div>
      </div>
    </nav>
  )
}
