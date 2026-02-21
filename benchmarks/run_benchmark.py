#!/usr/bin/env python3
"""
Eä Demo Benchmark Runner
Outputs a single JSON object to stdout with benchmark results.
Usage: python run_benchmark.py --demo <name> [--format json]
       python run_benchmark.py --build-kernels <output_dir>
"""

import argparse
import ctypes
import json
import os
import subprocess
import sys
import tempfile
import time

# ─── Helpers ──────────────────────────────────────────────────────────────────

F32PTR = ctypes.POINTER(ctypes.c_float)
U8PTR  = ctypes.POINTER(ctypes.c_uint8)
I8PTR  = ctypes.POINTER(ctypes.c_int8)
I16PTR = ctypes.POINTER(ctypes.c_int16)

# Last ea compile error captured for diagnostic output
_ea_error = [None]

def median(values):
    s = sorted(values)
    n = len(s)
    return (s[n // 2] + s[(n - 1) // 2]) / 2

def benchmark(fn, warmup=3, runs=20):
    for _ in range(warmup):
        fn()
    times = []
    for _ in range(runs):
        t0 = time.perf_counter()
        fn()
        times.append((time.perf_counter() - t0) * 1000)  # ms
    return round(median(times), 3)

def find_ea():
    """Find the Eä compiler binary. Returns path or None."""
    is_win = sys.platform == "win32"
    ext = ".exe" if is_win else ""

    env_path = os.environ.get("EA_PATH")
    candidates = [env_path] if env_path else []

    cargo_bin = os.path.join(os.path.expanduser("~"), ".cargo", "bin", f"ea{ext}")
    candidates += [f"ea{ext}", cargo_bin]

    here = os.path.dirname(os.path.abspath(__file__))
    for relpath in [
        f"../resources/ea{ext}",
        f"../../resources/ea{ext}",
        f"../../target/release/ea{ext}",
        f"../EA2/E-/target/release/ea{ext}",
        f"../../EA2/E-/target/release/ea{ext}",
    ]:
        candidates.append(os.path.normpath(os.path.join(here, relpath)))

    if is_win:
        candidates.append(r"C:\Users\peter\Desktop\EA2\E-\target\release\ea.exe")
    else:
        candidates.append("/mnt/c/Users/peter/Desktop/EA2/E-/target/release/ea")
        candidates.append(os.path.expanduser("~/Desktop/EA2/E-/target/release/ea"))

    for c in candidates:
        if c and os.path.isfile(c):
            return c
    return None


def get_precompiled_dll(name):
    """Return path to a pre-compiled kernel DLL/SO if bundled, else None.

    Electron main sets EA_KERNELS_DIR to the resources/kernels/ directory
    that was populated at build time. When present we skip runtime compilation
    entirely — no ea.exe, no linker required on the user's machine.
    """
    kernels_dir = os.environ.get("EA_KERNELS_DIR", "").strip()
    if not kernels_dir:
        return None
    suffix = ".dll" if sys.platform == "win32" else ".so"
    path = os.path.join(kernels_dir, name + suffix)
    return path if os.path.isfile(path) else None


def compile_ea(ea_bin, source_code):
    """Compile Eä source to a shared library (dev / fallback path).

    Output: .so on Linux/macOS, .dll on Windows.
    The ea compiler outputs to CWD named after the source file,
    so we use a temp directory as both home for source and output.
    """
    if ea_bin is None:
        return None

    suffix = ".dll" if sys.platform == "win32" else ".so"

    # On Windows, ea.exe needs MSVC link.exe in PATH to produce .dll files.
    # EA_LINKER_DIR is injected by Electron main. Prepend it to PATH now so
    # ea.exe (and any child processes it spawns) can find link.exe.
    run_env = None
    if sys.platform == "win32":
        linker_dir = os.environ.get("EA_LINKER_DIR", "").strip()
        if linker_dir:
            # Build a clean env dict preserving the correct PATH key case
            run_env = dict(os.environ)
            path_key = next((k for k in run_env if k.upper() == "PATH"), "PATH")
            run_env[path_key] = linker_dir + ";" + run_env.get(path_key, "")

    try:
        tmpdir = tempfile.mkdtemp()
        src_path = os.path.join(tmpdir, "kernel.ea")
        out_path = os.path.join(tmpdir, "kernel" + suffix)

        with open(src_path, "w") as f:
            f.write(source_code)

        result = subprocess.run(
            [ea_bin, src_path, "--lib"],
            capture_output=True, timeout=30,
            cwd=tmpdir,
            env=run_env  # None = inherit; set on Windows to add linker dir
        )

        if result.returncode == 0 and os.path.exists(out_path):
            return out_path

        if result.returncode != 0:
            stderr = result.stderr.decode(errors="replace")
            stdout = result.stdout.decode(errors="replace")
            _ea_error[0] = (stderr or stdout).strip()[:400]
            print(f"[ea compile error]:\n{_ea_error[0]}", file=sys.stderr)

        # In case the compiler names output differently, scan tmpdir
        for f in os.listdir(tmpdir):
            if f.endswith(suffix):
                return os.path.join(tmpdir, f)

        return None
    except Exception as e:
        print(f"[compile_ea error]: {e}", file=sys.stderr)
        return None


# ─── Kernel sources (used for both runtime compile and --build-kernels) ───────

KERNEL_SOURCES = {
    "sobel": """\
export func sobel(
    input: *restrict f32,
    out: *mut f32,
    width: i32,
    height: i32
) {
    let vzero: f32x4 = splat(0.0)
    let vtwo: f32x4 = splat(2.0)

    let mut y: i32 = 1
    while y < height - 1 {
        let row_above: i32 = (y - 1) * width
        let row_curr: i32 = y * width
        let row_below: i32 = (y + 1) * width
        let mut x: i32 = 1

        while x + 4 <= width - 1 {
            let r0a: f32x4 = load(input, row_above + x - 1)
            let r0b: f32x4 = load(input, row_above + x)
            let r0c: f32x4 = load(input, row_above + x + 1)

            let r1a: f32x4 = load(input, row_curr + x - 1)
            let r1c: f32x4 = load(input, row_curr + x + 1)

            let r2a: f32x4 = load(input, row_below + x - 1)
            let r2b: f32x4 = load(input, row_below + x)
            let r2c: f32x4 = load(input, row_below + x + 1)

            let gx: f32x4 = (r0c .- r0a) .+ (r1c .- r1a) .* vtwo .+ (r2c .- r2a)
            let gy: f32x4 = (r2a .- r0a) .+ (r2b .- r0b) .* vtwo .+ (r2c .- r0c)

            let abs_gx: f32x4 = select(gx .< vzero, vzero .- gx, gx)
            let abs_gy: f32x4 = select(gy .< vzero, vzero .- gy, gy)

            store(out, row_curr + x, abs_gx .+ abs_gy)
            x = x + 4
        }

        while x < width - 1 {
            let r0a: f32 = input[row_above + x - 1]
            let r0b: f32 = input[row_above + x]
            let r0c: f32 = input[row_above + x + 1]
            let r1a: f32 = input[row_curr + x - 1]
            let r1c: f32 = input[row_curr + x + 1]
            let r2a: f32 = input[row_below + x - 1]
            let r2b: f32 = input[row_below + x]
            let r2c: f32 = input[row_below + x + 1]

            let gx: f32 = (r0c - r0a) + (r1c - r1a) * 2.0 + (r2c - r2a)
            let gy: f32 = (r2a - r0a) + (r2b - r0b) * 2.0 + (r2c - r0c)

            let mut abs_gx: f32 = gx
            if gx < 0.0 { abs_gx = 0.0 - gx }
            let mut abs_gy: f32 = gy
            if gy < 0.0 { abs_gy = 0.0 - gy }

            out[row_curr + x] = abs_gx + abs_gy
            x = x + 1
        }

        y = y + 1
    }
}
""",

    "video": """\
export func anomaly_count_fused(a: *restrict f32, b: *restrict f32, len: i32, thresh: f32) -> f32 {
    let vzero: f32x8 = splat(0.0)
    let vone: f32x8 = splat(1.0)
    let vthresh: f32x8 = splat(thresh)
    let mut acc0: f32x8 = splat(0.0)
    let mut acc1: f32x8 = splat(0.0)
    let mut i: i32 = 0
    while i + 16 <= len {
        let va0: f32x8 = load(a, i)
        let vb0: f32x8 = load(b, i)
        let diff0: f32x8 = va0 .- vb0
        let abs0: f32x8 = select(diff0 .< vzero, vzero .- diff0, diff0)
        let mask0: f32x8 = select(abs0 .> vthresh, vone, vzero)
        acc0 = acc0 .+ mask0

        let va1: f32x8 = load(a, i + 8)
        let vb1: f32x8 = load(b, i + 8)
        let diff1: f32x8 = va1 .- vb1
        let abs1: f32x8 = select(diff1 .< vzero, vzero .- diff1, diff1)
        let mask1: f32x8 = select(abs1 .> vthresh, vone, vzero)
        acc1 = acc1 .+ mask1

        i = i + 16
    }
    let mut total: f32 = reduce_add(acc0 .+ acc1)
    while i < len {
        let d: f32 = a[i] - b[i]
        let mut abs_d: f32 = d
        if d < 0.0 { abs_d = 0.0 - d }
        if abs_d > thresh {
            total = total + 1.0
        }
        i = i + 1
    }
    return total
}
""",

    "astronomy": """\
export func accumulate_f32x8(acc: *mut f32, frame: *restrict f32, len: i32) {
    let mut i: i32 = 0
    while i + 8 <= len {
        let va: f32x8 = load(acc, i)
        let vf: f32x8 = load(frame, i)
        store(acc, i, va .+ vf)
        i = i + 8
    }
    while i < len {
        acc[i] = acc[i] + frame[i]
        i = i + 1
    }
}

export func scale_f32x8(data: *restrict f32, out: *mut f32, len: i32, factor: f32) {
    let vfactor: f32x8 = splat(factor)
    let mut i: i32 = 0
    while i + 8 <= len {
        let v: f32x8 = load(data, i)
        store(out, i, v .* vfactor)
        i = i + 8
    }
    while i < len {
        out[i] = data[i] * factor
        i = i + 1
    }
}
""",

    "mnist": """\
export func preprocess_fused(
    input: *restrict f32,
    out: *mut f32,
    len: i32,
    scale: f32,
    mean: f32,
    inv_std: f32
) {
    let vscale: f32x8 = splat(scale)
    let vmean: f32x8 = splat(mean)
    let vinv_std: f32x8 = splat(inv_std)
    let vzero: f32x8 = splat(0.0)
    let vone: f32x8 = splat(1.0)
    let mut i: i32 = 0
    while i + 8 <= len {
        let v: f32x8 = load(input, i)
        let norm: f32x8 = v .* vscale

        let centered: f32x8 = norm .- vmean
        let scaled: f32x8 = centered .* vinv_std

        let clamped_lo: f32x8 = select(scaled .< vzero, vzero, scaled)
        let clamped: f32x8 = select(clamped_lo .> vone, vone, clamped_lo)

        store(out, i, clamped)
        i = i + 8
    }
    while i < len {
        let norm: f32 = input[i] * scale
        let std_val: f32 = (norm - mean) * inv_std
        let mut result: f32 = std_val
        if result < 0.0 { result = 0.0 }
        if result > 1.0 { result = 1.0 }
        out[i] = result
        i = i + 1
    }
}
""",

    "pixel": """\
export func threshold_u8x16(src: *u8, dst: *mut u8, n: i32, thresh: u8) {
    let mut i: i32 = 0
    let t: u8x16 = splat(thresh)
    let ff: u8x16 = splat(255)
    let zero: u8x16 = splat(0)
    while i < n {
        let chunk: u8x16 = load(src, i)
        let result: u8x16 = select(chunk .> t, ff, zero)
        store(dst, i, result)
        i = i + 16
    }
}
""",

    "conv2d": """\
export func conv2d_3x3_u8i8(src: *u8, wt: *i8, dst: *mut i16, H: i32, W: i32, C_in: i32) {
    let stride: i32 = (W + 2) * C_in
    let mut row: i32 = 0
    while row < H {
        let mut col: i32 = 0
        while col < W {
            let mut acc0: i16x8 = splat(0)
            let mut acc1: i16x8 = splat(0)
            let mut dr: i32 = 0
            while dr < 3 {
                let mut dc: i32 = 0
                while dc < 3 {
                    let src_off: i32 = (row + dr) * stride + (col + dc) * C_in
                    let wt_off: i32 = (dr * 3 + dc) * C_in
                    let mut ci: i32 = 0
                    while ci < C_in {
                        let a0: u8x16 = load(src, src_off + ci)
                        let b0: i8x16 = load(wt, wt_off + ci)
                        acc0 = acc0 .+ maddubs_i16(a0, b0)
                        let a1: u8x16 = load(src, src_off + ci + 16)
                        let b1: i8x16 = load(wt, wt_off + ci + 16)
                        acc1 = acc1 .+ maddubs_i16(a1, b1)
                        ci = ci + 32
                    }
                    dc = dc + 1
                }
                dr = dr + 1
            }
            let s: i16 = reduce_add(acc0) + reduce_add(acc1)
            dst[row * W + col] = s
            col = col + 1
        }
        row = row + 1
    }
}
""",

    "reduction": """\
export func sum_f32x8(data: *restrict f32, len: i32) -> f32 {
    let mut acc: f32x8 = splat(0.0)
    let mut i: i32 = 0
    while i + 8 <= len {
        let v: f32x8 = load(data, i)
        acc = acc .+ v
        i = i + 8
    }
    let mut total: f32 = reduce_add(acc)
    while i < len {
        total = total + data[i]
        i = i + 1
    }
    return total
}

export func max_f32x4(data: *restrict f32, len: i32) -> f32 {
    let mut acc0: f32x4 = load(data, 0)
    let mut acc1: f32x4 = load(data, 0)
    let mut i: i32 = 4
    while i + 8 <= len {
        let v0: f32x4 = load(data, i)
        let v1: f32x4 = load(data, i + 4)
        acc0 = select(acc0 .> v0, acc0, v0)
        acc1 = select(acc1 .> v1, acc1, v1)
        i = i + 8
    }
    let mut acc: f32x4 = select(acc0 .> acc1, acc0, acc1)
    while i + 4 <= len {
        let v: f32x4 = load(data, i)
        acc = select(acc .> v, acc, v)
        i = i + 4
    }
    let mut result: f32 = reduce_max(acc)
    while i < len {
        if data[i] > result {
            result = data[i]
        }
        i = i + 1
    }
    return result
}
""",
}


# ─── Demo benchmarks ──────────────────────────────────────────────────────────

def bench_sobel():
    try:
        import numpy as np
    except ImportError:
        return {"error": "NumPy not installed. Run: pip install numpy"}

    H, W = 1080, 1920
    img = np.random.rand(H, W).astype(np.float32)

    def numpy_sobel():
        gx = (img[:-2, 2:] - img[:-2, :-2]
              + 2.0 * (img[1:-1, 2:] - img[1:-1, :-2])
              + img[2:, 2:] - img[2:, :-2])
        gy = (img[2:, :-2] - img[:-2, :-2]
              + 2.0 * (img[2:, 1:-1] - img[:-2, 1:-1])
              + img[2:, 2:] - img[:-2, 2:])
        return np.abs(gx) + np.abs(gy)

    numpy_ms = benchmark(numpy_sobel)

    ea_ms = None
    ea_available = False

    so = get_precompiled_dll("sobel") or compile_ea(find_ea(), KERNEL_SOURCES["sobel"])
    if so:
        try:
            lib = ctypes.CDLL(so)
            lib.sobel.argtypes = [F32PTR, F32PTR, ctypes.c_int32, ctypes.c_int32]
            lib.sobel.restype = None

            flat_in  = np.ascontiguousarray(img, dtype=np.float32)
            flat_out = np.zeros_like(flat_in)
            in_ptr  = flat_in.ctypes.data_as(F32PTR)
            out_ptr = flat_out.ctypes.data_as(F32PTR)

            def ea_fn():
                lib.sobel(in_ptr, out_ptr, ctypes.c_int32(W), ctypes.c_int32(H))

            ea_ms = benchmark(ea_fn)
            ea_available = True
        except Exception as e:
            _ea_error[0] = str(e)
            print(f"[sobel ea load error]: {e}", file=sys.stderr)

    speedup = round(numpy_ms / ea_ms, 1) if ea_ms else None

    return {
        "demo": "sobel",
        "numpy_ms": numpy_ms,
        "ea_ms": ea_ms,
        "ea_available": ea_available,
        "speedup": speedup,
        "reference": {
            "ea_ms": 3.1,
            "numpy_ms": 28.9,
            "speedup": 9.4,
            "cpu": "AMD Ryzen 7 1700"
        }
    }


def bench_video():
    try:
        import numpy as np
    except ImportError:
        return {"error": "NumPy not installed"}

    H, W = 576, 768
    N = H * W
    prev = np.random.rand(N).astype(np.float32) * 200
    curr = np.random.rand(N).astype(np.float32) * 200
    threshold = 30.0

    def numpy_fn():
        diff = np.abs(curr - prev)
        return int(np.sum(diff > threshold))

    numpy_ms = benchmark(numpy_fn)

    ea_ms = None
    ea_available = False

    so = get_precompiled_dll("video") or compile_ea(find_ea(), KERNEL_SOURCES["video"])
    if so:
        try:
            lib = ctypes.CDLL(so)
            lib.anomaly_count_fused.argtypes = [F32PTR, F32PTR, ctypes.c_int32, ctypes.c_float]
            lib.anomaly_count_fused.restype = ctypes.c_float

            prev_c = np.ascontiguousarray(prev)
            curr_c = np.ascontiguousarray(curr)
            prev_ptr = prev_c.ctypes.data_as(F32PTR)
            curr_ptr = curr_c.ctypes.data_as(F32PTR)

            def ea_fn():
                lib.anomaly_count_fused(prev_ptr, curr_ptr, ctypes.c_int32(N), ctypes.c_float(threshold))

            ea_ms = benchmark(ea_fn)
            ea_available = True
        except Exception as e:
            _ea_error[0] = str(e)
            print(f"[video ea load error]: {e}", file=sys.stderr)

    speedup = round(numpy_ms / ea_ms, 1) if ea_ms else None

    return {
        "demo": "video",
        "numpy_ms": numpy_ms,
        "ea_ms": ea_ms,
        "ea_available": ea_available,
        "speedup": speedup,
        "reference": {
            "ea_ms": 0.08,
            "numpy_ms": 1.1,
            "speedup": 13.7,
            "cpu": "AMD Ryzen 7 1700"
        }
    }


def bench_astronomy():
    try:
        import numpy as np
    except ImportError:
        return {"error": "NumPy not installed"}

    N_FRAMES = 16
    H, W = 512, 512
    N_PIX = H * W

    frames = [np.random.rand(N_PIX).astype(np.float32) for _ in range(N_FRAMES)]

    def numpy_fn():
        stack = np.stack(frames)
        return np.mean(stack, axis=0)

    numpy_ms = benchmark(numpy_fn, warmup=2, runs=10)

    ea_ms = None
    ea_available = False

    so = get_precompiled_dll("astronomy") or compile_ea(find_ea(), KERNEL_SOURCES["astronomy"])
    if so:
        try:
            lib = ctypes.CDLL(so)
            lib.accumulate_f32x8.argtypes = [F32PTR, F32PTR, ctypes.c_int32]
            lib.accumulate_f32x8.restype = None
            lib.scale_f32x8.argtypes = [F32PTR, F32PTR, ctypes.c_int32, ctypes.c_float]
            lib.scale_f32x8.restype = None

            acc = np.zeros(N_PIX, dtype=np.float32)
            out_np = np.zeros(N_PIX, dtype=np.float32)
            frame_arrs = [np.ascontiguousarray(f) for f in frames]

            acc_ptr  = acc.ctypes.data_as(F32PTR)
            out_ptr  = out_np.ctypes.data_as(F32PTR)
            frame_ptrs = [f.ctypes.data_as(F32PTR) for f in frame_arrs]

            def ea_fn():
                acc[:] = 0.0
                for fp in frame_ptrs:
                    lib.accumulate_f32x8(acc_ptr, fp, ctypes.c_int32(N_PIX))
                lib.scale_f32x8(acc_ptr, out_ptr, ctypes.c_int32(N_PIX), ctypes.c_float(1.0 / N_FRAMES))

            ea_ms = benchmark(ea_fn, warmup=2, runs=10)
            ea_available = True
        except Exception as e:
            _ea_error[0] = str(e)
            print(f"[astro ea error]: {e}", file=sys.stderr)

    speedup = round(numpy_ms / ea_ms, 1) if ea_ms else None

    return {
        "demo": "astronomy",
        "numpy_ms": numpy_ms,
        "ea_ms": ea_ms,
        "ea_available": ea_available,
        "speedup": speedup,
        "reference": {
            "ea_ms": 6.2,
            "numpy_ms": 39.0,
            "speedup": 6.3,
            "cpu": "AMD Ryzen 7 1700"
        }
    }


def bench_mnist():
    try:
        import numpy as np
    except ImportError:
        return {"error": "NumPy not installed"}

    N = 1000
    H, W = 28, 28
    images = np.random.randint(0, 256, (N, H * W), dtype=np.uint8)
    mean = 0.1307
    std  = 0.3081

    def numpy_fn():
        x = images.astype(np.float32) / 255.0
        x = (x - mean) / std
        return np.clip(x, 0.0, 1.0)

    numpy_ms = benchmark(numpy_fn)

    ea_ms = None
    ea_available = False

    so = get_precompiled_dll("mnist") or compile_ea(find_ea(), KERNEL_SOURCES["mnist"])
    if so:
        try:
            lib = ctypes.CDLL(so)
            lib.preprocess_fused.argtypes = [
                F32PTR, F32PTR, ctypes.c_int32,
                ctypes.c_float, ctypes.c_float, ctypes.c_float
            ]
            lib.preprocess_fused.restype = None

            input_f32 = np.ascontiguousarray(images.flatten(), dtype=np.float32)
            N_total = N * H * W
            out_np = np.zeros(N_total, dtype=np.float32)
            in_ptr  = input_f32.ctypes.data_as(F32PTR)
            out_ptr = out_np.ctypes.data_as(F32PTR)

            def ea_fn():
                lib.preprocess_fused(
                    in_ptr, out_ptr, ctypes.c_int32(N_total),
                    ctypes.c_float(1.0 / 255.0),
                    ctypes.c_float(mean),
                    ctypes.c_float(1.0 / std)
                )

            ea_ms = benchmark(ea_fn)
            ea_available = True
        except Exception as e:
            _ea_error[0] = str(e)
            print(f"[mnist ea error]: {e}", file=sys.stderr)

    speedup = round(numpy_ms / ea_ms, 1) if ea_ms else None

    return {
        "demo": "mnist",
        "numpy_ms": numpy_ms,
        "ea_ms": ea_ms,
        "ea_available": ea_available,
        "speedup": speedup,
        "reference": {
            "ea_ms": 39,
            "numpy_ms": 470,
            "speedup": 12.0,
            "cpu": "AMD Ryzen 7 1700"
        },
        "extra": {"note": "N=1000 images (reference uses 60,000)"}
    }


def bench_pixel():
    try:
        import numpy as np
    except ImportError:
        return {"error": "NumPy not installed"}

    N = 4096 * 4096  # multiple of 16 — required by u8x16 kernel
    image = np.random.randint(0, 256, N, dtype=np.uint8)
    threshold = 128

    def numpy_fn():
        return np.where(image > threshold, np.uint8(255), np.uint8(0))

    numpy_ms = benchmark(numpy_fn)

    ea_ms = None
    ea_available = False

    so = get_precompiled_dll("pixel") or compile_ea(find_ea(), KERNEL_SOURCES["pixel"])
    if so:
        try:
            lib = ctypes.CDLL(so)
            lib.threshold_u8x16.argtypes = [U8PTR, U8PTR, ctypes.c_int32, ctypes.c_uint8]
            lib.threshold_u8x16.restype = None

            src_c  = np.ascontiguousarray(image)
            out_np = np.empty(N, dtype=np.uint8)
            src_ptr = src_c.ctypes.data_as(U8PTR)
            dst_ptr = out_np.ctypes.data_as(U8PTR)

            def ea_fn():
                lib.threshold_u8x16(src_ptr, dst_ptr, ctypes.c_int32(N), ctypes.c_uint8(threshold))

            ea_ms = benchmark(ea_fn)
            ea_available = True
        except Exception as e:
            _ea_error[0] = str(e)
            print(f"[pixel ea error]: {e}", file=sys.stderr)

    speedup = round(numpy_ms / ea_ms, 1) if ea_ms else None

    return {
        "demo": "pixel",
        "numpy_ms": numpy_ms,
        "ea_ms": ea_ms,
        "ea_available": ea_available,
        "speedup": speedup,
        "reference": {
            "ea_ms": 0.48,
            "numpy_ms": 10.1,
            "speedup": 21,
            "cpu": "AMD Ryzen 7 1700"
        }
    }


def bench_conv2d():
    try:
        import numpy as np
    except ImportError:
        return {"error": "NumPy not installed"}

    H, W, C = 56, 56, 32  # C must be multiple of 16
    src = np.random.randint(0, 128, ((H + 2) * (W + 2) * C), dtype=np.uint8)
    wt  = np.random.randint(-64, 64, (9 * C), dtype=np.int8)

    def numpy_conv():
        src3 = src.astype(np.int32).reshape(H + 2, W + 2, C)
        wt3  = wt.astype(np.int32).reshape(3, 3, C)
        acc  = np.zeros((H, W), dtype=np.int32)
        for dr in range(3):
            for dc in range(3):
                acc += (src3[dr:dr + H, dc:dc + W, :] * wt3[dr, dc, :]).sum(axis=-1)
        return acc.astype(np.int16)

    numpy_ms = benchmark(numpy_conv, warmup=2, runs=10)

    ea_ms = None
    ea_available = False

    so = get_precompiled_dll("conv2d") or compile_ea(find_ea(), KERNEL_SOURCES["conv2d"])
    if so:
        try:
            lib = ctypes.CDLL(so)
            lib.conv2d_3x3_u8i8.argtypes = [
                U8PTR, I8PTR, I16PTR,
                ctypes.c_int32, ctypes.c_int32, ctypes.c_int32
            ]
            lib.conv2d_3x3_u8i8.restype = None

            src_c  = np.ascontiguousarray(src)
            wt_c   = np.ascontiguousarray(wt)
            dst_np = np.zeros(H * W, dtype=np.int16)

            src_ptr = src_c.ctypes.data_as(U8PTR)
            wt_ptr  = wt_c.ctypes.data_as(I8PTR)
            dst_ptr = dst_np.ctypes.data_as(I16PTR)

            def ea_fn():
                lib.conv2d_3x3_u8i8(
                    src_ptr, wt_ptr, dst_ptr,
                    ctypes.c_int32(H), ctypes.c_int32(W), ctypes.c_int32(C)
                )

            ea_ms = benchmark(ea_fn, warmup=3, runs=20)
            ea_available = True
        except Exception as e:
            _ea_error[0] = str(e)
            print(f"[conv2d ea error]: {e}", file=sys.stderr)

    speedup = round(numpy_ms / ea_ms, 1) if ea_ms else None

    return {
        "demo": "conv2d",
        "numpy_ms": numpy_ms,
        "ea_ms": ea_ms,
        "ea_available": ea_available,
        "speedup": speedup,
        "reference": {
            "ea_ms": 18.2,
            "numpy_ms": 868,
            "speedup": 47.7,
            "cpu": "AMD Ryzen 7 1700"
        },
        "extra": {"note": f"C={C} (reference uses C=64)"}
    }


def bench_reduction():
    try:
        import numpy as np
    except ImportError:
        return {"error": "NumPy not installed"}

    N = 1_000_000
    data = np.random.rand(N).astype(np.float32)

    def numpy_sum():
        return float(np.sum(data))

    numpy_sum_us = benchmark(numpy_sum, warmup=5, runs=50) * 1000
    numpy_max_us = benchmark(lambda: float(np.max(data)), warmup=5, runs=50) * 1000

    ea_us = None
    ea_available = False

    so = get_precompiled_dll("reduction") or compile_ea(find_ea(), KERNEL_SOURCES["reduction"])
    if so:
        try:
            lib = ctypes.CDLL(so)
            lib.sum_f32x8.argtypes = [F32PTR, ctypes.c_int32]
            lib.sum_f32x8.restype  = ctypes.c_float
            lib.max_f32x4.argtypes = [F32PTR, ctypes.c_int32]
            lib.max_f32x4.restype  = ctypes.c_float

            data_c   = np.ascontiguousarray(data)
            data_ptr = data_c.ctypes.data_as(F32PTR)
            n_arg    = ctypes.c_int32(N)

            def ea_sum_fn():
                lib.sum_f32x8(data_ptr, n_arg)

            ea_sum_us = benchmark(ea_sum_fn, warmup=5, runs=50) * 1000
            ea_us = ea_sum_us
            ea_available = True
        except Exception as e:
            _ea_error[0] = str(e)
            print(f"[reduction ea error]: {e}", file=sys.stderr)

    speedup = round(numpy_sum_us / ea_us, 2) if ea_us else None

    return {
        "demo": "reduction",
        "numpy_ms": numpy_sum_us,   # unit is μs; name kept for JSON compat
        "ea_ms": ea_us,
        "ea_available": ea_available,
        "speedup": speedup,
        "reference": {
            "ea_ms": 105,     # μs
            "numpy_ms": 110,  # μs
            "speedup": 1.04,
            "cpu": "AMD Ryzen 7 1700"
        }
    }


# ─── Dispatch ─────────────────────────────────────────────────────────────────

BENCHMARKS = {
    "sobel":      bench_sobel,
    "video":      bench_video,
    "astronomy":  bench_astronomy,
    "mnist":      bench_mnist,
    "pixel":      bench_pixel,
    "conv2d":     bench_conv2d,
    "reduction":  bench_reduction,
}


def build_kernels(output_dir):
    """Pre-compile all Eä kernels to DLLs for bundling with the installer.

    Called from build-windows.bat via:
        python run_benchmark.py --build-kernels <output_dir>

    Requires ea.exe (EA_PATH env var or in PATH) and a linker in PATH.
    On the dev machine, vcvars64.bat has already set up link.exe in PATH.
    """
    import shutil
    os.makedirs(output_dir, exist_ok=True)

    ea_bin = find_ea()
    if not ea_bin:
        print("ERROR: Eä compiler not found. Set EA_PATH or install ea.", file=sys.stderr)
        sys.exit(1)

    print(f"  ea binary: {ea_bin}")
    suffix = ".dll" if sys.platform == "win32" else ".so"
    ok = 0

    for name, source in KERNEL_SOURCES.items():
        print(f"  Compiling {name}...", end=" ", flush=True)
        dll = compile_ea(ea_bin, source)
        if dll and os.path.isfile(dll):
            dest = os.path.join(output_dir, name + suffix)
            shutil.copy2(dll, dest)
            print(f"OK -> {dest}")
            ok += 1
        else:
            err = _ea_error[0] or "unknown error"
            print(f"FAILED: {err}")

    print(f"\n  {ok}/{len(KERNEL_SOURCES)} kernels compiled successfully.")
    if ok < len(KERNEL_SOURCES):
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Eä benchmark runner")
    subparsers = parser.add_subparsers(dest="mode")

    # --demo mode (default, used by Electron at runtime)
    run_parser = parser.add_argument_group("run mode")
    parser.add_argument("--demo", choices=list(BENCHMARKS.keys()))
    parser.add_argument("--format", default="json", choices=["json", "text"])

    # --build-kernels mode (used by build-windows.bat)
    parser.add_argument("--build-kernels", metavar="OUTPUT_DIR",
                        help="Pre-compile all kernels to DLLs in OUTPUT_DIR")

    args = parser.parse_args()

    if args.build_kernels:
        build_kernels(args.build_kernels)
        return

    if not args.demo:
        parser.error("--demo is required when not using --build-kernels")

    result = BENCHMARKS[args.demo]()

    if not result.get("ea_available") and _ea_error[0]:
        result["ea_error"] = _ea_error[0]

    if args.format == "json":
        print(json.dumps(result, indent=2))
    else:
        if "error" in result:
            print(f"ERROR: {result['error']}")
        else:
            print(f"Demo: {result['demo']}")
            if result.get("numpy_ms") is not None:
                print(f"NumPy: {result['numpy_ms']} ms")
            if result.get("ea_ms") is not None:
                print(f"Eä:    {result['ea_ms']} ms")
            if result.get("speedup") is not None:
                print(f"Speedup: {result['speedup']}×")

if __name__ == "__main__":
    main()
