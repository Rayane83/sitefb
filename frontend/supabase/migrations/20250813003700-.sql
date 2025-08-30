-- Add archived_at column to dotation_reports for tracking pending vs archived
ALTER TABLE public.dotation_reports
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Index to efficiently query pending reports per guild/company
CREATE INDEX IF NOT EXISTS dotation_reports_pending_idx
ON public.dotation_reports (guild_id, entreprise_key, archived_at);

-- Ensure updated_at is refreshed on updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_dotation_reports_updated_at'
  ) THEN
    CREATE TRIGGER update_dotation_reports_updated_at
    BEFORE UPDATE ON public.dotation_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;