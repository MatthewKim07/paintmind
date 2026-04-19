export type CircleAction = {
  x: number        // column index, 0 to width-1
  y: number        // row index, 0 to height-1
  radius: number   // 1 to canvasSize/4
  opacity: number  // 0.05 to 0.95
  gray: number     // 0 (black) to 255 (white)
}
