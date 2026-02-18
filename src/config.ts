import { homedir } from 'os';
import { join } from 'path';
import axios from 'axios';

export interface Config {
  proxyUrl: string;
  proxyToken: string;
  stateFile: string;
  weeklyBudget: number;
  alertThreshold: number;
  resetHour: number;  // Monday reset hour in Europe/Paris
  timezone: string;
  usdToEur: number;  // USD → EUR conversion rate
}

/**
 * Fetch live USD -> EUR exchange rate from Frankfurter API.
 * Fallback to 0.92 if API fails.
 */
async function fetchExchangeRate(): Promise<number> {
  try {
    const resp = await axios.get('https://api.frankfurter.app/latest?from=USD&to=EUR', {
      timeout: 5000,
    });
    const rate = resp.data?.rates?.EUR;
    if (typeof rate === 'number' && rate > 0) {
      return rate;
    }
  } catch {
    // API down or network error - use fallback
  }
  return 0.92; // Fallback rate
}

export function loadConfig(): Config {
  const home = homedir();
  return {
    proxyUrl: process.env.CLAUDE_USAGE_PROXY_URL || 'https://hal9000-claude-usage-proxy.onrender.com',
    proxyToken: process.env.CLAUDE_USAGE_PROXY_TOKEN || '',
    stateFile: process.env.CLAUDE_USAGE_STATE_FILE || join(home, '.openclaw/workspace/memory/claude-usage-state.json'),
    weeklyBudget: parseFloat(process.env.CLAUDE_USAGE_WEEKLY_BUDGET || '625'),
    alertThreshold: 0.5,
    resetHour: 21,
    timezone: 'Europe/Paris',
    usdToEur: parseFloat(process.env.USD_TO_EUR || '0.92'),  // Fallback, will be updated by loadConfigAsync
  };
}

/**
 * Load config with live exchange rate.
 * Use this in CLI commands instead of loadConfig().
 */
export async function loadConfigAsync(): Promise<Config> {
  const config = loadConfig();
  
  // Override with live rate if not explicitly set via env var
  if (!process.env.USD_TO_EUR) {
    config.usdToEur = await fetchExchangeRate();
  }
  
  return config;
}
