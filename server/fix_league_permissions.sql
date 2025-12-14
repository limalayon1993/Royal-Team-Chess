-- Fix for League Table Visibility
-- Problem: Frontend cannot see league stats, but Backend/Admin can.
-- Cause: Missing RLS Policy or Permissions for 'club_seasonal_stats'.

-- 1. Enable RLS (Best Practice)
ALTER TABLE club_seasonal_stats ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy if it exists (to start fresh and avoid conflicts)
DROP POLICY IF EXISTS "Public Read Access" ON club_seasonal_stats;

-- 3. Create Policy: Allow READ (SELECT) for everyone (anon + authenticated)
CREATE POLICY "Public Read Access"
ON club_seasonal_stats
FOR SELECT
USING (true);

-- 4. Explicitly Grant permissions (in case they were revoked or default strict)
GRANT SELECT ON club_seasonal_stats TO anon, authenticated, service_role;

-- 5. Repeat for 'clubs' table just in case (though it seems visible based on Profile)
-- ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Clubs Public Read" ON clubs;
-- CREATE POLICY "Clubs Public Read" ON clubs FOR SELECT USING (true);
-- GRANT SELECT ON clubs TO anon, authenticated, service_role;
