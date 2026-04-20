import { useAgentLoop } from './hooks/useAgentLoop'
import { useCanvas } from './hooks/useCanvas'
import { useImageUpload } from './hooks/useImageUpload'

const WIDTH = 96
const HEIGHT = 96
const SCALE = 4

type PaintingSessionProps = {
  targetPixels: Uint8ClampedArray
}

function PaintingSession({ targetPixels }: PaintingSessionProps) {
  const { state, step, reset } = useAgentLoop(targetPixels, WIDTH, HEIGHT)
  const paintingRef = useCanvas(state.pixels, WIDTH, HEIGHT, SCALE)
  const targetRef = useCanvas(targetPixels, WIDTH, HEIGHT, SCALE)

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
        <strong>step</strong> {state.step}&emsp;
        <strong>MSE</strong> {state.mse.toFixed(6)}
      </div>

      {state.lastAction && (
        <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
          last &mdash; x:{state.lastAction.x} y:{state.lastAction.y}{' '}
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
