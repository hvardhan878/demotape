import dynamic from 'next/dynamic'

// Load component client-side only — it uses Framer Motion and browser APIs
const Demo = dynamic(() => import('../component'), { ssr: false })

export default function DemoRecord() {
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
