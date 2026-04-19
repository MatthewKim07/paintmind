# agents.md

## Purpose
This document describes the AI agent strategies used in PaintMind.

## Current Status
The agent is not fully implemented yet. V1 will use a simple optimization-based approach.

## V1 Agent Strategy
The initial agent uses random sampling with greedy selection based on MSE improvement.

## Action Space
```ts
type CircleAction = {
  x: number
  y: number
  radius: number
  opacity: number
}
```

V1 may derive the grayscale paint value from the target pixel at `(x, y)`.

## Per-Step Algorithm
1. Generate K candidate circle actions.
2. Apply each candidate to a scratch drawing environment.
3. Compute MSE against the target pixels.
4. Select the candidate with the lowest MSE.
5. Commit only the selected action to the drawing environment.
6. Emit action, score, and step metadata to the loop driver.

## Agent Constraints
- Use grayscale only for V1.
- Use circles as the only drawing primitive.
- Do not import React from agent code.
- Do not directly manipulate UI state.
- Keep scoring modular and replaceable.
- Preserve deterministic drawing environment behavior.

## Future Ideas
- Increase candidate count when improvement stalls.
- Bias samples toward high-error regions.
- Add plateau handling and adaptive radius ranges.
- Swap in an opt-in backend agent behind the same interface.
