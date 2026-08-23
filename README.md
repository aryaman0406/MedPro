# 🏥 MedTrack Pro — Next-Gen Clinical Scheduling & Healthcare Operations Platform

**MedTrack Pro** is a comprehensive, production-grade clinical scheduling and healthcare operations suite engineered with **Next.js 15 App Router**, **TypeScript**, **PostgreSQL (Prisma ORM)**, **Auth.js v5 (Google OAuth 2.0 & Credentials)**, **Google Gemini AI (2.5 Flash)**, **Pusher Channels**, **Upstash Redis/QStash**, **Resend/Brevo SMTP**, and **Google Calendar 2-Way Sync**.

The platform unifies patient booking, concurrent double-booking exclusion, pre-visit AI diagnostic triage, real-time waiting room queues, post-visit structured prescription care plans, background medication adherence reminders, practice analytics, and single sign-on authentication.

---

## 🌟 Standout Capabilities & Architecture Highlights

1. **Dual Sign-In & Role-Preserving OAuth 2.0**:
   - **Google OAuth ("Continue with Google")**: Single sign-on using Auth.js v5. New Google accounts automatically receive `PATIENT` role access with zero intermediate prompts. Existing accounts (`PATIENT`, `DOCTOR`, `ADMIN`) match on verified email and log in preserving their role intact.
   - **Credentials Login**: Email and password authentication with interactive **Eye Toggle Buttons** (`Eye` / `EyeOff`) to show/hide typed passwords.
   - **Edge Middleware Safety**: All database lookups and role-assignment logic execute in Node.js runtime API routes, ensuring zero Edge Runtime bundler or `@prisma/client` failures.

2. **Deep Teal Design System & Deep Navy Dark Mode**:
   - Palette built around **Deep Teal** (`#0F766E`), **Mint Teal** (`#14B8A6`), **Warm Amber** (`#F59E0B`), **Rose Urgency Badges**, and **Deep Navy Dark Mode** (`hsl(224 71% 4%)`).
   - Cards styled with 20px border radius (`rounded-2xl`) and soft layered drop shadows.
   - Standardized top navbar shell with bell notification indicators across all authenticated roles.

3. **Pre-Visit Clinical Intake & AI Synthesis (Google Gemini 2.5 Flash)**:
   - Evaluates verbatim patient symptoms at booking.
   - Extracts clinical urgency (*Low* / *Medium* / *High*), chief complaint, and three tailored diagnostic exploration questions for the physician.
   - Zero-crash fallback architecture with single retry and non-blocking asynchronous execution.

4. **Real-Time Clinical Queue & Patient Position Tracker (Pusher Channels)**:
   - 30-minute pre-visit physical check-in window.
   - Live FIFO waiting room ordered strictly by check-in timestamp (`checkedInAt asc`) on the doctor's portal.
   - Instant *"Call Next Patient"* broadcast transitioning patients to `IN_PROGRESS` and updating the patient's screen (*"You are #N in queue"*) with zero browser refreshes.

5. **Multi-Party Google Calendar Sync (Google OAuth 2.0)**:
   - Incremental OAuth 2.0 flow scoped to `https://www.googleapis.com/auth/calendar.events`.
   - Automatically synchronizes tailored events to both the patient's and doctor's personal Google Calendars on booking confirmation.
   - Seamlessly removes or updates Google Calendar events on cancellations or rescheduling.

6. **Structured Prescription Builder & Automated Medication Reminders**:
   - Doctor encounter form supporting clinical notes and repeatable structured prescription rows (`medicineName`, `dosage`, `frequencyPerDay`, `durationDays`, `instructions`).
   - Converts doctor's notes into patient-friendly plain summaries, medication schedules, and follow-up guidance via Gemini.
   - Automated 15-minute background cron worker (Upstash QStash) dispatching personalized branded medication adherence emails.

7. **Leave Conflict Triage & Passwordless Magic-Link Rescheduling**:
   - Doctor leave creation scans and flags overlapping bookings as `NEEDS_RESCHEDULE`.
   - Generates a 7-day cryptographically signed JWT magic link (`jose`).
   - Patients click to access a public passwordless `/reschedule/[token]` portal with an interactive slot navigator to atomically swap their booking.

8. **Practice Analytics & Operations Dashboard (Recharts)**:
   - 30-Day consultation volume bar chart stacked by status (Completed, Scheduled, No-Show, Cancelled).
   - Doctor weekly capacity utilization progress bars derived dynamically from working hours minus active leave days.
   - 8-Week historical patient no-show rate area trend ($\frac{\text{NO\_SHOW}}{\text{COMPLETED} + \text{NO\_SHOW}} \times 100$).
   - Dedicated legal and compliance routes ([`/privacy`](file:///c:/Users/acer/Desktop/MedPro/src/app/privacy/page.tsx), [`/terms`](file:///c:/Users/acer/Desktop/MedPro/src/app/terms/page.tsx), [`/security`](file:///c:/Users/acer/Desktop/MedPro/src/app/security/page.tsx)).

---

## 🚀 Quickstart & Local Setup Guide

Follow these steps to run MedTrack Pro locally in under 5 minutes:

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/aryaman0406/MedPro.git
cd MedPro
npm install
```

### 2. Configure Environment Variables
Copy the template to `.env.local`:
```bash
cp .env.example .env.local
```

Populate environment variables using your free service keys (*Note: Zero real secrets should ever be committed to Git*):

| Variable | Purpose | Where to Get Free Key |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | [Supabase](https://supabase.com/) or [Neon](https://neon.tech/) (Free PostgreSQL) |
| `AUTH_SECRET` | 32-char encryption secret for Auth.js | Run `npx auth secret` or `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Application base URL | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web Client ID | [Google Cloud Console](https://console.cloud.google.com/) (Web Client) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret | [Google Cloud Console](https://console.cloud.google.com/) |
| `GOOGLE_CALENDAR_REDIRECT_URI` | OAuth 2.0 callback endpoint | `http://localhost:3000/api/auth/google-calendar/callback` |
| `GEMINI_API_KEY` | Google Gemini 2.5 Flash AI client | [Google AI Studio](https://aistudio.google.com/) (Free, no card) |
| `UPSTASH_REDIS_REST_URL` | Redis REST endpoint for 5-min slot holds | [Upstash Redis Console](https://console.upstash.com/redis) (Free serverless Redis) |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST authentication token | [Upstash Redis Console](https://console.upstash.com/redis) |
| `QSTASH_CURRENT_SIGNING_KEY` | Background cron verification key | [Upstash QStash Console](https://console.upstash.com/qstash) |
| `BREVO_SMTP_HOST` | Transactional email relay host | `smtp.resend.com` / `smtp-relay.brevo.com` |
| `BREVO_SMTP_PORT` | Transactional email port | `465` / `587` |
| `BREVO_SMTP_USER` | SMTP login account | [Resend](https://resend.com) or [Brevo](https://brevo.com) |
| `BREVO_SMTP_KEY` | SMTP API / Master key | [Resend](https://resend.com) or [Brevo](https://brevo.com) |
| `PUSHER_APP_ID` / `PUSHER_KEY` | Real-time queue WebSocket credentials | [Pusher Dashboard](https://dashboard.pusher.com/) |
| `NEXT_PUBLIC_PUSHER_KEY` | Client-side Pusher key | Same as `PUSHER_KEY` |

> *Security Note: `.env` and `.env.local` are explicitly listed in `.gitignore` to guarantee zero credentials or API keys are committed to Git repositories.*

### 3. Initialize Database & Seed Rich Data
```bash
# Push schema to PostgreSQL
npm run db:push

# Seed database with active specialists, patients, and 30-day historical analytics data
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Privacy Practices

- **Strict Environment Isolation**: All `.env*` files containing sensitive credentials (DB URLs, API keys, OAuth secrets) are excluded via `.gitignore`. Only `.env.example` with generic placeholders is committed.
- **Edge Middleware Integrity**: NextAuth Edge Middleware (`src/auth.config.ts`) only performs JWT validation and routing, while all database interactions run in Node.js server routes.
- **Password Protection**: Passwords are hashed with `bcryptjs` (salt factor 10) and masked by default with interactive eye toggle buttons (`Eye` / `EyeOff`) for user convenience.

---

## 📊 Database Schema & Entity Relationship Overview

```mermaid
erDiagram
    User ||--o| DoctorProfile : "has profile"
    User ||--o{ Appointment : "patient of"
    User ||--o{ EmailLog : "receives"
    User ||--o| GoogleCalendarAuth : "authorizes"
    DoctorProfile ||--o{ DoctorLeave : "registers"
    DoctorProfile ||--o{ Appointment : "conducts"
    Appointment ||--o{ MedicationReminder : "generates"
    Appointment ||--o{ CalendarEvent : "syncs to"

    User {
        string id PK
        string email UK
        string name
        string passwordHash
        Role role "PATIENT | DOCTOR | ADMIN"
        string phone
        datetime createdAt
    }

    DoctorProfile {
        string id PK
        string userId FK
        string specialization
        string bio
        int slotDurationMinutes "30 | 45"
        json workingHours
        boolean isActive
    }

    DoctorLeave {
        string id PK
        string doctorId FK
        datetime date
        string reason
    }

    Appointment {
        string id PK
        string doctorId FK
        string patientId FK
        datetime startTime
        datetime endTime
        AppointmentStatus status "CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW | NEEDS_RESCHEDULE"
        string symptomText
        datetime checkedInAt
        string preVisitSummaryStatus
        json preVisitSummaryJson
        string postVisitNotes
        string postVisitSummaryStatus
        json postVisitSummaryJson
        json prescriptionJson
    }

    MedicationReminder {
        string id PK
        string appointmentId FK
        string patientId FK
        string medicineName
        string dosage
        datetime scheduledFor
        string status "PENDING | SENT | CANCELLED"
    }

    EmailLog {
        string id PK
        string recipient
        string type "BOOKING_CONFIRMATION | REMINDER | CANCELLATION | LEAVE_NOTICE | MEDICATION_REMINDER"
        string subject
        string bodyHtml
        string status "PENDING | SENT | FAILED | DEAD"
        int attempts
        string lastError
    }

    GoogleCalendarAuth {
        string id PK
        string userId FK
        string accessToken
        string refreshToken
        datetime tokenExpiresAt
        boolean needsReauth
    }

    CalendarEvent {
        string id PK
        string appointmentId FK
        string userId FK
        string googleEventId
        string status "ACTIVE | DELETED | UPDATED"
    }
```

---

## 🧪 Automated Testing Suite

MedTrack Pro includes an automated unit and integration test suite powered by **Vitest**:

```bash
# Run all unit and integration tests
npm run test
```

### Test Suite Coverage
1. **`test/unit/slot-availability.test.ts`**:
   - Verifies mathematical boundary slot generation (16 slots for 8-hour shift, 12 slots for 6-hour Friday shift).
   - Weekend off-duty detection (`isOffDuty=true`).
   - Doctor leave date blackout subtraction (`isOnLeave=true`).
   - Booked appointment subtraction and Redis user hold status mapping.
2. **`test/unit/gemini-validation.test.ts`**:
   - Validates `PreVisitSummarySchema` urgency enums (*Low* / *Medium* / *High*), chief complaints, and diagnostic question arrays.
   - Rejects malformed JSON and verifies regex markdown code-fence cleaner.
   - Validates `PostVisitSummarySchema` and `PrescriptionItemSchema` coercion rules.
3. **`test/integration/concurrency-booking.test.ts`**:
   - Simulates 10 concurrent requests for the exact same slot timestamp.
   - Asserts **strictly 1 successful booking** and **9 rejected double-booking conflict errors**.

---

## 🌐 Live Production Deployment

- **Live Production URL**: [https://med-pro-one.vercel.app](https://med-pro-one.vercel.app)
- **GitHub Repository**: [https://github.com/aryaman0406/MedPro](https://github.com/aryaman0406/MedPro)

### Production Build Verification
```bash
# Verify TypeScript type check
npx tsc --noEmit

# Compile production Next.js build
npm run build
```
*All 22 Next.js App Router routes compile cleanly with 0 errors.*
