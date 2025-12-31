-- Add commentary column to balls table
-- This stores the auto-generated commentary for each ball

ALTER TABLE balls
ADD COLUMN IF NOT EXISTS commentary TEXT;

-- Add comment to column
COMMENT ON COLUMN balls.commentary IS 'Auto-generated commentary for the ball delivery';
