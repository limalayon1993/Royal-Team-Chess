-- 1. Create Trophies Definitions Table
CREATE TABLE IF NOT EXISTS trophies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    type TEXT CHECK (type IN ('CLUB', 'PLAYER')), -- 'CLUB' or 'PLAYER'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Club Trophies Award Table
CREATE TABLE IF NOT EXISTS club_trophies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    trophy_id UUID REFERENCES trophies(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    season_id TEXT, -- e.g., '2023-11'
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Create Player Trophies Award Table
-- FIX: Changed reference from 'users' to 'profiles' as 'users' is in auth schema
CREATE TABLE IF NOT EXISTS player_trophies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    trophy_id UUID REFERENCES trophies(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    season_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Insert Initial Trophy: First Division Winner (Club)
-- We use a DO block to avoid inserting if it already exists (by name)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM trophies WHERE name = 'Campeón de Primera División') THEN
        INSERT INTO trophies (name, description, image_url, type)
        VALUES (
            'Campeón de Primera División', 
            'Trofeo otorgado al club ganador de la Primera División.', 
            '/assets/trophies/first_division_gold.png', 
            'CLUB'
        );
    END IF;
END $$;
