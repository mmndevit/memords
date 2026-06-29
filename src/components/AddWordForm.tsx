import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { translateWord } from '../lib/translate'
import type { Translation, Word } from '../types'
import { IconSlot } from './IconSlot'

type AddWordFormProps = {
  onAdd: (word: Omit<Word, 'id' | 'createdAt'>) => void
  existing: string[]
}

type Pending = { english: string; translation: Translation }

export function AddWordForm({ onAdd, existing }: AddWordFormProps) {
  const [value, setValue] = useState('')
  // Set when a translated word wasn't found in the dictionary and is awaiting
  // the user's "Add anyway" / "Cancel" decision.
  const [pending, setPending] = useState<Pending | null>(null)

  function commit(english: string, translation: Translation) {
    onAdd({
      english,
      russian: translation.russian,
      translations: translation.translations,
      transcription: translation.transcription,
      audioUrl: translation.audioUrl,
      definitions: translation.definitions,
      examples: translation.examples,
    })
    setValue('')
    setPending(null)
  }

  const mutation = useMutation({
    mutationFn: translateWord,
    onSuccess: (translation, word) => {
      const english = word.trim().toLowerCase()
      if (translation.found) commit(english, translation)
      else setPending({ english, translation })
    },
  })

  const trimmed = value.trim().toLowerCase()
  const duplicate = trimmed.length > 0 && existing.includes(trimmed)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!trimmed || duplicate || mutation.isPending) return
    setPending(null)
    mutation.mutate(trimmed)
  }

  return (
    <section className="rounded-card bg-surface p-6 shadow-[0_18px_40px_-24px_rgba(29,36,51,0.35)]">
      <h2 className="mb-1 text-lg font-extrabold">Add a word</h2>
      <p className="mb-5 text-sm text-muted">
        Type an English word — we'll fetch the Russian translation, transcription
        and pronunciation.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-3 rounded-full bg-page/70 px-5 py-3">
          <IconSlot label="search" size={20} />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. serendipity"
            autoFocus
            className="flex-1 bg-transparent text-base font-semibold text-ink outline-none placeholder:font-medium placeholder:text-muted/70"
          />
        </div>
        <button
          type="submit"
          disabled={!trimmed || duplicate || mutation.isPending}
          className="rounded-full bg-grass px-7 py-3 text-base font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {mutation.isPending ? 'Translating…' : 'Add'}
        </button>
      </form>

      {duplicate && (
        <p className="mt-3 text-sm font-semibold text-coral">
          "{trimmed}" is already in your vocabulary.
        </p>
      )}
      {mutation.isError && (
        <p className="mt-3 text-sm font-semibold text-coral">
          {(mutation.error as Error).message}
        </p>
      )}

      {pending && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-coral-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-coral text-white">
              <IconSlot label="warning" size={18} className="border-white/40" />
            </span>
            <p className="text-sm font-bold text-ink">
              Sorry, there's no such word
              <span className="font-semibold text-muted"> “{pending.english}”</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-full bg-surface px-5 py-2 text-sm font-bold text-muted transition hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => commit(pending.english, pending.translation)}
              className="rounded-full bg-coral px-5 py-2 text-sm font-extrabold text-white transition hover:brightness-95"
            >
              Add anyway
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
