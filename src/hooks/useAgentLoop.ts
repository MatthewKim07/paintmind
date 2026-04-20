import { useRef, useState, useCallback } from 'react'
import { DrawingEnvironment } from '../env/drawing'
import type { CircleAction } from '../env/types'
import type { AgentEnv } from '../agent/types'
import { getNextAction } from '../agent'
import { computeMSE } from '../scoring/mse'

export type AgentLoopState = {
  step: number
  mse: number
  pixels: Uint8ClampedArray
  lastAction: CircleAction | null
}

export function useAgentLoop(targetPixels: Uint8ClampedArray, width: number, height: number) {
  const envRef = useRef(new DrawingEnvironment(width, height))

  const initialPixels = envRef.current.snapshot()
  const [state, setState] = useState<AgentLoopState>({
    step: 0,
    mse: computeMSE(initialPixels, targetPixels),
    pixels: initialPixels,
    lastAction: null,
  })

  const step = useCallback(() => {
    const env = envRef.current
    const agentEnv: AgentEnv = {
      width: env.width,
      height: env.height,
      targetPixels,
      apply: (a) => env.apply(a),
      snapshot: () => env.snapshot(),
      restore: (s) => env.restore(s),
    }

    const action = getNextAction(agentEnv)
    env.apply(action)
    const newPixels = env.snapshot()
    const newMSE = computeMSE(newPixels, targetPixels)

    setState((prev) => ({
      step: prev.step + 1,
      mse: newMSE,
      pixels: newPixels,
      lastAction: action,
    }))
  }, [targetPixels])

  const reset = useCallback(() => {
    envRef.current.reset()
    const pixels = envRef.current.snapshot()
    setState({
      step: 0,
      mse: computeMSE(pixels, targetPixels),
      pixels,
      lastAction: null,
    })
  }, [targetPixels])

  return { state, step, reset }
}
