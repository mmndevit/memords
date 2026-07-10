import { speak } from '../lib/translate'
import type { Word } from '../types'
import { IconSlot } from './IconSlot'

type WordCardProps = {
  word: Word
  onRemove: (id: string) => void
  onOpen: (word: Word) => void
}

export function WordCard({ word, onRemove, onOpen }: WordCardProps) {
  return (
    <article
      onClick={() => onOpen(word)}
      className="group relative flex cursor-pointer flex-col gap-1 rounded-[18px] bg-surface p-4 shadow-[0_12px_30px_-22px_rgba(29,36,51,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-22px_rgba(29,36,51,0.5)]"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(word.id)
        }}
        title="Remove"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-coral-soft text-coral opacity-0 transition hover:brightness-95 group-hover:opacity-100"
      >
        <IconSlot label="trash" size={14} />
      </button>

      <span className="truncate pr-6 text-base font-extrabold capitalize" title={word.english}>
        {word.english}
      </span>
      {word.transcription && (
        <span className="truncate font-mono text-xs text-muted">
          {word.transcription}
        </span>
      )}
      <p className="truncate text-sm font-bold text-grass" title={word.russian}>
        {word.russian}
      </p>

      <div className="mt-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            speak(word.english)
          }}
          title="Listen"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-page/70 transition hover:bg-page"
        >
          <IconSlot label="speaker" size={16} />
        </button>
        {word.definitions.length > 0 && (
          <span className="rounded-full bg-grass-soft px-2 py-1 text-[10px] font-extrabold text-grass">
            {word.definitions.length} def
          </span>
        )}
      </div>
    </article>
  )
}
