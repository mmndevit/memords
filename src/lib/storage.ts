import { useCallback } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { Definition, Word } from '../types'
import { WORDS_TABLE, isSupabaseConfigured, supabase } from './supabase'

/**
 * The single source of truth for the user's vocabulary, backed by a Supabase
 * (Postgres) table. Reads go through TanStack Query so the list stays cached
 * and in sync; writes optimistically update that cache and then reconcile with
 * the server. The hook's public shape — `words`, `addWord`, `removeWord` — is
 * unchanged from the old localStorage version, so callers don't care where the
 * data actually lives.
 */
const QUERY_KEY = ['vocabulary'] as const

/** Shape of a row in the `words` table (snake_case, as Postgres returns it). */
interface WordRow {
  id: string
  english: string
  russian: string
  translations: string[]
  transcription: string
  audio_url: string | null
  definitions: Definition[]
  examples: string[]
  created_at: string
}

/** Map a database row into the camelCase `Word` the UI works with. */
function rowToWord(row: WordRow): Word {
  return {
    id: row.id,
    english: row.english,
    russian: row.russian,
    translations:
      row.translations && row.translations.length > 0
        ? row.translations
        : [row.russian],
    transcription: row.transcription ?? '',
    audioUrl: row.audio_url,
    definitions: row.definitions ?? [],
    examples: row.examples ?? [],
    createdAt: new Date(row.created_at).getTime(),
  }
}

/** Map a new word (no id/createdAt yet) into a row for insertion. */
function wordToInsert(word: Omit<Word, 'id' | 'createdAt'>) {
  return {
    english: word.english,
    russian: word.russian,
    translations: word.translations,
    transcription: word.transcription,
    audio_url: word.audioUrl,
    definitions: word.definitions,
    examples: word.examples,
  }
}

async function fetchWords(): Promise<Word[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from(WORDS_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as WordRow[]).map(rowToWord)
}

export function useVocabulary() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchWords,
    // Nothing to fetch until credentials are present.
    enabled: isSupabaseConfigured,
  })

  const addMutation = useMutation({
    mutationFn: async (word: Omit<Word, 'id' | 'createdAt'>) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from(WORDS_TABLE)
        .insert(wordToInsert(word))
        .select()
        .single()
      if (error) throw error
      return rowToWord(data as WordRow)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { error } = await supabase.from(WORDS_TABLE).delete().eq('id', id)
      if (error) throw error
      return id
    },
    // Optimistically drop the card so removal feels instant.
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<Word[]>(QUERY_KEY)
      queryClient.setQueryData<Word[]>(QUERY_KEY, (old) =>
        (old ?? []).filter((w) => w.id !== id),
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  const addWord = useCallback(
    (word: Omit<Word, 'id' | 'createdAt'>) => addMutation.mutate(word),
    [addMutation],
  )

  const removeWord = useCallback(
    (id: string) => removeMutation.mutate(id),
    [removeMutation],
  )

  return {
    words: data ?? [],
    addWord,
    removeWord,
    loading: isLoading,
    error: error as Error | null,
    configured: isSupabaseConfigured,
  }
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
