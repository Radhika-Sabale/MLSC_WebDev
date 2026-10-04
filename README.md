# Canteen Crowd

A fast, lightweight web app showing real-time college canteen queue times based on anonymous one-tap reports from students on campus.

---

## The Annoyance

- **Wasted campus walks:** Walking across campus between lectures only to find a 25-minute queue wrapping around the canteen.
- **Heavy, bloated tools:** Existing university portals and dining apps require account logins, student ID verification, and clunky navigation just to check basic crowd levels.
- **Rapidly changing lines:** College canteen queues fluctuate dramatically in 15-minute bursts; static hours or manual staff updates are perpetually out of date.

---

## Constraint: "One Thumb" & How It Shaped the App

The core assignment constraint is **One Thumb**: the entire mobile experience must be completely operable using a single thumb without shifting hand grip or reaching into the top screen corners.

- **Bottom-anchored reporting:** The primary reporting bar (`ReportBar.tsx`) is permanently fixed to the bottom of the viewport with large `56px` tap targets.
- **Bottom-weighted directory:** The home canteen cards are anchored to the lower portion of the screen on tall smartphones via flexbox auto-margins (`.home-thumb-container`).
- **No top-corner navigation:** Traditional top-left back chevrons are replaced by a full-width bottom navigation button (`BackButton.tsx`) sitting safely above device home indicators.
- **Collapsible achievements:** The badge shelf (`BadgeShelf.tsx`) uses a native 56px `<summary>` disclosure widget placed beneath the cards so secondary gamification details never push core content out of thumb reach.
- **Zero complex gestures:** Pure single-tap operation—no swiping, pinch-to-zoom, pull-to-refresh, or long-press dependencies.
- **Detailed ergonomics documentation:** Full design decisions and phone reach diagrams are recorded in [`docs/thumb-zone.md`](./docs/thumb-zone.md).

---

## The Great Part I Picked

> [WRITE THIS: Choose ONE of the four candidate highlights below that you are most proud of, or write your own selection, and explain why it makes the project stand out.]

- **Candidate 1: Server-Side Anti-Spam Architecture**
  Postgres `SECURITY DEFINER` stored procedures with transaction advisory locks (`pg_advisory_xact_lock`), atomic 15-minute device cooldowns, and automatic 24-hour data pruning.
- **Candidate 2: Physical QR Proof-of-Presence**
  Secret tokens stored exclusively in database tables protected by RLS; frontend bundles contain zero keys and reports require scanning on-site QR posters (`?k=<secret>`).
- **Candidate 3: Resilient One-Thumb Layout Engine**
  Built entirely with vanilla CSS and zero UI component dependencies, combining `100dvh` dynamic viewport sizing, `env(safe-area-inset)` clearance, and bottom-anchored ergonomics.
- **Candidate 4: Accessible Live Screen-Reader Announcer**
  Polling-aware ARIA live region that suppresses repetitive 15-second background polling chatter, speaking politely *only* when the crowd level or report count actually changes.

*My selection:* `[WRITE THIS: Your chosen great part and 2-3 sentences explaining your rationale]`

---

## The Two Testers

The application was evaluated under zero-instruction conditions with two real users on mobile devices:
- Detailed testing logs, observation notes, and fix commit hashes are documented in [`docs/testers.md`](./docs/testers.md).

---

## AI Collaboration

- **How AI was utilized:** Assisting in scaffolding Vite + React + TypeScript setup, drafting PostgreSQL PL/pgSQL RPC logic with advisory locking, generating mathematical badge evaluation rules, and auditing WCAG 2.2 accessibility tokens.
- **One thing AI got wrong that I caught and fixed:** `[WRITE THIS: Detail a specific styling bug, layout collision, or edge case that you identified and corrected yourself during development]`

---

## Not Done (Honest Limitations & Trade-Offs)

- **Remote QR Link Sharing:** Anyone who photographs or bookmarks a canteen's QR link (`/c/main-canteen?k=...`) can submit reports remotely until that canteen's secret key is rotated in the database.
- **Multi-Device Evasion:** An individual with multiple physical phones or browsers can submit multiple reports because device identification is anonymous (`deviceId` in `localStorage`).
- **Local Device Badge Scope:** Badge progress is computed client-side from an anonymous local log capped at 200 entries; clearing browser cache or switching devices resets badge achievements.
- **No Long-Term Historical Graphs:** The system focuses strictly on the 20-minute live window and does not store or graph historical day-of-week trends.

---

## Live Demo & Repository

- **Live Deployment:** `[WRITE THIS: https://canteen-crowd.vercel.app]`
- **Public GitHub Repo:** `https://github.com/Radhika-Sabale/MLSC_WebDev`
- **Authentication:** *None required* (zero logins, zero accounts, fully anonymous).

---

## Local Development & Setup

### 1. Prerequisites
- Node.js (v18+) and npm
- A free Supabase project

### 2. Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Database Initialization
Run the following SQL files in your Supabase SQL Editor in exact sequence:
1. `supabase/schema.sql` (Creates tables `canteens`, `canteen_secrets`, `reports`, and sets Row Level Security)
2. `supabase/seed.sql` (Seeds `fruit-canteen`, `main-canteen`, `staff-canteen` with cryptographic keys)
3. `supabase/functions.sql` (Deploys `submit_report` and `get_status` RPC functions)

### 4. Running the App
```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run production build & preview
npm run build
npm run preview
```

### 5. Generating Physical QR Posters
```bash
# 1. Copy example config to local git-ignored file
cp keys.local.example.json keys.local.json

# 2. Add your deployed base URL and active secret keys from Supabase:
# SELECT c.slug, c.name, s.qr_key FROM canteens c JOIN canteen_secrets s ON s.canteen_id = c.id;

# 3. Generate PNGs and printable HTML poster
npm run make-qr
```

---

## Anti-Spam Architecture in 5 Bullets

1. **Database-enforced cooldown:** 1 report per device per canteen per 15 minutes, validated atomically inside Postgres.
2. **Transaction advisory locks:** `pg_advisory_xact_lock` serializes concurrent submissions, preventing race condition attacks.
3. **Physical QR proof-of-presence:** `canteen_secrets` has RLS enabled with no public policies; keys are validated server-side.
4. **Confidence threshold:** At least 2 reports within the 20-minute freshness window are required before a status is declared.
5. **Opportunistic 24-hour cleanup:** Every valid report submission automatically purges stale records older than 24 hours.

---

## Folder Structure

```
d:\Projects\MLSC_WebDev/
├── docs/
│   ├── thumb-zone.md             # One-thumb ergonomics decisions & screenshot spots
│   └── testers.md                # 2-tester observational evaluation logs
├── public/
│   ├── favicon.svg               # SVG application icon
│   ├── og-image-instructions.md  # 1200x630 social share graphic guidelines
│   └── _redirects                # Netlify SPA redirect fallback
├── scripts/
│   └── make-qr.mjs               # Node script for generating QR PNGs and print.html
├── src/
│   ├── components/
│   │   ├── BackButton.tsx        # Full-width 56px bottom navigation
│   │   ├── BadgeShelf.tsx        # Accessible <details>/<summary> achievements shelf
│   │   ├── CanteenCard.tsx       # 72px touch target directory cards
│   │   ├── PageShell.tsx         # 100dvh safe-area viewport container
│   │   ├── ReportBar.tsx         # Fixed bottom bar with 56px report targets
│   │   ├── SkipLink.tsx          # First-stop keyboard navigation jump
│   │   ├── StatusPill.tsx        # Color-independent queue status indicator
│   │   └── Toast.tsx             # Polite ARIA live region notification provider
│   ├── hooks/
│   │   ├── useCanteens.ts        # Parallel canteen status fetcher & 15s poller
│   │   └── useStatus.ts          # Single canteen status subscriber
│   ├── lib/
│   │   ├── api.ts                # Typed Supabase client API wrappers
│   │   ├── badges.ts             # Pure local-time badge rules & calculations
│   │   ├── deviceId.ts           # Resilient anonymous UUID generator
│   │   ├── reportLog.ts          # LocalStorage 200-item anonymous report logger
│   │   ├── supabase.ts           # Supabase client initialization
│   │   └── time.ts               # Humanized timeAgo and countdown formatters
│   ├── pages/
│   │   ├── Canteen.tsx           # /c/:slug reporting page with live queue card
│   │   ├── Home.tsx              # / directory with bottom-weighted thumb reach
│   │   └── NotFound.tsx          # 404 recovery route
│   ├── styles/
│   │   └── app.css               # Design tokens, high contrast & reduced motion
│   ├── App.tsx                   # Routes & focus management
│   └── main.tsx                  # Application entry point
├── supabase/
│   ├── functions.sql             # submit_report and get_status stored procedures
│   ├── schema.sql                # Tables, indexes, and Row Level Security
│   ├── seed.sql                  # Initial canteens and cryptographic secrets
│   └── tests.sql                 # SQL testing suite
├── index.html                    # HTML5 shell with SEO, OpenGraph & viewport-fit
├── keys.local.example.json       # Template for local QR generation script
├── package.json                  # Scripts and dependencies
├── tsconfig.json                 # TypeScript project configuration
├── vercel.json                   # Vercel SPA client-side route rewrites
└── vite.config.ts                # Vite build and react plugin settings
```
