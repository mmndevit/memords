import { useEffect } from 'react'
import { speak } from '../lib/translate'
import type { Word } from '../types'
import { IconSlot } from './IconSlot'
import { WordDetails } from './WordDetails'

type WordModalProps = {
  word: Word | null
  onClose: () => void
}

export function WordModal({ word, onClose }: WordModalProps) {
  useEffect(() => {
    if (!word) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [word, onClose])

  if (!word) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-card bg-surface p-7 shadow-[0_40px_80px_-30px_rgba(29,36,51,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-page/70 transition hover:bg-page"
        >
          <IconSlot label="close" size={18} />
        </button>

        <header className="mb-5 pr-10">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-3xl font-extrabold capitalize">
              {word.english}
            </h2>
            {word.transcription && (
              <span className="font-mono text-lg text-muted">
                {word.transcription}
              </span>
            )}
            <button
              type="button"
              onClick={() => speak(word.english)}
              title="Listen"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-page/70 transition hover:bg-page"
            >
              <IconSlot label="speaker" size={18} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(word.translations.length > 0 ? word.translations : [word.russian]).map(
              (t) => (
                <span
                  key={t}
                  className="rounded-full bg-grass-soft px-3 py-1 text-sm font-bold text-grass"
                >
                  {t}
                </span>
              ),
            )}
          </div>
        </header>

        <WordDetails
          definitions={word.definitions}
          examples={word.examples}
        />
      </div>
    </div>
  )
}
