-- Enable Row-Level Security (RLS) on all public schema tables in Supabase / PostgreSQL

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."google_calendar_auth" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."doctor_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."doctor_leaves" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."medication_reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;
