'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JoinDiscordButton } from '@/components/JoinDiscordButton'
import { cn } from '@/lib/utils'

export default function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-white/[0.06] bg-[#030303]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="text-base font-semibold tracking-tight">
          <span className="text-[#F5A623]">demo</span>tape
        </Link>

        <div className="flex items-center gap-1">
          <JoinDiscordButton size="sm" buttonClassName="h-8 gap-2 text-sm mr-1 border-white/[0.12] text-white/60 hover:text-white/90" />
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2 text-sm h-8',
                pathname === '/dashboard'
                  ? 'text-white bg-white/[0.08]'
                  : 'text-white/50 hover:text-white/80'
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/settings">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2 text-sm h-8',
                pathname === '/settings'
                  ? 'text-white bg-white/[0.08]'
                  : 'text-white/50 hover:text-white/80'
              )}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
