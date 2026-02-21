import { useEffect, useRef, useState } from 'react'
import { BenchmarkEntry } from '../data/types'

interface BenchmarkChartProps {
  data: BenchmarkEntry[]
  unit: string
  liveResults?: { numpy_ms?: number; ea_ms?: number } | null
}

export default function BenchmarkChart({ data, unit, liveResults }: BenchmarkChartProps) {
  const [animProgress, setAnimProgress] = useState(0)
  const animRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    setAnimProgress(0)
    startRef.current = null
    if (animRef.current) cancelAnimationFrame(animRef.current)

    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / 800, 1)
      const eased = 1 - Math.pow(1 - progress, 2)
      setAnimProgress(eased)
      if (progress < 1) animRef.current = requestAnimationFrame(tick)
    }
    const timeout = setTimeout(() => {
      animRef.current = requestAnimationFrame(tick)
    }, 200)
    return () => {
      clearTimeout(timeout)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [data])

  // Merge live results if available
  const displayData: (BenchmarkEntry & { isLive?: boolean })[] = data.map((entry) => {
    if (liveResults) {
      if (entry.isEa && liveResults.ea_ms != null) {
        return { ...entry, time: liveResults.ea_ms, isLive: true }
      }
      if (!entry.isEa && entry.name.toLowerCase().includes('numpy') && liveResults.numpy_ms != null) {
        return { ...entry, time: liveResults.numpy_ms, isLive: true }
      }
    }
    return entry
  })

  const maxTime = Math.max(...displayData.map((d) => d.time)) * 1.05

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3">
        {displayData.map((entry, i) => {
          const widthPct = (entry.time / maxTime) * animProgress * 100
          const delay = i * 80

          return (
            <div key={entry.name} className="flex items-center gap-3">
              {/* Name */}
              <div
                className="text-xs text-right flex-shrink-0 flex items-center gap-1"
                style={{ width: 130, color: entry.isEa ? entry.color : '#9ca3af' }}
              >
                {entry.isEa && (
                  <span className="text-xs" style={{ color: entry.color }}>
                    ★
                  </span>
                )}
                {entry.name}
                {entry.isLive && (
                  <span
                    className="text-xs px-1 rounded"
                    style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', fontSize: 9 }}
                  >
                    LIVE
                  </span>
                )}
              </div>

              {/* Bar */}
              <div className="flex-1 relative h-7 flex items-center">
                <div
                  className="absolute inset-y-0 left-0 rounded-r"
                  style={{
                    background: '#1a1a35',
                    width: '100%',
                    borderRadius: '0 6px 6px 0'
                  }}
                />
                <div
                  className="absolute inset-y-1 left-0 rounded-r transition-all"
                  style={{
                    width: `${widthPct}%`,
                    background: entry.color,
                    borderRadius: '0 4px 4px 0',
                    opacity: entry.isEa ? 1 : 0.7,
                    boxShadow: entry.isEa ? `0 0 12px ${entry.color}66` : 'none',
                    transition: `width ${600 - delay}ms ease-out`,
                    minWidth: widthPct > 0 ? 4 : 0
                  }}
                />
                {/* Time label */}
                <span
                  className="absolute left-2 text-xs font-mono z-10"
                  style={{
                    color: entry.isEa ? '#ffffff' : '#9ca3af',
                    fontSize: 11,
                    fontWeight: entry.isEa ? 600 : 400,
                    mixBlendMode: 'normal',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                  }}
                >
                  {formatTime(entry.time, unit)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs" style={{ color: '#4b5563' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: '#00ff88' }} />
          <span>Eä SIMD</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
          <span>Optimized C++</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: '#ff4444' }} />
          <span>NumPy</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span style={{ color: '#4b5563' }}>shorter = faster</span>
        </div>
      </div>
    </div>
  )
}

function formatTime(time: number, unit: string): string {
  if (unit === 'μs') return `${time} μs`
  if (time < 1) return `${(time * 1000).toFixed(1)} μs`
  if (time >= 1000) return `${(time / 1000).toFixed(2)} s`
  return `${time} ms`
}
