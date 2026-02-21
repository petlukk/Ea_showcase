import { useState } from 'react'
import { motion } from 'framer-motion'
import { Demo } from '../data/types'

interface DemoCardProps {
  demo: Demo
  onClick: () => void
  index: number
}

export default function DemoCard({ demo, onClick, index }: DemoCardProps) {
  const [hovered, setHovered] = useState(false)

  const maxBar = demo.benchmarkData[demo.benchmarkData.length - 1]?.time || 1
  const eaBar = demo.benchmarkData.find((d) => d.isEa)

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="w-full text-left rounded-xl border transition-all overflow-hidden"
      style={{
        background: hovered ? '#13132e' : '#0f0f24',
        borderColor: hovered ? `${demo.categoryColor}44` : '#1a1a35',
        boxShadow: hovered ? `0 0 30px ${demo.categoryColor}15, 0 8px 32px rgba(0,0,0,0.3)` : 'none',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Top color strip */}
      <div
        className="h-0.5"
        style={{
          background: hovered
            ? `linear-gradient(90deg, ${demo.categoryColor}, ${demo.categoryColor}44)`
            : 'transparent',
          transition: 'background 0.2s'
        }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{demo.icon}</span>
            <div>
              <div
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: `${demo.categoryColor}15`,
                  color: demo.categoryColor,
                  border: `1px solid ${demo.categoryColor}30`
                }}
              >
                {demo.category}
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div
            style={{
              color: hovered ? demo.categoryColor : '#2a2a4a',
              transition: 'color 0.2s, transform 0.2s',
              transform: hovered ? 'translateX(3px)' : 'translateX(0)'
            }}
          >
            →
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold mb-1" style={{ color: '#e2e8f0' }}>
          {demo.title}
        </h3>
        <p className="text-xs leading-relaxed mb-4" style={{ color: '#6b7280' }}>
          {demo.subtitle}
        </p>

        {/* Big speedup number */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <div
              className="text-4xl font-black"
              style={{
                color: '#00ff88',
                textShadow: hovered ? '0 0 20px rgba(0,255,136,0.5)' : 'none',
                transition: 'text-shadow 0.2s',
                lineHeight: 1
              }}
            >
              {demo.speedup}×
            </div>
            <div className="text-xs mt-1" style={{ color: '#4b5563' }}>
              faster than {demo.speedupVs}
            </div>
          </div>
          {demo.altSpeedup && (
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: '#f59e0b' }}>
                {demo.altSpeedup.value}×
              </div>
              <div className="text-xs" style={{ color: '#4b5563' }}>
                vs {demo.altSpeedup.vs}
              </div>
            </div>
          )}
          {demo.memoryNote && (
            <div className="text-right">
              <div className="text-xs font-semibold" style={{ color: '#00d4ff' }}>
                {demo.memoryNote}
              </div>
            </div>
          )}
        </div>

        {/* Mini bar chart */}
        <div className="flex flex-col gap-1.5">
          {demo.benchmarkData.slice(0, 3).map((entry) => {
            const widthPct = (entry.time / maxBar) * 100
            return (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="text-xs w-12 text-right flex-shrink-0" style={{ color: '#4b5563', fontSize: 9 }}>
                  {entry.name.split(' ')[0]}
                </div>
                <div className="flex-1 h-2 rounded-full" style={{ background: '#1a1a35' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${widthPct}%`,
                      background: entry.color,
                      boxShadow: entry.isEa ? `0 0 6px ${entry.color}88` : 'none'
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Test size */}
        <div className="mt-3 text-xs" style={{ color: '#374151', fontSize: 10 }}>
          {demo.testSize}
        </div>
      </div>
    </motion.button>
  )
}
