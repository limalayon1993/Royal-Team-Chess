-- Migration: Align Terminology (Games -> Confrontations/Matches)

-- 1. Club Stats: "Games" -> "Matches" (Partidas de Club)
ALTER TABLE club_seasonal_stats 
  RENAME COLUMN games_played TO matches_played;

ALTER TABLE club_seasonal_stats 
  RENAME COLUMN games_won TO matches_won;

ALTER TABLE club_seasonal_stats 
  RENAME COLUMN games_lost TO matches_lost;

ALTER TABLE club_seasonal_stats 
  RENAME COLUMN games_drawn TO matches_drawn;

-- 2. User Stats: "Games" -> "Confrontations" (Enfrentamientos Individuales)
ALTER TABLE user_stats 
  RENAME COLUMN games_played TO confrontations_played;

-- Note: 'wins', 'losses', 'draws' in user_stats remain generic as they apply to confrontations.
