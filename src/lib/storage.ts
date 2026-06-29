import { useCallback, useEffect, useState } from 'react'
import type { Word } from '../types'

const STORAGE_KEY = 'memords.vocabulary'

/**
 * The single source of truth for the user's vocabulary. Today it's backed by
 * localStorage — swapping in a real database later means changing only the
 * `load` / `persist` helpers below; the hook's API stays the same.
 */
function load(): Word[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    // Backfill fields added in later versions so older saves don't crash.
    return (JSON.parse(raw) as Word[]).map((w) => ({
      ...w,
      definitions: w.definitions ?? [],
      examples: w.examples ?? [],
      translations:
        w.translations && w.translations.length > 0
          ? w.translations
          : [w.russian],
    }))
  } catch {
    return []
  }
}

function persist(words: Word[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words))
}

export function useVocabulary() {
  const [words, setWords] = useState<Word[]>(load)

  useEffect(() => {
    persist(words)
  }, [words])

  const addWord = useCallback((word: Omit<Word, 'id' | 'createdAt'>) => {
    setWords((prev) => [
      { ...word, id: crypto.randomUUID(), createdAt: Date.now() },
      ...prev,
    ])
  }, [])

  const removeWord = useCallback((id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id))
  }, [])

  return { words, addWord, removeWord }
}

/**
 * Compares a typed answer against the expected one, forgivingly: case- and
 * whitespace-insensitive, and treats Russian ё/е as interchangeable. A word
 * with several comma- or slash-separated translations counts as correct if the
 * answer matches any one of them.
 *
 * Because the auto-translation only ever stores a single Russian form (e.g.
 * "arranged" → "расположены"), an exact match would reject every other valid
 * inflection the learner might type ("расположенный", "расположенная", …). So
 * beyond an exact match we also accept a close inflectional variant: a small
 * edit distance relative to the word length. Short words still require an exact
 * match, so unrelated words like "кот"/"код" are never confused.
 */
function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.!?]/g, '')
    .replace(/\s+/g, ' ')
}

export function isAnswerCorrect(
  answer: string,
  expected: string | string[],
): boolean {
  const answ = normalizeAnswer(answer)
  if (!answ) return false

  const candidates = (Array.isArray(expected) ? expected : [expected])
    .flatMap((e) => e.split(/[,/;]/))
    .map(normalizeAnswer)
    .filter(Boolean)

  return candidates.some((c) => answ === c || isInflectionMatch(answ, c))
}

/** True if two words differ only by a short ending — i.e. likely inflections. */
function isInflectionMatch(a: string, b: string): boolean {
  // Single-word answers only; phrases must match exactly.
  if (a.includes(' ') || b.includes(' ')) return false

  const shorter = Math.min(a.length, b.length)
  const longer = Math.max(a.length, b.length)
  if (shorter < 4) return false

  // They must share a real stem, otherwise edit distance alone is too loose.
  if (commonPrefixLength(a, b) < Math.ceil(shorter * 0.6)) return false

  // Allow the ending to differ by a few chars, capped at 3. From 5 letters up
  // we allow at least 2 so gender endings (-ый → -ая → -ое) still match.
  const floor = shorter >= 5 ? 2 : 1
  const allowed = Math.min(3, Math.max(floor, Math.floor(longer / 4)))
  return levenshtein(a, b) <= allowed
}

function commonPrefixLength(a: string, b: string): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array<number>(n + 1)

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}
