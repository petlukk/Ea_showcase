import { useState, useEffect, useRef } from 'react'
import { FusionScaling } from '../data/types'
import { motion, AnimatePresence } from 'framer-motion'

interface FusionVisualizerProps {
  fusionScaling?: FusionScaling[]
  demoId: string
}

export default function FusionVisualizer({ fusionScaling, demoId }: FusionVisualizerProps) {
  const [selectedOps, setSelectedOps] = useState(1)
  const [animParticles, setAnimParticles] = useState<Particle[]>([])
  const particleId = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  interface Particle {
    id: number
    x: number
    y: number
    side: 'numpy' | 'ea'
    progress: number
    pass: number
  }

  const scaling = fusionScaling || [
    { ops: 1, numpyMs: 77, eaMs: 39 },
    { ops: 2, numpyMs: 154, eaMs: 39 },
    { ops: 4, numpyMs: 470, eaMs: 39 },
    { ops: 8, numpyMs: 1006, eaMs: 40 }
  ]

  const currentScaling = scaling.find((s) => s.ops === selectedOps) || scaling[0]

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setAnimParticles((prev) => {
        // Move existing particles
        const updated = prev
          .map((p) => ({ ...p, progress: p.progress + 0.015 }))
          .filter((p) => p.progress < 1)

        // Add new particle occasionally
        if (Math.random() < 0.3) {
          updated.push({
            id: particleId.current++,
            x: 0,
            y: 0,
            side: Math.random() < 0.5 ? 'numpy' : 'ea',
            progress: 0,
            pass: 0
          })
        }

        return updated
      })
    }, 50)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const opsOptions = scaling.map((s) => s.ops)

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ background: '#0a0a1a', borderColor: '#1a1a35' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
          Kernel Fusion Visualizer
        </h4>

        {/* Ops selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6b7280' }}>
            Pipeline depth:
          </span>
          <div className="flex gap-1">
            {opsOptions.map((ops) => (
              <button
                key={ops}
                onClick={() => setSelectedOps(ops)}
                className="w-8 h-6 rounded text-xs font-semibold transition-all"
                style={{
                  background:
                    selectedOps === ops ? 'rgba(0,255,136,0.15)' : 'rgba(30,30,63,0.4)',
                  border: `1px solid ${selectedOps === ops ? '#00ff88' : '#1e1e3f'}`,
                  color: selectedOps === ops ? '#00ff88' : '#6b7280'
                }}
              >
                {ops}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main visualization */}
      <div className="flex gap-4">
        {/* NumPy side */}
        <FusionSide
          label="NumPy"
          color="#ff4444"
          ops={selectedOps}
          time={currentScaling.numpyMs}
          fused={false}
        />

        {/* Vs divider */}
        <div className="flex flex-col items-center justify-center px-2">
          <div className="text-2xl font-black" style={{ color: '#4b5563' }}>
            vs
          </div>
        </div>

        {/* Eä side */}
        <FusionSide
          label="Eä"
          color="#00ff88"
          ops={selectedOps}
          time={currentScaling.eaMs}
          fused={true}
        />
      </div>

      {/* Speedup comparison */}
      <div
        className="mt-4 rounded-lg p-3 flex items-center justify-between"
        style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.15)' }}
      >
        <div>
          <div className="text-xs" style={{ color: '#6b7280' }}>
            Each NumPy operation adds ~{Math.round(currentScaling.numpyMs / selectedOps)}ms
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
            Each Eä operation adds ~0ms (all in registers)
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black" style={{ color: '#00ff88' }}>
            {(currentScaling.numpyMs / currentScaling.eaMs).toFixed(1)}×
          </div>
          <div className="text-xs" style={{ color: '#6b7280' }}>
            faster at {selectedOps} ops
          </div>
        </div>
      </div>
    </div>
  )
}

function FusionSide({
  label,
  color,
  ops,
  time,
  fused
}: {
  label: string
  color: string
  ops: number
  time: number
  fused: boolean
}) {
  const passes = fused ? 1 : ops + 1 // input + output passes

  return (
    <div className="flex-1">
      <div
        className="text-xs font-semibold mb-2 text-center"
        style={{ color: color }}
      >
        {label}
      </div>

      {/* Memory diagram */}
      <div className="flex flex-col gap-1">
        {/* RAM box */}
        <MemBlock label="RAM" color={color} opacity={0.3} />

        {/* Arrows showing passes */}
        <div className="flex flex-col items-center gap-0.5 py-1">
          {Array.from({ length: passes }).map((_, i) => (
            <DataArrow key={i} color={color} direction={i % 2 === 0 ? 'down' : 'up'} />
          ))}
        </div>

        {/* CPU box */}
        <MemBlock
          label={fused ? `CPU (all ${ops} ops)` : `CPU (op ${1}–${ops})`}
          color={color}
          opacity={0.6}
          highlight
        />
      </div>

      {/* Time */}
      <div
        className="mt-3 text-center text-lg font-black"
        style={{ color: color, textShadow: `0 0 10px ${color}66` }}
      >
        {time} ms
      </div>
      <div className="text-center text-xs" style={{ color: '#4b5563' }}>
        {fused ? '1 RAM pass' : `${passes} RAM passes`}
      </div>
    </div>
  )
}

function MemBlock({
  label,
  color,
  opacity,
  highlight
}: {
  label: string
  color: string
  opacity: number
  highlight?: boolean
}) {
  return (
    <div
      className="rounded py-2 px-3 text-xs text-center font-mono"
      style={{
        background: `${color}${Math.round(opacity * 15).toString(16).padStart(2, '0')}`,
        border: `1px solid ${color}${Math.round(opacity * 80).toString(16).padStart(2, '0')}`,
        color: highlight ? color : `${color}aa`,
        fontSize: 11
      }}
    >
      {label}
    </div>
  )
}

function DataArrow({ color, direction }: { color: string; direction: 'up' | 'down' }) {
  return (
    <div
      className="text-xs text-center"
      style={{ color: `${color}88`, fontSize: 14, lineHeight: 1 }}
    >
      {direction === 'down' ? '↓' : '↑'}
    </div>
  )
}
