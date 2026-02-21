import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import DemoDetail from './components/DemoDetail'
import { demos } from './data/demos'
import { SystemInfo } from './data/types'

export type Page = 'dashboard' | string

declare global {
  interface Window {
    api: {
      getSystemInfo: () => Promise<SystemInfo>
      runBenchmark: (demoId: string) => Promise<import('./data/types').BenchmarkResult>
      openExternal: (url: string) => Promise<void>
      windowMinimize: () => void
      windowMaximize: () => void
      windowClose: () => void
    }
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)

  useEffect(() => {
    window.api?.getSystemInfo().then(setSystemInfo).catch(console.error)
  }, [])

  const currentDemo = demos.find((d) => d.id === currentPage)

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage} systemInfo={systemInfo}>
      <AnimatePresence mode="wait">
        {currentPage === 'dashboard' ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            <Dashboard onSelectDemo={setCurrentPage} systemInfo={systemInfo} />
          </motion.div>
        ) : currentDemo ? (
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            <DemoDetail
              demo={currentDemo}
              onBack={() => setCurrentPage('dashboard')}
              systemInfo={systemInfo}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Layout>
  )
}
