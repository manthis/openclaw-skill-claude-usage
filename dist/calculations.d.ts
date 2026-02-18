import type { DailyCost } from './proxy.js';
import type { Config } from './config.js';
import type { UsageState } from './state.js';
/** Get current date/time info in the configured timezone */
export declare function getDateInfo(config: Config): {
    today: string;
    hour: number;
    dow: string;
    dowNum: number;
    yesterday: string;
    dayBefore: string;
    threeDaysAgo: string;
    sevenDaysAgo: string;
    tomorrow: string;
    weekStart: string;
    weekEnd: string;
};
/** Find cost for a specific date in the daily costs array */
export declare function costForDate(days: DailyCost[], date: string): number;
export declare function computeMetrics(config: Config, days: DailyCost[], dates: ReturnType<typeof getDateInfo>): {
    yesterday: {
        date: string;
        cost: number;
        tokens_input: number;
        tokens_output: number;
    };
    dayBefore: {
        date: string;
        cost: number;
        tokens_input: number;
        tokens_output: number;
    };
    threeDaysAgo: {
        date: string;
        cost: number;
        tokens_input: number;
        tokens_output: number;
    };
    week: {
        startDate: string;
        endDate: string;
        total: number;
        projection: number;
        pct: string;
        dayCount: number;
    };
    sevenDays: {
        total: number;
        avg: number;
    };
    dailyCosts: DailyCost[];
};
/** Determine alerts based on metrics */
export declare function computeAlerts(config: Config, metrics: ReturnType<typeof computeMetrics>): {
    alerts: string[];
    protectionMode: boolean;
};
/** Build updated state from metrics and alerts */
export declare function buildState(config: Config, currentState: UsageState, metrics: ReturnType<typeof computeMetrics>, alertResult: ReturnType<typeof computeAlerts>): UsageState;
