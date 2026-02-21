# Copilot AI Agent Instructions for Lumina

## Project Overview
- **Lumina** is a Next.js 16 (App Router) web app for immersive e-book reading and library management.
- Core features: EPUB/PDF reader, customizable themes, paginated/scrolled modes, annotation (planned), progress sync, smart library, public domain book discovery (Gutendex API), and Supabase backend.

## Architecture & Key Patterns
- **App Structure:**
  - `app/` — Next.js routes (App Router). Main entry: `app/(main)/`, reader: `app/reader/[bookId]/page.tsx`.
  - `components/` — Modular UI and feature components. Reader UI is under `components/reader/`.
  - `lib/` — Service logic (auth, db, storage, Gutendex integration).
  - `hooks/` — Custom React hooks (e.g., reading sync, infinite scroll).
- **State & Context:**
  - Reader state (theme, font, progress, etc.) is managed via React context (`components/reader/reader-context.tsx`).
  - Progress and settings are autosaved (localStorage, Supabase).
- **Styling:**
  - Uses Tailwind CSS v4, with custom themes and utility classes.
  - Animations via Framer Motion.
- **Data Flow:**
  - Book/user data fetched from Supabase (`lib/db.ts`).
  - Book files stored in Supabase Storage.
  - Discovery via Gutendex API (`lib/gutendex.ts`).

## Developer Workflows
- **Run locally:**
  - `npm install` then `npm run dev` (Node 18+ required)
  - Configure `.env.local` with Supabase credentials
- **Testing:**
  - No formal test suite yet; manual QA and visual checks are standard
- **Debugging:**
  - Use browser devtools and Next.js error overlays
  - Console logs and toast notifications are common for error surfacing
- **Build:**
  - `npm run build` for production

## Project-Specific Conventions
- **Component Structure:**
  - Prefer colocated files (e.g., `components/reader/epub-reader.tsx`)
  - Use `"use client"` for all interactive components
  - UI state is managed via hooks/context, not Redux
- **Error Handling:**
  - User-facing errors are surfaced via toast (`sonner`) or fallback UI
  - Always check for missing book files, user auth, or Supabase errors
- **Accessibility:**
  - Keyboard navigation and ARIA labels are expected for all major controls
- **Customization:**
  - Reader supports themes, font, margin, and layout changes via context/settings

## Integration Points
- **Supabase:** Auth, database, and storage (see `lib/supabase.ts`, `lib/db.ts`)
- **epub.js/pdf.js:** Used for rendering books (`components/reader/epub-reader.tsx`, `pdf-reader.tsx`)
- **Gutendex:** Book discovery/catalog (`lib/gutendex.ts`)
- **Radix UI:** For popovers, tooltips, dialogs, etc.

## Examples
- See `components/reader/reader-ui.tsx` for how the reader is composed
- See `app/reader/[bookId]/page.tsx` for the main reader route logic
- See `components/reader/reader-settings.tsx` for theme/font customization patterns

---

**When in doubt, prefer modular, context-driven, and user-centric patterns.**

---
