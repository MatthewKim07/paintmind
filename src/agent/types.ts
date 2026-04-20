import type { CircleAction } from '../env/types'

export type { CircleAction }

export interface AgentEnv {
  readonly width: number
  readonly height: number
  readonly targetPixels: Uint8ClampedArray
  apply(action: CircleAction): void
  snapshot(): Uint8ClampedArray
  restore(snapshot: Uint8ClampedArray): void
}
