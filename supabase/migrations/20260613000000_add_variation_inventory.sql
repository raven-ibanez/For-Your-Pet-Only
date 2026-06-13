-- Add variation stock, cost, and margin columns to variations table
ALTER TABLE variations 
ADD COLUMN IF NOT EXISTS stock_on_hand integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price decimal(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS margin decimal(5,2) NOT NULL DEFAULT 0.00;
