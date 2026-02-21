import { useEffect, useRef, useState } from 'react'

interface SpeedMeterProps {
  speedup: number
  max: number
  vs: string
  unit?: string
  size?: number
}

export default function SpeedMeter({ speedup, max, vs, size = 200 }: SpeedMeterProps) {
  const [animValue, setAnimValue] = useState(1)
  const animRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    // Animate from 1 to speedup over ~1.5s with easeOut
    if (animRef.current) cancelAnimationFrame(animRef.current)
    startRef.current = null
    setAnimValue(1)

    const duration = 1500
    const from = 1
    const to = speedup

    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setAnimValue(from + (to - from) * eased)
      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick)
      }
    }
    animRef.current = requestAnimationFrame(tick)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [speedup])

  // Gauge geometry
  const CX = size / 2
  const CY = size / 2
  const R = size * 0.38
  const SW = size * 0.07
  const CIRC = 2 * Math.PI * R
  const ARC_DEG = 270
  const ARC_LEN = (ARC_DEG / 360) * CIRC
  const GAP_LEN = CIRC - ARC_LEN
  const ROTATION = 135 // degrees; arc starts at 7:30 o'clock

  const normalizedValue = Math.min(Math.max((animValue - 1) / (max - 1), 0), 1)
  const fillLen = normalizedValue * ARC_LEN

  // Needle tip position
  const needleAngleRad = ((ROTATION + normalizedValue * ARC_DEG) * Math.PI) / 180
  const needleTipX = CX + (R - 4) * Math.cos(needleAngleRad)
  const needleTipY = CY + (R - 4) * Math.sin(needleAngleRad)

  // Scale markers
  const markerCount = 5
  const markers = Array.from({ length: markerCount }, (_, i) => {
    const t = i / (markerCount - 1)
    const angle = (ROTATION + t * ARC_DEG) * (Math.PI / 180)
    const val = 1 + t * (max - 1)
    const outerR = R + SW / 2 + 4
    const innerR = R - SW / 2 - 4
    return {
      x1: CX + innerR * Math.cos(angle),
      y1: CY + innerR * Math.sin(angle),
      x2: CX + outerR * Math.cos(angle),
      y2: CY + outerR * Math.sin(angle),
      lx: CX + (outerR + 12) * Math.cos(angle),
      ly: CY + (outerR + 12) * Math.sin(angle),
      val: val < 2 ? '1×' : `${Math.round(val)}×`
    }
  })

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="speedFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00ff88" />
            <stop offset="50%" stopColor="#00cccc" />
            <stop offset="100%" stopColor="#00d4ff" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="needleGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="#1a1a35"
          strokeWidth={SW}
          strokeDasharray={`${ARC_LEN} ${GAP_LEN}`}
          strokeLinecap="round"
          transform={`rotate(${ROTATION}, ${CX}, ${CY})`}
        />

        {/* Dim track ticks */}
        {markers.map((m, i) => (
          <line
            key={i}
            x1={m.x1}
            y1={m.y1}
            x2={m.x2}
            y2={m.y2}
            stroke="#2a2a4a"
            strokeWidth={1.5}
          />
        ))}

        {/* Fill arc */}
        {fillLen > 0 && (
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="url(#speedFill)"
            strokeWidth={SW}
            strokeDasharray={`${fillLen} ${CIRC - fillLen}`}
            strokeLinecap="round"
            transform={`rotate(${ROTATION}, ${CX}, ${CY})`}
            filter="url(#glow)"
            style={{ transition: 'stroke-dasharray 0.05s linear' }}
          />
        )}

        {/* Scale labels */}
        {markers.map((m, i) => (
          <text
            key={i}
            x={m.lx}
            y={m.ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.055}
            fill="#4b5563"
          >
            {m.val}
          </text>
        ))}

        {/* Needle */}
        <line
          x1={CX}
          y1={CY}
          x2={needleTipX}
          y2={needleTipY}
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={2}
          strokeLinecap="round"
          filter="url(#needleGlow)"
        />
        <circle cx={CX} cy={CY} r={6} fill="#1e1e3f" stroke="#ffffff44" strokeWidth={2} />
        <circle cx={CX} cy={CY} r={3} fill="#00ff88" />
      </svg>

      {/* Center text overlay */}
      <div className="speed-center" style={{ width: size }}>
        <div
          style={{
            fontSize: size * 0.22,
            fontWeight: 800,
            color: '#00ff88',
            lineHeight: 1,
            textShadow: '0 0 20px rgba(0,255,136,0.6)',
            letterSpacing: '-1px',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {animValue < 1.5 ? '—' : `${animValue.toFixed(animValue >= 10 ? 0 : 1)}×`}
        </div>
        <div
          style={{
            fontSize: size * 0.07,
            color: '#6b7280',
            marginTop: 2,
            letterSpacing: '0.05em'
          }}
        >
          FASTER
        </div>
        <div
          style={{
            fontSize: size * 0.065,
            color: '#4b5563',
            marginTop: 1
          }}
        >
          vs {vs}
        </div>
      </div>
    </div>
  )
}
