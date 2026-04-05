-- Add explanation and trend columns to market_data table
ALTER TABLE market_data
  ADD COLUMN IF NOT EXISTS explanation text,
  ADD COLUMN IF NOT EXISTS trend text DEFAULT 'neutral';
