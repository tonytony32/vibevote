export type RoundStatus = "waiting" | "live" | "ended";

export interface Project {
  id: string;
  slug: string;
  name: string;
  one_liner: string;
  team: string;
  wallet_address: string;
  demo_link: string;
  logo_url: string;
  color: string;
  total_crc: number;
  tap_count: number;
  sort_order: number;
}

export interface TapFeedItem {
  id: string;
  created_at: string;
  voter_address: string;
  tx_hash: string;
  project_name: string;
  project_color: string;
  project_slug: string;
}

export interface RoundConfig {
  id: number;
  title: string;
  subtitle: string;
  status: RoundStatus;
  cooldown_ms: number;
  started_at?: string;
  ended_at?: string;
}
