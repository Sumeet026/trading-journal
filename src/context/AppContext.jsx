import { createContext, useContext, useReducer, useCallback } from 'react';
import {
  getTrades,
  getNotes,
  getGoals,
  getChecklist,
  getAccounts,
  getBacktests,
} from '../lib/storage';

const AppContext = createContext(null);

const initialState = {
  user: null,
  isLocalMode: false,
  accounts: [],
  activeAccountId: 'all',
  trades: [],
  allTrades: [],
  notes: [],
  goals: [],
  checklist: [],
  backtests: [],
  currentTab: 'journal',
  activeTradeType: 'Buy',
  dateFrom: null,
  dateTo: null,
  showArchived: false,
  notification: { message: '', type: 'info', visible: false },
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };

    case 'SET_LOCAL_MODE':
      return { ...state, isLocalMode: action.payload };

    case 'SET_ACCOUNTS':
      return { ...state, accounts: action.payload };

    case 'SET_ALL_TRADES': {
      const allTrades = action.payload;
      const filtered = filterTrades(allTrades, state.activeAccountId, state.dateFrom, state.dateTo, state.showArchived);
      return { ...state, allTrades, trades: filtered };
    }

    case 'SET_NOTES':
      return { ...state, notes: action.payload };

    case 'SET_GOALS':
      return { ...state, goals: action.payload };

    case 'SET_CHECKLIST':
      return { ...state, checklist: action.payload };

    case 'SET_BACKTESTS':
      return { ...state, backtests: action.payload };

    case 'SET_ACTIVE_ACCOUNT': {
      const activeAccountId = action.payload;
      const trades = filterTrades(state.allTrades, activeAccountId, state.dateFrom, state.dateTo, state.showArchived);
      return { ...state, activeAccountId, trades };
    }

    case 'SET_CURRENT_TAB':
      return { ...state, currentTab: action.payload };

    case 'SET_ACTIVE_TRADE_TYPE':
      return { ...state, activeTradeType: action.payload };

    case 'SET_DATE_FILTER': {
      const { dateFrom, dateTo } = action.payload;
      const trades = filterTrades(state.allTrades, state.activeAccountId, dateFrom, dateTo, state.showArchived);
      return { ...state, dateFrom, dateTo, trades };
    }

    case 'SET_SHOW_ARCHIVED': {
      const showArchived = action.payload;
      const trades = filterTrades(state.allTrades, state.activeAccountId, state.dateFrom, state.dateTo, showArchived);
      return { ...state, showArchived, trades };
    }

    case 'SET_NOTIFICATION':
      return { ...state, notification: { ...action.payload, visible: true } };

    case 'CLEAR_NOTIFICATION':
      return { ...state, notification: { ...state.notification, visible: false } };

    default:
      return state;
  }
}

function filterTrades(allTrades, activeAccountId, dateFrom, dateTo, showArchived) {
  return allTrades.filter((trade) => {
    if (!showArchived && trade.archived) return false;

    if (activeAccountId !== 'all' && trade.accountId !== activeAccountId) return false;

    if (dateFrom || dateTo) {
      const tradeDate = new Date(trade.date);
      if (dateFrom && tradeDate < new Date(dateFrom)) return false;
      if (dateTo && tradeDate > new Date(dateTo)) return false;
    }

    return true;
  });
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const loadInitialData = useCallback(async (userId) => {
    try {
      if (userId) {
        const [accounts, allTrades, notes, goals, checklist, backtests] = await Promise.all([
          getAccounts(),
          getTrades("all"),
          getNotes(),
          getGoals(),
          getChecklist(),
          getBacktests(),
        ]);

        dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
        dispatch({ type: 'SET_ALL_TRADES', payload: allTrades });
        dispatch({ type: 'SET_NOTES', payload: notes });
        dispatch({ type: 'SET_GOALS', payload: goals });
        dispatch({ type: 'SET_CHECKLIST', payload: checklist });
        dispatch({ type: 'SET_BACKTESTS', payload: backtests });
      } else {
        const allTrades = JSON.parse(localStorage.getItem('trades') || '[]');
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const goals = JSON.parse(localStorage.getItem('goals') || '[]');
        const checklist = JSON.parse(localStorage.getItem('checklist') || '[]');
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        const backtests = JSON.parse(localStorage.getItem('backtests') || '[]');

        dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
        dispatch({ type: 'SET_ALL_TRADES', payload: allTrades });
        dispatch({ type: 'SET_NOTES', payload: notes });
        dispatch({ type: 'SET_GOALS', payload: goals });
        dispatch({ type: 'SET_CHECKLIST', payload: checklist });
        dispatch({ type: 'SET_BACKTESTS', payload: backtests });
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      dispatch({
        type: 'SET_NOTIFICATION',
        payload: { message: 'Failed to load data', type: 'error' },
      });
    }
  }, []);

  const value = { state, dispatch, loadInitialData };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
