import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useVocabulary, isAnswerCorrect } from '../lib/storage'
import { speak } from '../lib/translate'
import { Flashcard, type CardStatus } from '../components/Flashcard'
import { WordDetails } from '../components/WordDetails'
import { IconSlot } from '../components/IconSlot'
import type { Word } from '../types'

type Round = 1 | 2

// A practice session uses at most this many randomly picked words.
const QUIZ_SIZE = 10

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Shuffle the full vocabulary and take up to QUIZ_SIZE random words for a session.
function drawDeck(words: Word[]): Word[] {
  return shuffle(words).slice(0, QUIZ_SIZE)
}

export function PracticePage() {
  const { words } = useVocabulary()
  // Snapshot the deck once so adding/removing elsewhere can't reshuffle mid-game.
  const initialDeck = useMemo(() => drawDeck(words), [words])

  const [deck, setDeck] = useState<Word[]>(initialDeck)
  const [round, setRound] = useState<Round>(1)
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<CardStatus>('typing')
  const [scores, setScores] = useState<{ 1: number; 2: number }>({ 1: 0, 2: 0 })
  const [finished, setFinished] = useState(false)

  if (words.length === 0) {
    return (
      <EmptyPractice />
    )
  }

  if (finished) {
    return (
      <Summary
        total={deck.length}
        scores={scores}
        onRestart={() => {
          setDeck(drawDeck(words))
          setRound(1)
          setIndex(0)
          setValue('')
          setStatus('typing')
          setScores({ 1: 0, 2: 0 })
          setFinished(false)
        }}
      />
    )
  }

  const card = deck[index]
  // Round 1 accepts any of the stored Russian translations; round 2 the word.
  const accepted = round === 1 ? card.translations : [card.english]
  const expectedLabel = accepted.join(', ')

  function check() {
    const correct = isAnswerCorrect(value, accepted)
    setStatus(correct ? 'correct' : 'wrong')
    if (correct) setScores((s) => ({ ...s, [round]: s[round] + 1 }))
  }

  function next() {
    setValue('')
    setStatus('typing')
    if (index < deck.length - 1) {
      setIndex(index + 1)
    } else if (round === 1) {
      setRound(2)
      setIndex(0)
      setDeck(shuffle(deck))
    } else {
      setFinished(true)
    }
  }

  const totalCards = deck.length * 2
  const doneCards = (round === 1 ? 0 : deck.length) + index
  const progress = Math.round((doneCards / totalCards) * 100)

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-bold text-muted transition hover:text-ink"
        >
          <IconSlot label="back" size={18} />
          Vocabulary
        </Link>
        <span className="rounded-full bg-surface px-4 py-1.5 text-sm font-extrabold shadow-sm">
          Round {round} of 2 ·{' '}
          <span className="text-muted">
            {round === 1 ? 'EN → RU' : 'RU → EN'}
          </span>
        </span>
      </header>

      {/* progress */}
      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-grass transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-bold text-muted">
          {index + 1}/{deck.length}
        </span>
      </div>

      <Flashcard
        key={`${round}-${index}`}
        prompt={round === 1 ? card.english : card.russian}
        promptHint={round === 1 ? 'Translate to Russian' : 'Translate to English'}
        transcription={round === 1 ? card.transcription || undefined : undefined}
        correctAnswer={expectedLabel}
        placeholder={round === 1 ? 'Type in Russian…' : 'Type in English…'}
        status={status}
        value={value}
        onChange={setValue}
        onSubmit={check}
        onNext={next}
        onListen={
          round === 1 ? () => speak(card.english) : undefined
        }
        details={
          <WordDetails
            definitions={card.definitions}
            examples={card.examples}
            align="center"
            // In RU → EN the English word is the answer, so mask it in examples.
            maskHeadword={round === 2 ? card.english : undefined}
          />
        }
      />
    </div>
  )
}

function EmptyPractice() {
  return (
    <div className="mx-auto max-w-md rounded-card bg-surface p-10 text-center shadow-[0_18px_40px_-24px_rgba(29,36,51,0.35)]">
      <IconSlot label="cards" size={44} className="mx-auto mb-4" />
      <h1 className="text-2xl font-extrabold">Nothing to practice yet</h1>
      <p className="mt-2 text-muted">
        Add a few words to your vocabulary, then come back to play.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-full bg-grass px-7 py-3 font-extrabold text-white"
      >
        Go to Vocabulary
      </Link>
    </div>
  )
}

function Summary({
  total,
  scores,
  onRestart,
}: {
  total: number
  scores: { 1: number; 2: number }
  onRestart: () => void
}) {
  const overall = scores[1] + scores[2]
  const max = total * 2
  const pct = Math.round((overall / max) * 100)

  return (
    <div className="mx-auto max-w-md rounded-card bg-surface p-10 text-center shadow-[0_18px_40px_-24px_rgba(29,36,51,0.35)]">
      <IconSlot label="trophy" size={56} className="mx-auto mb-4" />
      <h1 className="text-3xl font-extrabold">Session complete!</h1>
      <p className="mt-2 text-muted">
        You scored <span className="font-extrabold text-ink">{pct}%</span>{' '}
        overall.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <ScorePill label="EN → RU" score={scores[1]} total={total} />
        <ScorePill label="RU → EN" score={scores[2]} total={total} />
      </div>

      <div className="mt-7 flex flex-col gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-full bg-grass px-7 py-3 font-extrabold text-white transition hover:brightness-105"
        >
          Practice again
        </button>
        <Link
          to="/"
          className="rounded-full px-7 py-3 font-bold text-muted transition hover:text-ink"
        >
          Back to vocabulary
        </Link>
      </div>
    </div>
  )
}

function ScorePill({
  label,
  score,
  total,
}: {
  label: string
  score: number
  total: number
}) {
  const good = score / total >= 0.6
  return (
    <div
      className={`rounded-2xl px-4 py-4 ${good ? 'bg-grass-soft' : 'bg-sun-soft'}`}
    >
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold">
        {score}
        <span className="text-base font-bold text-muted">/{total}</span>
      </p>
    </div>
  )
}
