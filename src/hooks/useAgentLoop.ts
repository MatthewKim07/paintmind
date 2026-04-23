import { useRef, useState, useCallback, useEffect } from 'react'
import { DrawingEnvironment } from '../env/drawing'
import type { DrawingAction } from '../env/types'
import type { AgentEnv } from '../agent/types'
import { getNextAction } from '../agent'
import { computeMSE } from '../scoring/mse'

export type RunStats = {
  steps: number
  finalMSE: number
  mseHistory: number[]
}

export type AgentLoopState = {
  step: number
  mse: number
  pixels: Uint8ClampedArray
  lastAction: DrawingAction | null
  mseHistory: number[]
  isRunning: boolean
  done: boolean
  prevRunStats: RunStats | null
}

export type AgentLoopOptions = {
  maxSteps?: number
  mseThreshold?: number
  intervalMs?: number
}

function makeInitialState(
  env: DrawingEnvironment,
  targetPixels: Uint8ClampedArray,
  prevRunStats: RunStats | null = null,
): AgentLoopState {
  const pixels = env.snapshot()
  return {
    step: 0,
    mse: computeMSE(pixels, targetPixels),
    pixels,
    lastAction: null,
    mseHistory: [],
    isRunning: false,
    done: false,
    prevRunStats,
  }
}

export function useAgentLoop(
  targetPixels: Uint8ClampedArray,
  width: number,
  height: number,
  options: AgentLoopOptions = {},
) {
  const { maxSteps = 200, mseThreshold = 0.001, intervalMs = 100 } = options

  const envRef = useRef(new DrawingEnvironment(width, height))
  const prevTargetRef = useRef(targetPixels)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const heatmapRef = useRef<Uint8ClampedArray | null>(null)
  const latestRunRef = useRef<RunStats | null>(null)   // most recently completed run
  const prevRunStatsRef = useRef<RunStats | null>(null) // promoted to baseline only on Reset

  // Shadow refs — always current, safe to read inside setInterval without stale closure
  const stepRef = useRef(0)
  const mseRef = useRef(0)
  const isRunningRef = useRef(false)
  const mseHistoryRef = useRef<number[]>([])

  const [state, setState] = useState<AgentLoopState>(() => {
    const s = makeInitialState(envRef.current, targetPixels)
    mseRef.current = s.mse
    return s
  })

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Reset everything when the target image changes
  useEffect(() => {
    if (prevTargetRef.current === targetPixels) return
    prevTargetRef.current = targetPixels

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    isRunningRef.current = false
    stepRef.current = 0
    mseHistoryRef.current = []
    heatmapRef.current = null
    latestRunRef.current = null
    prevRunStatsRef.current = null

    envRef.current.reset()
    const s = makeInitialState(envRef.current, targetPixels, null)
    mseRef.current = s.mse
    setState(s)
  }, [targetPixels])

  const captureHeatmap = useCallback(() => {
    const current = envRef.current.snapshot()
    const map = new Uint8ClampedArray(current.length)
    for (let i = 0; i < current.length; i++) {
      map[i] = Math.abs(targetPixels[i] - current[i])
    }
    heatmapRef.current = map
  }, [targetPixels])

  // Capture the just-completed (or mid-run) state into latestRunRef.
  // prevRunStatsRef is NOT updated here — it is only promoted from latestRunRef on Reset.
  const finalizeRun = useCallback(() => {
    captureHeatmap()
    latestRunRef.current = {
      steps: stepRef.current,
      finalMSE: mseRef.current,
      mseHistory: mseHistoryRef.current,
    }
  }, [captureHeatmap])

  // Core step logic — shared by manual step() and auto-run interval
  const executeStep = useCallback(() => {
    const env = envRef.current
    const agentEnv: AgentEnv = {
      width: env.width,
      height: env.height,
      targetPixels,
      progress: Math.min(1, stepRef.current / maxSteps),
      priorErrorMap: heatmapRef.current,
      apply: (a) => env.apply(a),
      snapshot: () => env.snapshot(),
      restore: (s) => env.restore(s),
    }

    const action = getNextAction(agentEnv)
    env.apply(action)
    const newPixels = env.snapshot()
    const newMSE = computeMSE(newPixels, targetPixels)

    stepRef.current += 1
    mseRef.current = newMSE
    mseHistoryRef.current = [...mseHistoryRef.current, newMSE]

    setState((prev) => ({
      ...prev,
      step: stepRef.current,
      mse: newMSE,
      pixels: newPixels,
      lastAction: action,
      mseHistory: mseHistoryRef.current,
    }))
  }, [targetPixels, maxSteps])

  // Manual single step — blocked during auto-run
  const step = useCallback(() => {
    if (isRunningRef.current) return
    executeStep()
  }, [executeStep])

  const run = useCallback(() => {
    if (isRunningRef.current) return
    // Don't start if already at a terminal condition
    if (stepRef.current >= maxSteps || mseRef.current < mseThreshold) return

    isRunningRef.current = true
    setState((prev) => ({ ...prev, isRunning: true, done: false }))

    intervalRef.current = setInterval(() => {
      // Stopping conditions read from refs — never stale
      if (stepRef.current >= maxSteps || mseRef.current < mseThreshold) {
        finalizeRun()
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        isRunningRef.current = false
        setState((prev) => ({ ...prev, isRunning: false, done: true }))
        return
      }
      executeStep()
    }, intervalMs)
  }, [executeStep, finalizeRun, maxSteps, mseThreshold, intervalMs])

  const pause = useCallback(() => {
    if (!isRunningRef.current) return
    clearInterval(intervalRef.current!)
    intervalRef.current = null
    isRunningRef.current = false
    setState((prev) => ({ ...prev, isRunning: false }))
  }, [])

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    isRunningRef.current = false

    if (stepRef.current > 0) finalizeRun()   // capture mid-run state if reset before natural stop
    prevRunStatsRef.current = latestRunRef.current  // promote latest → comparison baseline
    stepRef.current = 0
    mseHistoryRef.current = []

    envRef.current.reset()
    const s = makeInitialState(envRef.current, targetPixels, prevRunStatsRef.current)
    mseRef.current = s.mse
    setState(s)
  }, [finalizeRun, targetPixels])

  return { state, step, run, pause, reset }
}
