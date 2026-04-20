import { useState, useCallback } from 'react'
import type { ChangeEvent } from 'react'
import { rgbaToGrayscale } from '../utils/imageToGrayscale'

const WIDTH = 96
const HEIGHT = 96

export type ImageUploadState = {
  pixels: Uint8ClampedArray | null
  fileName: string | null
  error: string | null
}

export function useImageUpload() {
  const [state, setState] = useState<ImageUploadState>({
    pixels: null,
    fileName: null,
    error: null,
  })

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Clear the input so the same file can be re-uploaded if needed
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      const dataUrl = readerEvent.target?.result
      if (typeof dataUrl !== 'string') return

      const img = new Image()
      img.onload = () => {
        const offscreen = new OffscreenCanvas(WIDTH, HEIGHT)
        const ctx = offscreen.getContext('2d')
        if (!ctx) return

        // drawImage handles both resizing and format decoding in one call
        ctx.drawImage(img, 0, 0, WIDTH, HEIGHT)
        const { data } = ctx.getImageData(0, 0, WIDTH, HEIGHT)
        const pixels = rgbaToGrayscale(data, WIDTH * HEIGHT)
        setState({ pixels, fileName: file.name, error: null })
      }
      img.onerror = () => {
        setState((prev) => ({ ...prev, error: 'Could not decode image.' }))
      }
      img.src = dataUrl
    }
    reader.onerror = () => {
      setState((prev) => ({ ...prev, error: 'Could not read file.' }))
    }
    reader.readAsDataURL(file)
  }, [])

  return { ...state, handleFileChange }
}
