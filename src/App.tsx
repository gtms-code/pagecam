import { useRef, useState, useCallback } from 'react'
import { usePageNumber, type Step } from './hooks/usePageNumber'
import { compositeImage } from './utils/compositeImage'

type AppState = 'idle' | 'processing' | 'preview'

export default function App() {
  const { page, step, advance, reset, setStep } = usePageNumber()
  const [appState, setAppState] = useState<AppState>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentPageRef = useRef(page)
  currentPageRef.current = page

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return

    setError(null)
    setAppState('processing')

    try {
      const dataUrl = await compositeImage(file, currentPageRef.current)
      setPreviewUrl(dataUrl)
      setAppState('preview')
    } catch (err) {
      console.error(err)
      setError('画像の処理に失敗しました。もう一度お試しください。')
      setAppState('idle')
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (!previewUrl) return
    const fileName = `page_${String(currentPageRef.current).padStart(4, '0')}.jpg`

    const res = await fetch(previewUrl)
    const blob = await res.blob()
    const shareFile = new File([blob], fileName, { type: 'image/jpeg' })

    let shared = false
    if (navigator.canShare?.({ files: [shareFile] })) {
      try {
        await navigator.share({ files: [shareFile], title: fileName })
        shared = true
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
      }
    }

    if (!shared) {
      const a = document.createElement('a')
      a.href = previewUrl
      a.download = fileName
      a.click()
    }

    advance()
    setPreviewUrl(null)
    setAppState('idle')
  }, [previewUrl, advance])

  const handleRetake = useCallback(() => {
    setPreviewUrl(null)
    setAppState('idle')
  }, [])

  const triggerCamera = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className="min-h-dvh bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
        <h1 className="text-lg font-bold tracking-tight text-white">📷 PageCam</h1>
        <span className="text-slate-400 text-sm">書籍スキャン補助</span>
      </header>

      <main className="flex-1 flex flex-col gap-4 p-4 max-w-lg mx-auto w-full">
        {/* Settings Card */}
        <section className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">設定</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="page-input" className="text-sm text-slate-300 whitespace-nowrap">
                現在のページ番号
              </label>
              <input
                id="page-input"
                type="number"
                min={1}
                value={page}
                onChange={(e) => reset(Number(e.target.value))}
                className="w-24 text-center text-xl font-bold bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-300">ページ増分</span>
              <div className="flex rounded-xl overflow-hidden border border-slate-600">
                {([1, 2] as Step[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStep(s)}
                    className={[
                      'px-6 py-2 text-sm font-semibold transition-colors',
                      step === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 active:bg-slate-600',
                    ].join(' ')}
                  >
                    +{s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Current page badge */}
        <div className="flex items-center justify-center">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 px-8 py-5 text-center w-full">
            <p className="text-xs text-slate-400 mb-1">次に撮影するページ</p>
            <p className="text-8xl font-black text-white tabular-nums leading-none">{page}</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/60 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* ── IDLE: shoot button ── */}
        {appState === 'idle' && (
          <button
            onClick={triggerCamera}
            className="mt-auto bg-blue-600 active:bg-blue-700 active:scale-95 transition-all rounded-2xl py-6 text-2xl font-bold shadow-lg shadow-blue-900/50 select-none"
          >
            📸　撮影する
          </button>
        )}

        {/* ── PROCESSING ── */}
        {appState === 'processing' && (
          <div className="mt-auto flex flex-col items-center gap-3 py-8">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400">画像を処理中…</p>
          </div>
        )}

        {/* ── PREVIEW ── */}
        {appState === 'preview' && previewUrl && (
          <div className="flex flex-col gap-3 mt-auto">
            <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-black">
              <img
                src={previewUrl}
                alt={`ページ ${page} のプレビュー`}
                className="w-full object-contain max-h-[48dvh]"
              />
              <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-lg">
                p.{page}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleRetake}
                className="bg-slate-700 active:bg-slate-600 active:scale-95 transition-all rounded-2xl py-5 text-base font-semibold"
              >
                撮り直す
              </button>
              <button
                onClick={handleSave}
                className="bg-green-600 active:bg-green-700 active:scale-95 transition-all rounded-2xl py-5 text-base font-bold shadow-lg shadow-green-900/50"
              >
                保存して次へ →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Hidden file input — triggers native camera on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
      />
    </div>
  )
}
