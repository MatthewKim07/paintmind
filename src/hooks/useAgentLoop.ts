import { useRef, useState, useCallback, useEffect } from 'react'
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
  const prevTargetRef = useRef(targetPixels)

  const [state, setState] = useState<AgentLoopState>(() => {
    const pixels = envRef.current.snapshot()
    return { step: 0, mse: computeMSE(pixels, targetPixels), pixels, lastAction: null }
  })

  // Reset drawing env and state whenever the target image changes
  useEffect(() => {
    if (prevTargetRef.current === targetPixels) return
    prevTargetRef.current = targetPixels
    envRef.current.reset()
    const pixels = envRef.current.snapshot()
    setState({ step: 0, mse: computeMSE(pixels, targetPixels), pixels, lastAction: null })
  }, [targetPixels])

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
