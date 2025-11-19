-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on active status for faster queries
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(active);

-- Create index on dates for filtering active announcements
CREATE INDEX IF NOT EXISTS idx_announcements_dates ON announcements(start_date, end_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read active announcements
CREATE POLICY "Anyone can read active announcements"
  ON announcements
  FOR SELECT
  USING (true);

-- Policy: Only authenticated users can insert (admin will be authenticated)
CREATE POLICY "Authenticated users can insert announcements"
  ON announcements
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only authenticated users can update
CREATE POLICY "Authenticated users can update announcements"
  ON announcements
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policy: Only authenticated users can delete
CREATE POLICY "Authenticated users can delete announcements"
  ON announcements
  FOR DELETE
  USING (auth.role() = 'authenticated');

