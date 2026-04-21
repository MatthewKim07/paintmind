export type CircleAction = {
  x: number        // center column, 0 to width-1
  y: number        // center row, 0 to height-1
  radius: number   // 1 to canvasSize/4
  opacity: number  // 0.05 to 0.95
  gray: number     // 0 (black) to 255 (white)
}

export type RectAction = {
  x: number        // center column, 0 to width-1
  y: number        // center row, 0 to height-1
  w: number        // half-width (pixels from center to left/right edge)
  h: number        // half-height (pixels from center to top/bottom edge)
  opacity: number  // 0.05 to 0.95
  gray: number     // 0 (black) to 255 (white)
}

// Discriminate at runtime via: 'radius' in action → CircleAction, else RectAction
export type DrawingAction = CircleAction | RectAction
