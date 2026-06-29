export interface Definition {
  partOfSpeech: string
  text: string
}

export interface Word {
  id: string
  /** Source word the user typed, in English */
  english: string
  /** Primary Russian translation, shown on the card (== translations[0]) */
  russian: string
  /** All accepted Russian translations; any one counts as correct in practice */
  translations: string[]
  /** IPA phonetic transcription, e.g. /həˈloʊ/ — may be empty if unavailable */
  transcription: string
  /** URL to a pronunciation audio file, if the dictionary provided one */
  audioUrl: string | null
  /** English dictionary definitions (we aim for 3+ when available) */
  definitions: Definition[]
  /** Example sentences using the word (we aim for 2+ when available) */
  examples: string[]
  createdAt: number
}

/** What the translation service resolves to for a given English word. */
export interface Translation {
  russian: string
  translations: string[]
  transcription: string
  audioUrl: string | null
  definitions: Definition[]
  examples: string[]
  /** Whether the word exists in the English dictionary. */
  found: boolean
}
