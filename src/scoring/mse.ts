export function computeMSE(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  if (a.length !== b.length) {
    throw new Error(`Array length mismatch: ${a.length} vs ${b.length}`)
  }
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  // Normalize to [0, 1]: divide by n and by 255^2 (max possible squared diff per pixel)
  return sum / a.length / (255 * 255)
}
