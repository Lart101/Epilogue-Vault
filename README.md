# Epilogue Vault

> *Where ancient archives meet the echoes of future intelligence.*

A full-stack reading companion application built with **Next.js 15**, **Supabase**, and an AI layer powered by **Groq LLM**. Epilogue Vault lets users manage their personal book library, discover new titles, and generate immersive AI podcast experiences from any book in their collection.

---

## ✨ Features

- **Personal Library** — Upload EPUB/PDF books, browse your collection, and read with a built-in reader
- **Discover** — Browse public domain titles from Project Gutenberg  
- **Resonance Lab** — Transform books into multi-season AI podcast series in 5 distinct tones
- **Global Resonance Sharing** — Generated content is shared across users for the same book+tone, eliminating redundant AI calls
- **Token-Optimised Generation** — Smart content slicing sends only relevant text per episode; episodes generate in parallel batches
- **In-App Player** — Spotify-inspired podcast player with episode navigation and Text-to-Speech synthesis

---

## 🏗️ Project Structure

```
├── app/
│   ├── (auth)/           # Login & sign-up pages
│   ├── (main)/           # Authenticated app shell
│   │   ├── ai-lab/       # Resonance Lab page
│   │   ├── discover/     # Gutenberg book discovery
│   │   ├── library/      # Personal library management
│   │   └── layout.tsx    # App shell + player
│   ├── api/
│   │   ├── ai/           # /generate (Groq) and /share (global resonance)
│   │   ├── proxy/        # Gutenberg content proxy
│   │   └── tts/          # Text-to-Speech synthesis
│   └── reader/           # Full-screen book reader
│
├── components/
│   ├── ai/               # Resonance Lab UI: archives, detail view
│   ├── library/          # Library cards, upload, book row
│   ├── reader/           # Reader engine and player controls
│   ├── store/            # Generation pill, notification listener
│   ├── providers/        # Auth context provider
│   └── ui/               # shadcn/ui base components
│
├── lib/
│   ├── ai-config.ts      # ★ Central AI config: models, limits, parameters
│   ├── auth-service.ts   # All auth helpers (email, OAuth, session)
│   ├── content-optimizer.ts  # Smart text truncation for token savings
│   ├── db.ts             # Supabase data access layer
│   ├── extractors.ts     # EPUB/PDF text extraction
│   ├── gemini.ts         # Groq LLM prompt builders & parsers
│   ├── generation-store.ts   # Pub/sub store for active generation jobs
│   ├── gutendex.ts       # Gutenberg API client
│   ├── notification-store.ts # Pub/sub store for in-app notifications
│   ├── player-store.ts   # Global audio player state store
│   ├── series-generation.ts  # Orchestrator: extract → outline → episodes
│   ├── storage-service.ts    # Supabase Storage file operations
│   ├── supabase.ts       # Supabase client singleton
│   └── utils.ts          # Shared utilities (cn, etc.)
│
└── hooks/                # Custom React hooks
```

---

## ⚙️ AI Config

All AI generation settings live in **`lib/ai-config.ts`** — the single file to edit for:

| Setting | Description | Default |
|---|---|---|
| `GROQ_FALLBACK_MODELS` | Model waterfall order | 5 models |
| `temperature` | LLM creativity (0–1) | `0.7` |
| `episodeBatchSize` | Episodes generated in parallel | `3` |
| `outlineMaxWords` | Token cap for series outline | `6,000` |
| `episodeMaxWords` | Token cap per episode | `2,500` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- A Groq API key

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, GROQ_API_KEY

# 3. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🔒 Security

- All API routes verify JWT tokens before processing requests
- Row Level Security (RLS) is enforced at the database level
- AI-generated artifacts are user-scoped; cross-user sharing is strictly managed through the `/api/ai/share` endpoint

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database & Auth | Supabase |
| AI / LLM | Groq (Llama, GPT-OSS models) |
| Styling | Tailwind CSS + shadcn/ui |
| Animations | Framer Motion |
| Book Parsing | epubjs, pdfjs-dist |
