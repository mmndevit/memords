import type { Definition, Translation } from '../types'

const MAX_TRANSLATIONS = 6
const MAX_DEFINITIONS = 4
const MAX_EXAMPLES = 3

/**
 * Resolves an English word into a Russian translation + IPA transcription +
 * pronunciation audio + dictionary definitions and example sentences, using two
 * free, key-less public APIs:
 *
 *  - MyMemory          → EN → RU translation
 *  - Free Dictionary   → IPA phonetics + audio file + definitions + examples
 *
 * Both calls run in parallel; either is allowed to fail without breaking the
 * other (a word may have a translation but no known phonetics, and vice versa).
 */
export async function translateWord(rawWord: string): Promise<Translation> {
  const word = rawWord.trim().toLowerCase()
  if (!word) throw new Error('Enter a word first')

  const [translations, dict] = await Promise.all([
    fetchTranslations(word),
    fetchDictionary(word),
  ])

  return {
    russian: translations[0],
    translations,
    transcription: dict.transcription,
    audioUrl: dict.audioUrl,
    definitions: dict.definitions,
    examples: dict.examples,
    found: dict.found,
  }
}

/**
 * Returns several accepted Russian translations (primary first). A single word
 * like "looser" legitimately means «свободный», «рыхлый», «неплотный»… so we
 * gather alternatives — otherwise practice would reject valid answers.
 *
 * Primary source is Google's public translate endpoint, whose `dt=bd` payload
 * carries a part-of-speech dictionary of alternatives. MyMemory is the fallback
 * if that ever fails, yielding at least the single best translation.
 */
async function fetchTranslations(word: string): Promise<string[]> {
  const fromGoogle = await fetchGoogleTranslations(word)
  if (fromGoogle.length > 0) return fromGoogle

  const fallback = await fetchMyMemory(word)
  return [fallback]
}

async function fetchGoogleTranslations(word: string): Promise<string[]> {
  try {
    const url =
      `https://translate.googleapis.com/translate_a/single?client=gtx` +
      `&sl=en&tl=ru&dt=t&dt=bd&q=${encodeURIComponent(word)}`
    const res = await fetch(url)
    if (!res.ok) return []

    // Shape: [ [[main,...],...], [ [pos, [..], [[term,...],...]], ... ], ... ]
    const data = (await res.json()) as [
      Array<[string, ...unknown[]]> | null,
      Array<[string, unknown, Array<[string, ...unknown[]]>]> | null,
      ...unknown[],
    ]

    const main = (data[0] ?? [])
      .map((seg) => seg?.[0] ?? '')
      .join('')
      .trim()

    const alternatives: string[] = []
    for (const group of data[1] ?? []) {
      for (const term of group?.[2] ?? []) {
        if (typeof term?.[0] === 'string') alternatives.push(term[0])
      }
    }

    return dedupe([main, ...alternatives].filter(Boolean), (t) => t).slice(
      0,
      MAX_TRANSLATIONS,
    )
  } catch {
    return []
  }
}

async function fetchMyMemory(word: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    word,
  )}&langpair=en|ru`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Translation service is unavailable')

  const data = (await res.json()) as {
    responseData?: { translatedText?: string }
  }
  const translated = data.responseData?.translatedText?.trim()
  if (!translated) throw new Error(`No translation found for "${word}"`)

  return translated
}

type DictionaryResult = {
  transcription: string
  audioUrl: string | null
  definitions: Definition[]
  examples: string[]
  /** True if the word has a dictionary entry (false only on a definite 404). */
  found: boolean
}

const EMPTY_DICTIONARY: Omit<DictionaryResult, 'found'> = {
  transcription: '',
  audioUrl: null,
  definitions: [],
  examples: [],
}

async function fetchDictionary(word: string): Promise<DictionaryResult> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
        word,
      )}`,
    )
    // A 404 means the word genuinely isn't in the dictionary. Any other
    // failure means we couldn't verify — don't block the user in that case.
    if (!res.ok) {
      return { ...EMPTY_DICTIONARY, found: res.status !== 404 }
    }

    const entries = (await res.json()) as Array<{
      phonetic?: string
      phonetics?: Array<{ text?: string; audio?: string }>
      meanings?: Array<{
        partOfSpeech?: string
        definitions?: Array<{ definition?: string; example?: string }>
      }>
    }>

    const phonetics = entries.flatMap((e) => e.phonetics ?? [])
    const transcription =
      entries.find((e) => e.phonetic)?.phonetic ??
      phonetics.find((p) => p.text)?.text ??
      ''
    const audioUrl =
      phonetics.find((p) => p.audio && p.audio.length > 0)?.audio ?? null

    // Flatten every definition (and its example) across all parts of speech,
    // then de-duplicate and keep a useful handful of each.
    const definitions: Definition[] = []
    const examples: string[] = []
    for (const entry of entries) {
      for (const meaning of entry.meanings ?? []) {
        const partOfSpeech = meaning.partOfSpeech ?? ''
        for (const def of meaning.definitions ?? []) {
          if (def.definition) {
            definitions.push({ partOfSpeech, text: def.definition })
          }
          if (def.example) examples.push(def.example)
        }
      }
    }

    return {
      transcription,
      audioUrl,
      definitions: dedupe(definitions, (d) => d.text).slice(0, MAX_DEFINITIONS),
      examples: dedupe(examples, (e) => e).slice(0, MAX_EXAMPLES),
      found: true,
    }
  } catch {
    // Network error — best-effort, and we can't verify existence, so allow it.
    return { ...EMPTY_DICTIONARY, found: true }
  }
}

function dedupe<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const k = key(item).trim().toLowerCase()
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * Masks the headword (and simple inflections) inside an example sentence so
 * showing examples during practice doesn't hand the learner the answer.
 */
export function maskWord(sentence: string, word: string): string {
  const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!escaped) return sentence
  return sentence.replace(
    new RegExp(`\\b${escaped}(s|es|ed|ing|d)?\\b`, 'gi'),
    '___',
  )
}

// Tracks the recording currently playing so a new word (or a double-tap on the
// same one) can stop it before starting. Without this, overlapping playback
// stacks the same voice on top of itself and you hear an echo.
let currentAudio: HTMLAudioElement | null = null

// Bumped on every stopPlayback() so a deferred synthesized call (one that was
// waiting for voices to load) knows it's stale and skips speaking an old word.
let speechGeneration = 0

/** Stops any recording and any synthesized speech that's still playing. */
function stopPlayback() {
  speechGeneration++
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

/**
 * Builds the URL of our text-to-speech proxy for a word, or null when Supabase
 * isn't configured. The proxy returns one fixed, natural voice for every word
 * and every user (see supabase/functions/tts), so pronunciation is consistent
 * instead of varying by dictionary recording or by the device's own voice.
 */
function ttsUrl(text: string): string | null {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!base) return null
  return `${base}/functions/v1/tts?text=${encodeURIComponent(text)}`
}

/**
 * Plays a word out loud in the app's one clear voice. Uses the TTS proxy so the
 * same neural voice is heard everywhere; only if that request fails (e.g. the
 * user is offline) do we fall back to the browser's built-in speech synthesis
 * so the button is never completely silent.
 */
export function speak(text: string) {
  // Always silence whatever is playing first, so nothing overlaps into an echo.
  stopPlayback()

  const url = ttsUrl(text)
  if (url) {
    const audio = new Audio(url)
    currentAudio = audio
    audio.play().catch(() => {
      // Only fall back if this word is still the active one; if a newer word
      // already replaced it, staying silent avoids an echo.
      if (currentAudio === audio) speakSynthesized(text)
    })
    return
  }
  speakSynthesized(text)
}

// Kick off voice loading as soon as this module is imported. Voices populate
// asynchronously, so requesting them early gives the browser a head start
// before the user ever presses play.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices()
}

/** Picks the best-sounding English voice available, or null if none exist. */
function pickEnglishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  const pool = english.length > 0 ? english : voices
  return (
    // Prefer higher-quality named voices (Google/natural/enhanced) in en-US…
    pool.find(
      (v) =>
        v.lang.toLowerCase() === 'en-us' &&
        /google|natural|enhanced|samantha/i.test(v.name),
    ) ??
    // …then any en-US voice, the browser default, or whatever's first.
    pool.find((v) => v.lang.toLowerCase() === 'en-us') ??
    pool.find((v) => v.default) ??
    pool[0]
  )
}

function speakSynthesized(text: string) {
  if (!('speechSynthesis' in window)) return
  const synth = window.speechSynthesis

  const speakNow = () => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    const voice = pickEnglishVoice(synth.getVoices())
    if (voice) utterance.voice = voice
    synth.cancel()
    synth.speak(utterance)
  }

  // On a fresh page load getVoices() is often still empty; speaking then makes
  // the browser fall back to a robotic default voice. Wait for the voice list
  // to arrive the first time so we can pick a real English voice instead.
  if (synth.getVoices().length > 0) {
    speakNow()
    return
  }

  // Remember which playback this deferred call belongs to; if stopPlayback()
  // runs before the voices arrive, this word is stale and should stay silent.
  const generation = speechGeneration
  let spoken = false
  const run = () => {
    if (spoken || generation !== speechGeneration) return
    spoken = true
    speakNow()
  }
  synth.addEventListener('voiceschanged', run, { once: true })
  // Fallback in case the event never fires (some browsers don't emit it).
  setTimeout(run, 500)
}
