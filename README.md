# Eä Performance Showcase

A desktop application showcasing [Eä](https://github.com/petlukk/E-), the SIMD kernel language, with real benchmark comparisons against NumPy and OpenCV.

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

## Running

### Windows (portable)
Extract `Ea-Performance-Showcase-Windows-x64.zip` and run `Eä Performance Showcase.exe`.

### Linux
```bash
chmod +x "Eä Performance Showcase-1.0.0.AppImage"
./"Eä Performance Showcase-1.0.0.AppImage"
```

## Live Benchmarks

For live benchmark execution, install:
```bash
pip install numpy
```

For live Eä benchmarks (Eä compiler required):
```bash
cargo install --git https://github.com/petlukk/E- --tag v0.4.0
```

## Development

```bash
npm install
npm run dev          # Development mode
npm run build:linux  # Build Linux AppImage
npm run build:win    # Build Windows (requires Wine on Linux)
```

### Tech Stack
- **Electron 30** + **Vite 5** + **React 18** + **TypeScript**
- **Tailwind CSS** dark theme with neon green accents
- **Framer Motion** for animations
- Custom SVG speedometer gauge
- Python + ctypes for live Eä benchmark execution
