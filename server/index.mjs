import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { URL } from 'node:url'

// Simple .env loader (avoid external deps)
async function loadEnv(path = '.env') {
  try {
    const raw = await readFile(path, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue
      const idx = line.indexOf('=')
      if (idx === -1) continue
      const key = line.slice(0, idx).trim()
      const val = line.slice(idx + 1).trim()
      if (key && !(key in process.env)) process.env[key] = val
    }
  } catch {
    // no-op if .env not found
  }
}

await loadEnv()

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

if (!OPENAI_API_KEY) {
  console.warn('[warn] OPENAI_API_KEY not set in environment')
}
if (!PERPLEXITY_API_KEY) {
  console.warn('[warn] PERPLEXITY_API_KEY not set in environment')
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001
const ORIGIN = process.env.CORS_ORIGIN || '*' // e.g., http://localhost:5173 for dev

function send(res, status, data, headers = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...headers,
  })
  res.end(body)
}

function isYouTubeUrl(url) {
  const re = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i
  return re.test(url)
}

function extractYouTubeId(url) {
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

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

async function fetchText(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

async function fetchYouTubeOEmbed(videoUrl) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(videoUrl)}`
  try {
    return await fetchJson(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  } catch {
    return null
  }
}

async function fetchYouTubeTranscript(videoId) {
  // Unofficial public endpoint used by popular transcript tools.
  const endpoint = `https://youtubetranscript.com/?server_vid2=${encodeURIComponent(videoId)}`
  try {
    const data = await fetchJson(endpoint, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (Array.isArray(data)) {
      return data.map((x) => x.text).join('\n')
    }
  } catch (e) {
    // swallow and return null fallback
  }
  return null
}

function truncate(str, max = 8000) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '\n…[truncated]' : str
}

async function openaiSummarize({ transcript, title, channel, url }) {
  if (!OPENAI_API_KEY) return { greeting: defaultGreeting(), summary: defaultSummary(transcript, title), summary_text: defaultLongSummary({ transcript, title }) }
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
  const json = await res.json()
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI empty content')
  const parsed = JSON.parse(content)
  return parsed
}

async function perplexityRelated({ title, summary, url }) {
  if (!PERPLEXITY_API_KEY) return []
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
  const json = await res.json()
  const content = json.choices?.[0]?.message?.content || '[]'
  // Sometimes models wrap code fences; strip them.
  const cleaned = String(content).replace(/^```(json)?/i, '').replace(/```$/,'').trim()
  try {
    const arr = JSON.parse(cleaned)
    if (Array.isArray(arr)) return arr
  } catch {
    // Try to coerce if returns object with items field
    try {
      const obj = JSON.parse(cleaned)
      if (Array.isArray(obj.items)) return obj.items
    } catch {
      // ignore
    }
  }
  return []
}

function defaultGreeting() {
  return "Análise concluída! Aqui estão os principais pontos do vídeo."
}

function defaultSummary(transcript, title) {
  const base = []
  if (title) base.push(`Resumo automático do vídeo: ${title}`)
  if (transcript) base.push('Transcrição obtida; análise resumida indisponível sem OpenAI.')
  if (!base.length) base.push('Não foi possível gerar o resumo.')
  return base
}

function defaultLongSummary({ transcript, title }) {
  if (transcript) {
    const sentences = transcript
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean)
      .slice(0, 36) // up to ~36 sentences for fallback
    // Group into paragraphs of ~4–6 sentences
    const paras = []
    for (let i = 0; i < sentences.length; i += 5) {
      paras.push(sentences.slice(i, i + 5).join(' '))
    }
    const header = title ? `${title}. ` : ''
    return [header + (paras[0] || ''), ...paras.slice(1)].join('\n\n')
  }
  // Fallback if no transcript
  return title ? `Resumo do vídeo: ${title}. O conteúdo não pôde ser transcrito automaticamente.` : 'Resumo indisponível.'
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': ORIGIN,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    })
    return res.end()
  }

  const { method, url } = req
  if (method === 'GET' && url === '/health') {
    return send(res, 200, { ok: true })
  }

  if (method === 'POST' && url === '/api/analyze') {
    try {
      const body = await readJsonBody(req)
      const videoUrl = String(body.url || '').trim()
      if (!videoUrl || !isYouTubeUrl(videoUrl)) {
        return send(res, 400, { error: 'Invalid or missing YouTube URL' })
      }

      const videoId = extractYouTubeId(videoUrl)
      if (!videoId) {
        return send(res, 400, { error: 'Unable to extract video ID' })
      }

      const meta = await fetchYouTubeOEmbed(videoUrl)
      const title = meta?.title || null
      const channel = meta?.author_name || null

      let transcript = await fetchYouTubeTranscript(videoId)
      if (!transcript) {
        transcript = ''
      }

      let aiSummary = { greeting: defaultGreeting(), summary: defaultSummary(transcript, title), summary_text: defaultLongSummary({ transcript, title }) }
      try {
        aiSummary = await openaiSummarize({ transcript, title, channel, url: videoUrl })
      } catch (e) {
        console.warn('[warn] OpenAI summarize failed:', e.message)
      }

      let related = []
      try {
        related = await perplexityRelated({ title: title || '', summary: aiSummary.summary || [], url: videoUrl })
      } catch (e) {
        console.warn('[warn] Perplexity related failed:', e.message)
      }

      return send(res, 200, {
        greeting: aiSummary.greeting,
        summary: aiSummary.summary,
        summaryText: aiSummary.summary_text,
        transcript, // kept for potential future use
        relatedNews: related,
        meta: { title, channel, videoId },
      })
    } catch (e) {
      console.error('[error] /api/analyze failed', e)
      return send(res, 500, { error: 'Internal Server Error' })
    }
  }

  send(res, 404, { error: 'Not Found' })
})

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
  if (ORIGIN !== '*') console.log(`[server] CORS origin: ${ORIGIN}`)
})
