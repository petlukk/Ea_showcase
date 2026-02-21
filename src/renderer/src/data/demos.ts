import { Demo } from './types'

export const demos: Demo[] = [
  // ─── 1. Sobel Edge Detection ──────────────────────────────────────────────
  {
    id: 'sobel',
    title: 'Sobel Edge Detection',
    subtitle: 'Finding outlines in images',
    category: 'Stencil Kernel',
    categoryColor: '#6366f1',
    icon: '🔍',
    speedup: 9.4,
    speedupVs: 'NumPy',
    altSpeedup: { value: 4.4, vs: 'OpenCV' },
    testSize: '1920×1080 image',
    maxSpeedup: 15,

    plainEnglish: `Imagine tracing the outlines of every object in a photo with a pencil. For each pixel, you check if the brightness changes sharply — that means there's an edge there. You compare each pixel to its 8 neighbors, in all directions.

That's Sobel edge detection. It powers everything from Snapchat filters to self-driving car lane detection.`,

    whyItMatters: `This runs on every frame in real-time video processing. At 60fps on a 4K camera feed, you have only 16ms to process each frame. NumPy takes 28.9ms — you'd drop frames. Eä takes 3.1ms — plenty of headroom for everything else.`,

    theScience: `The Sobel operator applies two 3×3 convolution kernels (Gx for horizontal, Gy for vertical edges) across every pixel. Eä uses f32x4 SIMD to process 4 pixels simultaneously, loading each row's pixel neighborhood directly into CPU registers. NumPy creates 3 intermediate arrays in RAM for each operation; Eä keeps all intermediate data in registers and only writes the final result.`,

    benchmarkData: [
      { name: 'Eä', time: 3.1, color: '#00ff88', isEa: true },
      { name: 'OpenCV', time: 8.3, color: '#f59e0b' },
      { name: 'NumPy', time: 28.9, color: '#ff4444' }
    ],
    unit: 'ms',

    codeEa: `fn sobel(src: *restrict f32, dst: *mut f32, w: i32, h: i32) {
  let i: i32 = 0;
  while i + 4 <= (w - 2) * (h - 2) {
    // Load 3 rows simultaneously — stays in L1 cache
    let r0 = load(src, i);
    let r1 = load(src, i + w);
    let r2 = load(src, i + 2*w);

    // Gx: left-right difference (all in registers)
    let gx = fma(splat(2.0), r1, r0) - r2;
    // Gy: top-bottom difference (all in registers)
    let gy = fma(splat(2.0), r0, r1) - r2;

    store(dst, i, gx * gx + gy * gy);
    i = i + 4;
  }
  // No intermediate arrays — just registers
}`,

    codeNumPy: `def sobel_numpy(image):
    # Creates NEW array in RAM (full image size)
    Gx = (image[:-2, :-2] + 2*image[1:-1, :-2]
         + image[2:, :-2] - image[:-2, 2:]
         - 2*image[1:-1, 2:] - image[2:, 2:])

    # Creates ANOTHER new array in RAM
    Gy = (image[:-2, :-2] + 2*image[:-2, 1:-1]
         + image[:-2, 2:] - image[2:, :-2]
         - 2*image[2:, 1:-1] - image[2:, 2:])

    # Creates YET ANOTHER array in RAM
    return np.sqrt(Gx**2 + Gy**2)
# → 4 full image passes through RAM`
  },

  // ─── 2. Video Anomaly (Fusion) ────────────────────────────────────────────
  {
    id: 'video',
    title: 'Video Anomaly Detection',
    subtitle: 'Kernel fusion: 13.7× faster with one trick',
    category: 'Fused Pipeline',
    categoryColor: '#ec4899',
    icon: '🎬',
    speedup: 13.7,
    speedupVs: 'NumPy',
    testSize: '768×576 video frame',
    maxSpeedup: 20,
    isFusionDemo: true,

    plainEnglish: `Security cameras need to detect motion automatically: is something happening in this frame that wasn't there before? The simplest way: compare each pixel to the previous frame, flag pixels that changed a lot, count how many changed.

Three simple operations. NumPy does them one at a time — three trips through memory. Eä does all three while reading each pixel once.`,

    whyItMatters: `This runs on every frame in every security camera, video conferencing "background removal" system, and traffic monitoring algorithm. At scale (thousands of cameras), the difference between 1.1ms and 0.08ms per frame is millions of dollars in hardware costs.`,

    theScience: `Three operations: abs(curr - prev), apply threshold, count changed pixels. Run separately (unfused), Eä was actually SLOWER than NumPy — the overhead outweighed the gains. Fused into one kernel: all three ops execute on each pixel before moving to the next. Data stays in CPU registers for the entire pipeline. NumPy writes 3 full frames to RAM (3 × 1.7 MB = 5 MB of writes); Eä writes zero until the final count.`,

    benchmarkData: [
      { name: 'Eä (fused)', time: 0.08, color: '#00ff88', isEa: true },
      { name: 'OpenCV', time: 0.97, color: '#f59e0b' },
      { name: 'NumPy', time: 1.1, color: '#ff4444' },
      { name: 'Eä (unfused)', time: 1.12, color: '#9ca3af' }
    ],
    unit: 'ms',

    codeEa: `fn detect_fused(
  prev: *restrict f32,  curr: *restrict f32,
  out_count: *mut i32,  n: i32,  thresh: f32
) {
  let count: i32 = 0;
  let i: i32 = 0;
  let tv = splat(thresh);

  while i + 4 <= n {
    let p = load(prev, i);
    let c = load(curr, i);

    // All 3 operations — everything stays in registers:
    let diff = abs(c - p);           // op 1: difference
    let mask = diff > tv;            // op 2: threshold
    count = count + reduce_add(mask);// op 3: count

    i = i + 4;
  }
  store(out_count, 0, count);
  // Only 1 write to RAM — at the very end
}`,

    codeNumPy: `def detect_numpy(prev, curr, threshold):
    # Write #1: full frame to RAM (1.7 MB)
    diff = np.abs(curr.astype(float) - prev)

    # Write #2: full frame to RAM (1.7 MB)
    mask = diff > threshold

    # Write #3: reduction result
    count = int(np.sum(mask))

    return count
# → 3 full frames written to RAM = 5.1 MB traffic`
  },

  // ─── 3. Astronomy Stacking ────────────────────────────────────────────────
  {
    id: 'astronomy',
    title: 'Astronomy Image Stacking',
    subtitle: '6.3× faster + 16× less memory',
    category: 'Streaming Dataset',
    categoryColor: '#06b6d4',
    icon: '🔭',
    speedup: 6.3,
    speedupVs: 'NumPy',
    memoryNote: '64 MB → 4 MB peak RAM',
    testSize: '16 frames × 1024×1024',
    maxSpeedup: 10,

    plainEnglish: `Astronomers combine many photos of the same patch of sky to reduce noise. Stars and galaxies appear consistently; random sensor noise averages out. With 16 frames, each pixel in the output is the average of 16 measurements.

NumPy loads all 16 frames into memory at once, then averages. Eä loads one frame at a time, accumulates, and discards each frame after processing.`,

    whyItMatters: `Modern telescopes generate terabytes per night. Processing 16 frames is easy — but astronomers often stack hundreds or thousands. With NumPy, more frames = more RAM. With Eä, memory usage stays constant regardless of how many frames you stack.`,

    theScience: `NumPy's np.mean() requires all frames in memory simultaneously (16 × 4MB = 64MB) plus intermediate buffers. Eä maintains a single 4MB accumulator buffer in L2 cache and streams frames through one at a time. The accumulator stays "hot" in cache across all 16 iterations, while each frame is read once and immediately discarded.`,

    benchmarkData: [
      { name: 'Eä', time: 6.2, color: '#00ff88', isEa: true },
      { name: 'NumPy', time: 39.0, color: '#ff4444' }
    ],
    unit: 'ms',

    codeEa: `fn stack_frames(
  frames: *restrict f32,
  out: *mut f32,
  n_frames: i32,
  n_pixels: i32,
  scale: f32
) {
  let f: i32 = 0;
  while f < n_frames {
    let i: i32 = 0;
    while i + 8 <= n_pixels {
      // Read one frame chunk (goes through L1/L2)
      let chunk = load(frames, f * n_pixels + i);
      // Read accumulator (stays in L2 cache — always hot!)
      let acc = load(out, i);
      // Accumulate — store stays in L2
      store(out, i, acc + chunk);
      i = i + 8;
    }
    f = f + 1;
    // Frame is done — can be evicted from cache
  }
  // Final scale pass: divide by n_frames
}`,

    codeNumPy: `# NumPy: loads ALL frames at once
frames = np.stack([
    fits.open(f)[0].data for f in frame_files
])
# ↑ 64 MB allocated in RAM simultaneously

result = np.mean(frames, axis=0)
# Peak memory: 64 MB + 4 MB result = 68 MB

# Eä: streams one frame at a time
# Peak memory: 4 MB frame + 4 MB accumulator = 8 MB
# (constant regardless of number of frames)`
  },

  // ─── 4. MNIST Preprocessing ───────────────────────────────────────────────
  {
    id: 'mnist',
    title: 'ML Preprocessing Pipeline',
    subtitle: 'Add more operations for free — 25× faster at 8 ops',
    category: 'Fused Pipeline',
    categoryColor: '#ec4899',
    icon: '🧠',
    speedup: 25.2,
    speedupVs: 'NumPy (8 operations)',
    testSize: '60,000 images × 47M pixels',
    maxSpeedup: 30,
    isFusionDemo: true,

    fusionScaling: [
      { ops: 1, numpyMs: 77, eaMs: 39 },
      { ops: 2, numpyMs: 154, eaMs: 39 },
      { ops: 4, numpyMs: 470, eaMs: 39 },
      { ops: 8, numpyMs: 1006, eaMs: 40 }
    ],

    plainEnglish: `Before training AI on handwritten digits, images need preprocessing: normalize brightness to 0-1, standardize values, clip extremes, maybe flip or rotate. Each step is simple — but ML pipelines often need 4-8 of them.

For NumPy, each step costs ~125ms because it writes a full copy of 60,000 images to RAM. For Eä, adding more steps costs ~0ms — everything happens in CPU registers.`,

    whyItMatters: `Preprocessing is often the bottleneck in ML training pipelines. GPUs sit idle waiting for the CPU to prepare the next batch. With Eä's fusion, 8-step preprocessing takes the same time as 1-step. GPUs stay busy, training runs faster.`,

    theScience: `Each NumPy operation on 47M pixels = one full pass through ~180MB of data. With 8 operations: 8 × 180MB = 1.44 GB read/written per batch. Eä's fused kernel reads each pixel once, applies all 8 transformations in registers, writes once. Total: 180MB regardless of pipeline depth. Scaling law: NumPy ≈ O(N × ops), Eä ≈ O(N × 1).`,

    benchmarkData: [
      { name: 'Eä (any ops)', time: 39, color: '#00ff88', isEa: true },
      { name: 'NumPy × 1 op', time: 77, color: '#fbbf24' },
      { name: 'NumPy × 2 ops', time: 154, color: '#f97316' },
      { name: 'NumPy × 4 ops', time: 470, color: '#ef4444' },
      { name: 'NumPy × 8 ops', time: 1006, color: '#dc2626' }
    ],
    unit: 'ms',

    codeEa: `fn preprocess_fused(
  input: *restrict u8,
  output: *mut f32,
  n: i32,
  mean: f32,  std_inv: f32
) {
  let i: i32 = 0;
  while i + 8 <= n {
    // All ops in one pass — one read, one write:
    let px = load_u8_f32(input, i);   // op 1: cast uint8→float
    let norm = px * splat(0.00392);   // op 2: normalize /255
    let std = (norm - splat(mean))    // op 3: subtract mean
              * splat(std_inv);        // op 4: divide by std
    let clipped = clamp(std,          // op 5: clip [-3, 3]
                        splat(-3.0), splat(3.0));
    store(output, i, clipped);
    i = i + 8;
    // Memory: 1 read of 8 pixels, 1 write of 8 floats
  }
}`,

    codeNumPy: `def preprocess_numpy(images):
    # Op 1: normalize — writes 47M floats to RAM
    x = images.astype(np.float32) / 255.0

    # Op 2: subtract mean — writes 47M floats to RAM
    x = x - mean

    # Op 3: divide by std — writes 47M floats to RAM
    x = x / std

    # Op 4: clip — writes 47M floats to RAM
    x = np.clip(x, -3, 3)

    return x
# → 4 × 47M × 4 bytes = ~750 MB written to RAM`
  },

  // ─── 5. Pixel Pipeline ────────────────────────────────────────────────────
  {
    id: 'pixel',
    title: 'Pixel Pipeline (Threshold)',
    subtitle: '21× faster — 16 pixels per CPU cycle',
    category: 'Streaming Kernel',
    categoryColor: '#10b981',
    icon: '🖼️',
    speedup: 21,
    speedupVs: 'NumPy (warm cache)',
    testSize: '4096×4096 image (16.8M pixels)',
    maxSpeedup: 25,

    plainEnglish: `Image thresholding is the simplest possible filter: every pixel brighter than 128 becomes white (255), everything darker becomes black (0). One comparison per pixel.

NumPy does this by converting all 16 million pixels to 64-bit doubles, comparing, then converting back to bytes — 3 steps, 3 RAM trips. Eä compares 16 pixels at once in their native format, never leaving the CPU.`,

    whyItMatters: `Thresholding powers barcode scanners, document digitization, license plate readers, and machine vision systems. Processing 4K images at 60fps requires <16ms per frame. NumPy takes 10ms just for this one operation; Eä takes 0.48ms — leaving time for everything else.`,

    theScience: `Eä uses u8x16 SIMD — the \`pcmpgtb\` x86 instruction compares 16 bytes (pixels) simultaneously in a single clock cycle. NumPy converts uint8→float64 (8× larger) before comparing, then converts back. That's 3× the memory traffic at 8× the data size. Eä also avoids NumPy's Python dispatch overhead and array allocation.`,

    benchmarkData: [
      { name: 'Eä (warm)', time: 0.48, color: '#00ff88', isEa: true },
      { name: 'Eä (cold)', time: 0.71, color: '#34d399' },
      { name: 'NumPy (warm)', time: 10.1, color: '#f97316' },
      { name: 'NumPy (cold)', time: 14.2, color: '#ff4444' }
    ],
    unit: 'ms',

    codeEa: `fn threshold_u8(
  input: *restrict u8,
  output: *mut u8,
  n: i32,
  threshold: u8
) {
  let i: i32 = 0;
  let tv = splat_u8(threshold);    // broadcast threshold
  let white = splat_u8(255u8);
  let black = splat_u8(0u8);

  while i + 16 <= n {
    // Load 16 pixels at once — native uint8 format
    let px = load_u8(input, i);

    // Compare 16 pixels simultaneously (pcmpgtb)
    let mask = px > tv;

    // Select 0 or 255 for each pixel
    let result = select(mask, white, black);

    store_u8(output, i, result);  // Write 16 pixels at once
    i = i + 16;
  }
  // Total: N/16 iterations — no type conversion
}`,

    codeNumPy: `def threshold_numpy(image, threshold=128):
    # Step 1: uint8 → float64 (8× memory expansion!)
    #         16.8M pixels × 8 bytes = 134 MB
    float_img = image.astype(np.float64)

    # Step 2: compare — new array in RAM
    mask = float_img > threshold

    # Step 3: back to uint8 (134 MB → 16.8 MB)
    result = np.where(mask, 255, 0).astype(np.uint8)

    return result
# 3 RAM passes, 134 MB peak memory usage`
  },

  // ─── 6. Quantized Conv2D ─────────────────────────────────────────────────
  {
    id: 'conv2d',
    title: 'Quantized Neural Net Inference',
    subtitle: '47.7× faster — integer SIMD unlocks hardware speed',
    category: 'Quantized Kernel',
    categoryColor: '#8b5cf6',
    icon: '⚡',
    speedup: 47.7,
    speedupVs: 'NumPy',
    testSize: '56×56×64 conv layer (typical ResNet)',
    maxSpeedup: 55,

    plainEnglish: `When AI runs on your phone, it uses "quantized" models: instead of precise 32-bit decimal numbers, weights are stored as small 8-bit integers. This makes models 4× smaller and — if you have the right code — dramatically faster.

Most frameworks still use 32-bit math even with 8-bit weights. Eä speaks the CPU's native 8-bit multiplication language directly.`,

    whyItMatters: `Every AI assistant running on a phone, every voice command processor, every on-device image classifier uses quantized inference. The gap between 18ms and 870ms per layer is the difference between real-time AI and noticeable delay — or between running on a $50 chip vs a $500 one.`,

    theScience: `The x86 \`pmaddubsw\` instruction multiplies 16 pairs of (unsigned 8-bit × signed 8-bit) integers simultaneously, producing 16 signed 16-bit results in one clock cycle. This is exactly the operation in quantized convolution. Eä exposes this via \`maddubs_i16()\`. NumPy must use float32 (no native u8×i8 multiply) and processes one number at a time conceptually. Eä achieves 38.5 GMACs/s.`,

    benchmarkData: [
      { name: 'Eä (int8)', time: 18.2, color: '#00ff88', isEa: true },
      { name: 'NumPy (float32)', time: 868, color: '#ff4444' }
    ],
    unit: 'ms',

    codeEa: `fn conv2d_3x3_u8i8(
  src: *restrict u8,  wt: *restrict i8,
  dst: *mut i16,
  H: i32, W: i32, C: i32
) {
  let y: i32 = 0;
  while y < H {
    let x: i32 = 0;
    while x < W {
      // Dual accumulator — breaks dependency chain
      let acc0: i32x4 = splat_i32(0);
      let acc1: i32x4 = splat_i32(0);

      let c: i32 = 0;
      while c + 32 <= C {
        let u = load_u8(src, y*W*C + x*C + c);
        let w = load_i8(wt, c);

        // pmaddubsw: 16 int8 multiplications per cycle!
        acc0 = acc0 + maddubs_i32(u, w);
        acc1 = acc1 + maddubs_i32(u+16, w+16);
        c = c + 32;
      }
      store_i16(dst, y*W + x, acc0 + acc1);
      x = x + 1;
    }
    y = y + 1;
  }
}`,

    codeNumPy: `def conv2d_numpy(src, weights, H, W, C):
    # Must cast to int32 (no native u8×i8 in NumPy)
    src32 = src.astype(np.int32)    # 4× memory
    wt32  = weights.astype(np.int32)

    acc = np.zeros((H, W), dtype=np.int32)
    # Python loop — no vectorization
    for dr in range(3):
        for dc in range(3):
            patch = src32[dr:dr+H, dc:dc+W, :]
            acc += (patch * wt32[dr, dc, :]).sum(axis=-1)

    return acc.astype(np.int16)
# No access to pmaddubsw — 47× slower`
  },

  // ─── 7. SIMD Reduction ────────────────────────────────────────────────────
  {
    id: 'reduction',
    title: 'SIMD Sum & Max Reduction',
    subtitle: 'Beating optimized C — by exposing ILP',
    category: 'Reduction Kernel',
    categoryColor: '#f59e0b',
    icon: '📊',
    speedup: 1.04,
    speedupVs: 'C (AVX2, -O3)',
    testSize: '1,000,000 float32 elements',
    maxSpeedup: 1.5,

    plainEnglish: `Adding up a million numbers is the simplest possible task. But modern CPUs can do multiple additions in parallel — if you explicitly tell them how. Without that hint, even the smartest compiler creates a chain where each add must wait for the previous result.

Eä's explicit multi-accumulator pattern breaks this chain, and the result beats optimized C.`,

    whyItMatters: `Reductions are everywhere: neural network softmax, attention scores, physics simulations, financial risk calculations. Being faster than C with strict IEEE 754 math (without the -ffast-math shortcut C typically needs) is a significant claim for a new language.`,

    theScience: `A single-accumulator loop has a latency-bound dependency chain: each addition must wait for the previous (3-4 cycle latency on modern CPUs). With 4 independent accumulators, the CPU can pipeline 4 additions simultaneously, saturating throughput. LLVM cannot auto-discover this — the programmer must express the parallelism. Eä's max reduction achieves 0.83× of C's time; C used -ffast-math (which allows unsafe floating-point reordering). Eä uses strict IEEE 754.`,

    benchmarkData: [
      { name: 'Eä max (f32x4)', time: 78, color: '#00ff88', isEa: true },
      { name: 'Eä sum (f32x8)', time: 105, color: '#34d399' },
      { name: 'C max (SSE)', time: 100, color: '#fbbf24' },
      { name: 'C sum (AVX2)', time: 110, color: '#f59e0b' }
    ],
    unit: 'μs',

    codeEa: `fn reduce_max(data: *restrict f32, n: i32) -> f32 {
  // 4 independent accumulators — breaks dependency chain!
  // CPU can pipeline all 4 simultaneously
  let acc0 = load(data, 0);
  let acc1 = load(data, 4);
  let acc2 = load(data, 8);
  let acc3 = load(data, 12);

  let i: i32 = 16;
  while i + 16 <= n {
    acc0 = max(acc0, load(data, i));
    acc1 = max(acc1, load(data, i + 4));
    acc2 = max(acc2, load(data, i + 8));
    acc3 = max(acc3, load(data, i + 12));
    i = i + 16;
  }
  // Merge 4 accumulators
  let merged = max(max(acc0, acc1), max(acc2, acc3));
  return reduce_max(merged);
}`,

    codeNumPy: `# NumPy version — conceptually:
result = np.max(data)

# Under the hood, this is roughly:
# acc = -inf
# for x in data:
#     acc = max(acc, x)  ← serial dependency chain!
# Each max must wait for previous → limited by latency

# With -O3 and -ffast-math, C can auto-vectorize this.
# Eä does it explicitly — and wins without unsafe flags.`
  }
]
