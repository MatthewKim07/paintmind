import { useRef, useEffect } from 'react'

export function useCanvas(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  scale = 4,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width
    canvas.height = height
    canvas.style.width = `${width * scale}px`
    canvas.style.height = `${height * scale}px`
    canvas.style.imageRendering = 'pixelated'
    ctx.imageSmoothingEnabled = false

    // Expand grayscale Uint8ClampedArray → RGBA ImageData
    const rgba = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < pixels.length; i++) {
      rgba[i * 4]     = pixels[i]  // R
      rgba[i * 4 + 1] = pixels[i]  // G
      rgba[i * 4 + 2] = pixels[i]  // B
      rgba[i * 4 + 3] = 255        // A
    }

    ctx.putImageData(new ImageData(rgba, width, height), 0, 0)
  }, [pixels, width, height, scale])

  return canvasRef
}
