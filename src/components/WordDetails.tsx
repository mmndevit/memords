import { maskWord } from '../lib/translate'
import type { Definition } from '../types'

type WordDetailsProps = {
  definitions: Definition[]
  examples: string[]
  /** When set, occurrences of this word are masked in examples (for practice). */
  maskHeadword?: string
  align?: 'left' | 'center'
}

/**
 * Shared presentation of a word's definitions + example sentences. Reused by
 * the vocabulary popup and the practice flashcard.
 */
export function WordDetails({
  definitions,
  examples,
  maskHeadword,
  align = 'left',
}: WordDetailsProps) {
  if (definitions.length === 0 && examples.length === 0) {
    return (
      <p className="text-sm font-semibold text-muted">
        No definitions or examples were found for this word.
      </p>
    )
  }

  const alignment = align === 'center' ? 'text-center' : 'text-left'

  return (
    <div className={`flex flex-col gap-5 ${alignment}`}>
      {definitions.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
            Definitions
          </h3>
          <ol className="flex flex-col gap-2">
            {definitions.map((def, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-grass-soft text-xs font-extrabold text-grass">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold leading-snug text-ink">
                  {def.partOfSpeech && (
                    <span className="mr-1.5 italic text-muted">
                      {def.partOfSpeech}
                    </span>
                  )}
                  {def.text}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {examples.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
            Examples
          </h3>
          <ul className="flex flex-col gap-2">
            {examples.map((ex, i) => (
              <li
                key={i}
                className="rounded-xl bg-sun-soft px-3.5 py-2.5 text-sm font-semibold italic leading-snug text-ink"
              >
                “{maskHeadword ? maskWord(ex, maskHeadword) : ex}”
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
