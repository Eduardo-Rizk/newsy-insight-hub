# Newsy Insight Hub

Aplicação que analisa vídeos de notícias do YouTube, gera um resumo em bullets, um resumo analítico mais profundo e sugere matérias relacionadas.

Deploy de produção: https://newsy-insight-hub.vercel.app/

## Tecnologias
- Vite + React + TypeScript
- Tailwind CSS + shadcn-ui
- Funções Serverless na Vercel (rotas `/api/*`)

## Como funciona
- O frontend envia `POST /api/analyze` com `{ "url": "<URL do YouTube>" }`.
- A API extrai o ID do vídeo, busca metadados via oEmbed e tenta obter a transcrição pública via `youtubetranscript.com`.
  - Nem todo vídeo possui transcrição; quando indisponível, o app retorna um resumo de fallback baseado no pouco texto disponível.
- Se houver chave `OPENAI_API_KEY`, a API chama o endpoint de Chat Completions da OpenAI para produzir:
  - `greeting`: uma saudação amigável de 1 frase.
  - `summary`: 3–6 bullets concisos (em pt‑BR quando apropriado).
  - `summary_text`: um texto analítico de ~300–900 palavras, em parágrafos.
- Se houver `PERPLEXITY_API_KEY`, a API consulta a Perplexity para trazer 3–5 notícias relacionadas confiáveis e recentes (tenta parsear o JSON retornado, com fallback para lista vazia se necessário).
- O frontend renderiza a saudação, bullets, o texto analítico, a transcrição (colapsável) e os links das matérias relacionadas.

## Endpoints (Vercel Functions)
- `POST /api/analyze` → body `{ url: string }` retorna:
  - `greeting: string`
  - `summary: string[]`
  - `summaryText: string`
  - `transcript: string`
  - `relatedNews: { title, description, link }[]`
  - `meta: { title, channel, videoId }`
- `GET /api/health` → `{ ok: true }`

Código das funções:
- `api/analyze.ts`
- `api/health.ts`

## Variáveis de ambiente
- `OPENAI_API_KEY` (obrigatória para resumos “inteligentes”; sem ela, usa fallback)
- `PERPLEXITY_API_KEY` (opcional, ativa “Related News”)
- `OPENAI_SUMMARY_MODEL` (opcional; default `gpt-4o-mini`)
- `PPLX_MODEL` (opcional; default `sonar-pro`)

Defina-as no painel do projeto da Vercel (Preview e Production).

## Desenvolvimento local
Requisitos: Node.js 18+ e npm.

```sh
npm i

# Opção A: usar Vercel Dev (recomendado para testar /api)
npm i -g vercel
vercel dev

# Em paralelo, rode o front com Vite (se preferir hot reload)
npm run dev

# Dica: para o front chamar a API do Vercel Dev (http://localhost:3000),
# crie .env.local com: VITE_API_BASE=http://localhost:3000
```

Obs.: O repositório ainda contém `server/index.mjs` (um servidor Node simples) que não é usado na Vercel; pode ser útil apenas para experiências locais.

## Build e Deploy (Vercel)
- A build do front é `npm run build` (resultado em `dist/`).
- A Vercel publica `dist/` como estático e expõe as funções em `/api/*`.
- Arquivo `vercel.json` já configura rewrites de SPA e preserva `/api/*`.

Passos:
1) Conecte o repositório no dashboard da Vercel (New Project → Import).
2) Configure as variáveis de ambiente (Preview/Production).
3) Deploy: a cada push, a Vercel cria um Preview. Promova para Production quando desejar.
4) Teste `GET /api/health` e o app na raiz.
