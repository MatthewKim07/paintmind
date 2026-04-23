import { useAgentLoop } from './hooks/useAgentLoop'
import type { RunStats } from './hooks/useAgentLoop'
import { useCanvas } from './hooks/useCanvas'
import { useImageUpload } from './hooks/useImageUpload'

const WIDTH = 96
const HEIGHT = 96
const SCALE = 4
const MAX_STEPS = 1000

const CHART_W = 300
const CHART_H = 80

function MSEChart({ current, prev }: { current: number[]; prev: RunStats | null }) {
  if (current.length < 2 && (!prev || prev.mseHistory.length < 2)) return null

  const allValues = [...current, ...(prev ? prev.mseHistory : [])]
  const maxVal = Math.max(...allValues, 0.001)

  function toPoints(history: number[]): string {
    if (history.length < 2) return ''
    return history
      .map((v, i) => {
        const x = (i / (history.length - 1)) * CHART_W
        const y = CHART_H - (v / maxVal) * CHART_H
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }

  return (
    <svg
      width={CHART_W}
      height={CHART_H}
      style={{ display: 'block', border: '1px solid #ddd', background: '#fafafa', marginBottom: 12 }}
    >
      {prev && prev.mseHistory.length >= 2 && (
        <polyline points={toPoints(prev.mseHistory)} fill="none" stroke="#bbb" strokeWidth={1.5} />
      )}
      {current.length >= 2 && (
        <polyline points={toPoints(current)} fill="none" stroke="#444" strokeWidth={1.5} />
      )}
    </svg>
  )
}

function RunComparison({ prev, current }: { prev: RunStats; current: { steps: number; mse: number } }) {
  const stepDelta = prev.steps - current.steps
  const mseDelta = prev.finalMSE - current.mse

  return (
    <div style={{ fontSize: 11, color: '#666', marginBottom: 12, lineHeight: 1.8 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 2 }}>run comparison</div>
      <div>
        steps&emsp;
        <span style={{ color: '#888' }}>prev {prev.steps}</span>
        {current.steps > 0 && (
          <>
            &ensp;→&ensp;<span style={{ color: '#444' }}>now {current.steps}</span>
            {stepDelta !== 0 && (
              <span style={{ color: stepDelta > 0 ? '#080' : '#c00', marginLeft: 4 }}>
                ({stepDelta > 0 ? `−${stepDelta}` : `+${Math.abs(stepDelta)}`} steps)
              </span>
            )}
          </>
        )}
      </div>
      <div>
        final MSE&emsp;
        <span style={{ color: '#888' }}>prev {prev.finalMSE.toFixed(6)}</span>
        {current.steps > 0 && (
          <>
            &ensp;→&ensp;<span style={{ color: '#444' }}>now {current.mse.toFixed(6)}</span>
            {mseDelta !== 0 && (
              <span style={{ color: mseDelta > 0 ? '#080' : '#c00', marginLeft: 4 }}>
                ({mseDelta > 0 ? '↓' : '↑'}{Math.abs(mseDelta).toFixed(6)})
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

type PaintingSessionProps = {
  targetPixels: Uint8ClampedArray
}

function PaintingSession({ targetPixels }: PaintingSessionProps) {
  const { state, step, run, pause, reset } = useAgentLoop(
    targetPixels, WIDTH, HEIGHT,
    { maxSteps: MAX_STEPS, mseThreshold: 0.001, intervalMs: 100 },
  )
  const paintingRef = useCanvas(state.pixels, WIDTH, HEIGHT, SCALE)
  const targetRef   = useCanvas(targetPixels,  WIDTH, HEIGHT, SCALE)

  const canRun = !state.isRunning && !state.done && state.step < MAX_STEPS

  return (
    <>
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, marginBottom: 4, color: '#888' }}>target</div>
          <canvas ref={targetRef} style={{ border: '1px solid #ccc' }} />
        </div>
        <div>
          <div style={{ fontSize: 11, marginBottom: 4, color: '#888' }}>painting</div>
          <canvas ref={paintingRef} style={{ border: '1px solid #ccc' }} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>step</strong> {state.step} / {MAX_STEPS}&emsp;
        <strong>MSE</strong> {state.mse.toFixed(6)}
        {state.done && (
          <span style={{ marginLeft: 12, color: '#080', fontWeight: 'bold' }}>done</span>
        )}
      </div>

      {state.lastAction && (
        <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
          {'radius' in state.lastAction
            ? `circle — x:${state.lastAction.x} y:${state.lastAction.y} r:${state.lastAction.radius} op:${state.lastAction.opacity.toFixed(2)} gray:${state.lastAction.gray}`
            : `rect — x:${state.lastAction.x} y:${state.lastAction.y} w:${state.lastAction.w} h:${state.lastAction.h} op:${state.lastAction.opacity.toFixed(2)} gray:${state.lastAction.gray}`
          }
        </div>
      )}

      <MSEChart current={state.mseHistory} prev={state.prevRunStats} />

      {state.prevRunStats && state.step > 0 && (
        <RunComparison
          prev={state.prevRunStats}
          current={{ steps: state.step, mse: state.mse }}
        />
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={step}
          disabled={state.isRunning || state.done}
          style={{ padding: '6px 16px', cursor: 'pointer' }}
        >
          Step
        </button>
        <button
          onClick={state.isRunning ? pause : run}
          disabled={!state.isRunning && !canRun}
          style={{ padding: '6px 16px', cursor: 'pointer' }}
        >
          {state.isRunning ? 'Pause' : 'Run'}
        </button>
        <button onClick={reset} style={{ padding: '6px 16px', cursor: 'pointer' }}>
          Reset
        </button>
      </div>
    </>
  )
}

export default function App() {
  const { pixels, fileName, error, handleFileChange } = useImageUpload()

  return (
    <div style={{ fontFamily: 'monospace', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>PaintMind</h1>

      <div style={{ marginBottom: 20 }}>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {fileName && (
          <span style={{ marginLeft: 8, fontSize: 11, color: '#888' }}>{fileName}</span>
        )}
        {error && (
          <span style={{ marginLeft: 8, fontSize: 11, color: '#c00' }}>{error}</span>
        )}
      </div>

      {pixels ? (
        <PaintingSession key={fileName ?? undefined} targetPixels={pixels} />
      ) : (
        <p style={{ color: '#aaa', margin: 0 }}>Upload an image to begin.</p>
      )}
    </div>
  )
}
