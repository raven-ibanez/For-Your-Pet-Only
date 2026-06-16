-- Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL, -- 'free_delivery', 'percentage', 'fixed'
  value decimal(10,2) NOT NULL DEFAULT 0.00,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed some default vouchers
INSERT INTO vouchers (code, type, value) VALUES
  ('FREESHIP', 'free_delivery', 0.00),
  ('WELCOME10', 'percentage', 10.00),
  ('LESS30', 'fixed', 30.00)
ON CONFLICT (code) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read vouchers" ON vouchers FOR SELECT USING (true);
CREATE POLICY "Allow public insert vouchers" ON vouchers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update vouchers" ON vouchers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete vouchers" ON vouchers FOR DELETE USING (true);
