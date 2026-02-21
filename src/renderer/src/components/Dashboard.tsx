import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { demos } from '../data/demos'
import DemoCard from './DemoCard'
import { SystemInfo } from '../data/types'

interface DashboardProps {
  onSelectDemo: (id: string) => void
  systemInfo: SystemInfo | null
}

function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(eased * target)
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

export default function Dashboard({ onSelectDemo, systemInfo }: DashboardProps) {
  const maxSpeedup = useCountUp(47.7, 1800)

  return (
    <div className="p-6 min-h-full">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="px-2 py-1 rounded text-xs font-bold uppercase tracking-widest"
                style={{
                  background: 'rgba(0,255,136,0.1)',
                  color: '#00ff88',
                  border: '1px solid rgba(0,255,136,0.3)'
                }}
              >
                SIMD KERNEL LANGUAGE
              </div>
            </div>
            <h1
              className="text-5xl font-black tracking-tight leading-none"
              style={{
                background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Eä
            </h1>
            <p className="text-xl mt-2" style={{ color: '#9ca3af' }}>
              Up to{' '}
              <span className="font-black text-white" style={{ textShadow: '0 0 20px rgba(0,255,136,0.4)' }}>
                {maxSpeedup.toFixed(1)}×
              </span>{' '}
              faster than NumPy.{' '}
              <span style={{ color: '#6b7280' }}>For real, on real hardware.</span>
            </p>
          </div>

          {/* Aggregate stats */}
          <div className="flex gap-4">
            <HeroStat value="7" label="demos" />
            <HeroStat value="47.7×" label="peak speedup" highlight />
            <HeroStat value="16×" label="less memory" />
          </div>
        </div>

        {/* Subtitle strip */}
        <div
          className="mt-5 px-4 py-3 rounded-xl flex items-center gap-4 text-sm"
          style={{ background: '#0d0d1e', border: '1px solid #1a1a35' }}
        >
          <div style={{ color: '#6b7280' }}>
            <span style={{ color: '#e2e8f0' }}>Eä compiles to native machine code</span> — callable from
            Python, C, or Rust. SIMD without the assembly complexity.
          </div>
          <button
            onClick={() => window.api?.openExternal('https://github.com/petlukk/E-')}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: 'rgba(0,255,136,0.1)',
              border: '1px solid rgba(0,255,136,0.3)',
              color: '#00ff88'
            }}
          >
            View on GitHub ↗
          </button>
        </div>
      </motion.div>

      {/* Demo cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {demos.map((demo, i) => (
          <motion.div
            key={demo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.07, duration: 0.4 }}
          >
            <DemoCard demo={demo} onClick={() => onSelectDemo(demo.id)} index={i} />
          </motion.div>
        ))}
      </div>

      {/* Bottom: Key insight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-8 grid grid-cols-3 gap-4"
      >
        <InsightCard
          icon="⚡"
          title="Kernel Fusion"
          body="Chain operations in registers — each additional operation adds ~0ms to Eä but ~125ms to NumPy."
        />
        <InsightCard
          icon="💾"
          title="Memory Control"
          body="Stream large datasets through constant-size cache windows. O(1) memory vs O(N) for batch processing."
        />
        <InsightCard
          icon="🎯"
          title="Explicit SIMD"
          body="f32x8, i8x16, maddubs — you choose the vector width. No auto-vectorizer guessing."
        />
      </motion.div>
    </div>
  )
}

function HeroStat({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div
      className="px-4 py-3 rounded-xl text-center"
      style={{
        background: highlight ? 'rgba(0,255,136,0.08)' : '#0d0d1e',
        border: `1px solid ${highlight ? 'rgba(0,255,136,0.25)' : '#1a1a35'}`
      }}
    >
      <div
        className="text-2xl font-black"
        style={{
          color: highlight ? '#00ff88' : '#e2e8f0',
          textShadow: highlight ? '0 0 20px rgba(0,255,136,0.5)' : 'none'
        }}
      >
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
        {label}
      </div>
    </div>
  )
}

function InsightCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{ background: '#0d0d1e', borderColor: '#1a1a35' }}
    >
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-sm font-semibold mb-2" style={{ color: '#e2e8f0' }}>
        {title}
      </div>
      <div className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
        {body}
      </div>
    </div>
  )
}
