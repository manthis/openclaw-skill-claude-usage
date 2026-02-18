import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { Config } from './config.js';

export interface BudgetInfo {
  weekly_limit: number;
  alert_threshold: number;
}

export interface WeekInfo {
  start_date: string;
  end_date: string;
  total_cost: number;
  projection: number;
  pct?: string;
}

export interface DayInfo {
  date: string;
  cost: number;
  tokens_input?: number;
  tokens_output?: number;
}

export interface UsageState {
  lastCheck: number;
  protection_mode: boolean;
  weekly_reset_day: string;
  weekly_reset_hour: number;
  budget: BudgetInfo;
  current_week: WeekInfo;
  last_7_days: { avg_daily: number; total: number };
  yesterday: DayInfo;
  day_before: DayInfo;
  three_days_ago: DayInfo;
  daily_costs_7d?: DayInfo[];
  alerts: string[];
  last_alert_ts: number;
  error: string | null;
}

const DEFAULT_STATE: UsageState = {
  lastCheck: 0,
  protection_mode: false,
  weekly_reset_day: 'monday',
  weekly_reset_hour: 21,
  budget: { weekly_limit: 625.0, alert_threshold: 0.5 },
  current_week: { start_date: '', end_date: '', total_cost: 0, projection: 0 },
  last_7_days: { avg_daily: 0, total: 0 },
  yesterday: { date: '', cost: 0, tokens_input: 0, tokens_output: 0 },
  day_before: { date: '', cost: 0, tokens_input: 0, tokens_output: 0 },
  three_days_ago: { date: '', cost: 0, tokens_input: 0, tokens_output: 0 },
  daily_costs_7d: [],
  alerts: [],
  last_alert_ts: 0,
  error: null,
};

export function readState(config: Config): UsageState {
  try {
    const raw = readFileSync(config.stateFile, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeState(config: Config, state: UsageState): void {
  mkdirSync(dirname(config.stateFile), { recursive: true });
  writeFileSync(config.stateFile, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

export function getDefaultState(): UsageState {
  return { ...DEFAULT_STATE };
}
