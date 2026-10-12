CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), started_at INTEGER NOT NULL, finished_at INTEGER, outcome TEXT NOT NULL CHECK(outcome IN ('pending','win','loss','draw')));
CREATE INDEX IF NOT EXISTS matches_player_time ON matches(player_id,started_at DESC);
CREATE INDEX IF NOT EXISTS matches_wins ON matches(player_id,finished_at) WHERE outcome='win';
