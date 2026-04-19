import type { CircleAction } from './types'

export class DrawingEnvironment {
  private pixels: Uint8ClampedArray
  readonly width: number
  readonly height: number

  constructor(width = 96, height = 96) {
    this.width = width
    this.height = height
    this.pixels = new Uint8ClampedArray(width * height).fill(255)
  }

  apply(action: CircleAction): void {
    const { x, y, radius, opacity, gray } = action
    const xMin = Math.max(0, Math.floor(x - radius))
    const xMax = Math.min(this.width - 1, Math.ceil(x + radius))
    const yMin = Math.max(0, Math.floor(y - radius))
    const yMax = Math.min(this.height - 1, Math.ceil(y + radius))

    for (let py = yMin; py <= yMax; py++) {
      for (let px = xMin; px <= xMax; px++) {
        const dist = Math.sqrt((px - x) ** 2 + (py - y) ** 2)
        if (dist <= radius) {
          const idx = py * this.width + px
          this.pixels[idx] = Math.round(this.pixels[idx] * (1 - opacity) + gray * opacity)
        }
      }
    }
  }

  snapshot(): Uint8ClampedArray {
    return this.pixels.slice()
  }

  restore(snapshot: Uint8ClampedArray): void {
    if (snapshot.length !== this.pixels.length) {
      throw new Error(`Snapshot length ${snapshot.length} does not match env size ${this.pixels.length}`)
    }
    this.pixels.set(snapshot)
  }

  reset(): void {
    this.pixels.fill(255)
  }
}
