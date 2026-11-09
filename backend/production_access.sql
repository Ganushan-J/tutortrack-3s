-- Apply after schema.sql to a dedicated production TutorTrack database.
-- Flask alone connects as the database owner; browser clients never use Supabase's
-- Data API. Keep anon/authenticated roles away from tutoring records.
-- This intentionally creates no RLS policies for those roles.
BEGIN;
REVOKE ALL PRIVILEGES ON TABLE
  public.tutors,
  public.students,
  public.lessons,
  public.topic_observations,
  public.resources,
  public.lesson_resources,
  public.monthly_reports
FROM anon, authenticated;

ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
COMMIT;
