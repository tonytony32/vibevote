# VibeVote 🎤

> Tap to reward what resonates. 1 CRC = 1 vibe.

An onchain **applause meter** for hackathon demos. Each tap sends 1 CRC to the selected project in real time. Live scoreboard. Winner reveal. No spreadsheets.

---

## Setup in 5 steps

### 1. Install
```bash
npm install
```

### 2. Create Supabase project
1. Go to https://supabase.com → New project
2. **SQL Editor → New query** → paste `supabase/schema.sql` → **Run**
3. Enable Realtime on both tables (also in schema.sql, uncomment last 2 lines)

### 3. Get credentials
- Supabase **Dashboard → Settings → API**
- Copy **Project URL** and **anon/public key**

### 4. Configure env
```bash
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ADMIN_SECRET
```

### 5. Add your projects
Edit `supabase/schema.sql` bottom section (or use Supabase Table Editor):

| Field | Notes |
|-------|-------|
| `slug` | URL-safe identifier e.g. `myproject` |
| `name` | ≤ 30 chars |
| `one_liner` | ≤ 120 chars |
| `team` | team name |
| `wallet_address` | receives CRC on each tap |
| `color` | hex color for the card accent |
| `sort_order` | 1–5 display order |

---

## Run

```bash
npm run dev        # localhost:3000
npx vercel         # deploy to Vercel
```

### Test as MiniApp
1. `npm run dev`
2. Circles App → MiniApps → Advanced tab → `http://localhost:3000`
3. Connect your wallet

---

## Admin panel

Visit `/admin` — requires `ADMIN_SECRET` from your `.env.local`

| Action | Effect |
|--------|--------|
| **START ROUND** | Opens voting (status: live) |
| **END ROUND** | Closes voting, shows winner (status: ended) |
| **RESET ALL** | Wipes all taps + scores, back to waiting |

---

## Architecture

```
Audience tap
  → sendTransactions([{ to: project.wallet, value: 1 CRC }])
  → POST /api/tap (record in Supabase)
  → Supabase Realtime broadcast
  → All connected clients update instantly
```

**State machine:** `waiting → live → ended → (reset) → waiting`

---

## Cooldown

Default: 3 seconds between taps per wallet per project.
Change with `NEXT_PUBLIC_TAP_COOLDOWN_MS` in env.

The cooldown is client-side only (UX anti-spam). For strict limits, add server-side logic in `/api/tap`.
