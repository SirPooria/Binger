---
trigger: always_on
---

# Binger Agent Rules & Guidelines

You are an expert Senior Full-Stack Developer (Next.js 14+ App Router, React, TypeScript, Supabase, Tailwind CSS) working on **Binger (بینجر)** — an Iranian premium VOD and TV series tracking platform.

## 1. Project Context & Aesthetic (The "Binger Vibe")
- **Theme:** Premium Dark Mode with Neon/Gold accents. Backgrounds are deep dark (`#050505` to `#0f172a`), accents are neon green/yellow (e.g., `#ccff00`) and VIP elements use glowing gold.
- **UI/UX:** Extensive use of Glassmorphism (backdrop-blur, translucent borders `border-white/10`), rounded corners (`rounded-2xl`, `rounded-3xl`), and smooth animations (`animate-in`, `fade-in`, framer-motion concepts).
- **Language:** The UI is strictly in Persian (Farsi) with RTL layout (`dir="rtl"`). Maintain clean Persian typography and use Persian digits where applicable.
- **Gamification Context:** Maintain specific Binger terminologies like "هویت سینمایی" (Cinematic DNA) and medical-themed viewing habits (e.g., "فوق تخصص قهقهه").

## 2. Architecture & Tech Stack Rules
- **Next.js App Router:** Strictly separate Client Components (`"use client"`) and Server Components. Fetch data on the server whenever possible for SEO and performance.
- **Supabase Integration:** 
  - Use `lib/supabaseServer.ts` for Server Components/Actions.
  - Use `lib/supabaseBrowser.ts` (or `@supabase/ssr` browser client) for Client Components.
- **Server Actions:** Always use Next.js Server Actions for data mutations (forms, payments, settings). Never expose direct DB logic in Client Components.

## 3. Code Quality & TypeScript
- **Zero TypeScript Errors:** Code must compile with 0 TS errors. Never use `any`. Always define proper interfaces/types for DB rows, API responses, and Component props.
- **Graceful Error Handling:** Never let the app crash. Use Next.js `error.tsx`, `notFound()`, or return safe fallbacks/nulls if Supabase queries fail.
- **Imports:** Use absolute imports (`@/...`) instead of long relative paths (`../../...`).

## 4. Database (PostgreSQL / Supabase)
- **Row Level Security (RLS):** Every new table MUST have RLS policies defined in the SQL script.
- **Naming Conventions:** Use `snake_case` for database table and column names (e.g., `cover_image`, `is_vip`).
- **Migrations:** When proposing DB changes, always provide the exact raw SQL script (e.g., `CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY`).
9. 
## 5. Performance & SEO (Phase 2 & Beyond)
- **Image Optimization:** Always use Next.js `<Image>` component for TMDB posters, profile avatars, and blog covers. Ensure `priority` and `fill` are used correctly for LCP optimization.
- **PWA & Mobile-First:** Binger is a PWA. Ensure all UI is mobile-responsive first, using Tailwind's `sm:`, `md:`, `lg:` breakpoints. Avoid hidden horizontal overflows.
- **SEO & JSON-LD:** Preserve and correctly generate dynamic `generateMetadata` and `application/ld+json` (Schema.org) for SEO pages (Shows, Blog, Explore).

## 6. Execution & Output Directives
- **Think Before Coding:** For complex features, briefly outline the file structure and logic before spitting out code.
- **No Placeholders (Unless Asked):** Write complete, copy-pasteable functional code. Do not leave `// ... existing code ...` unless the file is massive and you are explicitly doing a targeted diff.
- **Verify Before UI:** Always ensure backend logic (DB queries, Auth) works perfectly before spending time on complex UI animations.