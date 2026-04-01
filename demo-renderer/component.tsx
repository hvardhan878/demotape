'use client'
// Placeholder — overwritten at render time by Claude-generated code.
// Must export: default function Demo(), DEMO_DURATION_MS
import { useEffect } from 'react'
import { motion } from 'framer-motion'

export const DEMO_DURATION_MS = 8000

export default function Demo() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__demoDuration = DEMO_DURATION_MS
    }
  }, [])

  return (
    <motion.div
      className="w-full h-full flex items-center justify-center bg-gray-950 text-white text-4xl font-bold"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 1 }}
    >
      demotape
    </motion.div>
  )
}
