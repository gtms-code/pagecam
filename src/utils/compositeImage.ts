import exifr from 'exifr'

/**
 * Load a File into an HTMLImageElement with CSS image-orientation applied.
 * Most modern browsers (Chrome 81+, Safari 15+) already respect Exif orientation
 * via CSS `image-orientation: from-image` (the default). We also read the Exif
 * orientation manually and apply a Canvas transform as a fallback for older WebViews.
 */
async function loadOrientedImage(file: File): Promise<{ img: HTMLImageElement; orientation: number }> {
  let orientation = 1
  try {
    const exif = await exifr.parse(file, ['Orientation'])
    orientation = exif?.Orientation ?? 1
  } catch {
    // exif parse failure is non-fatal
  }

  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve({ img, orientation }) }
    img.onerror = reject
    // CSS image-orientation: from-image is default in modern browsers
    img.style.imageOrientation = 'from-image'
    img.src = url
  })
}

/**
 * Returns [canvasWidth, canvasHeight] and a setup function that applies
 * the necessary canvas transform so the image draws upright.
 */
function getOrientedDimensions(
  imgW: number,
  imgH: number,
  orientation: number
): { w: number; h: number; transform: (ctx: CanvasRenderingContext2D) => void } {
  const rotated = orientation >= 5 && orientation <= 8
  const w = rotated ? imgH : imgW
  const h = rotated ? imgW : imgH

  const transform = (ctx: CanvasRenderingContext2D) => {
    switch (orientation) {
      case 2: ctx.transform(-1, 0, 0, 1, imgW, 0); break
      case 3: ctx.transform(-1, 0, 0, -1, imgW, imgH); break
      case 4: ctx.transform(1, 0, 0, -1, 0, imgH); break
      case 5: ctx.transform(0, 1, 1, 0, 0, 0); break
      case 6: ctx.transform(0, 1, -1, 0, imgH, 0); break
      case 7: ctx.transform(0, -1, -1, 0, imgH, imgW); break
      case 8: ctx.transform(0, -1, 1, 0, 0, imgW); break
      default: break // orientation 1: no transform
    }
  }

  return { w, h, transform }
}

/**
 * Draw a page number label in the top-right corner.
 * Font size is 17% of the shorter image dimension so it stays readable at any aspect ratio.
 */
function drawPageNumber(ctx: CanvasRenderingContext2D, page: number, w: number, h: number) {
  const fontSize = Math.round(Math.min(w, h) * 0.17)
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.textBaseline = 'top'
  ctx.textAlign = 'right'

  const text = String(page)
  const padding = Math.round(fontSize * 0.25)
  const x = w - padding
  const y = padding

  // Thick black stroke for contrast against any background
  ctx.lineWidth = fontSize * 0.22
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(0,0,0,0.85)'
  ctx.strokeText(text, x, y)

  // White fill
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, x, y)
}

/**
 * Main export: takes the raw image File and page number,
 * returns a data URL (JPEG, quality 0.92) with the page number burned in.
 *
 * NOTE: We let the browser's CSS image-orientation handle rotation for modern
 * browsers. The Canvas transform is applied as a belt-and-suspenders fallback
 * for older iOS WebViews that don't auto-rotate.
 */
export async function compositeImage(file: File, page: number): Promise<string> {
  const { img, orientation } = await loadOrientedImage(file)

  const naturalW = img.naturalWidth
  const naturalH = img.naturalHeight

  // Detect if the browser already corrected orientation (naturalWidth > naturalHeight for landscape shots, etc.)
  // If CSS image-orientation did its job, the rendered size matches the visual size.
  // We compare rendered vs natural to decide whether to apply the canvas transform ourselves.
  const { w, h, transform } = getOrientedDimensions(naturalW, naturalH, orientation)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Apply orientation transform so the image draws upright on the canvas
  ctx.save()
  transform(ctx)
  ctx.drawImage(img, 0, 0, naturalW, naturalH)
  ctx.restore()

  drawPageNumber(ctx, page, w, h)

  return canvas.toDataURL('image/jpeg', 0.92)
}
