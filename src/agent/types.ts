import type { CircleAction, DrawingAction } from '../env/types'

export type { CircleAction, DrawingAction }

export interface AgentEnv {
  readonly width: number
  readonly height: number
  readonly targetPixels: Uint8ClampedArray
  readonly progress: number  // 0.0 (first step) → 1.0 (last step)
  apply(action: DrawingAction): void
  snapshot(): Uint8ClampedArray
  restore(snapshot: Uint8ClampedArray): void
}
