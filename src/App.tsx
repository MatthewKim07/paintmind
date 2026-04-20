import { useMemo } from 'react'
import { useAgentLoop } from './hooks/useAgentLoop'
import { useCanvas } from './hooks/useCanvas'

const WIDTH = 96
const HEIGHT = 96
const SCALE = 4

// Hard-coded test target for M3: dark-center radial gradient.
// Replaced by uploaded image in M4.
function makeTestTarget(w: number, h: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(w * h)
  const cx = w / 2
  const cy = h / 2
  const maxDist = Math.sqrt(cx * cx + cy * cy)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      pixels[y * w + x] = Math.round((dist / maxDist) * 210)
    }
  }
  return pixels
}

export default function App() {
  const targetPixels = useMemo(() => makeTestTarget(WIDTH, HEIGHT), [])
  const { state, step, reset } = useAgentLoop(targetPixels, WIDTH, HEIGHT)

  const paintingRef = useCanvas(state.pixels, WIDTH, HEIGHT, SCALE)
  const targetRef = useCanvas(targetPixels, WIDTH, HEIGHT, SCALE)

  return (
    <div style={{ fontFamily: 'monospace', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>PaintMind</h1>

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
        <strong>step</strong> {state.step}&emsp;
        <strong>MSE</strong> {state.mse.toFixed(6)}
      </div>

      {state.lastAction && (
        <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
          last action &mdash; x:{state.lastAction.x} y:{state.lastAction.y}{' '}
          r:{state.lastAction.radius} op:{state.lastAction.opacity.toFixed(2)}{' '}
          gray:{state.lastAction.gray}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={step} style={{ padding: '6px 16px', cursor: 'pointer' }}>
          Step
        </button>
        <button onClick={reset} style={{ padding: '6px 16px', cursor: 'pointer' }}>
          Reset
        </button>
      </div>
    </div>
  )
}
