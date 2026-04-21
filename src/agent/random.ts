import { computeMSE } from '../scoring/mse'
import type { AgentEnv, DrawingAction } from './types'

const CANDIDATES = 50
const RADIUS_LARGE = 0.25  // fraction of short side at progress=0 (e.g. 24px on a 96px canvas)

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Build a cumulative distribution function (CDF) over per-pixel absolute error.
 * Sampling an index from this CDF biases primitive centers toward high-error regions.
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
 * Analytically optimal gray for a circle.
 * Derived from: d/d(gray) Σ(target_i - current_i*(1−α) − gray*α)² = 0
 *   gray = (target_mean − current_mean*(1−α)) / α
 */
function optimalGrayCircle(
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

/**
 * Analytically optimal gray for an axis-aligned rectangle.
 * Same formula as circle; region is the full bounding box instead of a disc.
 */
function optimalGrayRect(
  cx: number, cy: number, hw: number, hh: number, opacity: number,
  width: number, height: number,
  current: Uint8ClampedArray, target: Uint8ClampedArray,
): number {
  const xMin = Math.max(0, Math.round(cx - hw))
  const xMax = Math.min(width - 1, Math.round(cx + hw))
  const yMin = Math.max(0, Math.round(cy - hh))
  const yMax = Math.min(height - 1, Math.round(cy + hh))

  let targetSum = 0
  let currentSum = 0
  let n = 0

  for (let py = yMin; py <= yMax; py++) {
    for (let px = xMin; px <= xMax; px++) {
      const idx = py * width + px
      targetSum += target[idx]
      currentSum += current[idx]
      n++
    }
  }

  if (n === 0) return target[Math.round(cy) * width + Math.round(cx)]
  const g = (targetSum / n - (currentSum / n) * (1 - opacity)) / opacity
  return Math.max(0, Math.min(255, Math.round(g)))
}

export function getNextAction(env: AgentEnv): DrawingAction {
  const { width, height, targetPixels, progress } = env
  const shortSide = Math.min(width, height)

  // Quadratic decay: drops quickly through mid-steps, reaches 1px by progress=1
  const large = Math.floor(shortSide * RADIUS_LARGE)
  const maxExtent = Math.max(1, Math.round((large - 1) * (1 - progress) ** 2 + 1))

  const currentPixels = env.snapshot()
  const errorCDF = buildErrorCDF(currentPixels, targetPixels)

  let bestAction!: DrawingAction
  let bestMSE = Infinity

  for (let i = 0; i < CANDIDATES; i++) {
    const pixelIdx = sampleCDF(errorCDF)
    const x = pixelIdx % width
    const y = Math.floor(pixelIdx / width)
    const opacity = randomInt(1, 19) * 0.05

    // Evaluate a circle at this location
    const radius = randomInt(1, maxExtent)
    const grayC = optimalGrayCircle(x, y, radius, opacity, width, height, currentPixels, targetPixels)
    const circleCandidate: DrawingAction = { x, y, radius, opacity, gray: grayC }
    env.apply(circleCandidate)
    const mseCircle = computeMSE(env.snapshot(), targetPixels)
    env.restore(currentPixels)

    // Evaluate a rect at the same location — independent dimensions allow edge-aligned slivers
    const hw = randomInt(1, maxExtent)
    const hh = randomInt(1, maxExtent)
    const grayR = optimalGrayRect(x, y, hw, hh, opacity, width, height, currentPixels, targetPixels)
    const rectCandidate: DrawingAction = { x, y, w: hw, h: hh, opacity, gray: grayR }
    env.apply(rectCandidate)
    const mseRect = computeMSE(env.snapshot(), targetPixels)
    env.restore(currentPixels)

    // Keep whichever primitive performed better at this location
    const candidate = mseCircle <= mseRect ? circleCandidate : rectCandidate
    const mse = Math.min(mseCircle, mseRect)

    if (mse < bestMSE) {
      bestMSE = mse
      bestAction = candidate
    }
  }

  return bestAction
}
