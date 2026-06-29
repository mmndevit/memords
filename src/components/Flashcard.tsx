import type { ReactNode } from 'react'
import { IconSlot } from './IconSlot'

export type CardStatus = 'typing' | 'correct' | 'wrong'

type FlashcardProps = {
  prompt: string
  promptHint: string
  transcription?: string
  /** Shown only when answered wrong, so the user learns the right answer. */
  correctAnswer: string
  placeholder: string
  status: CardStatus
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onNext: () => void
  onListen?: () => void
  /** Definitions/examples panel rendered beneath the answer box. */
  details?: ReactNode
}

const SURFACE: Record<CardStatus, string> = {
  typing: 'bg-surface',
  correct: 'bg-grass-soft ring-2 ring-grass/50',
  wrong: 'bg-coral-soft ring-2 ring-coral/50',
}

export function Flashcard({
  prompt,
  promptHint,
  transcription,
  correctAnswer,
  placeholder,
  status,
  value,
  onChange,
  onSubmit,
  onNext,
  onListen,
  details,
}: FlashcardProps) {
  const answered = status !== 'typing'

  return (
    <div
      className={`relative flex min-h-[360px] flex-col items-center justify-center gap-6 rounded-card px-8 py-12 text-center shadow-[0_30px_60px_-30px_rgba(29,36,51,0.45)] transition-colors ${SURFACE[status]}`}
    >
      {/* status badge */}
      {answered && (
        <span
          className={`absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full text-white ${
            status === 'correct' ? 'bg-grass' : 'bg-coral'
          }`}
        >
          <IconSlot
            label={status === 'correct' ? 'check' : 'close'}
            size={22}
            className="border-white/40 text-white"
          />
        </span>
      )}

      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">
          {promptHint}
        </span>
        <h2 className="text-5xl font-extrabold capitalize tracking-tight">
          {prompt}
        </h2>
        {transcription && (
          <span className="font-mono text-lg text-muted">{transcription}</span>
        )}
        {onListen && (
          <button
            type="button"
            onClick={onListen}
            title="Listen"
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-page/70 transition hover:bg-page"
          >
            <IconSlot label="speaker" size={20} />
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (answered) onNext()
          else onSubmit()
        }}
        className="flex w-full max-w-sm flex-col gap-3"
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={answered}
          autoFocus
          className={`w-full rounded-full border-2 px-6 py-3.5 text-center text-lg font-bold outline-none transition ${
            status === 'correct'
              ? 'border-grass/40 bg-white/60 text-grass'
              : status === 'wrong'
                ? 'border-coral/40 bg-white/60 text-coral line-through'
                : 'border-line bg-page/50 text-ink focus:border-grass/60'
          }`}
        />

        {status === 'wrong' && (
          <p className="text-sm font-semibold text-ink">
            Correct answer:{' '}
            <span className="font-extrabold text-grass">{correctAnswer}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={!answered && value.trim().length === 0}
          className="rounded-full bg-ink px-7 py-3 text-base font-extrabold text-white transition disabled:opacity-30"
        >
          {answered ? 'Next' : 'Check'}
        </button>
      </form>

      {details && (
        <div className="w-full max-w-md border-t border-line/70 pt-5">
          {details}
        </div>
      )}
    </div>
  )
}
