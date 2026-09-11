import { NextResponse } from 'next/server'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_fba5cf151cea3db4dfb248622cd85872fd097a02fa15520e'
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'gHu9GtaHOXcSqFTK06ux'
const FALLBACK_VOICE_ID = process.env.ELEVENLABS_FALLBACK_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const text = (body?.text || '').trim()
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const requestedVoice = body?.voiceId || DEFAULT_VOICE_ID
    const model = body?.modelId || MODEL_ID

    // Try requested voice first
    let audioBuffer = await synthesizeSpeech(text, requestedVoice, model)

    // If requested voice failed (e.g. library voice requiring paid plan), retry with fallback
    if (!audioBuffer && requestedVoice !== FALLBACK_VOICE_ID) {
      console.warn(`[tts] Retrying speech synthesis with fallback voice: ${FALLBACK_VOICE_ID}`)
      audioBuffer = await synthesizeSpeech(text, FALLBACK_VOICE_ID, model)
    }

    if (!audioBuffer) {
      return NextResponse.json({ error: 'Speech synthesis failed' }, { status: 500 })
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err: any) {
    console.error('[tts] error', err)
    return NextResponse.json({ error: err?.message || 'TTS endpoint error' }, { status: 500 })
  }
}

async function synthesizeSpeech(text: string, voiceId: string, modelId: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.warn(`[tts] ElevenLabs returned ${res.status} for voice ${voiceId}:`, errText)
      return null
    }

    return await res.arrayBuffer()
  } catch (e) {
    console.error(`[tts] Network error for voice ${voiceId}:`, e)
    return null
  }
}
