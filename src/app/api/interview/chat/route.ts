import { NextResponse } from 'next/server'
import { generateContentWithFallback } from '@/lib/aiClient'

interface ChatMessage {
  role: 'assistant' | 'user'
  text: string
}

const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_FALLBACK_KEY_1,
  process.env.GROQ_FALLBACK_KEY_2,
].filter(Boolean) as string[]

const GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'groq/compound']

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const interviewType: 'visa' | 'university' = body?.interviewType === 'university' ? 'university' : 'visa'
    const country = body?.country || 'United States'
    const language = body?.language || 'English'
    const profile = body?.profile || {}
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : []

    const studentName = profile.name || 'the candidate'
    const university = profile.target_university || profile.dreamUniversities?.[0] || `a ${country} institution`
    const program = profile.target_degree || profile.target_field || 'a graduate program'
    const fundingSource = profile.funding_source || 'self-funded with family education savings'

    const personaInstructions =
      interviewType === 'visa'
        ? `You are an official consular officer at the ${country} embassy/consulate conducting a formal student visa interview.
Your job is to test genuine non-immigrant intent, funding credibility (${fundingSource}), academic readiness for ${program} at ${university}, and ties to return home.
Be professional, concise, direct, and conversational.`
        : `You are a senior admissions committee interviewer at ${university} interviewing ${studentName} for admission into ${program}.
Your job is to assess academic drive, project experience, leadership, communication skills, and institutional fit.
Be warm, professional, intellectually stimulating, and concise.`

    const isFirstQuestion = messages.length === 0
    const questionCount = messages.filter((m) => m.role === 'assistant').length
    const shouldConclude = questionCount >= 6

    const systemPrompt = `${personaInstructions}

CRITICAL RULES:
1. Speak exclusively in the requested language: "${language}". Do NOT use English unless the requested language is English.
2. Ask only ONE question at a time. Keep your response short (1 to 3 sentences maximum), suitable for natural spoken voice via text-to-speech. Do not output bullet points, asterisks, or markdown formatting.
3. If the candidate just answered, briefly react or follow up directly on what they said before asking the next targeted question.
${shouldConclude ? '4. The candidate has answered sufficient questions. Thank them politely, conclude the interview, and state that the results will be evaluated.' : '4. Dig into specifics (exact numbers, university reasons, professors, career roadmap).'}`

    let formattedMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ]

    if (isFirstQuestion) {
      formattedMessages.push({
        role: 'user',
        content: `Start the interview in ${language}. Introduce yourself briefly as the interviewer and ask the candidate their very first question about their background and intent for ${program} at ${university} in ${country}.`,
      })
    } else {
      for (const m of messages) {
        formattedMessages.push({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.text,
        })
      }
      formattedMessages.push({
        role: 'user',
        content: `Candidate has responded above. Give a brief conversational reaction and ask the next question in ${language}. Remember to keep it spoken, short, and under 3 sentences.`,
      })
    }

    // Attempt Groq LLM first
    let responseText: string | null = null
    for (const key of GROQ_KEYS) {
      for (const model of GROQ_MODELS) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
              'User-Agent': 'EduFin-AI/1.0',
            },
            body: JSON.stringify({
              model,
              messages: formattedMessages,
              temperature: 0.7,
              max_tokens: 250,
            }),
          })

          if (res.ok) {
            const data = await res.json()
            const content = data?.choices?.[0]?.message?.content?.trim()
            if (content) {
              responseText = content
              break
            }
          }
        } catch {
          // try next model / key
        }
      }
      if (responseText) break
    }

    // Fallback to Gemini if Groq was unavailable
    if (!responseText) {
      try {
        const fallbackPrompt = `${systemPrompt}\n\nCandidate interaction so far:\n${messages.map((m) => `${m.role}: ${m.text}`).join('\n')}\n\nProvide the next spoken response/question in ${language} (maximum 3 sentences, clean text with no markdown):`
        const { GoogleGenAI } = await import('@google/genai')
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock' })
        const fallbackResult = await generateContentWithFallback(ai, {
          model: 'gemini-2.5-flash',
          contents: fallbackPrompt,
        })
        if (fallbackResult?.text) {
          responseText = fallbackResult.text
        }
      } catch (geminiErr) {
        console.error('[interview-chat] fallback failed', geminiErr)
      }
    }

    if (!responseText) {
      responseText =
        language.toLowerCase() === 'hindi'
          ? 'नमस्ते। क्या आप मुझे अपने अध्ययन की योजना और विश्वविद्यालय चुनने के कारण के बारे में बता सकते हैं?'
          : `Hello, welcome to your ${interviewType === 'visa' ? 'visa' : 'university'} interview. Could you please tell me why you chose ${university} and what your plans are after graduation?`
    }

    // Strip markdown formatting symbols like * or # for clean audio pronunciation
    const cleanSpeechText = responseText.replace(/[*#_`~]/g, '').trim()

    return NextResponse.json({
      text: cleanSpeechText,
      isFinished: shouldConclude,
      language,
    })
  } catch (err: any) {
    console.error('[interview-chat] error', err)
    return NextResponse.json({ error: err?.message || 'Chat generation failed' }, { status: 500 })
  }
}
