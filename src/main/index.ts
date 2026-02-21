import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn, execSync } from 'child_process'
import { readdirSync } from 'fs'

// ─── Platform detection ───────────────────────────────────────────────────────
const IS_WIN = process.platform === 'win32'

/**
 * Find MSVC link.exe directory so ea.exe can link shared libraries on Windows.
 * Checks vswhere first, then falls back to known VS2022 paths.
 */
function findMsvcLinkerDir(): string | null {
  if (!IS_WIN) return null

  // vswhere ships with every VS2017+ installer
  const vsWherePaths = [
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe',
    'C:\\Program Files\\Microsoft Visual Studio\\Installer\\vswhere.exe',
  ]
  for (const vsWhere of vsWherePaths) {
    if (existsSync(vsWhere)) {
      try {
        const installPath = execSync(
          `"${vsWhere}" -latest -property installationPath`,
          { timeout: 5000, stdio: 'pipe' }
        ).toString().trim()
        // Glob the MSVC version dir
        const msvcRoot = join(installPath, 'VC', 'Tools', 'MSVC')
        if (existsSync(msvcRoot)) {
          const versions = readdirSync(msvcRoot).sort().reverse()
          for (const ver of versions) {
            const linkDir = join(msvcRoot, ver, 'bin', 'HostX64', 'x64')
            if (existsSync(join(linkDir, 'link.exe'))) return linkDir
          }
        }
      } catch { /* continue */ }
    }
  }

  // Hard-coded fallback for VS 2022 Community / BuildTools
  const fallbacks = [
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\VC\\Tools\\MSVC',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\VC\\Tools\\MSVC',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\VC\\Tools\\MSVC',
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Tools\\MSVC',
  ]
  for (const msvcRoot of fallbacks) {
    if (existsSync(msvcRoot)) {
      try {
        const versions = readdirSync(msvcRoot).sort().reverse()
        for (const ver of versions) {
          const linkDir = join(msvcRoot, ver, 'bin', 'HostX64', 'x64')
          if (existsSync(join(linkDir, 'link.exe'))) return linkDir
        }
      } catch { /* continue */ }
    }
  }

  return null
}

/** Find a Python 3 interpreter by checking known install paths. */
function findPython(): string {
  if (!IS_WIN) return 'python3'

  const localAppData = process.env['LOCALAPPDATA'] || ''

  const candidates: string[] = []

  // Standard Python.org per-user installs (most common on Windows)
  for (const ver of ['Python313', 'Python312', 'Python311', 'Python310', 'Python39', 'Python38', 'Python37']) {
    candidates.push(join(localAppData, 'Programs', 'Python', ver, 'python.exe'))
  }

  // System-wide installs
  for (const ver of ['313', '312', '311', '310', '39', '38', '37']) {
    candidates.push(`C:\\Python${ver}\\python.exe`)
    candidates.push(`C:\\Program Files\\Python${ver}\\python.exe`)
  }

  // Windows Store Python stubs
  candidates.push(join(localAppData, 'Microsoft', 'WindowsApps', 'python3.exe'))
  candidates.push(join(localAppData, 'Microsoft', 'WindowsApps', 'python.exe'))

  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return 'python' // last resort — rely on PATH
}

/** Find the ea compiler binary. Returns { path } or null. */
function findEaBinary(): { path: string } | null {
  const ext = IS_WIN ? '.exe' : ''

  // Resources directory (bundled ea binary ships here)
  const resourcesDir = is.dev
    ? join(__dirname, '../../resources')
    : process.resourcesPath

  const candidates: string[] = [
    join(resourcesDir, `ea${ext}`),
    `ea${ext}`,  // in PATH
  ]

  if (IS_WIN) {
    const userProfile = process.env['USERPROFILE'] || ''
    candidates.push(join(userProfile, '.cargo', 'bin', 'ea.exe'))
    // Dev fallback
    candidates.push('C:\\Users\\peter\\Desktop\\EA2\\E-\\target\\release\\ea.exe')
  } else {
    const home = process.env.HOME || '~'
    candidates.push(join(home, '.cargo/bin/ea'))
    candidates.push('/mnt/c/Users/peter/Desktop/EA2/E-/target/release/ea')
    candidates.push(join(home, 'Desktop/EA2/E-/target/release/ea'))
  }

  for (const c of candidates) {
    if (existsSync(c)) return { path: c }
  }
  return null
}

// ─── Window creation ─────────────────────────────────────────────────────────
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#07070f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.ea-lang.showcase')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── Window controls ──────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => BrowserWindow.getFocusedWindow()?.minimize())
ipcMain.on('window-maximize', () => {
  const win = BrowserWindow.getFocusedWindow()
  win?.isMaximized() ? win.unmaximize() : win?.maximize()
})
ipcMain.on('window-close', () => BrowserWindow.getFocusedWindow()?.close())

// ─── Benchmark runner ─────────────────────────────────────────────────────────
/** Returns the bundled run_benchmark.exe path, or null if not present. */
function getBenchmarkExePath(): string | null {
  const name = IS_WIN ? 'run_benchmark.exe' : 'run_benchmark'
  const p = is.dev
    ? join(__dirname, '../../resources', name)
    : join(process.resourcesPath, name)
  return existsSync(p) ? p : null
}

function getBenchmarkScriptPath(): string {
  return is.dev
    ? join(__dirname, '../../benchmarks/run_benchmark.py')
    : join(process.resourcesPath, 'benchmarks/run_benchmark.py')
}

/** Resources directory (dev or production). */
function getResourcesPath(): string {
  return is.dev ? join(__dirname, '../../resources') : process.resourcesPath
}

// ─── System info ─────────────────────────────────────────────────────────────
ipcMain.handle('get-system-info', async () => {
  const ea = findEaBinary()
  const benchExe = getBenchmarkExePath()

  // If the frozen run_benchmark.exe is bundled, Python+NumPy are inside it.
  // No need to spawn anything — report them as available immediately.
  if (benchExe) {
    return {
      python: 'bundled',
      numpy: 'bundled',
      ea: !!ea,
      ea_path: ea?.path ?? null,
      platform: IS_WIN ? 'Windows x64' : 'Linux x64',
      os: IS_WIN ? 'Windows' : 'Linux'
    }
  }

  // Fallback: probe system Python (dev mode without the frozen exe)
  const infoScript = `
import sys, json, platform
result = {
  "python": sys.version.split()[0],
  "numpy": False,
  "ea": ${ea ? 'True' : 'False'},
  "ea_path": ${ea ? `"${ea.path.replace(/\\/g, '\\\\')}"` : 'None'},
  "platform": platform.processor() or platform.machine(),
  "os": platform.system()
}
try:
  import numpy as np
  result["numpy"] = np.__version__
except ImportError:
  pass
print(json.dumps(result))
`

  return new Promise((resolve) => {
    const python = findPython()
    const proc = spawn(python, ['-c', infoScript])

    let out = ''
    proc.stdout.on('data', (d) => (out += d))
    proc.on('close', () => {
      try {
        resolve(JSON.parse(out))
      } catch {
        resolve({
          python: null,
          numpy: false,
          ea: !!ea,
          ea_path: ea?.path ?? null,
          platform: 'Unknown',
          os: IS_WIN ? 'Windows' : 'Linux'
        })
      }
    })
    proc.on('error', () => {
      resolve({
        python: null,
        numpy: false,
        ea: !!ea,
        ea_path: ea?.path ?? null,
        platform: 'Unknown',
        os: IS_WIN ? 'Windows' : 'Linux'
      })
    })
  })
})

// ─── Run benchmark ────────────────────────────────────────────────────────────
ipcMain.handle('run-benchmark', async (_, demoId: string) => {
  const ea = findEaBinary()
  const benchExe = getBenchmarkExePath()

  const env: NodeJS.ProcessEnv = { ...process.env }
  if (ea) env['EA_PATH'] = ea.path

  // Point compile_ea to the pre-compiled kernel DLLs bundled in resources/kernels/.
  // When found, the benchmark script skips runtime compilation entirely —
  // no ea.exe invocation and no linker needed on the user's machine.
  const kernelsDir = join(getResourcesPath(), 'kernels')
  if (existsSync(kernelsDir)) {
    env['EA_KERNELS_DIR'] = kernelsDir
  } else if (IS_WIN) {
    // Dev fallback: no pre-compiled kernels yet, try system MSVC linker
    const linkerDir = findMsvcLinkerDir()
    if (linkerDir) env['EA_LINKER_DIR'] = linkerDir
  }

  // Use frozen exe (no Python required) if available, else fall back to script
  const [cmd, args] = benchExe
    ? [benchExe, ['--demo', demoId, '--format', 'json']]
    : [findPython(), [getBenchmarkScriptPath(), '--demo', demoId, '--format', 'json']]

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { env })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (d) => (stdout += d))
    proc.stderr.on('data', (d) => (stderr += d))

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          const jsonMatch = stdout.match(/(\{[\s\S]*\})\s*$/)
          if (jsonMatch) {
            resolve(JSON.parse(jsonMatch[1]))
          } else {
            reject(new Error('No JSON in output:\n' + stdout.slice(-500)))
          }
        } catch {
          reject(new Error('JSON parse error:\n' + stdout.slice(-500)))
        }
      } else {
        reject(new Error(stderr.slice(-1000) || `Benchmark exited with code ${code}`))
      }
    })

    proc.on('error', (err) => reject(new Error('Failed to spawn process: ' + err.message)))

    setTimeout(() => {
      proc.kill()
      reject(new Error('Benchmark timed out after 3 minutes'))
    }, 180_000)
  })
})

// ─── Open external URL ────────────────────────────────────────────────────────
ipcMain.handle('open-external', async (_, url: string) => {
  await shell.openExternal(url)
})
