# MedTrack Pro - External Services & Environment Runbook

This document tracks all external services integrated into MedTrack Pro, setup steps, and environment variable requirements.

---

## 1. PostgreSQL Database (Supabase / Neon)

### Overview
MedTrack Pro uses Prisma ORM against a PostgreSQL relational database.

### Setup Instructions
1. **Create Free Account**:
   - Go to [Supabase](https://supabase.com) (or [Neon](https://neon.tech)) and create a free project.
2. **Retrieve Connection String**:
   - **Supabase**: Navigate to `Project Settings` → `Database` → `Connection String` (URI / Node.js).
   - **Neon**: Navigate to `Dashboard` → `Connection Details` → `Prisma` / `PostgreSQL connection string`.
3. **Configure `.env.local`**:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
   ```
4. **Run Migrations & Seed**:
   ```bash
   npx prisma db push
   npm run db:seed
   ```

---

## 2. Authentication (Auth.js v5 / NextAuth)

### Overview
Authentication uses Credentials provider with Bcrypt password hashing and JWT sessions.

### Setup Instructions
1. Generate an `AUTH_SECRET`:
   ```bash
   # In terminal or powershell:
   openssl rand -base64 32
   ```
2. Add to `.env.local`:
   ```env
   AUTH_SECRET="your-generated-secret"
   NEXTAUTH_URL="http://localhost:3000"
   ```

---

## 3. Seeded Accounts Reference

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin** | `admin@medtrack.pro` | `AdminPass123!` | Full clinic administration & analytics |
| **Doctor** | `sarah.jenkins@medtrack.pro` | `DoctorPass123!` | Cardiology specialist (9:00 - 17:00) |
| **Doctor** | `marcus.chen@medtrack.pro` | `DoctorPass123!` | Neurology specialist (8:00 - 16:00) |
| **Doctor** | `priya.patel@medtrack.pro` | `DoctorPass123!` | Pediatrics specialist (10:00 - 18:00) |
| **Patient** | `john.doe@example.com` | `PatientPass123!` | General patient |
| **Patient** | `emma.watson@example.com` | `PatientPass123!` | General patient |
| **Patient** | `alex.rivera@example.com` | `PatientPass123!` | General patient |
