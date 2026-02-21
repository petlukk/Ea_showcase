export interface BenchmarkEntry {
  name: string
  time: number
  color: string
  isEa?: boolean
}

export interface FusionScaling {
  ops: number
  numpyMs: number
  eaMs: number
}

export interface Demo {
  id: string
  title: string
  subtitle: string
  category: string
  categoryColor: string
  icon: string
  speedup: number
  speedupVs: string
  altSpeedup?: { value: number; vs: string }
  memoryNote?: string
  testSize: string
  maxSpeedup: number
  plainEnglish: string
  whyItMatters: string
  theScience: string
  benchmarkData: BenchmarkEntry[]
  unit: string
  isFusionDemo?: boolean
  fusionScaling?: FusionScaling[]
  codeEa?: string
  codeNumPy?: string
}

export interface SystemInfo {
  python: string | null
  numpy: string | false
  ea: boolean
  ea_path?: string | null
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
  ea_error?: string
}
