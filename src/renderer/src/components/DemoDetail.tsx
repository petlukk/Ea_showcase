import { useState } from 'react'
import { motion } from 'framer-motion'
import { Demo, BenchmarkResult } from '../data/types'
import { SystemInfo } from '../data/types'
import SpeedMeter from './SpeedMeter'
import BenchmarkChart from './BenchmarkChart'
import FusionVisualizer from './FusionVisualizer'
import LiveBenchmark from './LiveBenchmark'

interface DemoDetailProps {
  demo: Demo
  onBack: () => void
  systemInfo: SystemInfo | null
}

export default function DemoDetail({ demo, onBack, systemInfo }: DemoDetailProps) {
  const [liveResult, setLiveResult] = useState<BenchmarkResult | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [showScience, setShowScience] = useState(false)

  const referenceData = {
    ea_ms: demo.benchmarkData.find((d) => d.isEa)?.time ?? 0,
    numpy_ms:
      demo.benchmarkData.find((d) => d.name.toLowerCase().includes('numpy') && !d.isEa)?.time ??
      demo.benchmarkData[demo.benchmarkData.length - 1]?.time ??
      0,
    speedup: demo.speedup,
    cpu: 'AMD Ryzen 7 1700'
  }

  const liveChartResults = liveResult
    ? { numpy_ms: liveResult.numpy_ms, ea_ms: liveResult.ea_ms ?? undefined }
    : null

  return (
    <div className="p-6 min-h-full">
      {/* Back button + breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: '#6b7280' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#00ff88')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
        >
          ← All Demos
        </button>
        <span style={{ color: '#2a2a4a' }}>/</span>
        <span className="text-sm" style={{ color: '#e2e8f0' }}>
          {demo.title}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* ─── Left column: explanation ────────────────────────────────── */}
        <div className="col-span-3 flex flex-col gap-5">
          {/* Title block */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{demo.icon}</span>
              <div>
                <div
                  className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block"
                  style={{
                    background: `${demo.categoryColor}15`,
                    color: demo.categoryColor,
                    border: `1px solid ${demo.categoryColor}30`
                  }}
                >
                  {demo.category}
                </div>
                <h1 className="text-3xl font-black mt-1" style={{ color: '#e2e8f0' }}>
                  {demo.title}
                </h1>
              </div>
            </div>

            {/* Key stat bar */}
            <div className="flex gap-3 mb-5">
              <KeyStat value={`${demo.speedup}×`} label={`faster than ${demo.speedupVs}`} primary />
              {demo.altSpeedup && (
                <KeyStat
                  value={`${demo.altSpeedup.value}×`}
                  label={`faster than ${demo.altSpeedup.vs}`}
                  amber
                />
              )}
              {demo.memoryNote && (
                <KeyStat value={demo.memoryNote} label="memory savings" cyan />
              )}
              <KeyStat value={demo.testSize} label="test size" />
            </div>
          </motion.div>

          {/* Plain English explanation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl p-5 border"
            style={{ background: '#0d0d1e', borderColor: '#1a1a35' }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
              What is this?
            </h3>
            <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#c9d1d9' }}>
              {demo.plainEnglish}
            </div>
          </motion.div>

          {/* Why it matters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl p-5 border"
            style={{ background: '#0d0d1e', borderColor: '#1a1a35' }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
              Why does speed matter here?
            </h3>
            <div className="text-sm leading-relaxed" style={{ color: '#c9d1d9' }}>
              {demo.whyItMatters}
            </div>
          </motion.div>

          {/* Expandable: The Science */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border overflow-hidden"
            style={{ background: '#0d0d1e', borderColor: '#1a1a35' }}
          >
            <button
              onClick={() => setShowScience(!showScience)}
              className="w-full flex items-center justify-between px-5 py-3 text-left transition-all"
              style={{ color: '#9ca3af' }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider">
                🔬 The Science (technical details)
              </span>
              <span style={{ transform: showScience ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▾
              </span>
            </button>
            {showScience && (
              <div className="px-5 pb-4 text-sm leading-relaxed border-t" style={{ borderColor: '#1a1a35', color: '#c9d1d9' }}>
                <div className="mt-3">{demo.theScience}</div>
              </div>
            )}
          </motion.div>

          {/* Code comparison */}
          {(demo.codeEa || demo.codeNumPy) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-xl border overflow-hidden"
              style={{ background: '#0d0d1e', borderColor: '#1a1a35' }}
            >
              <button
                onClick={() => setShowCode(!showCode)}
                className="w-full flex items-center justify-between px-5 py-3 text-left"
                style={{ color: '#9ca3af' }}
              >
                <span className="text-xs font-semibold uppercase tracking-wider">
                  &lt;/&gt; Code Comparison
                </span>
                <span
                  style={{
                    transform: showCode ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s'
                  }}
                >
                  ▾
                </span>
              </button>
              {showCode && (
                <div className="border-t" style={{ borderColor: '#1a1a35' }}>
                  <div className="grid grid-cols-2 divide-x" style={{ borderColor: '#1a1a35' }}>
                    <div className="p-4">
                      <div
                        className="text-xs font-bold mb-2"
                        style={{ color: '#00ff88', fontFamily: 'monospace' }}
                      >
                        Eä ✓
                      </div>
                      <pre
                        className="text-xs leading-relaxed overflow-x-auto"
                        style={{
                          color: '#d4d4d4',
                          fontFamily: "'JetBrains Mono', monospace",
                          background: '#05050f',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #1a1a35'
                        }}
                      >
                        {demo.codeEa}
                      </pre>
                    </div>
                    <div className="p-4" style={{ borderLeftColor: '#1a1a35', borderLeftWidth: 1 }}>
                      <div
                        className="text-xs font-bold mb-2"
                        style={{ color: '#ff6b6b', fontFamily: 'monospace' }}
                      >
                        NumPy (slower)
                      </div>
                      <pre
                        className="text-xs leading-relaxed overflow-x-auto"
                        style={{
                          color: '#d4d4d4',
                          fontFamily: "'JetBrains Mono', monospace",
                          background: '#05050f',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #1a1a35'
                        }}
                      >
                        {demo.codeNumPy}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* ─── Right column: visualizations ────────────────────────────── */}
        <div className="col-span-2 flex flex-col gap-5">
          {/* Speed Meter */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="rounded-xl p-6 border flex flex-col items-center"
            style={{ background: '#0d0d1e', borderColor: '#1a1a35' }}
          >
            <SpeedMeter speedup={demo.speedup} max={demo.maxSpeedup} vs={demo.speedupVs} size={220} />
          </motion.div>

          {/* Benchmark chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl p-5 border"
            style={{ background: '#0d0d1e', borderColor: '#1a1a35' }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: '#6b7280' }}
            >
              Performance Comparison
            </h3>
            <BenchmarkChart
              data={demo.benchmarkData}
              unit={demo.unit}
              liveResults={liveChartResults}
            />
          </motion.div>

          {/* Fusion visualizer (if applicable) */}
          {demo.isFusionDemo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <FusionVisualizer
                fusionScaling={demo.fusionScaling}
                demoId={demo.id}
              />
            </motion.div>
          )}

          {/* Live benchmark */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <LiveBenchmark
              demoId={demo.id}
              systemInfo={systemInfo}
              onResult={setLiveResult}
              referenceData={referenceData}
            />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function KeyStat({
  value,
  label,
  primary,
  amber,
  cyan
}: {
  value: string
  label: string
  primary?: boolean
  amber?: boolean
  cyan?: boolean
}) {
  const color = primary ? '#00ff88' : amber ? '#f59e0b' : cyan ? '#00d4ff' : '#9ca3af'
  const bg = primary
    ? 'rgba(0,255,136,0.08)'
    : amber
    ? 'rgba(245,158,11,0.08)'
    : cyan
    ? 'rgba(0,212,255,0.08)'
    : '#0d0d1e'
  const border = primary
    ? 'rgba(0,255,136,0.2)'
    : amber
    ? 'rgba(245,158,11,0.2)'
    : cyan
    ? 'rgba(0,212,255,0.2)'
    : '#1a1a35'

  return (
    <div
      className="px-3 py-2 rounded-lg"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div
        className="text-lg font-black leading-none"
        style={{ color, textShadow: primary ? '0 0 15px rgba(0,255,136,0.4)' : 'none' }}
      >
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>
        {label}
      </div>
    </div>
  )
}
