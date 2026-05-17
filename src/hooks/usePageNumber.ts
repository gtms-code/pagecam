import { useState, useEffect } from 'react'

const STORAGE_KEY = 'pagecam_page_number'
const STEP_KEY = 'pagecam_step'

export type Step = 1 | 2

export function usePageNumber() {
  const [page, setPage] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? parseInt(stored, 10) : NaN
    return isNaN(parsed) ? 1 : parsed
  })

  const [step, setStep] = useState<Step>(() => {
    const stored = localStorage.getItem(STEP_KEY)
    return stored === '2' ? 2 : 1
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(page))
  }, [page])

  useEffect(() => {
    localStorage.setItem(STEP_KEY, String(step))
  }, [step])

  const advance = () => setPage((p) => p + step)

  const reset = (value: number) => {
    const n = parseInt(String(value), 10)
    if (!isNaN(n)) setPage(n)
  }

  return { page, step, advance, reset, setStep }
}
