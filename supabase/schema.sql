-- ============================================================
-- VibeVote – Supabase Schema
-- Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- Projects (hackathon submissions)
CREATE TABLE IF NOT EXISTS projects (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT    NOT NULL UNIQUE,
  name           TEXT    NOT NULL,
  one_liner      TEXT    NOT NULL DEFAULT '',
  team           TEXT    DEFAULT '',
  wallet_address TEXT    NOT NULL,
  demo_link      TEXT    DEFAULT '',
  logo_url       TEXT    DEFAULT '',
  color          TEXT    NOT NULL DEFAULT '#ffffff',
  total_crc      NUMERIC(20,4) NOT NULL DEFAULT 0,
  tap_count      INTEGER NOT NULL DEFAULT 0,
  sort_order     INTEGER NOT NULL DEFAULT 0
);

-- Taps (each = 1 CRC transferred)
CREATE TABLE IF NOT EXISTS taps (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID    NOT NULL REFERENCES projects(id),
  voter_address  TEXT    NOT NULL,
  tx_hash        TEXT    NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Live feed view (last 20 taps)
CREATE OR REPLACE VIEW tap_feed AS
  SELECT
    t.id, t.created_at, t.voter_address, t.tx_hash,
    p.name  AS project_name,
    p.color AS project_color,
    p.slug  AS project_slug
  FROM taps t
  JOIN projects p ON p.id = t.project_id
  ORDER BY t.created_at DESC
  LIMIT 20;

-- Round config (single row, id = 1 always)
CREATE TABLE IF NOT EXISTS round_config (
  id           INTEGER PRIMARY KEY DEFAULT 1,
  title        TEXT NOT NULL DEFAULT 'VibeVote',
  subtitle     TEXT NOT NULL DEFAULT 'Tap to reward what resonates. 1 CRC = 1 vibe.',
  status       TEXT NOT NULL DEFAULT 'waiting', -- waiting | live | ended
  cooldown_ms  INTEGER NOT NULL DEFAULT 3000,
  started_at   TIMESTAMPTZ,
  ended_at     TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO round_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS taps_project_id_idx ON taps(project_id);
CREATE INDEX IF NOT EXISTS taps_voter_idx       ON taps(voter_address);
CREATE INDEX IF NOT EXISTS taps_created_idx     ON taps(created_at DESC);

-- Atomic increment
CREATE OR REPLACE FUNCTION increment_tap(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE projects
  SET tap_count = tap_count + 1,
      total_crc = total_crc + 1
  WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- ── Enable Realtime (run these two lines too) ──────────────────
-- ALTER PUBLICATION supabase_realtime ADD TABLE taps;
-- ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- ── Sample projects (replace with real hackathon data) ─────────
INSERT INTO projects (slug, name, one_liner, team, wallet_address, color, sort_order) VALUES
  ('ecochain',   'EcoChain',    'Carbon footprint tracker rewarding green actions with UBI.',    'GreenDAO',       '0x0000000000000000000000000000000000000001', '#22c55e', 1),
  ('circlemart', 'CircleMart',  'P2P local marketplace where CRC is the only currency.',         'LocalFirst',     '0x0000000000000000000000000000000000000002', '#f59e0b', 2),
  ('ubibridge',  'UBIBridge',   'Cross-chain bridge so Circles holders spend UBI on mainnet.',  'BridgeBuilders', '0x0000000000000000000000000000000000000003', '#38bdf8', 3),
  ('harvestid',  'HarvestID',   'QR traceability from harvest to freeze-dry plant, onchain.',   'AgriTrace',      '0x0000000000000000000000000000000000000004', '#f472b6', 4),
  ('votedao',    'VoteDAO',     'On-chain governance layer for Circles UBI grant distribution.','DAOBuilders',    '0x0000000000000000000000000000000000000005', '#a78bfa', 5)
ON CONFLICT DO NOTHING;
