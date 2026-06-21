-- Migration to add admin and expiry columns to menu_items table
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS cost_price decimal(10,2);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS margin decimal(10,2);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS expiry_date date;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS internal_notes text;
