import { computeMSE } from '../scoring/mse'
import type { AgentEnv, CircleAction } from './types'

const CANDIDATES = 20

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sampleCandidate(
  width: number,
  height: number,
  maxRadius: number,
  targetPixels: Uint8ClampedArray,
): CircleAction {
  const x = randomInt(0, width - 1)
  const y = randomInt(0, height - 1)
  const radius = randomInt(1, maxRadius)
  // Quantize opacity to 0.05 steps to keep search space bounded
  const opacitySteps = randomInt(1, 19)
  const opacity = opacitySteps * 0.05
  // Sample the target color at the circle center — far better than random gray
  const gray = targetPixels[y * width + x]
  return { x, y, radius, opacity, gray }
}

export function getNextAction(env: AgentEnv): CircleAction {
  const { width, height, targetPixels } = env
  const maxRadius = Math.floor(Math.min(width, height) / 4)

  const before = env.snapshot()
  let bestAction!: CircleAction
  let bestMSE = Infinity

  for (let i = 0; i < CANDIDATES; i++) {
    const candidate = sampleCandidate(width, height, maxRadius, targetPixels)
    env.apply(candidate)
    const mse = computeMSE(env.snapshot(), targetPixels)
    env.restore(before)

    if (mse < bestMSE) {
      bestMSE = mse
      bestAction = candidate
    }
  }

  return bestAction
}
