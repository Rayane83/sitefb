-- Create public bucket for archives files
insert into storage.buckets (id, name, public)
values ('archives', 'archives', true)
on conflict (id) do nothing;

-- Create policies with guards to avoid duplicates (use pg_policies.policyname)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read access to archives'
  ) THEN
    CREATE POLICY "Public read access to archives"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'archives');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can upload to archives'
  ) THEN
    CREATE POLICY "Authenticated can upload to archives"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'archives');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated can update archives'
  ) THEN
    CREATE POLICY "Authenticated can update archives"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'archives')
    WITH CHECK (bucket_id = 'archives');
  END IF;
END $$;