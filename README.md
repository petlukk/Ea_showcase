# Eä Performance Showcase

A desktop application showcasing [Eä](https://github.com/petlukk/E-), the SIMD kernel language, with real benchmark comparisons against NumPy and OpenCV.

## Download & Install (Windows)

1. Download `Ea-Performance-Showcase-Windows-x64.zip` from [Releases](https://github.com/petlukk/Ea_showcase/releases)
2. Extract and run `Eä Performance Showcase.exe`

No Python, no compiler, no dependencies — everything is bundled.

## Demos

| Demo | Speedup | Category |
|------|---------|----------|
| Sobel Edge Detection | **9.4×** vs NumPy, **4.4×** vs OpenCV | Stencil Kernel |
| Video Anomaly Detection | **13.7×** (fused kernel) | Fused Pipeline |
| Astronomy Image Stacking | **6.3×** + 16× less memory | Streaming Dataset |
| ML Preprocessing Pipeline | **25.2×** (8-op pipeline) | Fused Pipeline |
| Pixel Threshold | **21×** | Streaming Kernel |
| Quantized Conv2D | **47.7×** vs NumPy | Quantized Kernel |
| SIMD Reduction | **Beats optimized C** | Reduction Kernel |

Each demo runs a live benchmark on your machine — Eä SIMD kernel vs NumPy — and shows your actual speedup.

## How It Works

- **Eä kernels** are pre-compiled to native `.dll` files at build time and bundled with the app
- **Python + NumPy** are embedded via PyInstaller — no installation needed
- The benchmark runner loads the DLLs via `ctypes` and compares against NumPy on your CPU

## Building from Source

Requires: Windows 10/11 x64, Visual Studio 2022, LLVM 18 (MSVC build), Node.js, Python 3.9+

```bat
build-windows.bat
```

This builds `ea.exe`, pre-compiles all 7 kernels to DLLs, packages Python into `run_benchmark.exe`, and produces the installer in `dist\`.

### Dev Mode

```bash
npm install
npm run dev
```

### Tech Stack
- **Electron 30** + **Vite 5** + **React 18** + **TypeScript**
- **Tailwind CSS** dark theme with neon green accents
- **Framer Motion** for animations
- Custom SVG speedometer gauge
- Pre-compiled Eä SIMD kernels loaded via `ctypes`
