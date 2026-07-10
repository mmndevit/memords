// Text-to-speech proxy: gives every word ONE clear, consistent voice for every
// user (the way Google's pronunciation feature does) instead of mixing variable
// dictionary recordings with each device's own robotic browser voice.
//
// This uses Google's FREE Translate TTS endpoint (translate_tts) — no API key,
// no billing account. The browser can't call it directly (no CORS headers), so
// this function proxies it and keeps a permanent cache of the resulting MP3s in
// a public Storage bucket. That means each word is fetched only ONCE, which
// keeps us well under the endpoint's rate limits and makes repeats free CDN
// hits. Cache hits redirect to the CDN copy; misses fetch, store, and serve.
//
// Note: translate_tts is an unofficial endpoint intended for personal use and
// limited to short text (~200 chars) — perfect for single words/phrases.
//
// Required setup (see README):
//   • a PUBLIC Storage bucket named `tts`
//   • optional secret TTS_LANG  (defaults to "en")
//   • verify_jwt = false in config.toml so <audio> can load it without headers

import { createClient } from 'jsr:@supabase/supabase-js@2'

// Language for the voice. Google Translate serves one consistent voice per
// language; part of the cache key so switching it never serves stale audio.
const LANG = Deno.env.get('TTS_LANG') ?? 'en'
const BUCKET = 'tts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  // Service-role key is injected into every function; it lets us write to
  // Storage regardless of row-level security.
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

// Stable cache path per language + word. The language prefix means switching
// TTS_LANG never serves audio in the old voice, and old files stay reusable if
// you switch back. Non-alphanumerics collapse to hyphens so the path is URL-safe.
function keyFor(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${LANG}/${slug || 'word'}.mp3`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const text = (new URL(req.url).searchParams.get('text') ?? '')
    .slice(0, 200)
    .trim()
  if (!text) {
    return new Response('Missing ?text', { status: 400, headers: corsHeaders })
  }

  const path = keyFor(text)
  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data
    .publicUrl

  // Cache hit → hand the browser the CDN copy so it (and the CDN) cache it too.
  const cached = await fetch(publicUrl, { method: 'HEAD' })
  if (cached.ok) {
    return Response.redirect(publicUrl, 302)
  }

  // Cache miss → fetch once from Google's free Translate TTS endpoint. The
  // `client=tw-ob` param and a browser User-Agent are what keep it from 403ing.
  const ttsUrl =
    'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob' +
    `&tl=${encodeURIComponent(LANG)}&q=${encodeURIComponent(text)}`
  const ttsRes = await fetch(ttsUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })
  if (!ttsRes.ok) {
    return new Response(`TTS failed: ${ttsRes.status}`, {
      status: 502,
      headers: corsHeaders,
    })
  }

  const bytes = new Uint8Array(await ttsRes.arrayBuffer())

  // Store for next time. `upsert` keeps this safe under the occasional race
  // where two requests synthesize the same new word at once.
  await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'audio/mpeg',
    cacheControl: '31536000',
    upsert: true,
  })

  return new Response(bytes, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=31536000',
    },
  })
})
