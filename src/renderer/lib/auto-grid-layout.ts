import { clamp } from './math'

export const AUTO_MIN_CARD_W = 320
export const AUTO_MIN_CARD_H = 200
// Row cap threshold: rows only keep getting added if each row has at least
// this many px. Higher than MIN_CARD_H so cards don't get squashed short
// just because a viewport technically fits 4 rows. Asymmetric with cols on
// purpose — we want wider layouts, not taller ones.
export const AUTO_ROW_FIT_MIN_H = 280

// Target a roughly square card. Terminals need vertical room for output —
// wide-short cards (e.g. 2 cols × 3 rows) leave each card too short to read,
// so we bias toward more columns / squarer tiles.
export const AUTO_TARGET_ASPECT = 1
// Hard upper bound regardless of monitor — past 4×4 (16 cards) the benefit of
// seeing more at once is outweighed by the harm of small tiles.
export const AUTO_HARD_MAX_COLS = 4
export const AUTO_HARD_MAX_ROWS = 4

// How many rows fit comfortably on this viewport. Used to size scroll-mode
// rows so the first "page" of cards looks identical to the fit-mode grid.
export function fitMaxRows(H: number): number {
  return clamp(Math.floor(H / AUTO_ROW_FIT_MIN_H), 1, AUTO_HARD_MAX_ROWS)
}

export type AutoLayout = { cols: number; rows: number; mode: 'fit' | 'scroll' }

// Pure function: given card count and viewport, pick the best (cols, rows, mode).
// Fit mode is capped dynamically (3×3 on laptops, up to 4×4 on large monitors);
// beyond the cap we scroll so cards stay readable.
export function pickAutoLayout(n: number, W: number, H: number): AutoLayout {
  if (n <= 0) return { cols: 1, rows: 1, mode: 'fit' }
  if (n === 1) return { cols: 1, rows: 1, mode: 'fit' }
  if (n === 2) return { cols: 2, rows: 1, mode: 'fit' }
  if (n === 3) return { cols: 3, rows: 1, mode: 'fit' }

  const maxCols = clamp(Math.floor(W / AUTO_MIN_CARD_W), 1, AUTO_HARD_MAX_COLS)
  const maxRows = clamp(Math.floor(H / AUTO_ROW_FIT_MIN_H), 1, AUTO_HARD_MAX_ROWS)

  const scrollFallback = (): AutoLayout => {
    const cols = clamp(Math.floor(W / AUTO_MIN_CARD_W), 1, maxCols)
    return { cols, rows: Math.ceil(n / cols), mode: 'scroll' }
  }

  if (n > maxCols * maxRows) return scrollFallback()

  let best: { cols: number; rows: number; score: number; fits: boolean } | null = null
  for (let cols = 1; cols <= Math.min(n, maxCols); cols++) {
    const rows = Math.ceil(n / cols)
    if (rows > maxRows) continue
    const cardW = W / cols
    const cardH = H / rows
    const fits = cardW >= AUTO_MIN_CARD_W && cardH >= AUTO_MIN_CARD_H
    const aspectPenalty = Math.abs(Math.log(cardW / cardH / AUTO_TARGET_ASPECT))
    const emptyPenalty = (cols * rows - n) * 0.25
    const score = -aspectPenalty - emptyPenalty
    if (
      best === null ||
      (fits && !best.fits) ||
      (fits === best.fits && (score > best.score || (score === best.score && cols > best.cols)))
    ) {
      best = { cols, rows, score, fits }
    }
  }

  if (best && best.fits) return { cols: best.cols, rows: best.rows, mode: 'fit' }
  return scrollFallback()
}
