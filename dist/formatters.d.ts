import type { UsageState } from './state.js';
import type { Config } from './config.js';
type Format = 'text' | 'json' | 'html';
export declare function formatReport(state: UsageState, config: Config, format: Format): string;
export declare function formatWeekSummary(state: UsageState, config: Config): string;
export declare function formatDailyBreakdown(state: UsageState, config: Config): string;
export declare function formatProtectionStatus(status: {
    enabled: boolean;
    reason: string;
    weekTotal: number;
    weeklyBudget: number;
    weekPct: string;
    lastCheck: string;
}, config: Config): string;
export declare function formatSevenDaysDetail(state: UsageState, config: Config): string;
export {};
