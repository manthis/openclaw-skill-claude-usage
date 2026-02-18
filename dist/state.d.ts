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
    last_7_days: {
        avg_daily: number;
        total: number;
    };
    yesterday: DayInfo;
    day_before: DayInfo;
    three_days_ago: DayInfo;
    daily_costs_7d?: DayInfo[];
    alerts: string[];
    last_alert_ts: number;
    error: string | null;
}
export declare function readState(config: Config): UsageState;
export declare function writeState(config: Config, state: UsageState): void;
export declare function getDefaultState(): UsageState;
