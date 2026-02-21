import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getSystemInfo: (): Promise<SystemInfo> => ipcRenderer.invoke('get-system-info'),
  runBenchmark: (demoId: string): Promise<BenchmarkResult> =>
    ipcRenderer.invoke('run-benchmark', demoId),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close')
}

export interface SystemInfo {
  python: string | null
  numpy: string | false
  ea: boolean
  ea_path?: string
  platform: string
  os: string
}

export interface BenchmarkResult {
  demo: string
  numpy_ms?: number
  ea_ms?: number
  ea_available: boolean
  speedup?: number
  reference: {
    ea_ms: number
    numpy_ms: number
    speedup: number
    cpu: string
  }
  extra?: Record<string, unknown>
  error?: string
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
