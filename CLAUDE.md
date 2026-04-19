Project: PaintMind

Goal:
Build an AI agent that recreates images using constrained paint tools in a step-by-step, real-time process.

Core Principles:
- The AI must act like a drawing agent, not instantly generate images
- All improvements must come from iterative actions and evaluation
- Keep the system simple and testable at each stage
- Prefer working code over complex abstractions
- Do not break existing functionality

Architecture Rules:
- Separate UI, agent logic, and scoring logic
- Agent must not directly manipulate UI state
- Scoring function must be modular and replaceable
- Keep drawing environment deterministic

Development Rules:
- Only implement one milestone at a time
- Always include test instructions
- Avoid overengineering
- Explain tradeoffs before complex changes

V1 Constraints:
- Small canvas (e.g., 64x64 or 96x96)
- Grayscale initially
- ONE drawing primitive: circles only (x, y, radius, opacity)
- Simple similarity metric (pixel MSE)
- Real-time step-by-step updates (no instant final image)

Success Criteria (v1):
- Upload target image
- See AI canvas update step-by-step
- Similarity score generally improves over time

---

## Milestone 1: Technical Plan

### Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React + TypeScript |
| Canvas | HTML5 Canvas API (offscreen env + display canvas) |
| Agent (V1) | Local random-search (no API calls) |
| State | React `useReducer` |
| Styling | Tailwind CSS |
| Backend | None |

### Architecture

```
src/
├── agent/
│   ├── types.ts         # CircleAction, AgentEnv interface
│   ├── random.ts        # V1: random sampling + greedy MSE pick
│   └── index.ts         # getNextAction(env): CircleAction
├── env/
│   ├── drawing.ts       # DrawingEnvironment: apply(), snapshot(), reset()
│   └── types.ts         # CanvasState (Uint8Array grayscale)
├── scoring/
│   └── mse.ts           # computeMSE(a, b: Uint8Array): number
├── components/
│   ├── App.tsx
│   ├── ImageUploader.tsx
│   ├── CanvasView.tsx   # side-by-side: target | painting (scaled 4x)
│   ├── StepLog.tsx
│   └── Controls.tsx     # Run / Pause / Step / Reset
├── hooks/
│   ├── useAgentLoop.ts  # loop driver; calls agent, applies to env, emits state
│   └── useCanvas.ts     # imperative display canvas ref
└── types/index.ts
```

**Data flow:** Target pixels → Agent → CircleAction → DrawingEnvironment → Uint8Array → React state → Canvas render

**Invariant:** `agent/` has zero React imports. `useAgentLoop` is the only bridge between agent logic and UI.

### Action Type

```ts
type CircleAction = {
  x: number;       // 0–96
  y: number;       // 0–96
  radius: number;  // 1–24
  opacity: number; // 0.05–0.95
}
```

### V1 Agent Algorithm (random sampling)

Per step:
1. Generate K=20 candidate circles (random x, y, radius; color = target pixel at (x,y))
2. Apply each to scratch canvas → compute MSE → revert
3. Commit the candidate with lowest MSE
4. Emit { action, mse, step } to React

### Stopping Conditions

1. `step >= maxSteps` (default 200)
2. `mse < stopThreshold` (default 0.001)
3. 10 consecutive non-improving steps (plateau)
4. User clicks Pause

### Milestone Roadmap

| M | Deliverable | Gate |
|---|---|---|
| M1 | Architecture plan (this) | — |
| M2 | DrawingEnvironment + computeMSE + unit tests | apply() + MSE verified in isolation |
| M3 | Agent loop wired to React | Manual step-one updates canvas |
| M4 | Full UI: upload, side-by-side, controls, step log | End-to-end demo |
| M5 | Polish: plateau detection, MSE sparkline, error states | Shippable |
| M6 | Claude Vision agent as opt-in backend | Swap via env var |

### Key Risks

| Risk | Mitigation |
|---|---|
| Agent/UI coupling grows | Enforce: agent/ has no React imports |
| Random search plateaus early | Plateau detection + expand search radius on stall |
| Offscreen canvas perf | K=20 at 96×96 is fast; reduce K if needed |
| Future LLM swap is hard | `getNextAction(env)` is a single drop-in function |