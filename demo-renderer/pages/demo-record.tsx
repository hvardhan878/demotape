import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

// Dynamically import the Claude-generated component placed at /app/component.tsx in the sandbox
// In the sandbox, the file is uploaded to /app/component.tsx (project root), so import path is ../component
const Demo = dynamic(() => import('../component'), { ssr: false })

const DEMO_TOKEN = process.env.NEXT_PUBLIC_DEMO_TOKEN || process.env.DEMO_TOKEN || ''

export default function DemoRecord() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!router.isReady) return
    if (router.query.token === DEMO_TOKEN) {
      setAuthorized(true)
    } else {
      router.replace('/')
    }
  }, [router.isReady, router.query.token])

  if (!authorized) return null

  return (
    <div
      style={{
        width: 1280,
        height: 720,
        overflow: 'hidden',
        position: 'relative',
        background: '#000',
      }}
    >
      <Demo />
    </div>
  )
}
