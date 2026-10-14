# ApexTrader - Professional Trading Journal & Analytics

A premium dark-themed trading journal built with React, Chart.js, and Firebase. Track every trade, analyze session performance, and improve your trading discipline.

## Tech Stack
- **Frontend:** React 19 + Vite, React Router DOM
- **Charts:** Chart.js 4.x + react-chartjs-2
- **Icons:** FontAwesome 6.x
- **Backend:** Firebase (Auth + Firestore)
- **Storage:** localStorage (primary) + Firebase Firestore (dual-write sync)

## Features

### Dashboard
- **Core Stats** - Today's PnL, Total PnL, Live Balance, Win Rate
- **Extended Stats** - Total Trades, Win/Loss count, Profit Factor, Max Drawdown
- **Performance Stats** - Best/Worst Trade, Current Streak, ROI
- **Equity Curve** - Line chart showing cumulative account growth
- **Win/Loss Pie** - Doughnut chart for trade outcome distribution
- **Session Performance Table** - Win rate and PnL breakdown by session (Tokyo/London/NY/Asian/Overlap)
- **Session Clocks** - Real-time session status (OPEN/CLOSED) in IST
- **Strategy Performance Table** - Per-strategy breakdown with trades, wins, losses, win rate, PnL, and visual progress bar
- **Activity Heatmap** - Last 49 days color-coded by daily PnL
- **Daily Checklist** - Pre-trading checklist with toggle
- **Goals Progress** - Track trading goals with progress bars
- **Account Selector** - Filter entire dashboard by selected account (header dropdown)

### Trade Entry
- **Full Trade Form** - Account, asset, date, timeframe, entry/exit price, quantity, commission, entry/exit time, session, stop loss
- **Buy/Sell Toggle** - Visual toggle for trade direction
- **Strategy & Setup Tags** - Add/select saved strategies and setups with tag chips
- **Emotion Tracking** - Emotion before/after, confidence/discipline ratings (1-5)
- **Notes & Lessons** - Trade analysis and lessons learned
- **Mistake Tracking** - Common mistakes checklist (Overtrading, FOMO, Revenge Trading, etc.)
- **Drag & Drop Screenshot** - Upload trade screenshots with drag & drop or click (max 2MB, PNG/JPG)
- **Edit Mode** - Edit existing trades directly from Trade History
- **Duplicate Mode** - Duplicate trades as templates

### AI MT5 Screenshot Importer
- **Screenshot to Trades** - Upload MetaTrader 5 History/Deals screenshots (PNG/JPG, up to 4 per batch, max 5MB each); Gemini vision AI reads every visible deal row, including multi-part screenshots of long history tables
- **Smart Reconciliation** - Merges entry and exit deals into complete trades (position ID match → ticket match → open-volume pairing), parses SL/TP from `[sl X]`/`[tp X]` comments, auto-detects session, ignores balance/deposit rows
- **Duplicate Protection** - Each trade fingerprinted against your journal (MT5 position ID / ticket / asset+time); existing or in-batch duplicates require explicit confirmation to import again
- **Review Table** - Inline editing of every value (date, time, symbol, direction, entry/exit, lots, commission, swap, P&L) plus an expandable panel with SL/TP, exit time, entry reason, strategy (with saved-strategy chips), Liquidity, POI, setup confirmation, emotions, mistakes and notes
- **Validation & Flags** - Row-level errors, needs-review flags with reasons, "Select valid" batch actions, live selected-P&L total, raw deal rows view for auditing
- **Security** - Gemini key lives only in server env vars (never in the frontend bundle), optional Firebase ID-token verification, per-IP rate limiting (12 requests / 10 min), strict image type/size validation
- **Seamless Import** - Imported as new trades into any account (never overwrites existing records), immediately reflected in Dashboard, Trade History, Calendar and all analytics

### Trade History
- **Table View** - Full data table with all trade fields
- **Card View** - Compact card layout for quick overview
- **Filters** - Search, account, result, strategy, timeframe, session, date range (from/to)
- **Actions** - View details, Edit, Duplicate, Delete per trade
- **Detail Modal** - Full trade details with all fields, screenshot, and import metadata (commission, swap, entry reason, LQ, POI, setup confirmation)
- **MT5 Import Button** - Quick link to the AI Screenshot Importer

### Trading Accounts
- **Live Balance** - Shows initial balance + trade PnL (real-time)
- **Net Performance** - Percentage gain/loss from trading
- **Deposit/Withdraw** - Quick action buttons per account
- **Adjust Balance Sidebar** - Form to post deposits/withdrawals with memo
- **Transaction History** - Recent transactions across all accounts
- **Strategy & Trade Details** - Per-account breakdown showing strategy performance, long/short trade counts, win rate, and PnL per strategy
- **Create/Edit/Delete** - Full account management with modal form
- **Archive** - Archive/restore accounts with button on each card

### Session Analysis
- **Session Tagging** - Auto-detect or manually select session per trade
- **Session Performance Table** - Win rate, total PnL, avg PnL per session
- **Strategy x Session Matrix** - Which strategies work in which sessions
- **Session Charts** - Win rate doughnut and PnL bar charts
- **Smart Recommendations** - AI-powered session suggestions

### Strategy Performance (Dashboard)
- Full breakdown per strategy showing:
  - Total trades, wins, losses
  - Win rate with color coding
  - Total PnL (green if profit, red if loss)
  - Visual performance progress bar
- Sorted by highest PnL

### Strategy Analysis (Dedicated Page)
- **Account Filter** - View strategies for specific account or all accounts
- **Overall Stats** - Total strategies, trades, win rate, total PnL, long/short counts
- **Strategy Breakdown Table** - Per-strategy: trades, wins, losses, win rate, long/short counts with win rates, avg PnL, total PnL
- **Expandable Strategy Details** - Click any strategy row to expand and see:
  - Direction Performance (Long vs Short with separate win rates and PnL)
  - Best / Worst Trade per strategy
  - Setups used within the strategy
  - Recent 5 trades with quick view link
- **Per-Account Overview** - When viewing all accounts, shows strategy count and performance per account

### Trading Calendar
- Monthly calendar with daily PnL visualization
- Color-coded days (green/red/grey)
- Click day to view trades

### Backtest Journal
- Log backtested strategies
- Track win/loss and PnL per backtest

### Daily Notes
- Write daily trading reviews
- Categories and tags
- Emotion tracking

### Settings
- **Profile** - User info and connection mode
- **Theme** - 4 color themes (TradingView Navy, Emerald Forest, Cyberpunk Neon, Amethyst Void)
- **Backup & Data** - Export/Import JSON backup, Reset all data

### Auth & Sync
- **Firebase Auth** - Email/password login with Google sign-in
- **Dual-Write Storage** - Writes to both localStorage and Firebase Firestore
- **Auto Data Load** - Loads Firebase data on login automatically
- **User-Scoped Storage** - Data isolated per user

## Project Structure
```
trading-j/
├── src/
│   ├── main.jsx                    # React entry point
│   ├── App.jsx                     # Router + auth + providers
│   ├── index.css                   # Full CSS (1990+ lines, includes MT5 importer styles)
│   ├── context/
│   │   └── AppContext.jsx          # Global state (useReducer)
│   ├── lib/
│   │   ├── firebase.js             # Firebase config & exports
│   │   ├── storage.js              # Dual-write data layer
│   │   ├── mt5Import.js            # Deal reconciliation, validation, duplicates, trade mapping
│   │   └── chartConfig.js          # Chart.js defaults
│   ├── components/
│   │   ├── Layout.jsx              # Sidebar + Header layout
│   │   └── Notification.jsx        # Auto-dismiss notification banner
│   └── pages/
│       ├── Auth.jsx                # Login/Register
│       ├── Dashboard.jsx           # Main dashboard with stats/charts
│       ├── TradeEntry.jsx          # Trade form (new + edit mode)
│       ├── TradeHistory.jsx        # Trade table/card views + MT5 import button
│       ├── MT5Import.jsx           # AI MT5 Screenshot Importer
│       ├── SessionAnalysis.jsx     # Session performance analysis
│       ├── Calendar.jsx            # Trading calendar
│       ├── Notes.jsx               # Daily notes
│       ├── Accounts.jsx            # Account management + balances
│       ├── StrategyAnalysis.jsx    # Strategy breakdown with long/short details
│       ├── Backtest.jsx            # Backtest journal
│       └── Settings.jsx            # Theme, backup, profile
├── server/                         # Shared server code (dev + production)
│   ├── extractTrades.mjs           # Gemini vision extraction + model fallback
│   ├── extractEndpoint.mjs         # /api/extract-trades request handler
│   └── guards.mjs                  # Auth verify, rate limit, body/image validation
├── api/
│   └── extract-trades.js           # Vercel serverless function entry (60s max)
├── vite.config.js                  # Build config + dev middleware for /api/extract-trades
├── firestore.rules                 # Owner-only Firestore security rules
├── firebase.json                   # Firestore rules deploy config
├── .env.example                    # Environment variable template
├── package.json
└── README.md
```

## Setup

### Quick Start
```bash
npm install
npm run dev
```
App runs at `http://localhost:5173/`

### Build
```bash
npm run build
```

### Firebase Setup (Optional)
1. Create a Firebase project
2. Enable Email/Password authentication
3. Create a Firestore database
4. Update `src/lib/firebase.js` with your config
5. Deploy security rules: `firebase deploy --only firestore:rules`
6. Data syncs to cloud automatically

### AI MT5 Importer - Environment Variables

Copy `.env.example` to `.env` for local dev. **Never prefix these with `VITE_`** (they must stay server-side only).

| Variable | Required | Purpose |
|---|---|---|
| `MT5_AI_API_KEY` | Yes | Google Gemini API key (read only by the server) |
| `MT5_AI_MODEL` | No | Override the AI model (default: `gemini-3.8-flash`) |
| `MT5_ENFORCE_AUTH` | No | `true` = require sign-in for the import API |
| `MT5_RATE_LIMIT` | No | Requests per 10 min per IP (default: 12) |
| `ALLOWED_ORIGINS` | No | Comma-separated origin allowlist (default: allow all) |

**Local dev** - `npm run dev` serves the API via a Vite middleware, so `.env` is enough.

**Vercel deploy**
1. Push the repo - Vercel picks up `api/extract-trades.js` automatically
2. Project -> Settings -> Environment Variables -> add `MT5_AI_API_KEY`
3. Redeploy (env vars only apply to new deployments)
4. Without the variable, uploads fail with `NO_API_KEY` - this is expected until it is set

> Note: extraction usually takes 7-35s. Vercel Hobby caps functions at 60s; a retry is safe (screenshots are never lost).

## Recent Changes (Vanilla JS to React Migration)
- Migrated from vanilla JS SPA to React + Vite
- Added edit mode in Trade Entry (navigate from Trade History)
- Added drag & drop screenshot upload
- Removed Position Size Calculator from Trade Entry
- Removed Push/Pull sync buttons from Settings
- Removed Storage section from Settings
- Fixed Firebase data loading (getTrades was filtering by userId instead of "all")
- Added backtests state to AppContext
- Fixed account selector filtering on Dashboard
- Notification auto-dismiss after 3 seconds
- Live account balance (initial + PnL) on Accounts page and Dashboard
- Strategy Performance table on Dashboard
- Redesigned Accounts page with Adjust Balance sidebar
- Added edit/duplicate buttons in Trade History
- Balance shown next to account selector in header
- Added archive button on each active account card
- Added date range filter (from/to) in Trade History
- Fixed theme persistence - theme now applies on page refresh without visiting Settings
- Added Strategy & Trade Details section on Accounts page showing per-account strategy breakdown with long/short trade counts, win rate, and PnL
- Added dedicated Strategy Analysis page with full strategy breakdown, expandable details, direction performance, and per-account overview

## Recent Changes (AI MT5 Screenshot Importer)
- New `/import/mt5` page: upload MT5 History/Deals screenshots and import them as trades using Gemini vision AI
- Server endpoint `/api/extract-trades` shared between Vercel serverless (`api/`) and the Vite dev middleware
- Reconciliation library (`src/lib/mt5Import.js`): entry/exit pairing by position ID/ticket, SL/TP parsing from `[sl]`/`[tp]` comments, duplicate fingerprints, row validation
- Review table with inline editing + expandable panel (SL/TP, entry reason, strategy, LQ, POI, setup confirmation, emotions, mistakes, notes)
- Security: server-side API key, optional Firebase ID-token verification, per-IP rate limiting, 40s AI request timeout with model fallback
- Trade History: "Import MT5 Screenshot" button, needs-review/duplicate badges, new detail fields
- Trade Entry edit mode preserves imported P/L instead of recomputing from price x lots
- Firestore security rules (`firestore.rules`) restricting data to the signed-in user

## License
Private - For personal trading journal use only.
