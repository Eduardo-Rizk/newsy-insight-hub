# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/680daabe-9bf5-4c82-a069-f8bf0143eb4b

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/680daabe-9bf5-4c82-a069-f8bf0143eb4b) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Backend (API)

This repo now includes a minimal Node.js backend that powers the YouTube analysis flow.

- Server entry: `server/index.mjs`
- Endpoint: `POST /api/analyze` with JSON `{ "url": "<YouTube URL>" }`
- Uses env vars from `.env`: `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, optional `CORS_ORIGIN`, `OPENAI_SUMMARY_MODEL`, `PPLX_MODEL`.

Run locally (Node 18+):

```sh
# 1) Ensure your .env has your keys
#    OPENAI_API_KEY=...
#    PERPLEXITY_API_KEY=...

# 2) Start the backend in one terminal
npm run server
# -> listens on http://localhost:3001

# 3) Start the frontend in a second terminal
npm run dev
# -> open http://localhost:8080

# The frontend proxies /api -> http://localhost:3001 in dev.
```

Notes:
- Transcripts are fetched via a public transcript endpoint; some videos may not have transcripts available. If none is found, the transcript may be empty.
- Summaries use OpenAI (model configurable via `OPENAI_SUMMARY_MODEL`, default `gpt-4o-mini`).
- Related articles use Perplexity (`PPLX_MODEL`, default `sonar-pro`) and return 3–5 links.
- For production, set `CORS_ORIGIN` to your site origin (e.g. `https://your-domain`).

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/680daabe-9bf5-4c82-a069-f8bf0143eb4b) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
