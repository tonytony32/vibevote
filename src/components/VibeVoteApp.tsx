"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Project, RoundConfig, TapFeedItem } from "@/types";
import { supabase } from "@/lib/supabase";
import styles from "./VibeVoteApp.module.css";

// Lazy-load SDK (only meaningful inside Circles iframe)
let _sdk: typeof import("@aboutcircles/miniapp-sdk") | null = null;
async function getSDK() {
  if (!_sdk) _sdk = await import("@aboutcircles/miniapp-sdk");
  return _sdk;
}

interface Props {
  initialProjects: Project[];
  initialConfig: RoundConfig | null;
  initialFeed: TapFeedItem[];
}

// Sorted by tap_count descending
function ranked(ps: Project[]) {
  return [...ps].sort((a, b) => b.tap_count - a.tap_count);
}

export function VibeVoteApp({ initialProjects, initialConfig, initialFeed }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [config, setConfig]     = useState<RoundConfig | null>(initialConfig);
  const [feed, setFeed]         = useState<TapFeedItem[]>(initialFeed);
  const [wallet, setWallet]     = useState<string | null>(null);
  const [isMiniapp, setIsMiniapp] = useState(false);
  const [view, setView]         = useState<"vote" | "board">("vote");

  // Per-project tap state
  const [tapping, setTapping]   = useState<string | null>(null);   // project id being tapped
  const [justTapped, setJustTapped] = useState<string | null>(null); // for animation trigger
  const cooldownRef              = useRef<Record<string, number>>({}); // wallet → last tap ms
  const [coolingDown, setCoolingDown] = useState<Record<string, boolean>>({});

  const cooldownMs = config?.cooldown_ms ?? 3000;
  const status     = config?.status ?? "waiting";
  const isLive     = status === "live";
  const isEnded    = status === "ended";

  // ── SDK init ─────────────────────────────────────────────────────
  useEffect(() => {
    getSDK().then((sdk) => {
      if (sdk.isMiniappMode()) {
        setIsMiniapp(true);
        sdk.onWalletChange((w) => setWallet(w));
        // Try to get wallet immediately via appData
        sdk.onAppData((data: string) => {
          try {
            const d = JSON.parse(data) as { wallet?: { address?: string } };
            if (d?.wallet?.address) setWallet(d.wallet.address);
          } catch {}
        });
      }
    });
  }, []);

  // ── Supabase Realtime ─────────────────────────────────────────────
  useEffect(() => {
    const tapsSub = supabase
      .channel("taps-channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "taps" },
        () => { refreshProjects(); refreshFeed(); }
      )
      .subscribe();

    const roundSub = supabase
      .channel("round-channel")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "round_config" },
        (payload) => setConfig(payload.new as RoundConfig)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tapsSub);
      supabase.removeChannel(roundSub);
    };
  }, []);

  const refreshProjects = useCallback(async () => {
    const { data } = await supabase.from("projects").select("*").order("sort_order");
    if (data) setProjects(data);
  }, []);

  const refreshFeed = useCallback(async () => {
    const { data } = await supabase.from("tap_feed").select("*");
    if (data) setFeed(data);
  }, []);

  // ── Tap flow ──────────────────────────────────────────────────────
  const handleTap = useCallback(async (project: Project) => {
    if (!wallet || !isLive || tapping) return;

    // Cooldown check
    const now = Date.now();
    const last = cooldownRef.current[project.id] ?? 0;
    if (now - last < cooldownMs) return;

    cooldownRef.current[project.id] = now;
    setCoolingDown((prev) => ({ ...prev, [project.id]: true }));
    setTimeout(() => setCoolingDown((prev) => ({ ...prev, [project.id]: false })), cooldownMs);

    setTapping(project.id);
    setJustTapped(project.id);
    setTimeout(() => setJustTapped(null), 600);

    try {
      const sdk = await getSDK();
      const { buildVoteTx } = await import("@/lib/circles");
      const tx = buildVoteTx(wallet);
      const hashes = await sdk.sendTransactions([tx]);

      await fetch("/api/tap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voter_address: wallet,
          project_id: project.id,
          tx_hash: hashes[0],
        }),
      });

      // Optimistic update
      setProjects((prev) =>
        prev.map((p) =>
          p.id === project.id
            ? { ...p, tap_count: p.tap_count + 1, total_crc: p.total_crc + 1 }
            : p
        )
      );
    } catch {
      // Rejected or error — silently ignore (not a punish mechanic)
    } finally {
      setTapping(null);
    }
  }, [wallet, isLive, tapping, cooldownMs]);

  // ── Derived ───────────────────────────────────────────────────────
  const sorted       = ranked(projects);
  const totalTaps    = projects.reduce((s, p) => s + p.tap_count, 0);
  const winner       = isEnded ? sorted[0] : null;
  const maxTaps      = sorted[0]?.tap_count ?? 0;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className={styles.app}>
      {/* Scanline fx */}
      <div className={styles.scanline} aria-hidden />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>VIBEVOTE</span>
          <StatusPill status={status} />
        </div>
        <div className={styles.headerRight}>
          <span className={styles.totalTaps}>
            <span className={styles.tapNum}>{totalTaps}</span>
            <span className={styles.tapLabel}> TAPS</span>
          </span>
          {wallet ? (
            <span className={styles.walletChip}>
              <span className={styles.walletDot} />
              {wallet.slice(0, 6)}…{wallet.slice(-4)}
            </span>
          ) : isMiniapp ? (
            <button
              className={styles.walletChip}
              style={{ color: "#ffb800", borderColor: "#ffb80044", background: "transparent", cursor: "pointer" }}
              onClick={() => getSDK().then(s =>
                s.signMessage("vibevote")
                  .catch(() => {})
                  .finally(() => window.parent.postMessage({ type: "request_address" }, "*"))
              )}
            >
              Connect wallet
            </button>
          ) : (
            <span className={styles.walletHint}>Open in Circles</span>
          )}
        </div>
      </header>

      {/* Sub-header */}
      <div className={styles.subheader}>
        <span className={styles.subtitle}>{config?.subtitle ?? "Tap to reward what resonates. 1 CRC = 1 vibe."}</span>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${view === "vote" ? styles.tabActive : ""}`} onClick={() => setView("vote")}>VOTE</button>
          <button className={`${styles.tab} ${view === "board" ? styles.tabActive : ""}`} onClick={() => setView("board")}>BOARD</button>
        </div>
      </div>

      {/* ── WINNER REVEAL ── */}
      {isEnded && winner && (
        <div className={styles.winnerBanner}>
          <div className={styles.winnerCrown}>👑</div>
          <div className={styles.winnerInfo}>
            <div className={styles.winnerLabel}>WINNER</div>
            <div className={styles.winnerName} style={{ color: winner.color }}>{winner.name}</div>
            <div className={styles.winnerTeam}>{winner.team}</div>
          </div>
          <div className={styles.winnerScore}>
            <span className={styles.winnerCrc}>{winner.tap_count}</span>
            <span className={styles.winnerUnit}>CRC</span>
          </div>
        </div>
      )}

      {/* ── WAITING STATE ── */}
      {status === "waiting" && (
        <div className={styles.waitingBanner}>
          <span className={styles.waitingDot} />
          WAITING FOR ORGANIZER TO START THE ROUND
        </div>
      )}

      <main className={styles.main}>
        {view === "vote" ? (
          /* ── VOTE VIEW ── */
          <div className={styles.voteGrid}>
            {projects.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                rank={sorted.findIndex((p) => p.id === project.id) + 1}
                maxTaps={maxTaps}
                totalTaps={totalTaps}
                isLive={isLive}
                canTap={!!wallet && isLive && !tapping && !coolingDown[project.id]}
                isTapping={tapping === project.id}
                justTapped={justTapped === project.id}
                coolingDown={!!coolingDown[project.id]}
                onTap={() => handleTap(project)}
                delay={i * 60}
              />
            ))}
          </div>
        ) : (
          /* ── BOARD VIEW ── */
          <div className={styles.boardWrap}>
            <Scoreboard projects={sorted} maxTaps={maxTaps} totalTaps={totalTaps} isEnded={isEnded} />
            <TapFeed feed={feed} />
          </div>
        )}
      </main>
    </div>
  );
}

/* ── ProjectCard ─────────────────────────────────────────────────── */
function ProjectCard({
  project, rank, maxTaps, totalTaps,
  isLive, canTap, isTapping, justTapped, coolingDown, onTap, delay,
}: {
  project: Project;
  rank: number;
  maxTaps: number;
  totalTaps: number;
  isLive: boolean;
  canTap: boolean;
  isTapping: boolean;
  justTapped: boolean;
  coolingDown: boolean;
  onTap: () => void;
  delay: number;
}) {
  const pct = totalTaps > 0 ? (project.tap_count / totalTaps) * 100 : 0;
  const barPct = maxTaps > 0 ? (project.tap_count / maxTaps) * 100 : 0;
  const isLeader = rank === 1 && project.tap_count > 0;

  return (
    <div
      className={`${styles.card} ${isLeader ? styles.cardLeader : ""}`}
      style={{ "--accent": project.color, animationDelay: `${delay}ms` } as React.CSSProperties}
    >
      {/* Rank badge */}
      <div className={styles.rankBadge} style={{ color: project.color }}>
        #{rank}
      </div>

      {/* Card body */}
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          {project.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.logo_url} alt="" className={styles.logo_img} />
          ) : (
            <div className={styles.logoPlaceholder} style={{ background: project.color + "22", border: `2px solid ${project.color}` }}>
              {project.name[0]}
            </div>
          )}
          <div>
            <h2 className={styles.cardName}>{project.name}</h2>
            {project.team && <div className={styles.cardTeam}>{project.team}</div>}
          </div>
        </div>

        <p className={styles.cardOneLiner}>{project.one_liner}</p>

        {project.demo_link && (
          <a href={project.demo_link} target="_blank" rel="noopener noreferrer" className={styles.demoLink}>
            VIEW DEMO ↗
          </a>
        )}
      </div>

      {/* Progress bar */}
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${barPct}%`, background: project.color, boxShadow: `0 0 12px ${project.color}88` }}
        />
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <span className={`${styles.tapCount} ${justTapped ? "anim-scoreFlash" : ""}`} key={project.tap_count}>
          {project.tap_count} CRC
        </span>
        <span className={styles.pctStat}>{pct.toFixed(0)}% of pool</span>
      </div>

      {/* VIBE button */}
      {isLive && (
        <button
          className={`${styles.vibeBtn} ${!canTap ? styles.vibeBtnDisabled : ""} ${justTapped ? styles.vibeBtnPop : ""}`}
          style={{ "--accent": project.color } as React.CSSProperties}
          disabled={!canTap}
          onClick={onTap}
          aria-label={`Vibe for ${project.name}`}
        >
          {isTapping ? (
            <span className={styles.vibeBtnSpinner} />
          ) : coolingDown ? (
            <span className={styles.vibeBtnCool}>●●●</span>
          ) : (
            <>VIBE +1 <span className={styles.vibeCrc}>1 CRC</span></>
          )}
          {justTapped && <span className={styles.ripple} style={{ background: project.color }} />}
        </button>
      )}
    </div>
  );
}

/* ── Scoreboard ──────────────────────────────────────────────────── */
function Scoreboard({ projects, maxTaps, totalTaps, isEnded }: {
  projects: Project[]; maxTaps: number; totalTaps: number; isEnded: boolean;
}) {
  return (
    <div className={styles.scoreboard}>
      <div className={styles.boardTitle}>LIVE SCOREBOARD</div>
      <div className={styles.boardTotal}>{totalTaps} total taps · {totalTaps} CRC in pool</div>
      <ol className={styles.boardList}>
        {projects.map((p, i) => {
          const barW = maxTaps > 0 ? (p.tap_count / maxTaps) * 100 : 0;
          return (
            <li key={p.id} className={`${styles.boardRow} ${i === 0 && isEnded ? styles.boardRowWinner : ""}`}
              style={{ animationDelay: `${i * 50}ms` }}>
              <span className={styles.boardRank} style={{ color: i === 0 && p.tap_count > 0 ? "#ffb800" : "#5a5a7a" }}>
                {i === 0 && p.tap_count > 0 ? "👑" : `#${i + 1}`}
              </span>
              <div className={styles.boardBarWrap}>
                <div className={styles.boardRowTop}>
                  <span className={styles.boardName} style={{ color: p.color }}>{p.name}</span>
                  <span className={styles.boardCrc}>{p.tap_count} CRC</span>
                </div>
                <div className={styles.boardBarTrack}>
                  <div className={styles.boardBarFill}
                    style={{ width: `${barW}%`, background: p.color, boxShadow: `0 0 10px ${p.color}66` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── TapFeed ─────────────────────────────────────────────────────── */
function TapFeed({ feed }: { feed: TapFeedItem[] }) {
  return (
    <div className={styles.feed}>
      <div className={styles.feedTitle}>RECENT TAPS</div>
      {feed.length === 0 ? (
        <div className={styles.feedEmpty}>No taps yet. Be first!</div>
      ) : (
        <ul className={styles.feedList}>
          {feed.slice(0, 12).map((item) => (
            <li key={item.id} className={styles.feedItem}>
              <span className={styles.feedDot} style={{ background: item.project_color }} />
              <span className={styles.feedProject} style={{ color: item.project_color }}>{item.project_name}</span>
              <span className={styles.feedAddr}>{item.voter_address.slice(0, 6)}…{item.voter_address.slice(-3)}</span>
              <a href={`https://gnosisscan.io/tx/${item.tx_hash}`} target="_blank" rel="noopener noreferrer" className={styles.feedTx}>↗</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── StatusPill ──────────────────────────────────────────────────── */
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; blink?: boolean }> = {
    waiting: { label: "WAITING",  color: "#5a5a7a" },
    live:    { label: "● LIVE",   color: "#00ff87", blink: true },
    ended:   { label: "ENDED",    color: "#ffb800" },
  };
  const s = map[status] ?? map.waiting;
  return (
    <span
      className={`${styles.statusPill} ${s.blink ? styles.statusPillBlink : ""}`}
      style={{ color: s.color, borderColor: s.color + "44" }}
    >
      {s.label}
    </span>
  );
}
