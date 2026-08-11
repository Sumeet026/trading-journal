# ApexTrader - Professional Trading Journal & Analytics

A premium dark-themed trading journal web application built with vanilla JavaScript, Chart.js, and Firebase. Track every trade, analyze session performance, and improve your trading discipline.

## Features

### Core Functionality
- **Trade Journal** - Log every trade with entry/exit prices, quantity, commissions, strategy, setup, timeframe, and session
- **Multi-Account Management** - Create, edit, and archive multiple trading accounts (Forex, Crypto, Stocks, Futures)
- **Trade History** - Filterable table and card views with search, account, result, strategy, timeframe, and session filters
- **Trading Calendar** - Interactive monthly calendar with daily P&L visualization
- **Backtest Journal** - Log and analyze backtested strategies with win/loss tracking

### Session Analysis (NEW)
- **Session Tagging** - Tag each trade with its trading session: Tokyo, London, New York, Asian, or Overlap
- **Session Performance Table** - Win rate, total PnL, average PnL, and best strategy per session
- **Strategy x Session Matrix** - See which strategies work best in which sessions
- **Session Win Rate Chart** - Doughnut chart showing win rate distribution across sessions
- **Session PnL Chart** - Bar chart comparing total PnL by session
- **Smart Recommendations** - AI-powered suggestions based on your session performance data
- **Dashboard Summary** - Quick session stats visible directly on the dashboard

### Trading Sessions (IST)
| Session | Time (IST) | Description |
|---------|-----------|-------------|
| Tokyo | 5:30 AM - 11:30 AM | Asian market open, JPY pairs active |
| London | 12:00 PM - 7:00 PM | European session, highest volume |
| New York | 1:00 PM - 7:00 PM | US session, USD pairs volatile |
| Asian/Osaka | 7:00 PM - 1:30 AM | Late Asian session |
| Overlap | 1:00 PM - 7:00 PM | London-NY overlap, maximum volatility |

### Dashboard
- **12 Stat Cards** - Today's P&L, Total P&L, Balance, Win Rate, Total Trades, Avg R-Multiple, Best/Worst Trade, Profit Factor, Max Drawdown, Trading Streak, ROI
- **Session Performance Summary** - Quick view of win rate and PnL for each session
- **Equity Curve** - Cumulative account growth chart
- **Win/Loss Pie** - Trade outcome distribution
- **Economic Calendar** - Live high-impact economic events
- **Global Session Clocks** - Real-time session status (OPEN/Closed)
- **Performance Heatmap** - Last 49 days color-coded by daily P&L
- **Daily Checklist** - Pre-trading checklist
- **Goals Progress** - Track trading goals

### Position Size Calculator
- Calculate optimal position size based on account balance, risk percentage, and stop loss size
- Real-time risk amount and position size display

### Analytics & Charts (13 Chart Types)
1. Equity Curve (Line)
2. Daily P&L (Bar)
3. Weekly P&L (Bar)
4. Monthly P&L (Bar)
5. Win/Loss Pie (Doughnut)
6. Strategy Performance (Horizontal Bar)
7. P&L Distribution (Histogram)
8. Portfolio Allocation (Doughnut)
9. Drawdown Curve (Line)
10. Hourly Profitability (Bar)
11. Day-of-Week Performance (Bar)
12. Session Win Rate (Doughnut)
13. Session PnL (Bar)

### Additional Features
- **Daily Journal Notes** - Write daily trading notes with categories and tags
- **Firebase Authentication** - Email/password login with verification
- **Firebase Cloud Sync** - Dual-write to localStorage + Firestore
- **4 Color Themes** - TradingView Navy, Emerald Forest, Cyberpunk Neon, Amethyst Void
- **CSV Export** - Export all trade data to CSV
- **JSON Backup** - Full data export/import for backup
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Screenshot Upload** - Attach trade screenshots to journal entries

## Tech Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6 Modules)
- **Charts:** Chart.js 4.x
- **Icons:** FontAwesome 6.4
- **Fonts:** Inter + Outfit (Google Fonts)
- **Backend:** Firebase (Auth + Firestore)
- **Storage:** localStorage (primary) + Firebase Firestore (sync)

## Project Structure
```
trading-j/
├── dashboard/
│   └── dashboard.html          # Main SPA (single-page application)
├── css/
│   └── dashboard.css           # Premium dark-theme styles (1756 lines)
├── js/
│   ├── app.js                  # Entry point, module wiring
│   ├── calendar.js             # Trading calendar renderer
│   ├── chart.js                # Chart.js engine (15 chart types)
│   ├── firebase.js             # Firebase config & imports
│   ├── storage.js              # Dual-write data layer (localStorage + Firebase)
│   └── modules/
│       ├── accounts.js         # Multi-account management
│       ├── auth.js             # Firebase auth (signup/login/verify)
│       ├── backtest.js         # Backtest journal system
│       ├── core.js             # Global state, DOM refs, utilities
│       ├── dashboard.js        # Dashboard stats, widgets, session clocks
│       ├── modals.js           # Modal popups (trade details, calendar day)
│       ├── navigation.js       # Tab/sidebar navigation
│       ├── notes.js            # Daily journal notes
│       ├── session-analysis.js # Session performance analysis (NEW)
│       ├── settings.js         # Settings, backup, Firebase sync
│       ├── trade-entry.js      # Trade journal form, tags, calculator
│       └── trade-history.js    # Trade history table/card views
├── index.html                  # Redirect to dashboard/
└── README.md
```

## Setup & Usage

### Quick Start
1. Clone the repository
2. Open with a local server (e.g., VS Code Live Server)
3. The app runs in **Local Sandbox Mode** by default (no Firebase needed)
4. Start logging trades and tagging sessions!

### Firebase Setup (Optional)
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Email/Password authentication
3. Create a Firestore database
4. Update `js/firebase.js` with your Firebase config
5. Your data will sync to the cloud automatically

### Using Session Analysis
1. Go to **Journal Trade** page
2. Fill in trade details
3. Select the **Trading Session** from the dropdown (Tokyo/London/NY/Asian/Overlap)
4. Save the trade
5. Go to **Session Analysis** page to see your session performance
6. Check the **Dashboard** for a quick session summary

## Git History
- Initial commit and website updates
- Repository: https://github.com/Sumeet026/trading-journal01

## License
Private - For personal trading journal use only.
