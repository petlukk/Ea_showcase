/// <reference types="vite/client" />

declare global {
  interface Window {
    api: {
      getSystemInfo: () => Promise<import('./data/types').SystemInfo>
      runBenchmark: (demoId: string) => Promise<import('./data/types').BenchmarkResult>
      openExternal: (url: string) => Promise<void>
      windowMinimize: () => void
      windowMaximize: () => void
      windowClose: () => void
    }
  }
}

export {}
