import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import TitleBar from './TitleBar'
import { Page } from '../App'
import { SystemInfo } from '../data/types'

interface LayoutProps {
  children: ReactNode
  currentPage: Page
  onNavigate: (page: Page) => void
  systemInfo: SystemInfo | null
}

export default function Layout({ children, currentPage, onNavigate, systemInfo }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: '#07070f' }}>
      <TitleBar systemInfo={systemInfo} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {/* Subtle grid background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 255, 136, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 255, 136, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }}
          />
          <div className="relative z-10 h-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
