// College Lookup — finds the best-fit college for the student's profile in
// the chosen destination country.
//
// Pipeline (in order):
//   1) Google Places Text Search via GOOGLE_PLACES_API_KEY (server-side key,
//      no referer restriction). Returns a ranked list of place candidates;
//      we keep the top-most that looks like a university and grab name,
//      address, lat/lng.
//   2) Serper Google Search fallback — used when Places fails or no key.
//   3) Synthesised record from the user's hint as a last resort.

import { NextResponse } from 'next/server'

interface LookupBody {
  hint?: string
  country: string
  degree?: string
  field?: string
}

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY

// Place types we treat as university-like (Places API New).
const UNI_TYPES = new Set([
  'university',
  'school',
  'educational_institution',
  'point_of_interest',
  'establishment',
])

interface SerperOrganic {
  title: string
  link: string
  snippet: string
}
interface SerperResponse {
  knowledgeGraph?: {
    title?: string
    description?: string
    attributes?: Record<string, string>
  }
  organic?: SerperOrganic[]
  places?: { title: string; address: string }[]
}

function looksLikeUniversity(s: string): boolean {
  return /(university|institute|college|school|polytechnic|tech|grande|école)/i.test(s)
}

function cleanName(raw: string): string {
  return raw
    .replace(/\s*[—|–-]\s*(wikipedia|home page|official.*|about|admissions?|programs?).*$/i, '')
    .replace(/^\s*about\s*[—|–-]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractCity(address: string): string {
  if (!address) return ''
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 3) return parts[parts.length - 3]
  if (parts.length >= 2) return parts[0]
  return ''
}

function buildQuery(hint: string, field?: string, country?: string): string {
  const parts: string[] = []
  if (hint) parts.push(hint)
  parts.push('university')
  if (field && !hint.toLowerCase().includes(field.toLowerCase())) parts.push(field)
  if (country) parts.push(country)
  return parts.join(' ').trim()
}

async function googlePlacesLookup(query: string, country: string) {
  if (!PLACES_KEY) return null
  try {
    // Places API (New) — searchText endpoint. Requires X-Goog-Api-Key header
    // and an X-Goog-FieldMask listing the response fields we want.
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_KEY,
        'X-Goog-FieldMask':
          'places.displayName,places.formattedAddress,places.id,places.types,places.location',
      },
      body: JSON.stringify({
        textQuery: query,
        includedType: 'university',
        pageSize: 5,
      }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      places?: Array<{
        id?: string
        displayName?: { text?: string }
        formattedAddress?: string
        types?: string[]
        location?: { latitude: number; longitude: number }
      }>
    }
    if (!data.places || data.places.length === 0) return null

    const top =
      data.places.find((p) =>
        (p.types || []).some((t) => UNI_TYPES.has(t)) ||
        looksLikeUniversity(p.displayName?.text || ''),
      ) || data.places[0]

    const name = cleanName(top.displayName?.text || '')
    const address = top.formattedAddress || country
    return {
      name,
      formatted_address: address,
      place_id: top.id || '',
      country,
      city: extractCity(address),
      lat: top.location?.latitude ?? null,
      lng: top.location?.longitude ?? null,
      confidence: 'high' as const,
    }
  } catch {
    return null
  }
}

async function serperLookup(query: string, country: string) {
  if (!process.env.SERPER_API_KEY) return null
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, gl: 'in', hl: 'en', num: 6 }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as SerperResponse

    if (data.knowledgeGraph?.title) {
      const kg = data.knowledgeGraph
      const name = cleanName(kg.title!)
      const address = kg.attributes?.['Address'] || kg.attributes?.['Location'] || country
      return {
        name,
        formatted_address: address,
        place_id: '',
        country,
        city: extractCity(address),
        lat: null as number | null,
        lng: null as number | null,
        confidence: 'high' as const,
      }
    }

    if (data.places && data.places.length > 0) {
      const p = data.places[0]
      return {
        name: cleanName(p.title),
        formatted_address: p.address || country,
        place_id: '',
        country,
        city: extractCity(p.address || ''),
        lat: null as number | null,
        lng: null as number | null,
        confidence: 'high' as const,
      }
    }

    const organic = data.organic || []
    const top = organic.find((o) => looksLikeUniversity(o.title)) || organic[0]
    if (!top) return null
    const cleaned = cleanName(top.title)
    return {
      name: cleaned,
      formatted_address: top.snippet?.slice(0, 200) || country,
      place_id: '',
      country,
      city: extractCity(top.snippet || ''),
      lat: null as number | null,
      lng: null as number | null,
      confidence: looksLikeUniversity(cleaned) ? ('medium' as const) : ('low' as const),
    }
  } catch {
    return null
  }
}

function synth(hint: string, country: string) {
  return {
    name: hint || `Top universities in ${country}`,
    formatted_address: country,
    place_id: '',
    country,
    city: '',
    lat: null as number | null,
    lng: null as number | null,
    confidence: 'estimate' as const,
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LookupBody
    const country = body.country?.trim() || 'USA'
    const hint = (body.hint || '').trim()
    const query = buildQuery(hint, body.field, country)

    // Try Google Places first.
    const fromPlaces = await googlePlacesLookup(query, country)
    if (fromPlaces) {
      return NextResponse.json({ match: fromPlaces, source: 'google-places' })
    }

    // Fall back to Serper.
    const fromSerper = await serperLookup(query, country)
    if (fromSerper) {
      return NextResponse.json({ match: fromSerper, source: 'serper' })
    }

    return NextResponse.json({ match: synth(hint, country), source: 'fallback' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Lookup failed' }, { status: 500 })
  }
}
