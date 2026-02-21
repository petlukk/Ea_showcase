import { useState } from 'react'
import { BenchmarkResult, SystemInfo } from '../data/types'
import { motion, AnimatePresence } from 'framer-motion'

interface LiveBenchmarkProps {
  demoId: string
  systemInfo: SystemInfo | null
  onResult?: (result: BenchmarkResult) => void
  referenceData: {
    ea_ms: number
    numpy_ms: number
    speedup: number
    cpu: string
  }
}

type BenchState = 'idle' | 'running' | 'done' | 'error'

export default function LiveBenchmark({
  demoId,
  systemInfo,
  onResult,
  referenceData
}: LiveBenchmarkProps) {
  const [state, setState] = useState<BenchState>('idle')
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dots, setDots] = useState('')

  const canRun = !!(systemInfo?.python && systemInfo?.numpy)

  const handleRun = async () => {
    setState('running')
    setError(null)
    setResult(null)

    let d = 0
    const dotsInterval = setInterval(() => {
      d = (d + 1) % 4
      setDots('.'.repeat(d))
    }, 400)

    try {
      const res = await window.api.runBenchmark(demoId)
      setResult(res)
      setState('done')
      onResult?.(res)
    } catch (e) {
      setError(String(e))
      setState('error')
    } finally {
      clearInterval(dotsInterval)
      setDots('')
    }
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: '#0a0a1a', borderColor: '#1a1a35' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: '#1a1a35' }}
      >
        <div>
          <div className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
            Live Benchmark
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
            Runs on your machine — real numbers, right now
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={!canRun || state === 'running'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: canRun
              ? state === 'running'
                ? 'rgba(0,255,136,0.05)'
                : 'rgba(0,255,136,0.12)'
              : 'rgba(100,100,100,0.1)',
            border: `1px solid ${canRun ? 'rgba(0,255,136,0.4)' : '#2a2a4a'}`,
            color: canRun ? '#00ff88' : '#4b5563',
            cursor: canRun && state !== 'running' ? 'pointer' : 'not-allowed'
          }}
        >
          {state === 'running' ? (
            <>
              <Spinner /> Running{dots}
            </>
          ) : (
            <>▶ Run Benchmark</>
          )}
        </button>
      </div>

      {/* Status bar */}
      {!canRun && (
        <div className="px-5 py-2" style={{ background: 'rgba(255,68,68,0.05)' }}>
          <div className="text-xs" style={{ color: '#ef4444' }}>
            {!systemInfo?.python
              ? '⚠ Python not found — install Python 3.x to run live benchmarks'
              : '⚠ NumPy not found — run: pip install numpy'}
          </div>
        </div>
      )}

      {/* Reference data */}
      <div className="px-5 py-4">
        <div className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: '#4b5563' }}>
          Reference Results — {referenceData.cpu}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Eä" value={`${referenceData.ea_ms} ms`} color="#00ff88" dim />
          <StatCard label="NumPy" value={`${referenceData.numpy_ms} ms`} color="#ff4444" dim />
          <StatCard
            label="Speedup"
            value={`${referenceData.speedup}×`}
            color="#00ff88"
            dim
            highlight
          />
        </div>

        {/* Live results */}
        <AnimatePresence>
          {state === 'done' && result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <div
                className="text-xs font-semibold mb-3 uppercase tracking-wider"
                style={{ color: '#00ff88' }}
              >
                Your Machine — {systemInfo?.platform || 'Unknown CPU'}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {result.ea_ms != null && (
                  <StatCard label="Eä" value={`${result.ea_ms.toFixed(1)} ms`} color="#00ff88" live />
                )}
                {result.ea_available === false && (
                  <StatCard label="Eä" value="not available" color="#6b7280" />
                )}
                <StatCard
                  label="NumPy"
                  value={result.numpy_ms != null ? `${result.numpy_ms.toFixed(1)} ms` : 'N/A'}
                  color="#ff4444"
                  live
                />
                <StatCard
                  label="Speedup"
                  value={result.speedup != null ? `${result.speedup.toFixed(1)}×` : 'N/A'}
                  color="#00ff88"
                  live
                  highlight
                />
              </div>

              {result.ea_available === false && (
                <div
                  className="mt-3 px-3 py-2 rounded-lg text-xs"
                  style={{
                    background: 'rgba(245,158,11,0.05)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    color: '#f59e0b'
                  }}
                >
                  {result.ea_error ? (
                    <>⚠ Eä compile error:<br /><span style={{ fontFamily: 'monospace', color: '#ef4444' }}>{result.ea_error}</span></>
                  ) : (
                    <>💡 Eä compiler not found. NumPy benchmark ran successfully.<br />Install Eä: cargo install --git https://github.com/petlukk/E-</>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 px-3 py-2 rounded-lg text-xs"
              style={{
                background: 'rgba(255,68,68,0.05)',
                border: '1px solid rgba(255,68,68,0.2)',
                color: '#ef4444'
              }}
            >
              Error: {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  dim,
  live,
  highlight
}: {
  label: string
  value: string
  color: string
  dim?: boolean
  live?: boolean
  highlight?: boolean
}) {
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{
        background: highlight
          ? live
            ? `rgba(0,255,136,0.1)`
            : `rgba(0,255,136,0.05)`
          : '#0d0d1e',
        border: `1px solid ${highlight ? (live ? 'rgba(0,255,136,0.3)' : 'rgba(0,255,136,0.15)') : '#1a1a35'}`,
        opacity: dim ? 0.6 : 1
      }}
    >
      <div className="text-xs mb-1" style={{ color: '#6b7280' }}>
        {label}
        {live && (
          <span
            className="ml-1 px-1 rounded"
            style={{ background: 'rgba(0,255,136,0.15)', color: '#00ff88', fontSize: 9 }}
          >
            LIVE
          </span>
        )}
      </div>
      <div
        className="text-sm font-bold font-mono"
        style={{ color: color, textShadow: highlight && live ? `0 0 10px ${color}66` : 'none' }}
      >
        {value}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div
      className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
      style={{ borderColor: '#00ff8844', borderTopColor: '#00ff88' }}
    />
  )
}
