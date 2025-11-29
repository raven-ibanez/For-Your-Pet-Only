-- Add note column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS note text;

-- Add comment to document the column
COMMENT ON COLUMN customers.note IS 'Additional notes about the customer';

