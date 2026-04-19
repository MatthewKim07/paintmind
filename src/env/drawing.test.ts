import { describe, it, expect, beforeEach } from 'vitest'
import { DrawingEnvironment } from './drawing'

describe('DrawingEnvironment', () => {
  let env: DrawingEnvironment

  beforeEach(() => {
    env = new DrawingEnvironment(10, 10)
  })

  it('initializes as all-white (255)', () => {
    const pixels = env.snapshot()
    expect(pixels.every(v => v === 255)).toBe(true)
    expect(pixels.length).toBe(100)
  })

  it('reset returns canvas to all-white', () => {
    env.apply({ x: 5, y: 5, radius: 3, opacity: 1, gray: 0 })
    env.reset()
    expect(env.snapshot().every(v => v === 255)).toBe(true)
  })

  it('apply paints the center pixel inside the circle', () => {
    env.apply({ x: 5, y: 5, radius: 1, opacity: 1, gray: 0 })
    expect(env.snapshot()[5 * 10 + 5]).toBe(0)
  })

  it('apply leaves pixels outside the circle untouched', () => {
    env.apply({ x: 5, y: 5, radius: 1, opacity: 1, gray: 0 })
    expect(env.snapshot()[0 * 10 + 0]).toBe(255)
  })

  it('opacity blends correctly: gray=0, opacity=0.5 on white → 128', () => {
    // 255 * (1 - 0.5) + 0 * 0.5 = 127.5 → rounds to 128
    env.apply({ x: 5, y: 5, radius: 1, opacity: 0.5, gray: 0 })
    expect(env.snapshot()[5 * 10 + 5]).toBe(128)
  })

  it('opacity blends correctly: gray=255, opacity=0.5 on white → 255', () => {
    env.apply({ x: 5, y: 5, radius: 1, opacity: 0.5, gray: 255 })
    expect(env.snapshot()[5 * 10 + 5]).toBe(255)
  })

  it('opacity blends correctly: gray=0, opacity=1.0 on white → 0', () => {
    env.apply({ x: 5, y: 5, radius: 1, opacity: 1, gray: 0 })
    expect(env.snapshot()[5 * 10 + 5]).toBe(0)
  })

  it('snapshot returns a copy — mutating it does not affect the environment', () => {
    const snap = env.snapshot()
    snap[0] = 42
    expect(env.snapshot()[0]).toBe(255)
  })

  it('restore reverts the canvas to a prior snapshot', () => {
    const before = env.snapshot()
    env.apply({ x: 5, y: 5, radius: 3, opacity: 1, gray: 0 })
    env.restore(before)
    expect(env.snapshot()).toEqual(before)
  })

  it('restore throws when snapshot size does not match', () => {
    const wrong = new Uint8ClampedArray(50)
    expect(() => env.restore(wrong)).toThrow()
  })

  it('apply clamps to canvas bounds — no out-of-bounds writes', () => {
    expect(() => env.apply({ x: 0, y: 0, radius: 10, opacity: 1, gray: 0 })).not.toThrow()
    expect(() => env.apply({ x: 9, y: 9, radius: 10, opacity: 1, gray: 0 })).not.toThrow()
  })

  it('apply with larger radius paints more pixels than a smaller one', () => {
    const envA = new DrawingEnvironment(10, 10)
    const envB = new DrawingEnvironment(10, 10)
    envA.apply({ x: 5, y: 5, radius: 1, opacity: 1, gray: 0 })
    envB.apply({ x: 5, y: 5, radius: 3, opacity: 1, gray: 0 })
    const paintedA = Array.from(envA.snapshot()).filter(v => v < 255).length
    const paintedB = Array.from(envB.snapshot()).filter(v => v < 255).length
    expect(paintedB).toBeGreaterThan(paintedA)
  })

  it('sequential applies accumulate — second apply blends over first', () => {
    env.apply({ x: 5, y: 5, radius: 1, opacity: 0.5, gray: 0 })
    // after first: pixel ≈ 128
    env.apply({ x: 5, y: 5, radius: 1, opacity: 0.5, gray: 0 })
    // after second: 128 * 0.5 + 0 * 0.5 = 64
    expect(env.snapshot()[5 * 10 + 5]).toBe(64)
  })
})
