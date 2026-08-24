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

### Trade History
- **Table View** - Full data table with all trade fields
- **Card View** - Compact card layout for quick overview
- **Filters** - Search, account, result, strategy, timeframe, session, date range (from/to)
- **Actions** - View details, Edit, Duplicate, Delete per trade
- **Detail Modal** - Full trade details with all fields and screenshot

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
│   ├── index.css                   # Full CSS (1770+ lines)
│   ├── context/
│   │   └── AppContext.jsx          # Global state (useReducer)
│   ├── lib/
│   │   ├── firebase.js             # Firebase config & exports
│   │   ├── storage.js              # Dual-write data layer
│   │   └── chartConfig.js          # Chart.js defaults
│   ├── components/
│   │   ├── Layout.jsx              # Sidebar + Header layout
│   │   └── Notification.jsx        # Auto-dismiss notification banner
│   └── pages/
│       ├── Auth.jsx                # Login/Register
│       ├── Dashboard.jsx           # Main dashboard with stats/charts
│       ├── TradeEntry.jsx          # Trade form (new + edit mode)
│       ├── TradeHistory.jsx        # Trade table/card views
│       ├── SessionAnalysis.jsx     # Session performance analysis
│       ├── Calendar.jsx            # Trading calendar
│       ├── Notes.jsx               # Daily notes
│       ├── Accounts.jsx            # Account management + balances
│       ├── StrategyAnalysis.jsx    # Strategy breakdown with long/short details
│       ├── Backtest.jsx            # Backtest journal
│       └── Settings.jsx            # Theme, backup, profile
├── package.json
├── vite.config.js
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
5. Data syncs to cloud automatically

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

## License
Private - For personal trading journal use only.
