-- 1. Actualizar tabla 'clubs'
-- Añade columna para la división actual (Por defecto 1)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS division INTEGER DEFAULT 1;

-- Añade columna para el historial de trofeos (JSONB para flexibilidad)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS trophies JSONB DEFAULT '[]'::jsonb;

-- 2. Asegurar tabla 'club_seasonal_stats'
-- Esta tabla guarda las estadísticas por temporada (Mes)
CREATE TABLE IF NOT EXISTS club_seasonal_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    season_id TEXT NOT NULL, -- Formato 'YYYY-MM'
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    games_drawn INTEGER DEFAULT 0,
    season_points INTEGER DEFAULT 0,
    division INTEGER DEFAULT 1, -- Captura la división en la que se jugó esta temporada
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(club_id, season_id)
);

-- Si la tabla ya existía pero faltaba la columna division:
ALTER TABLE club_seasonal_stats ADD COLUMN IF NOT EXISTS division INTEGER DEFAULT 1;

-- 3. Índices para rendimiento (Opcional pero recomendado)
CREATE INDEX IF NOT EXISTS idx_club_seasonal_stats_season ON club_seasonal_stats(season_id);
CREATE INDEX IF NOT EXISTS idx_club_seasonal_stats_ranking ON club_seasonal_stats(season_id, division, season_points DESC);
