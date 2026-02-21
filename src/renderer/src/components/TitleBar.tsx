import { SystemInfo } from '../data/types'

interface TitleBarProps {
  systemInfo: SystemInfo | null
}

export default function TitleBar({ systemInfo }: TitleBarProps) {
  return (
    <div
      className="titlebar-drag flex items-center justify-between px-4 h-10 border-b"
      style={{ background: '#05050d', borderColor: '#1a1a35', minHeight: 40 }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-3 titlebar-no-drag">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
            style={{
              background: 'rgba(0, 255, 136, 0.15)',
              color: '#00ff88',
              border: '1px solid rgba(0,255,136,0.3)'
            }}
          >
            Eä
          </div>
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
            Performance Showcase
          </span>
        </div>
      </div>

      {/* Center: Status pills */}
      <div className="flex items-center gap-2 titlebar-no-drag">
        {systemInfo ? (
          <>
            <StatusPill
              active={!!systemInfo.python}
              label={systemInfo.python ? `Python ${systemInfo.python}` : 'Python missing'}
              title={systemInfo.python ? `Python ${systemInfo.python}` : 'Python 3 not found'}
            />
            <StatusPill
              active={!!systemInfo.numpy}
              label={systemInfo.numpy ? `NumPy ${systemInfo.numpy}` : 'NumPy missing'}
              title={systemInfo.numpy ? `NumPy ${systemInfo.numpy}` : 'pip install numpy'}
            />
            <StatusPill
              active={systemInfo.ea}
              label={systemInfo.ea ? 'Eä compiler ✓' : 'Eä not found'}
              highlight
              title={
                systemInfo.ea
                  ? `Eä found at: ${systemInfo.ea_path ?? 'PATH'}`
                  : 'Eä compiler not found. Install from github.com/petlukk/E-'
              }
            />
          </>
        ) : (
          <span className="text-xs" style={{ color: '#6b7280' }}>
            Detecting environment…
          </span>
        )}
      </div>

      {/* Right: Window controls */}
      <div className="flex items-center gap-1 titlebar-no-drag">
        <WinButton onClick={() => window.api?.windowMinimize()} color="#f59e0b" title="Minimize">
          <span style={{ fontSize: 12 }}>─</span>
        </WinButton>
        <WinButton onClick={() => window.api?.windowMaximize()} color="#00ff88" title="Maximize">
          <span style={{ fontSize: 12 }}>□</span>
        </WinButton>
        <WinButton onClick={() => window.api?.windowClose()} color="#ff4444" title="Close">
          <span style={{ fontSize: 14 }}>×</span>
        </WinButton>
      </div>
    </div>
  )
}

function StatusPill({
  active,
  label,
  highlight,
  title
}: {
  active: boolean
  label: string
  highlight?: boolean
  title?: string
}) {
  const dotColor = active ? (highlight ? '#00ff88' : '#9ca3af') : '#ff4444'
  const textColor = active ? (highlight ? '#00ff88' : '#9ca3af') : '#ff6b6b'
  const bg = active
    ? highlight
      ? 'rgba(0,255,136,0.1)'
      : 'rgba(30,30,63,0.6)'
    : 'rgba(255,68,68,0.1)'
  const border = active
    ? highlight
      ? 'rgba(0,255,136,0.3)'
      : '#1e1e3f'
    : 'rgba(255,68,68,0.3)'

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs cursor-default"
      style={{ background: bg, border: `1px solid ${border}`, color: textColor }}
      title={title}
    >
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
      {label}
    </div>
  )
}

function WinButton({
  onClick,
  color,
  title,
  children
}: {
  onClick: () => void
  color: string
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-6 rounded flex items-center justify-center transition-all opacity-60 hover:opacity-100"
      style={{ color }}
    >
      {children}
    </button>
  )
}
