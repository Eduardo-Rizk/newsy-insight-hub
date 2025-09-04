import type { VercelRequest, VercelResponse } from '@vercel/node'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

function isYouTubeUrl(url: string) {
  const re = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i
  return re.test(url)
}

function extractYouTubeId(url: string) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    if (u.searchParams.get('v')) return u.searchParams.get('v')
    const paths = u.pathname.split('/')
    const embedIdx = paths.indexOf('embed')
    if (embedIdx !== -1 && paths[embedIdx + 1]) return paths[embedIdx + 1]
    return null
  } catch {
    return null
  }
}

async function readJsonBody(req: VercelRequest): Promise<any> {
  // Try req.body first (Vercel may parse JSON for us)
  if (req.body && typeof req.body === 'object') return req.body
  // Fallback: read raw stream
  const chunks: Uint8Array[] = []
  await new Promise<void>((resolve, reject) => {
    req.on('data', (c: Uint8Array) => chunks.push(c))
    req.on('end', () => resolve())
    req.on('error', (e) => reject(e))
  })
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

async function fetchJson(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

async function fetchYouTubeOEmbed(videoUrl: string) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(videoUrl)}`
  try {
    return await fetchJson(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  } catch {
    return null
  }
}

async function fetchYouTubeTranscript(videoId: string) {
  const endpoint = `https://youtubetranscript.com/?server_vid2=${encodeURIComponent(videoId)}`
  try {
    const data = await fetchJson(endpoint, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (Array.isArray(data)) {
      return data.map((x: any) => x.text).join('\n')
    }
  } catch {
    // ignore
  }
  return null
}

function truncate(str: string, max = 8000) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '\n…[truncated]' : str
}

function defaultGreeting() {
  return 'Análise concluída! Aqui estão os principais pontos do vídeo.'
}

function defaultSummary(transcript?: string, title?: string | null) {
  const base: string[] = []
  if (title) base.push(`Resumo automático do vídeo: ${title}`)
  if (transcript) base.push('Transcrição obtida; análise resumida indisponível sem OpenAI.')
  if (!base.length) base.push('Não foi possível gerar o resumo.')
  return base
}

function defaultLongSummary({ transcript, title }: { transcript?: string | null, title?: string | null }) {
  if (transcript) {
    const sentences = transcript
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean)
      .slice(0, 36)
    const paras: string[] = []
    for (let i = 0; i < sentences.length; i += 5) {
      paras.push(sentences.slice(i, i + 5).join(' '))
    }
    const header = title ? `${title}. ` : ''
    return [header + (paras[0] || ''), ...paras.slice(1)].join('\n\n')
  }
  return title ? `Resumo do vídeo: ${title}. O conteúdo não pôde ser transcrito automaticamente.` : 'Resumo indisponível.'
}

async function openaiSummarize({ transcript, title, channel, url }: { transcript: string, title: string | null, channel: string | null, url: string }) {
  if (!OPENAI_API_KEY) {
    return { greeting: defaultGreeting(), summary: defaultSummary(transcript, title), summary_text: defaultLongSummary({ transcript, title }) }
  }
  const sys = `You are a concise but insightful news assistant. Given a video transcript, produce:
1) A friendly one-sentence greeting to the user.
2) A 3–6 bullet summary of the key points (Portuguese if the content is Portuguese; otherwise match the content language, keep bullets short).
3) An analytical narrative summary that is deeper and more elaborate than the bullets: write 3–10 paragraphs (you may exceed six when helpful), ~300–900 words total. Synthesize arguments, provide context, actors, motivations, timeline, consequences, and relevant counterpoints; avoid list formatting, avoid repeating the bullets verbatim, and use smooth transitions.
Return ONLY valid JSON matching: {"greeting": string, "summary": string[], "summary_text": string}.`

  const user = `Video title: ${title || 'Unknown'}\nChannel: ${channel || 'Unknown'}\nURL: ${url}\nTranscript (may be truncated):\n---\n${truncate(transcript, 8000)}\n---`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SUMMARY_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`)
  const json: any = await res.json()
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI empty content')
  const parsed = JSON.parse(content)
  return parsed
}

async function perplexityRelated({ title, summary, url }: { title: string, summary: string[], url: string }) {
  if (!PERPLEXITY_API_KEY) return [] as any[]
  const sys = 'You are a research assistant that finds recent, credible related news articles. Always return only JSON.'
  const user = `Based on the following context, find 3-5 recent related news articles in Portuguese when appropriate (pt-BR), otherwise the content language. Prefer major outlets. Return ONLY a JSON array of items like {"title": string, "description": string, "link": string}.\nContext:\nTitle: ${title}\nURL: ${url}\nSummary bullets:\n- ${summary.join('\n- ')}`

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.PPLX_MODEL || 'sonar-pro',
      temperature: 0.2,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Perplexity error ${res.status}`)
  const json: any = await res.json()
  const content = json.choices?.[0]?.message?.content || '[]'
  const cleaned = String(content).replace(/^```(json)?/i, '').replace(/```$/,'').trim()
  try {
    const arr = JSON.parse(cleaned)
    if (Array.isArray(arr)) return arr
  } catch {
    try {
      const obj = JSON.parse(cleaned)
      if (Array.isArray(obj.items)) return obj.items
    } catch {}
  }
  return []
}

function withCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  withCors(res)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400')
    return res.status(204).end()
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }
  try {
    const body = await readJsonBody(req)
    const videoUrl = String(body.url || '').trim()
    if (!videoUrl || !isYouTubeUrl(videoUrl)) {
      return res.status(400).json({ error: 'Invalid or missing YouTube URL' })
    }

    const videoId = extractYouTubeId(videoUrl)
    if (!videoId) {
      return res.status(400).json({ error: 'Unable to extract video ID' })
    }

    const meta = await fetchYouTubeOEmbed(videoUrl)
    const title = (meta && (meta as any).title) || null
    const channel = (meta && (meta as any).author_name) || null

    let transcript = await fetchYouTubeTranscript(videoId)
    if (!transcript) {
      transcript = ''
    }

    let aiSummary: any = { greeting: defaultGreeting(), summary: defaultSummary(transcript, title), summary_text: defaultLongSummary({ transcript, title }) }
    try {
      aiSummary = await openaiSummarize({ transcript, title, channel, url: videoUrl })
    } catch (e: any) {
      console.warn('[warn] OpenAI summarize failed:', e?.message)
    }

    let related: any[] = []
    try {
      related = await perplexityRelated({ title: title || '', summary: aiSummary.summary || [], url: videoUrl })
    } catch (e: any) {
      console.warn('[warn] Perplexity related failed:', e?.message)
    }

    return res.status(200).json({
      greeting: aiSummary.greeting,
      summary: aiSummary.summary,
      summaryText: aiSummary.summary_text,
      transcript,
      relatedNews: related,
      meta: { title, channel, videoId },
    })
  } catch (e) {
    console.error('[error] /api/analyze failed', e)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

