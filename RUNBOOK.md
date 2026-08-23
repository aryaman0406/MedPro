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
Authentication supports dual login mechanisms:
1. **Credentials Provider**: Email and Bcrypt password hashing with JWT sessions.
2. **Google OAuth 2.0 Provider**: "Continue with Google" single sign-on with automatic `PATIENT` role assignment for new users and role-preserving login linking for existing accounts.

### Setup Instructions
1. **Generate an `AUTH_SECRET`**:
   ```bash
   openssl rand -base64 32
   ```
2. **Configure `.env.local`**:
   ```env
   AUTH_SECRET="your-generated-secret"
   NEXTAUTH_URL="http://localhost:3000"
   ```

### 2.1. Google OAuth 2.0 Web Application Credentials Setup
To enable "Continue with Google" sign-in:
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Click **"Create Credentials"** → **"OAuth client ID"**.
3. Select Application type: **Web application**.
4. Set Name: `MedTrack Pro Web Auth Client`.
5. **Authorized JavaScript origins**:
   - Production URL: `https://med-pro-one.vercel.app`
   - Local development: `http://localhost:3000`
6. **Authorized redirect URIs**:
   - Production callback: `https://med-pro-one.vercel.app/api/auth/callback/google`
   - Local development callback: `http://localhost:3000/api/auth/callback/google`
7. Click **Create** and note the **Client ID** and **Client Secret**.
8. Verify **OAuth Consent Screen** has `email` and `profile` scopes enabled.
9. Add to `.env.local` and Vercel Environment Variables:
   ```env
   GOOGLE_CLIENT_ID="your-auth-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-auth-client-secret"
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

---

## 4. Google Gemini API (Pre-Visit Intake LLM)

### Overview
MedTrack Pro integrates Google Gemini to analyze patient symptoms, determine clinical urgency (`Low` / `Medium` / `High`), identify chief complaints, and formulate tailored diagnostic questions for the doctor prior to the consultation.

### Setup Instructions
1. **Get Free Google AI Studio Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/).
   - Sign in with any Google account and click **"Get API key"**.
   - Create a free key (no credit card or billing configuration required).
2. **Configure `.env.local`**:
   ```env
   GEMINI_API_KEY="your-google-ai-studio-api-key"
   GEMINI_MODEL="gemini-2.5-flash"
   ```
3. **Resilience & Fallback**:
   - The Gemini call is executed non-blockingly with an automatic single retry.
   - If the API key is missing, rate-limited, or fails, the appointment booking completes uninterrupted and the appointment is flagged with a graceful `preVisitSummaryStatus: "FAILED"` (rendered as "Summary unavailable" in doctor views).

---

## 5. Upstash Redis (5-Minute Slot Hold Locking)

### Overview
MedTrack Pro implements a distributed 300-second (5-minute) soft-reservation lock using Upstash Redis (`SET NX EX 300`) to prevent appointment selection conflicts while patients fill out clinical intake forms.

### Setup Instructions
1. Go to [Upstash Console](https://console.upstash.com/redis).
2. Create a free serverless Redis database (e.g. `medtrack-redis`).
3. Under the **REST API** section, copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Add to `.env.local`:
   ```env
   UPSTASH_REDIS_REST_URL="https://your-database.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your-token"
   ```

---

## 6. Upstash QStash (Medication Reminder Cron & Background Jobs)

### Overview
MedTrack Pro uses Upstash QStash to execute periodic background checks (every 15 minutes) for due patient medication reminders. The job detects un-sent reminders whose `scheduledFor` time has passed, creates `EmailLog` records of type `MEDICATION_REMINDER`, and transitions the reminder state to `SENT`.

### Setup Instructions
1. **Create Upstash QStash Account**:
   - Go to [Upstash Console](https://console.upstash.com/qstash).
   - Under the QStash tab, locate your **Request Signing Keys**:
     - `QSTASH_CURRENT_SIGNING_KEY`
     - `QSTASH_NEXT_SIGNING_KEY`
2. **Configure `.env.local`**:
   ```env
   QSTASH_CURRENT_SIGNING_KEY="your-qstash-current-signing-key"
   QSTASH_NEXT_SIGNING_KEY="your-qstash-next-signing-key"
   CRON_SECRET="your-secure-cron-token"
   ```
3. **Create 15-Minute Recurring Schedule in QStash Console**:
   - Navigate to **Schedules** → **Create Schedule**.
   - **Destination URL**: `https://your-domain.com/api/jobs/send-due-reminders` (or ngrok/tunnel URL in development).
   - **Cron Expression**: `*/15 * * * *` (Runs every 15 minutes).
   - **Method**: `POST`.
   - **Headers**: Default QStash headers (`Upstash-Signature` will be automatically generated and verified by the route handler).
4. **Local Development & Manual Testing**:
   - In local development, the route handler supports direct invocation without signing keys, or using a bearer token (`Authorization: Bearer <CRON_SECRET>`).
   - You can test via `curl` or browser GET: `http://localhost:3000/api/jobs/send-due-reminders`.

---

## 6. Brevo SMTP Relay (Email Delivery Engine)

### Overview
MedTrack Pro delivers all transactional notifications (booking confirmations, cancellations, 24h reminders, leave conflict notices with magic links, and medication reminders) through Brevo's SMTP relay with Nodemailer. Brevo provides a free tier offering 300 emails/day with no credit card required.

### Setup Instructions
1. **Create Free Brevo Account**:
   - Go to [Brevo](https://www.brevo.com/) and sign up for a free account.
2. **Retrieve SMTP Credentials**:
   - Navigate to your account profile menu → **SMTP & API** (or visit [https://app.brevo.com/settings/keys/smtp](https://app.brevo.com/settings/keys/smtp)).
   - Under the **SMTP** tab:
     - **SMTP Server**: `smtp-relay.brevo.com`
     - **Port**: `587`
     - **Login**: Your Brevo login email address
     - Click **"Generate a new SMTP key"** to obtain your password/key.
3. **Configure `.env.local`**:
   ```env
   BREVO_SMTP_HOST="smtp-relay.brevo.com"
   BREVO_SMTP_PORT="587"
   BREVO_SMTP_USER="your-brevo-login-email@example.com"
   BREVO_SMTP_KEY="your-generated-smtp-key"
   EMAIL_FROM="MedTrack Pro <no-reply@medtrack.pro>"
   ```
4. **Create 5-Minute Recurring Schedule in QStash Console**:
   - Navigate to **Schedules** → **Create Schedule**.
   - **Destination URL**: `https://your-domain.com/api/jobs/process-email-queue`
   - **Cron Expression**: `*/5 * * * *` (Runs every 5 minutes).
   - **Method**: `POST`.
5. **Resilient Failure Handling**:
   - The queue worker automatically retries failed emails up to 5 times.
   - If an email reaches 5 attempts without success, it is flagged as `DEAD`.
   - Administrators can view failed/dead emails on `/admin` and click **"Retry"** to re-queue them once SMTP credentials are fixed.

---

## 7. Google Calendar OAuth 2.0 (Patient & Doctor Calendar Sync)

### Overview
MedTrack Pro integrates with the Google Calendar API to automatically synchronize consultations to the personal Google Calendars of connected patients and doctors upon booking, and automatically removes/patches events upon cancellation or rescheduling.

### Step-by-Step Google Cloud Setup Instructions
1. **Create / Select a Google Cloud Project**:
   - Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
   - Click the project dropdown at the top and select **"New Project"**.
   - Name your project (e.g. `MedTrack Pro`) and click **Create**.
2. **Enable Google Calendar API**:
   - Go to **APIs & Services** → **Library**.
   - Search for **"Google Calendar API"**.
   - Select it and click **"Enable"**.
3. **Configure OAuth Consent Screen**:
   - Go to **APIs & Services** → **OAuth consent screen**.
   - Select User Type: **External** and click **Create**.
   - **App Information**:
     - App name: `MedTrack Pro`
     - User support email: Select your email
     - Developer contact information: Your email
   - **Scopes**:
     - Click **"Add or Remove Scopes"**.
     - Add `https://www.googleapis.com/auth/calendar.events` (View and edit events on all your calendars).
   - **Test Users** (Since the app is in Testing mode):
     - Click **"Add Users"** and add the Google accounts you will use for testing (both doctor and patient test emails).
   - Click **Save and Continue**.
4. **Create OAuth 2.0 Client ID Credentials**:
   - Go to **APIs & Services** → **Credentials**.
   - Click **"Create Credentials"** → **"OAuth client ID"**.
   - Application type: **Web application**.
   - Name: `MedTrack Pro Web Client`.
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (and your production domain).
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/google-calendar/callback`
     - `https://your-production-domain.com/api/auth/google-calendar/callback`
   - Click **Create**.
   - Copy your **Client ID** and **Client Secret**.
5. **Configure `.env.local`**:
   ```env
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   GOOGLE_CALENDAR_REDIRECT_URI="http://localhost:3000/api/auth/google-calendar/callback"
   ```
6. **Graceful Error Handling & Token Lifecycle**:
   - Tokens are stored server-side only in the `GoogleCalendarAuth` table.
   - If a user revokes calendar permissions or a token expires, the booking/cancellation operation completes uninterrupted, `needsReauth` is set to `true`, and an amber reconnection alert banner appears on their dashboard.

---

## 8. Pusher Channels (Real-Time Clinical Queue & Patient Position Sync)

### Overview
MedTrack Pro uses Pusher Channels (WebSockets) for real-time consultation check-in, live queue position synchronization for patients, and instantaneous "Call Next Patient" broadcasts for doctors without page reloads.

### Setup Instructions
1. **Create Free Pusher Account**:
   - Sign up at [Pusher](https://pusher.com/) or log into the [Pusher Dashboard](https://dashboard.pusher.com/).
2. **Create Channels App**:
   - Click **"Create app"**.
   - Name your app: `medtrack-pro`.
   - Cluster: Choose closest region (e.g. `mt1` / `ap2` / `eu`).
   - Frontend: Select `React` / `Next.js`.
   - Backend: Select `Node.js`.
3. **Retrieve App Keys**:
   - Navigate to the **App Keys** tab.
   - Copy `app_id`, `key`, `secret`, and `cluster`.
4. **Configure `.env.local`**:
   ```env
   PUSHER_APP_ID="your-pusher-app-id"
   PUSHER_KEY="your-pusher-key"
   PUSHER_SECRET="your-pusher-secret"
   PUSHER_CLUSTER="mt1"
   NEXT_PUBLIC_PUSHER_KEY="your-pusher-key"
   NEXT_PUBLIC_PUSHER_CLUSTER="mt1"
   ```
5. **Real-Time Channel Architecture**:
   - Channel Name: `doctor-{doctorId}-queue`
   - Event Name: `queue-updated`
   - Payload: Real-time waiting list ordered strictly by `checkedInAt` timestamp, current serving patient, and urgency indicators.
   - Graceful Fallback: If Pusher credentials are omitted in local development, check-in operations succeed gracefully with optimistic UI and polling.
