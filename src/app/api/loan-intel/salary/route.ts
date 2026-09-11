// Loan Intelligence — Salary lookup
// Returns expected starting salary range for a given course + country, in
// the local currency. Uses Gemini structured JSON; falls back to hardcoded
// estimates when the API is unavailable.

import { NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock' })

const FALLBACK: Record<string, { min: number; avg: number; top: number; currency: string }> = {
  USA: { min: 60000, avg: 95000, top: 140000, currency: 'USD' },
  UK: { min: 28000, avg: 38000, top: 55000, currency: 'GBP' },
  Canada: { min: 50000, avg: 75000, top: 110000, currency: 'CAD' },
  Australia: { min: 55000, avg: 80000, top: 120000, currency: 'AUD' },
  Germany: { min: 45000, avg: 60000, top: 85000, currency: 'EUR' },
  Ireland: { min: 35000, avg: 50000, top: 75000, currency: 'EUR' },
  Singapore: { min: 50000, avg: 75000, top: 110000, currency: 'SGD' },
  Netherlands: { min: 40000, avg: 55000, top: 80000, currency: 'EUR' },
  France: { min: 35000, avg: 48000, top: 70000, currency: 'EUR' },
}

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    min: { type: Type.NUMBER },
    avg: { type: Type.NUMBER },
    top: { type: Type.NUMBER },
    currency: { type: Type.STRING },
  },
  required: ['min', 'avg', 'top', 'currency'],
}

export async function POST(request: Request) {
  try {
    const { course, country } = await request.json()
    const fallback = FALLBACK[country] || FALLBACK['USA']
    const year = new Date().getFullYear()

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock') {
      return NextResponse.json({ data: fallback, source: 'fallback' })
    }

    try {
      const prompt = `What is the average starting salary in USD/GBP/CAD/AUD/EUR for a ${course || 'master\'s degree'} graduate from ${country} in ${year}? Give me: minimum salary, average salary, top 25% salary. Return only JSON: {min: number, avg: number, top: number, currency: string}.`
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.2 },
      })
      const text = response.text
      if (!text) throw new Error('Empty response')
      const data = JSON.parse(text)
      return NextResponse.json({ data, source: 'gemini' })
    } catch (e) {
      return NextResponse.json({ data: fallback, source: 'fallback' })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
