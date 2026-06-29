import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useVocabulary } from '../lib/storage'
import { AddWordForm } from '../components/AddWordForm'
import { WordCard } from '../components/WordCard'
import { WordModal } from '../components/WordModal'
import { IconSlot } from '../components/IconSlot'
import type { Word } from '../types'

export function VocabularyPage() {
  const { words, addWord, removeWord } = useVocabulary()
  const [selected, setSelected] = useState<Word | null>(null)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">
            My Vocabulary
          </h1>
          <p className="mt-1 font-semibold text-muted">
            {words.length} {words.length === 1 ? 'word' : 'words'} collected
          </p>
        </div>

        <Link
          to="/practice"
          className={`flex items-center gap-2 rounded-full px-6 py-3 text-base font-extrabold text-white transition ${
            words.length === 0
              ? 'pointer-events-none bg-muted/40'
              : 'bg-grass hover:brightness-105'
          }`}
        >
          <IconSlot label="cards" size={20} />
          Practice
        </Link>
      </header>

      <AddWordForm onAdd={addWord} existing={words.map((w) => w.english)} />

      {words.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-surface/50 py-16 text-center">
          <IconSlot label="empty" size={40} className="mx-auto mb-4" />
          <p className="font-bold text-ink">No words yet</p>
          <p className="mt-1 text-sm text-muted">
            Add your first English word above to get started.
          </p>
        </div>
      ) : (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {words.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              onRemove={removeWord}
              onOpen={setSelected}
            />
          ))}
        </section>
      )}

      <WordModal word={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
