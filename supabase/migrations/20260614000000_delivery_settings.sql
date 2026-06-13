-- Delivery subdivisions table (admin-managed)
CREATE TABLE IF NOT EXISTS delivery_subdivisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  delivery_fee decimal(10,2) NOT NULL DEFAULT 0.00,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Delivery global settings (free delivery promo toggle)
CREATE TABLE IF NOT EXISTS delivery_settings (
  id text PRIMARY KEY DEFAULT 'global',
  free_delivery_promo boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Seed default subdivisions
INSERT INTO delivery_subdivisions (name, delivery_fee, sort_order) VALUES
  ('Natania Homes', 0.00, 1),
  ('Meridian Place', 15.00, 2),
  ('Heneral Uno', 25.00, 3),
  ('Heneral Dos', 25.00, 4),
  ('Kaia Homes', 30.00, 5),
  ('Heroes Town', 30.00, 6);

-- Seed delivery settings row
INSERT INTO delivery_settings (id, free_delivery_promo) VALUES ('global', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE delivery_subdivisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read delivery_subdivisions" ON delivery_subdivisions FOR SELECT USING (true);
CREATE POLICY "Allow public read delivery_settings" ON delivery_settings FOR SELECT USING (true);

-- Allow public write access (admin auth is handled in-app)
CREATE POLICY "Allow public insert delivery_subdivisions" ON delivery_subdivisions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update delivery_subdivisions" ON delivery_subdivisions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete delivery_subdivisions" ON delivery_subdivisions FOR DELETE USING (true);

CREATE POLICY "Allow public insert delivery_settings" ON delivery_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update delivery_settings" ON delivery_settings FOR UPDATE USING (true);
