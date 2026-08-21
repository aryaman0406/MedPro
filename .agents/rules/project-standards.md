# Project Standards & Standing Rules

## STACK
- Next.js 15, App Router, TypeScript (strict mode), Node 20+
- Tailwind CSS + shadcn/ui components + Framer Motion for animation
- Prisma ORM against PostgreSQL (Neon)
- Auth.js (NextAuth v5) with a Credentials provider and JWT sessions
- Server Actions for mutations where practical; Route Handlers under `app/api/**` for anything a background job or external service needs to call
- All secrets in `.env.local`, never hardcoded, never committed. Provide a matching `.env.example` whenever you add a new env var.

## CODE QUALITY RULES
- Strict TypeScript everywhere: no `any`, no `@ts-ignore` without a comment explaining why.
- Every Prisma schema change must ship with a migration (`prisma migrate dev`), never manual SQL drift.
- Every API route and Server Action must validate its input with Zod before doing anything else, and return typed error responses on invalid input.
- Every external call (Gemini, Brevo, Google Calendar, Pusher, Redis) must be wrapped in try/catch. On failure: log the error, degrade gracefully (never throw an unhandled 500 to the user), and leave a clear TODO/status in the DB so it can be retried.
- No feature is "done" until you have manually described how you verified it works (what you ran, what you clicked, what you expected vs saw).
- Write a short RUNBOOK.md note for every new external service integrated, listing exactly which free-tier account/API key the human needs to create.

## UI RULES
- Use shadcn/ui components as the base for every interactive element (forms, dialogs, tables, toasts) rather than raw HTML.
- Every page needs a loading state (skeleton), an empty state, and an error state — never a blank white screen.
- Support dark mode via Tailwind's class strategy from the start, not bolted on later.
- Mobile-first layout; test every screen down to 375px width.

## GIT
- Confirm `.gitignore` excludes `node_modules`, `.env*`, `.next`, and any generated Prisma client output before the first commit.
- Commit in small, logically scoped commits with clear messages as you go, not one giant commit at the end.
