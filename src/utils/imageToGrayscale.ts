// ITU-R BT.601 luminance weights — standard for JPEG/PNG grayscale conversion
export function rgbaToGrayscale(
  rgba: Uint8ClampedArray,
  pixelCount: number,
): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(pixelCount)
  for (let i = 0; i < pixelCount; i++) {
    gray[i] = Math.round(0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2])
  }
  return gray
}
