import { motion } from 'framer-motion'
import { demos } from '../data/demos'
import { Page } from '../App'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <div
      className="flex flex-col w-56 border-r overflow-y-auto"
      style={{ background: '#05050d', borderColor: '#1a1a35' }}
    >
      {/* Dashboard link */}
      <NavItem
        active={currentPage === 'dashboard'}
        onClick={() => onNavigate('dashboard')}
        icon="⚡"
        label="Dashboard"
        sublabel="All benchmarks"
        highlight
      />

      {/* Separator */}
      <div className="mx-4 my-2 border-t" style={{ borderColor: '#1a1a35' }} />
      <div className="px-4 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>
          Demos
        </span>
      </div>

      {/* Demo links */}
      {demos.map((demo) => (
        <NavItem
          key={demo.id}
          active={currentPage === demo.id}
          onClick={() => onNavigate(demo.id)}
          icon={demo.icon}
          label={demo.title}
          sublabel={`${demo.speedup}× vs ${demo.speedupVs}`}
          categoryColor={demo.categoryColor}
        />
      ))}

      {/* Bottom: GitHub link */}
      <div className="mt-auto">
        <div className="mx-4 my-2 border-t" style={{ borderColor: '#1a1a35' }} />
        <button
          onClick={() => window.api?.openExternal('https://github.com/petlukk/E-')}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs transition-colors"
          style={{ color: '#6b7280' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#00ff88')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
        >
          <span>🔗</span>
          <span>Eä on GitHub</span>
        </button>
      </div>
    </div>
  )
}

interface NavItemProps {
  active: boolean
  onClick: () => void
  icon: string
  label: string
  sublabel: string
  highlight?: boolean
  categoryColor?: string
}

function NavItem({ active, onClick, icon, label, sublabel, highlight, categoryColor }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className="relative w-full flex items-center gap-3 px-3 py-2 mx-0 text-left transition-all group"
      style={{
        background: active
          ? highlight
            ? 'rgba(0, 255, 136, 0.08)'
            : 'rgba(255, 255, 255, 0.04)'
          : 'transparent',
        borderLeft: active
          ? `2px solid ${highlight ? '#00ff88' : categoryColor || '#6366f1'}`
          : '2px solid transparent'
      }}
    >
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-medium truncate"
          style={{
            color: active
              ? highlight
                ? '#00ff88'
                : '#e2e8f0'
              : '#9ca3af',
            transition: 'color 0.15s'
          }}
        >
          {label}
        </div>
        <div className="text-xs truncate mt-0.5" style={{ color: '#4b5563', fontSize: 10 }}>
          {sublabel}
        </div>
      </div>

      {/* Active indicator */}
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-r pointer-events-none"
          style={{ background: `linear-gradient(90deg, ${highlight ? 'rgba(0,255,136,0.05)' : categoryColor + '10'}, transparent)` }}
          transition={{ duration: 0.2 }}
        />
      )}
    </button>
  )
}
