import { computeMSE } from '../scoring/mse'
import type { AgentEnv, CircleAction } from './types'

const CANDIDATES = 50

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Build a cumulative distribution function (CDF) over per-pixel absolute error.
 * Sampling an index from this CDF biases circle centers toward high-error regions.
 */
function buildErrorCDF(current: Uint8ClampedArray, target: Uint8ClampedArray): Float32Array {
  const cdf = new Float32Array(current.length)
  let running = 0
  for (let i = 0; i < current.length; i++) {
    running += Math.abs(target[i] - current[i])
    cdf[i] = running
  }
  // Canvas already matches target — fall back to uniform distribution
  if (running === 0) {
    for (let i = 0; i < cdf.length; i++) cdf[i] = i + 1
  }
  return cdf
}

/** Binary search for the first CDF bucket >= r. O(log n). */
function sampleCDF(cdf: Float32Array): number {
  const r = Math.random() * cdf[cdf.length - 1]
  let lo = 0
  let hi = cdf.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (cdf[mid] < r) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * Compute the gray value that analytically minimizes MSE for a given circle.
 * Derived by setting d/d(gray) Σ(target_i - current_i*(1−α) − gray*α)² = 0:
 *   gray = (target_mean − current_mean*(1−α)) / α
 * Clamped to [0, 255].
 */
function optimalGray(
  cx: number, cy: number, radius: number, opacity: number,
  width: number, height: number,
  current: Uint8ClampedArray, target: Uint8ClampedArray,
): number {
  const xMin = Math.max(0, Math.floor(cx - radius))
  const xMax = Math.min(width - 1, Math.ceil(cx + radius))
  const yMin = Math.max(0, Math.floor(cy - radius))
  const yMax = Math.min(height - 1, Math.ceil(cy + radius))

  let targetSum = 0
  let currentSum = 0
  let n = 0

  for (let py = yMin; py <= yMax; py++) {
    for (let px = xMin; px <= xMax; px++) {
      if (Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) <= radius) {
        const idx = py * width + px
        targetSum += target[idx]
        currentSum += current[idx]
        n++
      }
    }
  }

  if (n === 0) return target[Math.round(cy) * width + Math.round(cx)]

  const g = (targetSum / n - (currentSum / n) * (1 - opacity)) / opacity
  return Math.max(0, Math.min(255, Math.round(g)))
}

const RADIUS_LARGE = 0.25  // fraction of short side at progress=0 (e.g. 24px on a 96px canvas)

export function getNextAction(env: AgentEnv): CircleAction {
  const { width, height, targetPixels, progress } = env
  const shortSide = Math.min(width, height)
  // Quadratic decay: drops quickly through mid-steps, reaches 1px by progress=1.
  // Formula: (large - 1) * (1 - progress)^2 + 1
  // At progress=0 → large; progress=0.5 → ~7; progress=0.75 → ~3; progress=1 → 1
  const large = Math.floor(shortSide * RADIUS_LARGE)
  const maxRadius = Math.max(1, Math.round((large - 1) * (1 - progress) ** 2 + 1))

  const currentPixels = env.snapshot()
  const errorCDF = buildErrorCDF(currentPixels, targetPixels)

  let bestAction!: CircleAction
  let bestMSE = Infinity

  for (let i = 0; i < CANDIDATES; i++) {
    const pixelIdx = sampleCDF(errorCDF)
    const x = pixelIdx % width
    const y = Math.floor(pixelIdx / width)
    const radius = randomInt(1, maxRadius)
    const opacity = randomInt(1, 19) * 0.05

    const gray = optimalGray(x, y, radius, opacity, width, height, currentPixels, targetPixels)
    const candidate: CircleAction = { x, y, radius, opacity, gray }

    env.apply(candidate)
    const mse = computeMSE(env.snapshot(), targetPixels)
    env.restore(currentPixels)

    if (mse < bestMSE) {
      bestMSE = mse
      bestAction = candidate
    }
  }

  return bestAction
}
